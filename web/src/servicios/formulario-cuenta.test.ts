import { describe, expect, it } from 'vitest';
import {
  buildCreateUserData,
  buildUpdateData,
  editFormFrom,
  EMPTY_ACCOUNT_FORM,
  type NewAccountForm,
  validateAccountEdit,
  validateNewAccount,
} from './formulario-cuenta';

const naturalPerson: NewAccountForm = {
  ...EMPTY_ACCOUNT_FORM,
  rol: 'cliente',
  tipoPersona: 'fisica',
  nombre: 'Ana',
  apellido: 'Gómez',
  email: 'ana@correo.com',
  dni: '30.123.456',
  telefono: '3415551234',
  contrasenaTemporal: 'clave temporal 2026',
};

const legalPerson: NewAccountForm = {
  ...naturalPerson,
  tipoPersona: 'juridica',
  dni: '',
  cuit: '30-71234567-1',
  razonSocial: 'Acme SRL',
  telefono: '',
  domicilio: 'San Martín 123',
};

const lawyer: NewAccountForm = {
  ...naturalPerson,
  rol: 'abogado',
  email: 'marcos@estudio.com',
  dni: '20.111.222',
};

describe('validateNewAccount (RF-6, RF-39)', () => {
  it.each([
    ['persona física', naturalPerson],
    ['persona jurídica', legalPerson],
    ['abogado', lawyer],
  ])('acepta un alta válida de %s', (_case, form) => {
    expect(validateNewAccount(form)).toEqual([]);
  });

  it('pide los datos obligatorios de una persona física, que no incluyen el email (RF-3)', () => {
    expect(
      validateNewAccount({ ...EMPTY_ACCOUNT_FORM, rol: 'cliente', tipoPersona: 'fisica' }),
    ).toEqual([
      'El nombre es obligatorio',
      'El apellido es obligatorio',
      'La contraseña temporal es obligatoria',
      'El DNI es obligatorio para personas físicas',
    ]);
  });

  it('pide CUIT y razón social a una persona jurídica', () => {
    expect(validateNewAccount({ ...legalPerson, cuit: '', razonSocial: ' ' })).toEqual([
      'El CUIT es obligatorio para personas jurídicas',
      'La razón social es obligatoria para personas jurídicas',
    ]);
  });

  it.each([
    [{ email: 'ana@correo' }, 'El email debe tener el formato texto@texto.texto'],
    [{ nombre: 'a'.repeat(56) }, 'El nombre no puede tener más de 55 caracteres'],
    [{ contrasenaTemporal: 'corta' }, 'La contraseña debe tener al menos 8 caracteres'],
    [{ dni: '123456' }, 'El DNI debe tener 7 u 8 dígitos'],
    [{ telefono: '1'.repeat(16) }, 'El teléfono no puede tener más de 15 caracteres'],
    [{ domicilio: 'a'.repeat(56) }, 'El domicilio no puede tener más de 55 caracteres'],
  ])('rechaza %j', (change, message) => {
    expect(validateNewAccount({ ...naturalPerson, ...change })).toEqual([message]);
  });

  it('valida el dígito verificador del CUIT', () => {
    expect(validateNewAccount({ ...legalPerson, cuit: '30712345672' })).toEqual([
      'El CUIT debe tener 11 dígitos y un dígito verificador válido',
    ]);
  });

  it('a un integrante le pide DNI y email, y no datos de cliente (RF-2)', () => {
    expect(validateNewAccount({ ...lawyer, cuit: '', razonSocial: '' })).toEqual([]);
    expect(validateNewAccount({ ...lawyer, email: ' ', dni: '' })).toEqual([
      'El email es obligatorio',
      'El DNI es obligatorio',
    ]);
    expect(validateNewAccount({ ...lawyer, dni: '123' })).toEqual([
      'El DNI debe tener 7 u 8 dígitos',
    ]);
  });
});

describe('buildCreateUserData', () => {
  it('arma el alta de una persona física, sin campos vacíos', () => {
    expect(buildCreateUserData(naturalPerson)).toEqual({
      rol: 'cliente',
      email: 'ana@correo.com',
      nombre: 'Ana',
      apellido: 'Gómez',
      contrasenaTemporal: 'clave temporal 2026',
      cliente: { tipoPersona: 'fisica', dni: '30.123.456', telefono: '3415551234' },
    });
  });

  it('arma el alta de un cliente sin email, sin el campo', () => {
    expect(buildCreateUserData({ ...naturalPerson, email: ' ' })).not.toHaveProperty('email');
  });

  it('arma el alta de una persona jurídica', () => {
    expect(buildCreateUserData(legalPerson).cliente).toEqual({
      tipoPersona: 'juridica',
      cuit: '30-71234567-1',
      razonSocial: 'Acme SRL',
      domicilio: 'San Martín 123',
    });
  });

  it('arma el alta de un integrante con su DNI, sin datos de cliente aunque se hayan escrito', () => {
    expect(buildCreateUserData(lawyer)).toEqual({
      rol: 'abogado',
      email: 'marcos@estudio.com',
      dni: '20.111.222',
      nombre: 'Ana',
      apellido: 'Gómez',
      contrasenaTemporal: 'clave temporal 2026',
    });
  });
});

