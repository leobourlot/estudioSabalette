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
  QueryFailedError,
  Repository,
  type SelectQueryBuilder,
} from 'typeorm';
import { PasswordsService } from '../autenticacion/contrasenas.service.js';
import { Cliente } from './cliente.entity.js';
import type { CreateUserDto } from './dto/crear-usuario.dto.js';
import type { ListUsersQueryDto } from './dto/listar-usuarios.dto.js';
import { checkAccountAction, checkCreate, type PolicyDecision } from './permisos-gestion.js';
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
} as const;

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
