import { getMetadataArgsStorage } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { JURISDICTIONS } from '../causas/causa.entity.js';
import { FalloPalabraClave } from './fallo-palabra-clave.entity.js';
import { Fallo } from './fallo.entity.js';
import { PalabraClave } from './palabra-clave.entity.js';

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

function index(target: object, name: string) {
  return getMetadataArgsStorage().indices.find(
    (args) => args.target === target && args.name === name,
  );
}

describe('Fallo (RF-1, RF-2)', () => {
  it('se guarda en la tabla fallos', () => {
    expect(tableName(Fallo)).toBe('fallos');
  });

  it('el fuero tiene exactamente los valores del fuero de una causa', () => {
    expect(columnOptions(Fallo, 'fuero').enum).toBe(JURISDICTIONS);
    expect(JURISDICTIONS).toEqual(['civil', 'penal', 'familia', 'laboral', 'federal', 'otro']);
  });

  it('la fecha es un día sin hora', () => {
    expect(columnOptions(Fallo, 'fecha').type).toBe('date');
  });

  it('los textos tienen los largos de RF-1 y el número y el enlace son opcionales', () => {
    expect(columnOptions(Fallo, 'caratula')).toMatchObject({ type: 'varchar', length: 255 });
    expect(columnOptions(Fallo, 'tribunal')).toMatchObject({ type: 'varchar', length: 150 });
    expect(columnOptions(Fallo, 'numero')).toMatchObject({ length: 50, nullable: true });
    expect(columnOptions(Fallo, 'numeroBusqueda')).toMatchObject({ length: 50, nullable: true });
    expect(columnOptions(Fallo, 'sumario')).toMatchObject({ type: 'varchar', length: 5000 });
    expect(columnOptions(Fallo, 'enlace')).toMatchObject({ length: 500, nullable: true });
  });

  it('nace activo (RF-16)', () => {
    expect(columnOptions(Fallo, 'activo').default).toBe(true);
  });

  it('el momento de carga y de modificación tienen microsegundos (RF-21)', () => {
    expect(columnOptions(Fallo, 'creadoEn')).toMatchObject({ type: 'datetime', precision: 6 });
    expect(columnOptions(Fallo, 'modificadoEn')).toMatchObject({
      type: 'datetime',
      precision: 6,
      nullable: true,
    });
  });

  it('tiene el índice del listado y el de repetido (RF-18, RF-21)', () => {
    expect(index(Fallo, 'IDX_fallos_listado')?.columns).toEqual([
      'activo',
      'fecha',
      'creadoEn',
      'id',
    ]);
    expect(index(Fallo, 'IDX_fallos_repetido')?.columns).toEqual(['tribunal', 'numero']);
  });
});

describe('PalabraClave (RF-10, RF-11)', () => {
  it('se guarda en la tabla palabras_clave', () => {
    expect(tableName(PalabraClave)).toBe('palabras_clave');
  });

  it('la clave tiene intercalación binaria y un índice único', () => {
    expect(columnOptions(PalabraClave, 'clave')).toMatchObject({
      length: 50,
      collation: 'utf8mb4_bin',
    });
    const unique = index(PalabraClave, 'UQ_palabras_clave_clave');
    expect(unique?.columns).toEqual(['clave']);
    expect(unique?.unique).toBe(true);
  });

  it('el texto tiene hasta 50 caracteres', () => {
    expect(columnOptions(PalabraClave, 'texto')).toMatchObject({ type: 'varchar', length: 50 });
  });
});

describe('FalloPalabraClave (RF-14)', () => {
  it('se guarda en la tabla fallo_palabras_clave con clave primaria compuesta', () => {
    expect(tableName(FalloPalabraClave)).toBe('fallo_palabras_clave');
    const primaries = getMetadataArgsStorage()
      .columns.filter((args) => args.target === FalloPalabraClave && args.mode === 'regular')
      .filter((args) => args.options.primary)
      .map((args) => args.propertyName);
    expect(primaries).toEqual(['falloId', 'palabraClaveId']);
  });

  it('tiene el índice por palabra', () => {
    expect(index(FalloPalabraClave, 'IDX_fallo_palabras_clave_palabra')?.columns).toEqual([
      'palabraClaveId',
      'falloId',
    ]);
  });
});
