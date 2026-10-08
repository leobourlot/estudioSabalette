import { describe, expect, it } from 'vitest';
import type { Usuario } from '../usuarios/usuario.entity.js';
import type { CambioMovimiento } from './cambio-movimiento.entity.js';
import {
  toMovimientoCliente,
  toMovimientoDetalle,
  toMovimientoResumen,
} from './movimiento-detalle.js';
import type { Movimiento } from './movimiento.entity.js';

const NOW = new Date('2026-10-06T15:00:00Z');

const user = (id: number, activo = true) =>
  ({
    id,
    nombre: `Nombre${id}`,
    apellido: `Apellido${id}`,
    rol: 'abogado',
    activo,
    email: `usuario${id}@estudio.com`,
    contrasenaHash: '$2b$10$hash',
  }) as unknown as Usuario;

function movement(overrides: Partial<Movimiento> = {}): Movimiento {
  return {
    id: 7,
    causaId: 3,
    fecha: '2026-10-06',
    tipo: 'providencia',
    descripcion: 'Descripción técnica interna.',
    textoCliente: null,
    visible: true,
    anulado: false,
    creadoPorId: 1,
    creadoPor: user(1),
    creadoEn: new Date('2026-10-01T12:00:00Z'),
    modificadoPorId: 2,
    modificadoPor: user(2, false),
    modificadoEn: new Date('2026-10-02T12:00:00Z'),
    cambios: [],
    ...overrides,
  } as Movimiento;
}

const change = (id: number, usuario: Usuario) =>
  ({
    id,
    movimientoId: 7,
    accion: id === 1 ? 'carga' : 'modificacion',
    usuarioId: usuario.id,
    usuario,
    fechaHora: new Date(`2026-10-0${id}T12:00:00Z`),
    cambios: [{ campo: 'visible', anterior: false, nuevo: true }],
  }) as unknown as CambioMovimiento;

const leaksAccountData = (value: unknown) =>
  /email|contrasena|@estudio\.com|\$2b\$/.test(JSON.stringify(value));

describe('toMovimientoCliente (RF-31; spec 004, RF-21)', () => {
  it('tiene solo id, fecha, tipo, texto, anulado y la marca de fecha futura', () => {
    expect(toMovimientoCliente(movement(), NOW)).toEqual({
      id: 7,
      fecha: '2026-10-06',
      tipo: 'providencia',
      texto: 'Descripción técnica interna.',
      anulado: false,
      esFechaFutura: false,
    });
  });

  it('con texto para el cliente, usa ese texto y nunca incluye la descripción', () => {
    const cliente = toMovimientoCliente(
      movement({ textoCliente: 'El juez fijó audiencia.', anulado: true }),
      NOW,
    );

    expect(cliente).toEqual({
      id: 7,
      fecha: '2026-10-06',
      tipo: 'providencia',
      texto: 'El juez fijó audiencia.',
      anulado: true,
      esFechaFutura: false,
    });
    expect(JSON.stringify(cliente)).not.toContain('Descripción técnica');
  });

  it('no incluye autores, fechas de registro ni cambios', () => {
    const cliente = toMovimientoCliente(movement({ cambios: [change(1, user(1))] }), NOW);
    expect(Object.keys(cliente).sort()).toEqual([
      'anulado',
      'esFechaFutura',
      'fecha',
      'id',
      'texto',
      'tipo',
    ]);
  });

  it('marca la fecha futura en un movimiento posterior al día actual en Buenos Aires', () => {
    expect(toMovimientoCliente(movement({ fecha: '2026-10-07' }), NOW).esFechaFutura).toBe(true);
  });

  it('no marca la fecha futura en un movimiento del día actual', () => {
    expect(toMovimientoCliente(movement({ fecha: '2026-10-06' }), NOW).esFechaFutura).toBe(false);
  });

  it('un movimiento anulado nunca lleva la marca de fecha futura (spec 004, RF-21)', () => {
    expect(
      toMovimientoCliente(movement({ fecha: '2026-10-07', anulado: true }), NOW).esFechaFutura,
    ).toBe(false);
  });
});

describe('toMovimientoResumen (RF-24, RF-36)', () => {
  it('arma la fila del historial con el autor y la marca de fecha futura', () => {
    expect(toMovimientoResumen(movement({ fecha: '2026-10-07' }), NOW)).toEqual({
      id: 7,
      fecha: '2026-10-07',
      tipo: 'providencia',
      descripcion: 'Descripción técnica interna.',
      visible: true,
      tieneTextoCliente: false,
      anulado: false,
      esFechaFutura: true,
      creadoPor: { id: 1, nombre: 'Nombre1', apellido: 'Apellido1', activo: true },
      creadoEn: new Date('2026-10-01T12:00:00Z'),
    });
  });

  it('indica si tiene texto para el cliente y si la fecha es de hoy no es futura', () => {
    const resumen = toMovimientoResumen(movement({ textoCliente: 'Texto.' }), NOW);
    expect(resumen.tieneTextoCliente).toBe(true);
    expect(resumen.esFechaFutura).toBe(false);
  });

  it('marca al autor desactivado y no incluye datos de la cuenta', () => {
    const resumen = toMovimientoResumen(movement({ creadoPor: user(1, false) }), NOW);
    expect(resumen.creadoPor.activo).toBe(false);
    expect(leaksAccountData(resumen)).toBe(false);
  });
});

describe('toMovimientoDetalle (RF-22, RF-36)', () => {
  it('trae el texto visible con su origen, la auditoría y los cambios del más reciente al más antiguo', () => {
    const detalle = toMovimientoDetalle(
      movement({
        textoCliente: 'El juez fijó audiencia.',
        cambios: [change(1, user(1)), change(3, user(2, false)), change(2, user(1))],
      }),
      true,
      NOW,
    );

    expect(detalle).toMatchObject({
      causaId: 3,
      causaActiva: true,
      textoCliente: 'El juez fijó audiencia.',
      textoVisible: 'El juez fijó audiencia.',
      origenTextoVisible: 'textoCliente',
      modificadoPor: { id: 2, activo: false },
      modificadoEn: new Date('2026-10-02T12:00:00Z'),
    });
    expect(detalle.cambios.map((cambio) => cambio.id)).toEqual([3, 2, 1]);
    expect(detalle.cambios[0]).toEqual({
      id: 3,
      accion: 'modificacion',
      usuario: { id: 2, nombre: 'Nombre2', apellido: 'Apellido2', activo: false },
      fechaHora: new Date('2026-10-03T12:00:00Z'),
      cambios: [{ campo: 'visible', anterior: false, nuevo: true }],
    });
  });

  it('sin texto para el cliente, el texto visible es la descripción', () => {
    const detalle = toMovimientoDetalle(movement(), false, NOW);
    expect(detalle).toMatchObject({
      causaActiva: false,
      textoCliente: null,
      textoVisible: 'Descripción técnica interna.',
      origenTextoVisible: 'descripcion',
    });
  });

  it('un movimiento nunca modificado tiene modificadoPor en null', () => {
    const detalle = toMovimientoDetalle(
      movement({ modificadoPor: null, modificadoPorId: null, modificadoEn: null }),
      true,
      NOW,
    );
    expect(detalle.modificadoPor).toBeNull();
    expect(detalle.modificadoEn).toBeNull();
  });

  it('no incluye email ni hashes de los autores', () => {
    const detalle = toMovimientoDetalle(movement({ cambios: [change(1, user(1))] }), true, NOW);
    expect(leaksAccountData(detalle)).toBe(false);
  });
});
