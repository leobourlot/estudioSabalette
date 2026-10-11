import { getMetadataArgsStorage } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { JURISDICTIONS } from '../causas/causa.entity.js';
import { ModeloEscrito, TEMPLATE_TYPES } from './modelo-escrito.entity.js';

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

describe('ModeloEscrito (RF-1, RF-2)', () => {
  it('se guarda en la tabla modelos_escritos', () => {
    expect(tableName(ModeloEscrito)).toBe('modelos_escritos');
  });

  it('el tipo de escrito tiene exactamente los siete valores de la spec', () => {
    expect(columnOptions(ModeloEscrito, 'tipo').enum).toBe(TEMPLATE_TYPES);
    expect(TEMPLATE_TYPES).toEqual([
      'demanda',
      'contestacion_demanda',
      'escrito_tramite',
      'recurso',
      'oficio',
      'cedula',
      'otro',
    ]);
  });

  it('el fuero tiene exactamente los valores del fuero de una causa y nace como otro', () => {
    expect(columnOptions(ModeloEscrito, 'fuero').enum).toBe(JURISDICTIONS);
    expect(JURISDICTIONS).toEqual(['civil', 'penal', 'familia', 'laboral', 'federal', 'otro']);
    expect(columnOptions(ModeloEscrito, 'fuero').default).toBe('otro');
  });

  it('el título y la descripción tienen los largos de RF-1, y la descripción es opcional', () => {
    expect(columnOptions(ModeloEscrito, 'titulo')).toMatchObject({ type: 'varchar', length: 150 });
    expect(columnOptions(ModeloEscrito, 'descripcion')).toMatchObject({
      type: 'varchar',
      length: 500,
      nullable: true,
    });
  });

  it('el texto es mediumtext: 50.000 caracteres no entran en un varchar ni en un text', () => {
    expect(columnOptions(ModeloEscrito, 'texto').type).toBe('mediumtext');
  });

  it('nace activo (RF-13)', () => {
    expect(columnOptions(ModeloEscrito, 'activo').default).toBe(true);
  });

  it('el momento de carga y de modificación tienen microsegundos', () => {
    expect(columnOptions(ModeloEscrito, 'creadoEn')).toMatchObject({
      type: 'datetime',
      precision: 6,
    });
    expect(columnOptions(ModeloEscrito, 'modificadoEn')).toMatchObject({
      type: 'datetime',
      precision: 6,
      nullable: true,
    });
  });

  it('tiene el índice del listado (RF-15, RF-18)', () => {
    expect(index(ModeloEscrito, 'IDX_modelos_escritos_listado')?.columns).toEqual([
      'activo',
      'titulo',
    ]);
  });
});
