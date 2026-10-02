import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { PasswordsService } from '../autenticacion/contrasenas.service.js';
import { Cliente } from './cliente.entity.js';
import type { CreateUserDto } from './dto/crear-usuario.dto.js';
import { checkCreate, type PolicyDecision } from './permisos-gestion.js';
import { toUsuarioDetalle, type UsuarioDetalle } from './usuario-detalle.js';
import { Usuario } from './usuario.entity.js';

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
