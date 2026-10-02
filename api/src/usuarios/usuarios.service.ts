import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  In,
  IsNull,
  QueryFailedError,
  Repository,
  type SelectQueryBuilder,
} from 'typeorm';
import { PasswordsService } from '../autenticacion/contrasenas.service.js';
import { Cliente } from './cliente.entity.js';
import type { CreateUserDto } from './dto/crear-usuario.dto.js';
import type { ListUsersQueryDto } from './dto/listar-usuarios.dto.js';
import type { UpdateUserDto } from './dto/modificar-usuario.dto.js';
import { checkAccountAction, checkCreate, type PolicyDecision } from './permisos-gestion.js';
import { Sesion } from './sesion.entity.js';
import { toUsuarioDetalle, type UsuarioDetalle } from './usuario-detalle.js';
import { Usuario } from './usuario.entity.js';
import { normalizeDocumentNumber } from './validadores/normalizar.js';

const PAGE_SIZE = 20;

export interface UserPage {
  items: UsuarioDetalle[];
  total: number;
  pagina: number;
  porPagina: number;
}

/** Escapa los comodines de LIKE para que la búsqueda los trate como texto. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

export const USERS_MESSAGES = {
  emailTaken: 'Ya existe una cuenta con ese email',
  emailOfDeactivatedAccount: 'Ese email pertenece a una cuenta desactivada',
  documentTaken: 'Ya existe un cliente con ese DNI o CUIT',
  documentOfDeactivatedClient:
    'Ya existe un cliente con ese DNI o CUIT. Está desactivado: reactivalo en lugar de crear uno nuevo',
  notFound: 'No existe esa cuenta',
  clientDataOnStaff: 'Solo las cuentas de clientes llevan datos de cliente',
  businessNameOnNaturalPerson: 'La razón social solo corresponde a personas jurídicas',
  alreadyActive: 'La cuenta ya está activa',
  reactivateWithoutEmail: 'La cuenta no tiene email. Asignale uno antes de reactivarla',
} as const;

/** Quita las claves sin valor (undefined); null se conserva porque significa "borrar". */
function definedOnly<T extends Record<string, unknown>>(values: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

/** Convierte una decisión de permisos-gestion en la respuesta HTTP correspondiente. */
function throwIfDenied(decision: PolicyDecision): void {
  if (decision) throw new HttpException(decision.message, decision.status);
}

@Injectable()
export class UsersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Usuario) private readonly users: Repository<Usuario>,
    @InjectRepository(Cliente) private readonly clients: Repository<Cliente>,
    private readonly passwords: PasswordsService,
  ) {}

  /**
   * Listado paginado con búsqueda y filtros (RF-26). Un abogado solo ve clientes: si no
   * indica rol se fuerza "cliente", y si pide otro recibe 403.
   */
  async list(actor: Usuario, query: ListUsersQueryDto): Promise<UserPage> {
    let rol = query.rol;
    if (actor.rol === 'abogado') {
      if (rol !== undefined && rol !== 'cliente') throwIfDenied(checkCreate(actor, rol));
      rol = 'cliente';
    }
    const pagina = query.pagina ?? 1;

    const builder = this.users
      .createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.cliente', 'cliente')
      .leftJoinAndSelect('usuario.creadoPor', 'creadoPor')
      .leftJoinAndSelect('usuario.modificadoPor', 'modificadoPor');

    if (rol !== undefined) builder.andWhere('usuario.rol = :rol', { rol });
    if (query.activo !== undefined)
      builder.andWhere('usuario.activo = :activo', { activo: query.activo });
    if (query.buscar) this.applySearch(builder, query.buscar);

    // La intercalación utf8mb4_unicode_ci ordena y busca sin distinguir mayúsculas ni tildes.
    // offset/limit (y no skip/take): las uniones son 1 a 1 o muchos a 1 y no multiplican
    // filas, y skip/take arma una subconsulta que no admite COALESCE en el ORDER BY.
    const [usuarios, total] = await builder
      .orderBy('COALESCE(cliente.razonSocial, usuario.apellido)', 'ASC')
      .addOrderBy('usuario.nombre', 'ASC')
      .addOrderBy('usuario.id', 'ASC')
      .offset((pagina - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .getManyAndCount();

    return { items: usuarios.map(toUsuarioDetalle), total, pagina, porPagina: PAGE_SIZE };
  }

  /** Consulta de una cuenta con su auditoría (RF-34). */
  async findOne(actor: Usuario, id: number): Promise<UsuarioDetalle> {
    const usuario = await this.findWithDetail(id);
    throwIfDenied(checkAccountAction(actor, usuario, 'view'));
    return toUsuarioDetalle(usuario);
  }

  /**
   * Modificación parcial (RF-27, RF-28, RF-31). Registra quién modificó. Si cambia el email
   * de otra cuenta, cierra su sesión; un cambio de rol no la cierra: rige en la siguiente
   * petición porque el guard relee el usuario (RF-14).
   */
  async update(actor: Usuario, id: number, dto: UpdateUserDto): Promise<UsuarioDetalle> {
    const target = await this.findWithDetail(id);
    const emailChanged = dto.email !== undefined && dto.email !== target.email;
    throwIfDenied(
      checkAccountAction(actor, target, 'update', { email: emailChanged, rol: dto.rol }),
    );

    if (dto.cliente) {
      if (!target.cliente) throw new BadRequestException(USERS_MESSAGES.clientDataOnStaff);
      if (dto.cliente.razonSocial !== undefined && target.cliente.tipoPersona !== 'juridica') {
        throw new BadRequestException(USERS_MESSAGES.businessNameOnNaturalPerson);
      }
    }
    if (emailChanged) await this.assertEmailAvailable(dto.email!, target.id);

    const now = new Date();
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(Usuario, target.id, {
          ...definedOnly({
            email: dto.email,
            nombre: dto.nombre,
            apellido: dto.apellido,
            rol: dto.rol,
          }),
          modificadoPorId: actor.id,
          modificadoEn: now,
        });
        const clientChanges = definedOnly({
          razonSocial: dto.cliente?.razonSocial,
          telefono: dto.cliente?.telefono,
          domicilio: dto.cliente?.domicilio,
        });
        if (Object.keys(clientChanges).length > 0) {
          await manager.update(Cliente, target.id, clientChanges);
        }
        if (emailChanged && target.id !== actor.id) {
          await manager.update(
            Sesion,
            { usuarioId: target.id, revocadaEn: IsNull() },
            { revocadaEn: now },
          );
        }
      });
    } catch (error) {
      throw this.translateDuplicate(error);
    }

    return toUsuarioDetalle(await this.findWithDetail(target.id));
  }

  /**
   * Desactivación (RF-29): la cuenta no se borra, para conservar la autoría de lo cargado;
   * se cierra su sesión y ya no puede ingresar. Repetirla no es un error.
   */
  async deactivate(actor: Usuario, id: number): Promise<void> {
    const target = await this.findWithDetail(id);
    throwIfDenied(checkAccountAction(actor, target, 'deactivate'));

    const now = new Date();
    await this.dataSource.transaction(async (manager) => {
      await manager.update(Usuario, target.id, {
        activo: false,
        modificadoPorId: actor.id,
        modificadoEn: now,
      });
      await manager.update(
        Sesion,
        { usuarioId: target.id, revocadaEn: IsNull() },
        { revocadaEn: now },
      );
    });
  }

  /**
   * Reactivación (RF-30): exige una contraseña temporal nueva, para que una contraseña que
   * pudo verse comprometida no vuelva a servir, y deja pendiente el cambio.
   */
  async reactivate(actor: Usuario, id: number, temporaryPassword: string): Promise<void> {
    const target = await this.findWithDetail(id);
    throwIfDenied(checkAccountAction(actor, target, 'reactivate'));
    if (target.activo) throw new ConflictException(USERS_MESSAGES.alreadyActive);
    if (target.email === null) throw new ConflictException(USERS_MESSAGES.reactivateWithoutEmail);

    const passwordViolation = this.passwords.findRuleViolation(temporaryPassword);
    if (passwordViolation) throw new BadRequestException(passwordViolation);

    await this.users.update(target.id, {
      activo: true,
      contrasenaHash: await this.passwords.hash(temporaryPassword),
      debeCambiarContrasena: true,
      modificadoPorId: actor.id,
      modificadoEn: new Date(),
    });
  }

  /**
   * Restablecimiento de contraseña (RF-33): guarda la temporal, deja pendiente el cambio y
   * cierra la sesión. Un cambio propio simultáneo no lo pisa: ese guardado está condicionado
   * al hash que leyó, que este restablecimiento ya reemplazó.
   */
  async resetPassword(actor: Usuario, id: number, temporaryPassword: string): Promise<void> {
    const target = await this.findWithDetail(id);
    throwIfDenied(checkAccountAction(actor, target, 'resetPassword'));

    const passwordViolation = this.passwords.findRuleViolation(temporaryPassword);
    if (passwordViolation) throw new BadRequestException(passwordViolation);

    const contrasenaHash = await this.passwords.hash(temporaryPassword);
    const now = new Date();
    await this.dataSource.transaction(async (manager) => {
      await manager.update(Usuario, target.id, {
        contrasenaHash,
        debeCambiarContrasena: true,
        modificadoPorId: actor.id,
        modificadoEn: now,
      });
      await manager.update(
        Sesion,
        { usuarioId: target.id, revocadaEn: IsNull() },
        { revocadaEn: now },
      );
    });
  }

  /**
   * Liberación del email de una cuenta desactivada (RF-24), para poder usarlo en otra
   * cuenta. Para reactivarla después hay que asignarle un email nuevo.
   */
  async releaseEmail(actor: Usuario, id: number): Promise<void> {
    const target = await this.findWithDetail(id);
    throwIfDenied(checkAccountAction(actor, target, 'releaseEmail'));

    await this.users.update(target.id, {
      email: null,
      modificadoPorId: actor.id,
      modificadoEn: new Date(),
    });
  }

  /**
   * Transferencia de la condición de principal (RF-32). Bloquea las filas de los dos
   * usuarios y vuelve a verificar las reglas dentro de la transacción: si llegan dos
   * transferencias a la vez, la segunda espera y encuentra que el actor ya no es principal.
   */
  async transferPrincipal(actor: Usuario, id: number): Promise<void> {
    const target = await this.findWithDetail(id);
    throwIfDenied(checkAccountAction(actor, target, 'transferPrincipal'));

    const now = new Date();
    await this.dataSource.transaction(async (manager) => {
      const locked = await manager.find(Usuario, {
        where: { id: In([actor.id, target.id]) },
        lock: { mode: 'pessimistic_write' },
      });
      const lockedActor = locked.find((usuario) => usuario.id === actor.id);
      const lockedTarget = locked.find((usuario) => usuario.id === target.id);
      if (!lockedActor || !lockedTarget) throw new NotFoundException(USERS_MESSAGES.notFound);
      throwIfDenied(checkAccountAction(lockedActor, lockedTarget, 'transferPrincipal'));

      await manager.update(Usuario, lockedActor.id, {
        esPrincipal: false,
        modificadoPorId: actor.id,
        modificadoEn: now,
      });
      await manager.update(Usuario, lockedTarget.id, {
        esPrincipal: true,
        modificadoPorId: actor.id,
        modificadoEn: now,
      });
    });
  }

  /**
   * Busca en apellido, nombre y razón social. Si el texto parece un DNI o CUIT (solo dígitos
   * una vez quitados puntos, guiones y espacios), busca también en esos campos.
   */
  private applySearch(builder: SelectQueryBuilder<Usuario>, term: string): void {
    const text = `%${escapeLike(term)}%`;
    const digits = normalizeDocumentNumber(term);
    builder.andWhere(
      new Brackets((where) => {
        where
          .where('usuario.apellido LIKE :text', { text })
          .orWhere('usuario.nombre LIKE :text', { text })
          .orWhere('cliente.razonSocial LIKE :text', { text });
        if (/^\d+$/.test(digits)) {
          const document = `%${digits}%`;
          where
            .orWhere('cliente.dni LIKE :document', { document })
            .orWhere('cliente.cuit LIKE :document', { document });
        }
      }),
    );
  }

  /** Alta de una cuenta con contraseña temporal y cambio pendiente (RF-21 a RF-25). */
  async create(actor: Usuario, dto: CreateUserDto): Promise<UsuarioDetalle> {
    throwIfDenied(checkCreate(actor, dto.rol));

    const passwordViolation = this.passwords.findRuleViolation(dto.contrasenaTemporal);
    if (passwordViolation) throw new BadRequestException(passwordViolation);

    await this.assertEmailAvailable(dto.email);
    if (dto.cliente) await this.assertDocumentAvailable(dto.cliente.dni, dto.cliente.cuit);

    const contrasenaHash = await this.passwords.hash(dto.contrasenaTemporal);
    let id: number;
    try {
      id = await this.dataSource.transaction(async (manager) => {
        const usuario = await manager.save(Usuario, {
          rol: dto.rol,
          esPrincipal: false,
          email: dto.email,
          nombre: dto.nombre,
          apellido: dto.apellido,
          contrasenaHash,
          debeCambiarContrasena: true,
          activo: true,
          creadoPorId: actor.id,
        });
        if (dto.cliente) {
          await manager.save(Cliente, {
            usuarioId: usuario.id,
            tipoPersona: dto.cliente.tipoPersona,
            dni: dto.cliente.dni ?? null,
            cuit: dto.cliente.cuit ?? null,
            razonSocial: dto.cliente.razonSocial ?? null,
            telefono: dto.cliente.telefono ?? null,
            domicilio: dto.cliente.domicilio ?? null,
          });
        }
        return usuario.id;
      });
    } catch (error) {
      throw this.translateDuplicate(error);
    }

    return toUsuarioDetalle(await this.findWithDetail(id));
  }

  private async findWithDetail(id: number): Promise<Usuario> {
    const usuario = await this.users.findOne({
      where: { id },
      relations: { cliente: true, creadoPor: true, modificadoPor: true },
    });
    if (!usuario) throw new NotFoundException(USERS_MESSAGES.notFound);
    return usuario;
  }

  /** RF-23 y RF-24: el email no puede estar en uso, ni siquiera por una cuenta desactivada. */
  private async assertEmailAvailable(email: string, exceptUserId?: number): Promise<void> {
    const owner = await this.users.findOne({
      where: { email },
      select: { id: true, activo: true },
    });
    if (!owner || owner.id === exceptUserId) return;
    throw new ConflictException(
      owner.activo ? USERS_MESSAGES.emailTaken : USERS_MESSAGES.emailOfDeactivatedAccount,
    );
  }

  /** RF-25: DNI y CUIT únicos; si el dueño está desactivado, se sugiere reactivarlo. */
  private async assertDocumentAvailable(dni?: string, cuit?: string): Promise<void> {
    const where = dni ? { dni } : cuit ? { cuit } : null;
    if (!where) return;
    const existing = await this.clients.findOne({ where, relations: { usuario: true } });
    if (!existing) return;
    throw new ConflictException(
      existing.usuario.activo
        ? USERS_MESSAGES.documentTaken
        : USERS_MESSAGES.documentOfDeactivatedClient,
    );
  }

  /**
   * Si dos altas simultáneas pasan los controles previos, el índice único de la base
   * rechaza la segunda; se responde el mismo 409 que en el caso común.
   */
  private translateDuplicate(error: unknown): unknown {
    const driverError = error instanceof QueryFailedError ? error.driverError : undefined;
    if (driverError?.code !== 'ER_DUP_ENTRY') return error;
    const message = String(driverError.message);
    if (message.includes('UQ_usuarios_email'))
      return new ConflictException(USERS_MESSAGES.emailTaken);
    if (message.includes('UQ_clientes_dni') || message.includes('UQ_clientes_cuit')) {
      return new ConflictException(USERS_MESSAGES.documentTaken);
    }
    return error;
  }
}
