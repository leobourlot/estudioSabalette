import { describe, expect, it } from 'vitest';
import type { Causa } from '../causas/causa.entity.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import type { CompletedText } from './completar-escrito.js';
import {
  toEscritoCompletado,
  toModeloDetalle,
  toModeloReferencia,
  toModeloResumen,
} from './modelo-detalle.js';
import type { ModeloEscrito } from './modelo-escrito.entity.js';

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

function modelo(overrides: Partial<ModeloEscrito> = {}): ModeloEscrito {
  return {
    id: 8,
    titulo: 'Oficio al Registro de la Propiedad',
    tipo: 'oficio',
    fuero: 'civil',
    descripcion: 'Para pedir un informe de dominio',
    texto: 'Señor Director:\n\nAutos "#CARATULA#", del #FECHA#. Otra vez #CARATULA#.',
    activo: true,
    creadoPorId: 1,
    creadoPor: user(1),
    creadoEn: new Date('2026-10-01T12:00:00Z'),
    modificadoPorId: 2,
    modificadoPor: user(2, false),
    modificadoEn: new Date('2026-10-02T12:00:00Z'),
    ...overrides,
  };
}

describe('toModeloResumen (RF-19)', () => {
  it('tiene exactamente las claves de ModeloResumen, sin el texto', () => {
    expect(Object.keys(toModeloResumen(modelo())).sort()).toEqual(
      ['id', 'titulo', 'tipo', 'fuero', 'descripcion', 'activo'].sort(),
    );
  });

  it('lleva los datos del modelo', () => {
    expect(toModeloResumen(modelo({ descripcion: null, activo: false }))).toEqual({
      id: 8,
      titulo: 'Oficio al Registro de la Propiedad',
      tipo: 'oficio',
      fuero: 'civil',
      descripcion: null,
      activo: false,
    });
  });
});

describe('toModeloDetalle (RF-16, RF-51)', () => {
  it('tiene exactamente las claves de ModeloDetalle', () => {
    expect(Object.keys(toModeloDetalle(modelo())).sort()).toEqual(
      [
        'id',
        'titulo',
        'tipo',
        'fuero',
        'descripcion',
        'activo',
        'texto',
        'variables',
        'creadoPor',
        'creadoEn',
        'modificadoPor',
        'modificadoEn',
      ].sort(),
    );
  });

  it('lleva el texto con sus marcas sin reemplazar y las variables que usa, sin repetir', () => {
    const detalle = toModeloDetalle(modelo());
    expect(detalle.texto).toBe(
      'Señor Director:\n\nAutos "#CARATULA#", del #FECHA#. Otra vez #CARATULA#.',
    );
    expect(detalle.variables).toEqual(['CARATULA', 'FECHA']);
  });

  it('un modelo sin marcas no usa variables', () => {
    expect(toModeloDetalle(modelo({ texto: 'Texto fijo.' })).variables).toEqual([]);
  });

  it('lleva la autoría sin emails ni hashes, y marca a los autores desactivados', () => {
    const detalle = toModeloDetalle(modelo());
    expect(detalle.creadoPor).toEqual({
      id: 1,
      nombre: 'Nombre1',
      apellido: 'Apellido1',
      activo: true,
    });
    expect(detalle.modificadoPor).toEqual({
      id: 2,
      nombre: 'Nombre2',
      apellido: 'Apellido2',
      activo: false,
    });
    expect(detalle.creadoEn).toEqual(new Date('2026-10-01T12:00:00Z'));
    expect(detalle.modificadoEn).toEqual(new Date('2026-10-02T12:00:00Z'));

    const json = JSON.stringify(detalle);
    expect(json).not.toContain('@estudio.com');
    expect(json).not.toContain('contrasenaHash');
    expect(json).not.toContain('creadoPorId');
  });

  it('un modelo que nunca se modificó no tiene quién lo modificó', () => {
    const detalle = toModeloDetalle(
      modelo({ modificadoPorId: null, modificadoPor: null, modificadoEn: null }),
    );
    expect(detalle.modificadoPor).toBeNull();
    expect(detalle.modificadoEn).toBeNull();
  });
});

describe('toModeloReferencia (RF-15)', () => {
  it('lleva solo lo necesario para mostrar el modelo con el que coincide el título', () => {
    expect(toModeloReferencia(modelo())).toEqual({
      id: 8,
      titulo: 'Oficio al Registro de la Propiedad',
      tipo: 'oficio',
      fuero: 'civil',
    });
  });
});

describe('toEscritoCompletado (RF-32, RF-33)', () => {
  // Una causa como la carga el service: con datos que el escrito no tiene que llevar.
  const causa = {
    id: 5,
    caratula: 'Gómez, Luis c/ Acme S.A. s/ daños',
    numeroExpediente: '1234/2026',
    juzgado: 'Juzgado Civil Nº 3',
    fuero: 'civil',
    responsable: user(1),
    partes: [{ id: 1, dni: '20111222', cliente: { domicilio: 'San Martín 100' } }],
  } as unknown as Causa;

  const completed: CompletedText = {
    texto: 'Señor Juez:\n\nLuis Gómez, DNI 20.111.222.',
    faltantes: ['juzgado', 'DNI de María López'],
    clientesDesactivados: ['María López'],
    responsableDesactivado: true,
  };

  it('tiene exactamente las claves de EscritoCompletado', () => {
    const escrito = toEscritoCompletado(causa, modelo(), completed);
    expect(Object.keys(escrito).sort()).toEqual(
      [
        'causa',
        'modelo',
        'texto',
        'faltantes',
        'clientesDesactivados',
        'responsableDesactivado',
      ].sort(),
    );
    expect(Object.keys(escrito.causa).sort()).toEqual(['caratula', 'id']);
    expect(Object.keys(escrito.modelo).sort()).toEqual(['id', 'titulo']);
  });

  it('lleva el escrito, los faltantes y los avisos', () => {
    expect(toEscritoCompletado(causa, modelo(), completed)).toEqual({
      causa: { id: 5, caratula: 'Gómez, Luis c/ Acme S.A. s/ daños' },
      modelo: { id: 8, titulo: 'Oficio al Registro de la Propiedad' },
      texto: 'Señor Juez:\n\nLuis Gómez, DNI 20.111.222.',
      faltantes: ['juzgado', 'DNI de María López'],
      clientesDesactivados: ['María López'],
      responsableDesactivado: true,
    });
  });

  it('no lleva otros datos de la causa, de sus partes, de las cuentas ni el texto del modelo', () => {
    const json = JSON.stringify(toEscritoCompletado(causa, modelo(), completed));
    expect(json).not.toContain('numeroExpediente');
    expect(json).not.toContain('Juzgado Civil');
    expect(json).not.toContain('San Martín 100');
    expect(json).not.toContain('partes');
    expect(json).not.toContain('responsable"');
    expect(json).not.toContain('@estudio.com');
    expect(json).not.toContain('#CARATULA#');
    expect(json).not.toContain('descripcion');
  });
});
