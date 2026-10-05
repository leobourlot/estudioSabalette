import { describe, expect, it } from 'vitest';
import type { Cliente } from '../usuarios/cliente.entity.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import {
  toCausaDetalle,
  toCausaReferencia,
  toCausaResumen,
  toIntegranteResumen,
  toParteDetalle,
} from './causa-detalle.js';
import type { Causa } from './causa.entity.js';
import type { Colaborador } from './colaborador.entity.js';
import type { Parte } from './parte.entity.js';

const CREATED = new Date('2026-10-01T10:00:00-03:00');
const MODIFIED = new Date('2026-10-02T11:30:00-03:00');

/** Usuario completo, con los datos que nunca deben salir en una respuesta de causas. */
function user(id: number, overrides: Partial<Usuario> = {}): Usuario {
  return {
    id,
    rol: 'abogado',
    esPrincipal: false,
    email: `usuario${id}@estudio.com`,
    nombre: `Nombre${id}`,
    apellido: `Apellido${id}`,
    contrasenaHash: '$2b$12$hash-secreto',
    debeCambiarContrasena: false,
    activo: true,
    ultimoIngreso: null,
    creadoPorId: null,
    creadoPor: null,
    creadoEn: CREATED,
    modificadoPorId: null,
    modificadoPor: null,
    modificadoEn: null,
    cliente: null,
    ...overrides,
  };
}

function client(usuario: Usuario, overrides: Partial<Cliente> = {}): Cliente {
  return {
    usuarioId: usuario.id,
    usuario,
    tipoPersona: 'fisica',
    dni: '30123456',
    cuit: null,
    razonSocial: null,
    telefono: '341 555-1234',
    domicilio: 'Calle Falsa 123',
    ...overrides,
  };
}

function party(id: number, overrides: Partial<Parte> = {}): Parte {
  return {
    id,
    causaId: 1,
    causa: undefined as unknown as Causa,
    rol: 'actor',
    clienteId: null,
    cliente: null,
    tipoPersona: 'fisica',
    nombre: 'Juan',
    apellido: 'Pérez',
    razonSocial: null,
    dni: null,
    cuit: null,
    vigente: true,
    creadoPorId: 1,
    creadoPor: user(1),
    creadoEn: CREATED,
    modificadoPorId: null,
    modificadoPor: null,
    modificadoEn: null,
    ...overrides,
  };
}

const clientUser = user(7, {
  rol: 'cliente',
  nombre: 'Ana',
  apellido: 'Gómez',
  email: 'ana@correo.com',
});
const clientParty = party(2, {
  rol: 'demandado',
  clienteId: 7,
  cliente: client(clientUser),
  tipoPersona: null,
  nombre: null,
  apellido: null,
});

const companyUser = user(8, {
  rol: 'cliente',
  nombre: 'Laura',
  apellido: 'Contacto',
  activo: false,
});
const companyParty = party(3, {
  clienteId: 8,
  cliente: client(companyUser, {
    tipoPersona: 'juridica',
    dni: null,
    cuit: '30712345671',
    razonSocial: 'Gómez S.A.',
  }),
  tipoPersona: null,
  nombre: null,
  apellido: null,
});

function causa(overrides: Partial<Causa> = {}): Causa {
  const responsable = user(1, { rol: 'admin', nombre: 'Marta', apellido: 'Sabalette' });
  return {
    id: 10,
    caratula: 'Pérez c/ Gómez s/ daños',
    numeroExpediente: '1234/2024',
    numeroExpedienteBusqueda: '12342024',
    juzgado: 'Juzgado Civil N° 3',
    fuero: 'civil',
    estado: 'en_tramite',
    esIncidente: false,
    expedientePrincipal: null,
    activa: true,
    claveExpediente: 'civil|Juzgado Civil N° 3|1234/2024',
    responsableId: 1,
    responsable,
    colaboradores: [
      { causaId: 10, usuarioId: 5, usuario: user(5, { apellido: 'Zapata' }) } as Colaborador,
      {
        causaId: 10,
        usuarioId: 4,
        usuario: user(4, { apellido: 'Alvarez', activo: false }),
      } as Colaborador,
    ],
    partes: [companyParty, party(1), party(9, { vigente: false }), clientParty],
    creadoPorId: 1,
    creadoPor: responsable,
    creadoEn: CREATED,
    modificadoPorId: 5,
    modificadoPor: user(5),
    modificadoEn: MODIFIED,
    desactivadaPorId: null,
    desactivadaPor: null,
    desactivadaEn: null,
    reactivadaPorId: null,
    reactivadaPor: null,
    reactivadaEn: null,
    ...overrides,
  };
}

