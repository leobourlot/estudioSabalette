import { describe, expect, it } from 'vitest';
import type { Causa } from '../causas/causa.entity.js';
import type { Parte } from '../causas/parte.entity.js';
import type { MovimientoCliente } from '../movimientos/movimiento-detalle.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import {
  toCausaPortalDetalle,
  toCausaPortalResumen,
  toMovimientoClienteDetalle,
} from './portal-detalle.js';

const CLIENTE_ID = 50;

const lawyer = (activo = true) =>
  ({
    id: 3,
    rol: 'abogado',
    nombre: 'Luis',
    apellido: 'Sosa',
    email: 'luis@estudio.com',
    contrasenaHash: '$2b$12$hash',
    activo,
  }) as unknown as Usuario;

const clientParty = (id: number, clienteId: number, vigente = true): Parte =>
  ({
    id,
    causaId: 9,
    rol: 'actor',
    clienteId,
    tipoPersona: null,
    nombre: null,
    apellido: null,
    razonSocial: null,
    dni: null,
    cuit: null,
    vigente,
    cliente: {
      usuarioId: clienteId,
      tipoPersona: 'fisica',
      dni: '30111222',
      cuit: null,
      razonSocial: null,
      telefono: '1144445555',
      domicilio: 'Calle Falsa 123',
      usuario: {
        id: clienteId,
        nombre: 'Ana',
        apellido: 'Gómez',
        email: 'ana@correo.com',
        contrasenaHash: '$2b$12$otro',
        activo: true,
      },
    },
  }) as unknown as Parte;

const nonClientParty = (id: number, data: Partial<Parte>, vigente = true): Parte =>
  ({
    id,
    causaId: 9,
    rol: 'demandado',
    clienteId: null,
    tipoPersona: 'fisica',
    nombre: 'Pedro',
    apellido: 'López',
    razonSocial: null,
    dni: '20999888',
    cuit: null,
    vigente,
    cliente: null,
    ...data,
  }) as unknown as Parte;

function causa(overrides: Partial<Causa> = {}): Causa {
  return {
    id: 9,
    caratula: 'Gómez c/ López s/ daños',
    numeroExpediente: '1234/2024',
    numeroExpedienteBusqueda: '12342024',
    juzgado: 'Juzgado Civil Nº 3',
    fuero: 'civil',
    estado: 'en_tramite',
    esIncidente: false,
    expedientePrincipal: null,
    activa: true,
    claveExpediente: 'civil|Juzgado Civil Nº 3|1234/2024',
    responsableId: 3,
    responsable: lawyer(),
    colaboradores: [{ causaId: 9, usuarioId: 4, usuario: { ...lawyer(), id: 4 } }],
    partes: [
      nonClientParty(11, { nombre: 'Pedro', apellido: 'López' }),
      clientParty(10, CLIENTE_ID),
      nonClientParty(12, { nombre: 'Quique', apellido: 'Desvinculado' }, false),
    ],
    creadoPorId: 3,
    creadoPor: lawyer(),
    creadoEn: new Date('2026-01-01T10:00:00Z'),
    modificadoPorId: 3,
    modificadoPor: lawyer(),
    modificadoEn: new Date('2026-02-01T10:00:00Z'),
    desactivadaPorId: null,
    desactivadaPor: null,
    desactivadaEn: null,
    reactivadaPorId: null,
    reactivadaPor: null,
    reactivadaEn: null,
    ...overrides,
  } as unknown as Causa;
}

/** Todas las claves de un objeto, también las anidadas. */
function allKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(allKeys);
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => [key, ...allKeys(child)]);
}

const FORBIDDEN_KEYS = [
  'dni',
  'cuit',
  'tipoPersona',
  'clienteId',
  'email',
  'contrasenaHash',
  'colaboradores',
  'activa',
  'activo',
  'vigente',
  'creadoPor',
  'creadoEn',
  'modificadoPor',
  'modificadoEn',
  'desactivadaPor',
  'reactivadaPor',
  'responsableId',
  'claveExpediente',
  'numeroExpedienteBusqueda',
  'telefono',
  'domicilio',
];

