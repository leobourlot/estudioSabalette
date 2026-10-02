import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { formatValidationErrors } from '../../configuracion/errores-de-validacion.js';
import { TemporaryPasswordDto } from './contrasena-temporal.dto.js';
import { CreateUserDto } from './crear-usuario.dto.js';
import { ListUsersQueryDto } from './listar-usuarios.dto.js';
import { UpdateUserDto } from './modificar-usuario.dto.js';

type DtoClass<T> = new () => T;

/** Transforma y valida igual que el ValidationPipe global (whitelist + forbidNonWhitelisted). */
async function check<T extends object>(dto: DtoClass<T>, plain: object) {
  const instance = plainToInstance(dto, plain);
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
  return { instance, messages: formatValidationErrors(errors) };
}

const lawyer = {
  rol: 'abogado',
  email: 'juan@estudio.com',
  nombre: 'Juan',
  apellido: 'Pérez',
  contrasenaTemporal: 'clave temporal 2026',
};

const naturalPersonClient = {
  ...lawyer,
  rol: 'cliente',
  email: 'ana@correo.com',
  cliente: { tipoPersona: 'fisica', dni: '30123456' },
};

const legalPersonClient = {
  ...lawyer,
  rol: 'cliente',
  email: 'contacto@empresa.com',
  cliente: { tipoPersona: 'juridica', cuit: '30712345671', razonSocial: 'Empresa S.A.' },
};

describe('CreateUserDto', () => {
  it.each([
    ['un abogado', lawyer],
    ['un administrador', { ...lawyer, rol: 'admin' }],
    ['un cliente persona física', naturalPersonClient],
    ['un cliente persona jurídica', legalPersonClient],
  ])('acepta %s', async (_case, plain) => {
    expect((await check(CreateUserDto, plain)).messages).toEqual([]);
  });

  it('normaliza el email y el DNI, y recorta los textos (RF-5)', async () => {
    const { instance, messages } = await check(CreateUserDto, {
      ...naturalPersonClient,
      email: '  Ana@Correo.COM ',
      nombre: '  Ana ',
      cliente: { tipoPersona: 'fisica', dni: '30.123.456', telefono: ' 341 555-1234 ' },
    });

    expect(messages).toEqual([]);
    expect(instance.email).toBe('ana@correo.com');
    expect(instance.nombre).toBe('Ana');
    expect(instance.cliente?.dni).toBe('30123456');
    expect(instance.cliente?.telefono).toBe('341 555-1234');
  });

  it('normaliza el CUIT con guiones', async () => {
    const { instance, messages } = await check(CreateUserDto, {
      ...legalPersonClient,
      cliente: { ...legalPersonClient.cliente, cuit: '30-71234567-1' },
    });

    expect(messages).toEqual([]);
    expect(instance.cliente?.cuit).toBe('30712345671');
  });

  it.each([
    ['falta el rol', { ...lawyer, rol: undefined }, 'El rol debe ser admin, abogado o cliente'],
    ['el rol no existe', { ...lawyer, rol: 'pasante' }, 'El rol debe ser admin, abogado o cliente'],
    ['falta el email', { ...lawyer, email: undefined }, 'El email es obligatorio'],
    [
      'el email es inválido',
      { ...lawyer, email: 'juan@estudio' },
      'El email debe tener el formato texto@texto.texto',
    ],
    ['falta el nombre', { ...lawyer, nombre: '   ' }, 'El nombre es obligatorio'],
    [
      'el apellido es largo',
      { ...lawyer, apellido: 'a'.repeat(56) },
      'El apellido no puede tener más de 55 caracteres',
    ],
    [
      'falta la contraseña temporal',
      { ...lawyer, contrasenaTemporal: undefined },
      'La contraseña temporal es obligatoria',
    ],
    [
      'un cliente no tiene datos de cliente',
      { ...lawyer, rol: 'cliente' },
      'Los datos del cliente son obligatorios para el rol cliente',
    ],
    [
      'un integrante tiene datos de cliente',
      { ...lawyer, cliente: { tipoPersona: 'fisica', dni: '30123456' } },
      'Solo las cuentas de clientes llevan datos de cliente',
    ],
  ])('rechaza el alta si %s', async (_case, plain, message) => {
    expect((await check(CreateUserDto, plain)).messages).toContain(message);
  });

  it.each([
    [
      'falta el tipo de persona',
      { dni: '30123456' },
      'El tipo de persona debe ser fisica o juridica',
    ],
    ['falta el DNI', { tipoPersona: 'fisica' }, 'El DNI es obligatorio para personas físicas'],
    [
      'el DNI es inválido',
      { tipoPersona: 'fisica', dni: '123456' },
      'El DNI debe tener 7 u 8 dígitos',
    ],
    [
      'tiene CUIT',
      { tipoPersona: 'fisica', dni: '30123456', cuit: '30712345671' },
      'El CUIT solo corresponde a personas jurídicas',
    ],
    [
      'tiene razón social',
      { tipoPersona: 'fisica', dni: '30123456', razonSocial: 'X' },
      'La razón social solo corresponde a personas jurídicas',
    ],
    [
      'el teléfono es largo',
      { tipoPersona: 'fisica', dni: '30123456', telefono: '1'.repeat(16) },
      'El teléfono no puede tener más de 15 caracteres',
    ],
    [
      'el domicilio es largo',
      { tipoPersona: 'fisica', dni: '30123456', domicilio: 'a'.repeat(56) },
      'El domicilio no puede tener más de 55 caracteres',
    ],
  ])('rechaza un cliente persona física si %s', async (_case, cliente, message) => {
    const { messages } = await check(CreateUserDto, { ...naturalPersonClient, cliente });
    expect(messages).toContain(message);
  });

  it.each([
    [
      'falta el CUIT',
      { tipoPersona: 'juridica', razonSocial: 'Empresa S.A.' },
      'El CUIT es obligatorio para personas jurídicas',
    ],
    [
      'el CUIT es inválido',
      { tipoPersona: 'juridica', cuit: '30712345672', razonSocial: 'Empresa S.A.' },
      'El CUIT debe tener 11 dígitos y un dígito verificador válido',
    ],
    [
      'falta la razón social',
      { tipoPersona: 'juridica', cuit: '30712345671' },
      'La razón social es obligatoria para personas jurídicas',
    ],
    [
      'tiene DNI',
      {
        tipoPersona: 'juridica',
        cuit: '30712345671',
        razonSocial: 'Empresa S.A.',
        dni: '30123456',
      },
      'El DNI solo corresponde a personas físicas',
    ],
  ])('rechaza un cliente persona jurídica si %s', async (_case, cliente, message) => {
    const { messages } = await check(CreateUserDto, { ...legalPersonClient, cliente });
    expect(messages).toContain(message);
  });

  it('rechaza campos desconocidos, también dentro de cliente', async () => {
    const { messages } = await check(CreateUserDto, {
      ...naturalPersonClient,
      activo: false,
      cliente: { ...naturalPersonClient.cliente, extra: 1 },
    });

    expect(messages).toContain('El campo activo no está permitido');
    expect(messages).toContain('El campo cliente.extra no está permitido');
  });
});