describe('toIntegranteResumen', () => {
  it('devuelve solo id, nombre, apellido, rol y si está activo', () => {
    expect(toIntegranteResumen(user(4, { activo: false }))).toEqual({
      id: 4,
      nombre: 'Nombre4',
      apellido: 'Apellido4',
      rol: 'abogado',
      activo: false,
    });
  });
});

describe('toParteDetalle (RF-12, RF-14)', () => {
  it('una parte no cliente muestra sus datos propios', () => {
    expect(toParteDetalle(party(1, { dni: '20111222' }))).toEqual({
      id: 1,
      rol: 'actor',
      esCliente: false,
      clienteId: null,
      clienteActivo: null,
      tipoPersona: 'fisica',
      nombre: 'Juan',
      apellido: 'Pérez',
      razonSocial: null,
      dni: '20111222',
      cuit: null,
    });
  });

  it('una parte cliente persona física toma nombre, apellido y DNI de la cuenta', () => {
    expect(toParteDetalle(clientParty)).toEqual({
      id: 2,
      rol: 'demandado',
      esCliente: true,
      clienteId: 7,
      clienteActivo: true,
      tipoPersona: 'fisica',
      nombre: 'Ana',
      apellido: 'Gómez',
      razonSocial: null,
      dni: '30123456',
      cuit: null,
    });
  });

  it('una parte cliente persona jurídica toma la razón social y no el contacto', () => {
    expect(toParteDetalle(companyParty)).toMatchObject({
      esCliente: true,
      clienteActivo: false,
      tipoPersona: 'juridica',
      nombre: null,
      apellido: null,
      razonSocial: 'Gómez S.A.',
      cuit: '30712345671',
    });
  });
});

describe('toCausaResumen (RF-36)', () => {
  it('devuelve los datos del listado con el responsable', () => {
    expect(toCausaResumen(causa())).toEqual({
      id: 10,
      caratula: 'Pérez c/ Gómez s/ daños',
      numeroExpediente: '1234/2024',
      juzgado: 'Juzgado Civil N° 3',
      fuero: 'civil',
      estado: 'en_tramite',
      esIncidente: false,
      expedientePrincipal: null,
      activa: true,
      responsable: { id: 1, nombre: 'Marta', apellido: 'Sabalette', rol: 'admin', activo: true },
      creadoEn: CREATED,
      modificadoEn: MODIFIED,
    });
  });

  it('no expone las columnas internas de búsqueda ni de duplicados', () => {
    const resumen = toCausaResumen(causa());

    expect(resumen).not.toHaveProperty('claveExpediente');
    expect(resumen).not.toHaveProperty('numeroExpedienteBusqueda');
  });
});

describe('toCausaDetalle (RF-12)', () => {
  const detalle = toCausaDetalle(causa());

  it('separa las partes vigentes de las desvinculadas, por orden de alta', () => {
    expect(detalle.partes.map((parte) => parte.id)).toEqual([1, 2, 3]);
    expect(detalle.partesDesvinculadas.map((parte) => parte.id)).toEqual([9]);
  });

  it('ordena los colaboradores por apellido y muestra si están desactivados', () => {
    expect(detalle.colaboradores).toEqual([
      { id: 4, nombre: 'Nombre4', apellido: 'Alvarez', rol: 'abogado', activo: false },
      { id: 5, nombre: 'Nombre5', apellido: 'Zapata', rol: 'abogado', activo: true },
    ]);
  });

  it('incluye la auditoría con autores resumidos (RF-2)', () => {
    expect(detalle).toMatchObject({
      creadoPor: { id: 1, nombre: 'Marta', apellido: 'Sabalette' },
      creadoEn: CREATED,
      modificadoPor: { id: 5, nombre: 'Nombre5', apellido: 'Apellido5' },
      modificadoEn: MODIFIED,
      desactivadaPor: null,
      desactivadaEn: null,
      reactivadaPor: null,
      reactivadaEn: null,
    });
  });

  it('nunca incluye emails, hashes ni datos de contacto de las cuentas', () => {
    const json = JSON.stringify(detalle);

    expect(json).not.toContain('@');
    expect(json).not.toContain('hash');
    expect(json).not.toContain('Contrasena');
    expect(json).not.toContain('Calle Falsa');
    expect(json).not.toContain('555-1234');
    expect(json).not.toContain('Laura');
  });
});

describe('toCausaReferencia (RF-20)', () => {
  it('devuelve solo id, carátula y número', () => {
    expect(toCausaReferencia(causa())).toEqual({
      id: 10,
      caratula: 'Pérez c/ Gómez s/ daños',
      numeroExpediente: '1234/2024',
    });
  });
});
