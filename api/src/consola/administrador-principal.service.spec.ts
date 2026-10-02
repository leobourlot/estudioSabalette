import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PasswordsService } from '../autenticacion/contrasenas.service.js';
import type { Sesion } from '../usuarios/sesion.entity.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import {
  PRINCIPAL_CONSOLE_MESSAGES,
  PrincipalAdminService,
} from './administrador-principal.service.js';

const validData = {
  nombre: 'Carla',
  apellido: 'Sabalette',
  email: '  Carla@Estudio.com ',
  contrasena: 'clave del estudio 2026',
};

describe('PrincipalAdminService (RF-41, RF-42)', () => {
  let users: {
    findOne: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let sessions: { update: ReturnType<typeof vi.fn> };
  let passwords: PasswordsService;
  let service: PrincipalAdminService;

  /** Simula la base: qué devuelve buscar el principal y buscar por email. */
  function givenDatabase(state: { principal?: Partial<Usuario>; emailOwner?: Partial<Usuario> }) {
    users.findOne.mockImplementation(async (options: { where: Record<string, unknown> }) => {
      if (options.where.esPrincipal) return state.principal ?? null;
      if (options.where.email) return state.emailOwner ?? null;
      return null;
    });
  }

  beforeEach(() => {
    users = {
      findOne: vi.fn(),
      save: vi.fn(async (data: Partial<Usuario>) => ({ ...data, id: 1 })),
      update: vi.fn().mockResolvedValue(undefined),
    };
    sessions = { update: vi.fn().mockResolvedValue(undefined) };
    passwords = new PasswordsService();
    vi.spyOn(passwords, 'hash').mockResolvedValue('$2b$12$hash-de-prueba');
    service = new PrincipalAdminService(
      users as unknown as Repository<Usuario>,
      sessions as unknown as Repository<Sesion>,
      passwords,
    );
    givenDatabase({});
  });

  describe('createPrincipal', () => {
    it('crea el administrador principal si no existe', async () => {
      await service.createPrincipal(validData);

      expect(users.save).toHaveBeenCalledWith({
        rol: 'admin',
        esPrincipal: true,
        email: 'carla@estudio.com',
        nombre: 'Carla',
        apellido: 'Sabalette',
        contrasenaHash: '$2b$12$hash-de-prueba',
        debeCambiarContrasena: false,
        activo: true,
        creadoPorId: null,
      });
      expect(passwords.hash).toHaveBeenCalledWith('clave del estudio 2026');
    });

    it('si ya existe un principal, no crea nada (nunca crea otro administrador)', async () => {
      givenDatabase({ principal: { id: 1 } });

      await expect(service.createPrincipal(validData)).rejects.toThrow(
        PRINCIPAL_CONSOLE_MESSAGES.alreadyExists,
      );
      expect(users.save).not.toHaveBeenCalled();
    });

    it('rechaza un email que ya usa otra cuenta', async () => {
      givenDatabase({ emailOwner: { id: 9 } });

      await expect(service.createPrincipal(validData)).rejects.toThrow(
        'Ya existe una cuenta con ese email',
      );
      expect(users.save).not.toHaveBeenCalled();
    });

    it.each([
      [{ nombre: ' ' }, 'El nombre es obligatorio'],
      [{ apellido: 'a'.repeat(56) }, 'El apellido no puede tener más de 55 caracteres'],
      [{ email: 'carla@estudio' }, 'El email debe tener el formato texto@texto.texto'],
      [{ contrasena: 'corta' }, 'La contraseña debe tener al menos 10 caracteres'],
      [{ contrasena: 'contraseña segura' }, 'La contraseña no puede tener tildes, ñ ni emojis'],
    ])('rechaza datos inválidos: %j', async (change, message) => {
      await expect(service.createPrincipal({ ...validData, ...change })).rejects.toThrow(message);
      expect(users.save).not.toHaveBeenCalled();
    });
  });

  describe('resetPrincipalPassword', () => {
    it('restablece solo la contraseña del principal, deja el cambio pendiente y cierra su sesión', async () => {
      givenDatabase({ principal: { id: 4 } });

      await service.resetPrincipalPassword('clave temporal 2026');

      expect(users.update).toHaveBeenCalledWith(4, {
        contrasenaHash: '$2b$12$hash-de-prueba',
        debeCambiarContrasena: true,
      });
      expect(sessions.update).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: 4 }),
        expect.objectContaining({ revocadaEn: expect.any(Date) }),
      );
      expect(users.save).not.toHaveBeenCalled();
    });

    it('si no hay principal, no hace nada', async () => {
      await expect(service.resetPrincipalPassword('clave temporal 2026')).rejects.toThrow(
        PRINCIPAL_CONSOLE_MESSAGES.notFound,
      );
      expect(users.update).not.toHaveBeenCalled();
    });

    it('aplica las reglas de RF-39', async () => {
      givenDatabase({ principal: { id: 4 } });

      await expect(service.resetPrincipalPassword('corta')).rejects.toThrow(
        'La contraseña debe tener al menos 10 caracteres',
      );
      expect(users.update).not.toHaveBeenCalled();
    });
  });

  it('informa si existe un principal', async () => {
    expect(await service.findPrincipal()).toBeNull();

    givenDatabase({ principal: { id: 4, email: 'carla@estudio.com' } });
    expect(await service.findPrincipal()).toMatchObject({ id: 4 });
  });
});