describe('UpdateUserDto', () => {
  it('acepta un cuerpo vacío o con cambios parciales', async () => {
    expect((await check(UpdateUserDto, {})).messages).toEqual([]);
    expect(
      (await check(UpdateUserDto, { nombre: 'Juana', cliente: { telefono: '3415551234' } }))
        .messages,
    ).toEqual([]);
  });

  it.each(['dni', 'cuit', 'tipoPersona'])('rechaza modificar %s (RF-7)', async (field) => {
    const { messages } = await check(UpdateUserDto, { cliente: { [field]: '30123456' } });

    expect(messages).toContain(`El campo cliente.${field} no está permitido`);
  });

  it('permite borrar el teléfono y el domicilio, pero no vaciar el nombre', async () => {
    expect(
      (await check(UpdateUserDto, { cliente: { telefono: null, domicilio: null } })).messages,
    ).toEqual([]);
    expect((await check(UpdateUserDto, { nombre: null })).messages).toContain(
      'El nombre es obligatorio',
    );
    expect((await check(UpdateUserDto, { cliente: { razonSocial: ' ' } })).messages).toContain(
      'La razón social es obligatoria para personas jurídicas',
    );
  });

  it('valida el formato del email y normaliza su valor', async () => {
    expect((await check(UpdateUserDto, { email: 'mal' })).messages).toContain(
      'El email debe tener el formato texto@texto.texto',
    );
    const { instance } = await check(UpdateUserDto, { email: ' Nuevo@Estudio.com' });
    expect(instance.email).toBe('nuevo@estudio.com');
  });

  it('valida el rol', async () => {
    expect((await check(UpdateUserDto, { rol: 'pasante' })).messages).toContain(
      'El rol debe ser admin, abogado o cliente',
    );
  });
});

describe('TemporaryPasswordDto', () => {
  it('exige la contraseña temporal', async () => {
    expect(
      (await check(TemporaryPasswordDto, { contrasenaTemporal: 'clave temporal 2026' })).messages,
    ).toEqual([]);
    expect((await check(TemporaryPasswordDto, {})).messages).toContain(
      'La contraseña temporal es obligatoria',
    );
  });
});

describe('ListUsersQueryDto', () => {
  it('convierte los parámetros de la consulta', async () => {
    const { instance, messages } = await check(ListUsersQueryDto, {
      pagina: '2',
      activo: 'false',
      rol: 'cliente',
      buscar: '30.123',
    });

    expect(messages).toEqual([]);
    expect(instance).toMatchObject({ pagina: 2, activo: false, rol: 'cliente', buscar: '30.123' });
  });

  it('acepta una consulta sin parámetros', async () => {
    expect((await check(ListUsersQueryDto, {})).messages).toEqual([]);
  });

  it.each([
    [{ pagina: '0' }, 'La página debe ser un número entero mayor o igual a 1'],
    [{ pagina: 'dos' }, 'La página debe ser un número entero mayor o igual a 1'],
    [{ activo: 'quizas' }, 'El filtro activo debe ser true o false'],
    [{ rol: 'pasante' }, 'El rol debe ser admin, abogado o cliente'],
    [{ buscar: 'a'.repeat(101) }, 'La búsqueda no puede tener más de 100 caracteres'],
  ])('rechaza %j', async (query, message) => {
    expect((await check(ListUsersQueryDto, query)).messages).toContain(message);
  });
});
