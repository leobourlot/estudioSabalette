import { getMetadataArgsStorage } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { CambioMovimiento, MOVEMENT_ACTIONS } from './cambio-movimiento.entity.js';
import { Movimiento, MOVEMENT_TYPES } from './movimiento.entity.js';

function columnOptions(target: object, propertyName: string) {
  const column = getMetadataArgsStorage().columns.find(
    (args) => args.target === target && args.propertyName === propertyName,
  );
  if (!column) throw new Error(`No existe la columna ${propertyName}`);
  return column.options;
}

function tableName(target: object) {
  return getMetadataArgsStorage().tables.find((args) => args.target === target)?.name;
}

function indexColumns(target: object, name: string) {
  return getMetadataArgsStorage().indices.find(
    (args) => args.target === target && args.name === name,
  )?.columns;
}

describe('Movimiento (RF-1, RF-2)', () => {
  it('se guarda en la tabla movimientos', () => {
    expect(tableName(Movimiento)).toBe('movimientos');
  });

  it('el tipo tiene exactamente los valores del plan', () => {
    expect(MOVEMENT_TYPES).toEqual([
      'escrito_presentado',
      'providencia',
      'resolucion',
      'sentencia',
      'notificacion',
      'audiencia',
      'pericia',
      'oficio',
      'otro',
    ]);
    expect(columnOptions(Movimiento, 'tipo').enum).toBe(MOVEMENT_TYPES);
  });

  it('la fecha es un día sin hora', () => {
    expect(columnOptions(Movimiento, 'fecha').type).toBe('date');
  });

  it('los textos tienen hasta 2.000 caracteres y el texto para el cliente es opcional', () => {
    expect(columnOptions(Movimiento, 'descripcion')).toMatchObject({
      type: 'varchar',
      length: 2000,
    });
    expect(columnOptions(Movimiento, 'textoCliente')).toMatchObject({
      type: 'varchar',
      length: 2000,
      nullable: true,
    });
  });

  it('nace no visible y no anulado (RF-8)', () => {
    expect(columnOptions(Movimiento, 'visible').default).toBe(false);
    expect(columnOptions(Movimiento, 'anulado').default).toBe(false);
  });

  it('el momento de carga y de modificación tienen microsegundos (RF-23)', () => {
    expect(columnOptions(Movimiento, 'creadoEn')).toMatchObject({ type: 'datetime', precision: 6 });
    expect(columnOptions(Movimiento, 'modificadoEn')).toMatchObject({
      type: 'datetime',
      precision: 6,
      nullable: true,
    });
  });

  it('tiene el índice del historial sobre causa, fecha, carga e id (RF-23)', () => {
    expect(indexColumns(Movimiento, 'IDX_movimientos_historial')).toEqual([
      'causaId',
      'fecha',
      'creadoEn',
      'id',
    ]);
  });
});

describe('CambioMovimiento (RF-20)', () => {
  it('se guarda en la tabla movimiento_cambios', () => {
    expect(tableName(CambioMovimiento)).toBe('movimiento_cambios');
  });

  it('la acción tiene exactamente los valores del plan', () => {
    expect(MOVEMENT_ACTIONS).toEqual(['carga', 'modificacion', 'anulacion', 'restauracion']);
    expect(columnOptions(CambioMovimiento, 'accion').enum).toBe(MOVEMENT_ACTIONS);
  });

  it('guarda los datos que cambiaron en JSON y el momento con microsegundos', () => {
    expect(columnOptions(CambioMovimiento, 'cambios').type).toBe('json');
    expect(columnOptions(CambioMovimiento, 'fechaHora')).toMatchObject({
      type: 'datetime',
      precision: 6,
    });
  });

  it('tiene el índice por movimiento', () => {
    expect(indexColumns(CambioMovimiento, 'IDX_movimiento_cambios_movimiento')).toEqual([
      'movimientoId',
      'id',
    ]);
  });
});