describe('toCausaPortalResumen (RF-9, RF-30)', () => {
  it('tiene exactamente id, carátula, número, estado, grupo y fecha del último movimiento', () => {
    expect(toCausaPortalResumen(causa({ estado: 'paralizada' }), '2026-09-30')).toEqual({
      id: 9,
      caratula: 'Gómez c/ López s/ daños',
      numeroExpediente: '1234/2024',
      estado: 'paralizada',
      grupo: 'en_curso',
      fechaUltimoMovimiento: '2026-09-30',
    });
  });

  it('una causa archivada va en su grupo, y sin movimientos lleva fecha null', () => {
    expect(toCausaPortalResumen(causa({ estado: 'archivada' }), null)).toMatchObject({
      grupo: 'archivadas_y_finalizadas',
      fechaUltimoMovimiento: null,
    });
  });
});

describe('toCausaPortalDetalle (RF-13 a RF-17, RF-30)', () => {
  it('tiene exactamente los datos de la causa, las partes y el responsable', () => {
    const detail = toCausaPortalDetalle(causa(), CLIENTE_ID);

    expect(Object.keys(detail).sort()).toEqual([
      'caratula',
      'esIncidente',
      'estado',
      'expedientePrincipal',
      'fuero',
      'id',
      'juzgado',
      'numeroExpediente',
      'partes',
      'responsable',
    ]);
    expect(detail).toMatchObject({
      id: 9,
      caratula: 'Gómez c/ López s/ daños',
      numeroExpediente: '1234/2024',
      juzgado: 'Juzgado Civil Nº 3',
      fuero: 'civil',
      estado: 'en_tramite',
      esIncidente: false,
      expedientePrincipal: null,
      responsable: { nombre: 'Luis', apellido: 'Sosa' },
    });
  });

  it('muestra solo las partes vigentes, ordenadas y con "Vos" en la del cliente', () => {
    expect(toCausaPortalDetalle(causa(), CLIENTE_ID).partes).toEqual([
      { nombre: 'Ana Gómez', rol: 'actor', esVos: true },
      { nombre: 'Pedro López', rol: 'demandado', esVos: false },
    ]);
  });

  it('cada parte tiene solo nombre, rol y esVos', () => {
    for (const parte of toCausaPortalDetalle(causa(), CLIENTE_ID).partes) {
      expect(Object.keys(parte).sort()).toEqual(['esVos', 'nombre', 'rol']);
    }
  });

  it('con el responsable desactivado, no muestra ningún abogado (RF-16)', () => {
    expect(
      toCausaPortalDetalle(causa({ responsable: lawyer(false) }), CLIENTE_ID).responsable,
    ).toBeNull();
  });

  it('de un incidente, envía el número del expediente principal', () => {
    expect(
      toCausaPortalDetalle(
        causa({ esIncidente: true, expedientePrincipal: '999/2023' }),
        CLIENTE_ID,
      ),
    ).toMatchObject({ esIncidente: true, expedientePrincipal: '999/2023' });
  });

  it('nunca incluye documentos, tipo de persona, ids de partes o integrantes, emails, colaboradores, auditoría ni estado de cuentas', () => {
    const detail = toCausaPortalDetalle(causa(), CLIENTE_ID);
    const keys = allKeys(detail);
    const json = JSON.stringify(detail);

    for (const key of FORBIDDEN_KEYS) expect(keys).not.toContain(key);
    for (const text of ['30111222', '20999888', '@', 'Desvinculado', 'Calle Falsa', '$2b$']) {
      expect(json).not.toContain(text);
    }
    // El único id es el de la causa.
    expect(keys.filter((key) => key === 'id')).toHaveLength(1);
  });
});

describe('toMovimientoClienteDetalle (RF-22)', () => {
  it('suma solo el id y la carátula de la causa al movimiento', () => {
    const movimiento: MovimientoCliente = {
      id: 70,
      fecha: '2026-09-30',
      tipo: 'audiencia',
      texto: 'Audiencia fijada.',
      anulado: false,
      esFechaFutura: false,
    };

    expect(toMovimientoClienteDetalle(movimiento, causa())).toEqual({
      ...movimiento,
      causa: { id: 9, caratula: 'Gómez c/ López s/ daños' },
    });
  });
});
