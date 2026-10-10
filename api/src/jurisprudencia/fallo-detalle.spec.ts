import { describe, expect, it } from 'vitest';
import type { Usuario } from '../usuarios/usuario.entity.js';
import {
  toFalloDetalle,
  toFalloReferencia,
  toFalloResumen,
  toPalabraClaveSugerencia,
} from './fallo-detalle.js';
import type { Fallo } from './fallo.entity.js';
import type { PalabraClave } from './palabra-clave.entity.js';

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

const palabra = (id: number, texto: string) =>
  ({ id, texto, clave: texto.toLowerCase(), creadoEn: new Date() }) as PalabraClave;

function fallo(overrides: Partial<Fallo> = {}): Fallo {
  return {
    id: 5,
    caratula: 'Pérez c/ López s/ daños',
    tribunal: 'CNCiv., Sala A',
    fuero: 'civil',
    fecha: '2019-05-03',
    numero: '1234/2018',
    numeroBusqueda: '12342018',
    sumario: 'La responsabilidad es objetiva.',
    enlace: 'https://csjn.gov.ar/fallo',
    activo: true,
    creadoPorId: 1,
    creadoPor: user(1),
    creadoEn: new Date('2026-10-01T12:00:00Z'),
    modificadoPorId: 2,
    modificadoPor: user(2, false),
    modificadoEn: new Date('2026-10-02T12:00:00Z'),
    palabrasClave: [],
    ...overrides,
  };
}

const PALABRAS = [palabra(3, 'Responsabilidad'), palabra(1, 'daño moral'), palabra(2, 'Accidente')];

describe('toFalloResumen (RF-22)', () => {
  it('tiene exactamente las claves de FalloResumen', () => {
    expect(Object.keys(toFalloResumen(fallo(), PALABRAS)).sort()).toEqual(
      [
        'id',
        'caratula',
        'tribunal',
        'fuero',
        'fecha',
        'numero',
        'sumario',
        'palabrasClave',
        'activo',
      ].sort(),
    );
  });

  it('las palabras clave van en orden alfabético, solo con id y texto', () => {
    expect(toFalloResumen(fallo(), PALABRAS).palabrasClave).toEqual([
      { id: 2, texto: 'Accidente' },
      { id: 1, texto: 'daño moral' },
      { id: 3, texto: 'Responsabilidad' },
    ]);
  });

  it('el sumario va completo', () => {
    const sumario = 'a'.repeat(5000);
    expect(toFalloResumen(fallo({ sumario }), []).sumario).toBe(sumario);
  });
});

describe('toFalloDetalle (RF-19, RF-35)', () => {
  it('tiene exactamente las claves de FalloDetalle, sin clave, emails ni hashes', () => {
    const detalle = toFalloDetalle(fallo(), PALABRAS);

    expect(Object.keys(detalle).sort()).toEqual(
      [
        'id',
        'caratula',
        'tribunal',
        'fuero',
        'fecha',
        'numero',
        'sumario',
        'palabrasClave',
        'activo',
        'enlace',
        'creadoPor',
        'creadoEn',
        'modificadoPor',
        'modificadoEn',
      ].sort(),
    );
    const json = JSON.stringify(detalle);
    expect(json).not.toContain('@estudio.com');
    expect(json).not.toContain('$2b$');
    expect(json).not.toContain('"clave"');
    expect(json).not.toContain('numeroBusqueda');
  });

  it('marca a los autores desactivados', () => {
    const detalle = toFalloDetalle(fallo(), []);

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
  });

  it('un fallo nunca modificado no tiene autor de la modificación', () => {
    const detalle = toFalloDetalle(
      fallo({ modificadoPor: null, modificadoPorId: null, modificadoEn: null }),
      [],
    );
    expect(detalle.modificadoPor).toBeNull();
    expect(detalle.modificadoEn).toBeNull();
  });
});

describe('toFalloReferencia (RF-18)', () => {
  it('solo lleva id, carátula, tribunal, fecha y número', () => {
    expect(toFalloReferencia(fallo())).toEqual({
      id: 5,
      caratula: 'Pérez c/ López s/ daños',
      tribunal: 'CNCiv., Sala A',
      fecha: '2019-05-03',
      numero: '1234/2018',
    });
  });
});

describe('toPalabraClaveSugerencia (RF-13)', () => {
  it('convierte a número la cantidad que MySQL devuelve como texto', () => {
    expect(toPalabraClaveSugerencia({ id: 4, texto: 'daño moral', cantidad: '12' })).toEqual({
      id: 4,
      texto: 'daño moral',
      cantidad: 12,
    });
  });
});
