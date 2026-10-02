import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PasswordsService } from '../autenticacion/contrasenas.service.js';
import { emailRule, requiredText } from '../usuarios/dto/reglas.js';
import { Sesion } from '../usuarios/sesion.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { MAX_TEXT_LENGTH } from '../usuarios/validadores/longitudes.js';
import { normalizeEmail } from '../usuarios/validadores/normalizar.js';

export const PRINCIPAL_CONSOLE_MESSAGES = {
  alreadyExists: 'Ya existe un administrador principal',
  notFound: 'No existe un administrador principal',
  emailTaken: 'Ya existe una cuenta con ese email',
} as const;

export interface PrincipalData {
  nombre: string;
  apellido: string;
  email: string;
  contrasena: string;
}

const nameRule = requiredText(
  {
    required: 'El nombre es obligatorio',
    tooLong: `El nombre no puede tener más de ${MAX_TEXT_LENGTH} caracteres`,
  },
  MAX_TEXT_LENGTH,
);
const surnameRule = requiredText(
  {
    required: 'El apellido es obligatorio',
    tooLong: `El apellido no puede tener más de ${MAX_TEXT_LENGTH} caracteres`,
  },
  MAX_TEXT_LENGTH,
);

/**
 * Lógica del comando de consola (RF-41, RF-42), separada de la entrada por teclado para
 * poder testearla. Solo crea el administrador principal cuando no existe y, si existe, solo
 * restablece su contraseña: nunca crea otros administradores.
 */
@Injectable()
export class PrincipalAdminService {
  constructor(
    @InjectRepository(Usuario) private readonly users: Repository<Usuario>,
    @InjectRepository(Sesion) private readonly sessions: Repository<Sesion>,
    private readonly passwords: PasswordsService,
  ) {}

  findPrincipal(): Promise<Usuario | null> {
    return this.users.findOne({ where: { esPrincipal: true } });
  }

  async createPrincipal(data: PrincipalData): Promise<Usuario> {
    if (await this.findPrincipal()) throw new Error(PRINCIPAL_CONSOLE_MESSAGES.alreadyExists);

    const nombre = data.nombre.trim();
    const apellido = data.apellido.trim();
    const email = normalizeEmail(data.email);
    const problem =
      nameRule(nombre, {}) ??
      surnameRule(apellido, {}) ??
      emailRule(email, {}) ??
      this.passwords.findRuleViolation(data.contrasena);
    if (problem) throw new Error(problem);

    if (await this.users.findOne({ where: { email } })) {
      throw new Error(PRINCIPAL_CONSOLE_MESSAGES.emailTaken);
    }

    return this.users.save({
      rol: 'admin',
      esPrincipal: true,
      email,
      nombre,
      apellido,
      contrasenaHash: await this.passwords.hash(data.contrasena),
      // Quien instala elige su propia contraseña: no hace falta cambiarla al ingresar.
      debeCambiarContrasena: false,
      activo: true,
      creadoPorId: null,
    });
  }

  /** Para recuperar el acceso del principal, que nadie más puede restablecer (RF-31, RF-42). */
  async resetPrincipalPassword(temporaryPassword: string): Promise<void> {
    const principal = await this.findPrincipal();
    if (!principal) throw new Error(PRINCIPAL_CONSOLE_MESSAGES.notFound);

    const problem = this.passwords.findRuleViolation(temporaryPassword);
    if (problem) throw new Error(problem);

    await this.users.update(principal.id, {
      contrasenaHash: await this.passwords.hash(temporaryPassword),
      debeCambiarContrasena: true,
    });
    await this.sessions.update(
      { usuarioId: principal.id, revocadaEn: IsNull() },
      { revocadaEn: new Date() },
    );
  }
}
