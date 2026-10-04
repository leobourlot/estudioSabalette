import { getMetadataArgsStorage } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { Causa, CASE_STATUSES, JURISDICTIONS } from './causa.entity.js';
import { Colaborador } from './colaborador.entity.js';
import { Parte, PROCEDURAL_ROLES } from './parte.entity.js';

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

function uniqueIndexName(target: object, propertyName: string) {
  return getMetadataArgsStorage().indices.find(
    (args) =>
      args.target === target &&
      args.unique === true &&
      Array.isArray(args.columns) &&
      args.columns.length === 1 &&
      args.columns[0] === propertyName,
  )?.name;
}

function primaryColumns(target: object) {
  return getMetadataArgsStorage()
    .columns.filter((args) => args.target === target && args.options.primary === true)
    .map((args) => args.propertyName);
}

describe('entidades de causas', () => {
  it('define exactamente los fueros del plan (RF-1)', () => {
    expect(JURISDICTIONS).toEqual(['civil', 'penal', 'familia', 'laboral', 'federal', 'otro']);
  });

  it('define exactamente los estados del plan (RF-1)', () => {
    expect(CASE_STATUSES).toEqual(['en_tramite', 'paralizada', 'archivada', 'finalizada']);
  });

  it('define exactamente los roles procesales del plan (RF-13)', () => {
    expect(PROCEDURAL_ROLES).toEqual(['actor', 'demandado', 'tercero', 'otro']);
  });

  it('usa las tablas causas, partes y causa_colaboradores', () => {
    expect(tableName(Causa)).toBe('causas');
    expect(tableName(Parte)).toBe('partes');
    expect(tableName(Colaborador)).toBe('causa_colaboradores');
  });

  it('respeta los largos máximos de la spec (RF-1, RF-15)', () => {
    expect(columnOptions(Causa, 'caratula').length).toBe(255);
    expect(columnOptions(Causa, 'numeroExpediente')).toMatchObject({ length: 50, nullable: true });
    expect(columnOptions(Causa, 'numeroExpedienteBusqueda')).toMatchObject({
      length: 50,
      nullable: true,
    });
    expect(columnOptions(Causa, 'expedientePrincipal')).toMatchObject({
      length: 50,
      nullable: true,
    });
    expect(columnOptions(Causa, 'juzgado')).toMatchObject({ length: 150, nullable: true });
    expect(columnOptions(Parte, 'nombre')).toMatchObject({ length: 55, nullable: true });
    expect(columnOptions(Parte, 'apellido')).toMatchObject({ length: 55, nullable: true });
    expect(columnOptions(Parte, 'razonSocial')).toMatchObject({ length: 55, nullable: true });
    expect(columnOptions(Parte, 'dni')).toMatchObject({ length: 8, nullable: true });
    expect(columnOptions(Parte, 'cuit')).toMatchObject({ length: 11, nullable: true });
  });

  it('crea las causas en trámite, activas y no incidentes por defecto (RF-1, RF-6)', () => {
    expect(columnOptions(Causa, 'estado').default).toBe('en_tramite');
    expect(columnOptions(Causa, 'activa').default).toBe(true);
    expect(columnOptions(Causa, 'esIncidente').default).toBe(false);
  });

  it('calcula la clave de expediente en la base y la mantiene única (RF-8 a RF-10)', () => {
    const options = columnOptions(Causa, 'claveExpediente');
    expect(options).toMatchObject({
      generatedType: 'STORED',
      nullable: true,
      insert: false,
      update: false,
    });
    expect(options.asExpression).toContain('`activa` = 1');
    expect(options.asExpression).toContain('`esIncidente` = 0');
    expect(options.asExpression).toContain('`numeroExpediente` IS NOT NULL');
    expect(options.asExpression).toContain('`juzgado` IS NOT NULL');
    expect(uniqueIndexName(Causa, 'claveExpediente')).toBe('UQ_causas_expediente_activo');
  });

  it('exige un responsable en cada causa (RF-29)', () => {
    expect(columnOptions(Causa, 'responsableId').nullable).not.toBe(true);
  });

  it('permite partes con y sin cliente, vigentes por defecto (RF-14, RF-15, RF-22)', () => {
    expect(columnOptions(Parte, 'clienteId').nullable).toBe(true);
    expect(columnOptions(Parte, 'tipoPersona').nullable).toBe(true);
    expect(columnOptions(Parte, 'vigente').default).toBe(true);
  });

  it('no repite un colaborador en la misma causa (RF-31)', () => {
    expect(primaryColumns(Colaborador).sort()).toEqual(['causaId', 'usuarioId']);
  });
});