describe('edición de una cuenta (RF-27, RF-28)', () => {
  const account = {
    id: 7,
    rol: 'cliente' as const,
    esPrincipal: false,
    email: 'ana@correo.com',
    dni: null,
    nombre: 'Ana',
    apellido: 'Gómez',
    debeCambiarContrasena: false,
    activo: true,
    ultimoIngreso: null,
    creadoEn: '2026-09-01T15:00:00.000Z',
    modificadoEn: null,
    creadoPor: null,
    modificadoPor: null,
    cliente: {
      tipoPersona: 'juridica' as const,
      dni: null,
      cuit: '30712345671',
      razonSocial: 'Acme SRL',
      telefono: '3415551234',
      domicilio: null,
    },
  };

  it('arma el formulario con los valores actuales', () => {
    expect(editFormFrom(account)).toEqual({
      nombre: 'Ana',
      apellido: 'Gómez',
      email: 'ana@correo.com',
      dni: '',
      rol: 'cliente',
      razonSocial: 'Acme SRL',
      telefono: '3415551234',
      domicilio: '',
    });
  });

  it('sin cambios, no envía nada', () => {
    expect(buildUpdateData(editFormFrom(account), account)).toEqual({});
  });

  it('envía solo los campos que cambiaron', () => {
    const form = { ...editFormFrom(account), nombre: 'Ana María', domicilio: 'Córdoba 456' };

    expect(buildUpdateData(form, account)).toEqual({
      nombre: 'Ana María',
      cliente: { domicilio: 'Córdoba 456' },
    });
  });

  it('un teléfono borrado se envía como null', () => {
    expect(buildUpdateData({ ...editFormFrom(account), telefono: ' ' }, account)).toEqual({
      cliente: { telefono: null },
    });
  });

  it('el email borrado de un cliente se envía como null (RF-3)', () => {
    expect(buildUpdateData({ ...editFormFrom(account), email: ' ' }, account)).toEqual({
      email: null,
    });
    expect(validateAccountEdit({ ...editFormFrom(account), email: '' }, account)).toEqual([]);
  });

  it('el mismo email escrito distinto no es un cambio', () => {
    expect(
      buildUpdateData({ ...editFormFrom(account), email: ' ANA@correo.com' }, account),
    ).toEqual({});
  });

  it('valida los datos con los mensajes de la API', () => {
    expect(
      validateAccountEdit(
        { ...editFormFrom(account), nombre: ' ', email: 'mal', razonSocial: '' },
        account,
      ),
    ).toEqual([
      'El email debe tener el formato texto@texto.texto',
      'El nombre es obligatorio',
      'La razón social es obligatoria para personas jurídicas',
    ]);
  });

  describe('de un integrante', () => {
    const staff = { ...account, rol: 'abogado' as const, dni: '20111222', cliente: null };

    it('envía el DNI solo si cambió, sin contar puntos ni espacios', () => {
      expect(buildUpdateData({ ...editFormFrom(staff), dni: '20.111.222' }, staff)).toEqual({});
      expect(buildUpdateData({ ...editFormFrom(staff), dni: '27333444' }, staff)).toEqual({
        dni: '27333444',
      });
    });

    it('exige el email y el DNI', () => {
      expect(validateAccountEdit({ ...editFormFrom(staff), email: '', dni: '' }, staff)).toEqual([
        'El email es obligatorio',
        'El DNI es obligatorio',
      ]);
    });

    it('a un integrante sin DNI cargado lo deja guardar sin DNI hasta que se lo asignen', () => {
      const withoutDni = { ...staff, dni: null };

      expect(validateAccountEdit(editFormFrom(withoutDni), withoutDni)).toEqual([]);
      expect(validateAccountEdit({ ...editFormFrom(withoutDni), dni: '123' }, withoutDni)).toEqual([
        'El DNI debe tener 7 u 8 dígitos',
      ]);
    });
  });
});
