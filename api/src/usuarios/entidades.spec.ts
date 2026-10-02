import { getMetadataArgsStorage } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { Cliente, PERSON_TYPES } from './cliente.entity.js';
import { Sesion } from './sesion.entity.js';
import { ROLES, Usuario } from './usuario.entity.js';

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

function isUniqueIndex(target: object, propertyName: string) {
  return getMetadataArgsStorage().indices.some(
    (args) =>
      args.target === target &&
      args.unique === true &&
      Array.isArray(args.columns) &&
      args.columns.length === 1 &&
      args.columns[0] === propertyName,
  );
}

describe('entidades de usuarios', () => {
  it('define exactamente los roles del plan', () => {
    expect(ROLES).toEqual(['admin', 'abogado', 'cliente']);
  });

  it('define exactamente los tipos de persona del plan', () => {
    expect(PERSON_TYPES).toEqual(['fisica', 'juridica']);
  });

  it('usa las tablas usuarios, clientes y sesiones', () => {
    expect(tableName(Usuario)).toBe('usuarios');
    expect(tableName(Cliente)).toBe('clientes');
    expect(tableName(Sesion)).toBe('sesiones');
  });

  it('nunca carga el hash de la contraseña salvo que se pida explícitamente (RF-40)', () => {
    expect(columnOptions(Usuario, 'contrasenaHash').select).toBe(false);
  });

  it('permite email nulo (email liberado) y lo mantiene único (RF-24)', () => {
    expect(columnOptions(Usuario, 'email')).toMatchObject({ nullable: true, length: 254 });
    expect(isUniqueIndex(Usuario, 'email')).toBe(true);
  });

  it('mantiene únicos el DNI y el CUIT de los clientes (RF-25)', () => {
    expect(isUniqueIndex(Cliente, 'dni')).toBe(true);
    expect(isUniqueIndex(Cliente, 'cuit')).toBe(true);
  });

  it('respeta los largos máximos de la spec (RF-6)', () => {
    expect(columnOptions(Usuario, 'nombre').length).toBe(55);
    expect(columnOptions(Usuario, 'apellido').length).toBe(55);
    expect(columnOptions(Cliente, 'razonSocial').length).toBe(55);
    expect(columnOptions(Cliente, 'domicilio').length).toBe(55);
    expect(columnOptions(Cliente, 'telefono').length).toBe(15);
  });
});
