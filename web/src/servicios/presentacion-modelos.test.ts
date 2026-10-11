import { describe, expect, it } from 'vitest';
import type { EscritoCompletado } from './modelos-escritos';
import {
  CLIPBOARD_LEGEND,
  COPIED_MESSAGE,
  COPY_FAILED_MESSAGE,
  emptyModelListMessage,
  escritoNotices,
  NO_VARIABLES_LEGEND,
  TEMPLATE_TYPE_OPTIONS,
  tipoEscritoLabel,
  VARIABLE_GROUP_OPTIONS,
} from './presentacion-modelos';
import { VARIABLES } from './texto-modelo';

const escrito = (overrides: Partial<EscritoCompletado> = {}): EscritoCompletado => ({
  causa: { id: 5, caratula: 'Gómez c/ Acme S.A.' },
  modelo: { id: 8, titulo: 'Oficio al Registro' },
  texto: 'Señor Director:',
  faltantes: [],
  clientesDesactivados: [],
  responsableDesactivado: false,
  ...overrides,
});

describe('tipos de escrito (RF-1)', () => {
  it('tiene los siete tipos de la spec, con su etiqueta', () => {
    expect(TEMPLATE_TYPE_OPTIONS).toEqual([
      ['demanda', 'Demanda'],
      ['contestacion_demanda', 'Contestación de demanda'],
      ['escrito_tramite', 'Escrito de trámite'],
      ['recurso', 'Recurso'],
      ['oficio', 'Oficio'],
      ['cedula', 'Cédula'],
      ['otro', 'Otro'],
    ]);
    expect(tipoEscritoLabel('cedula')).toBe('Cédula');
  });
});

describe('grupos del catálogo de variables (RF-11)', () => {
  it('hay una etiqueta para cada grupo que usa el catálogo', () => {
    const groups = VARIABLE_GROUP_OPTIONS.map(([group]) => group);
    for (const variable of VARIABLES) expect(groups).toContain(variable.grupo);
    for (const [, label] of VARIABLE_GROUP_OPTIONS) expect(label.trim()).not.toBe('');
  });
});

describe('emptyModelListMessage (RF-23, RF-24)', () => {
  it('sin ningún modelo que pueda aparecer, avisa que todavía no hay modelos', () => {
    expect(emptyModelListMessage({ hayModelos: false, pagina: 1 })).toEqual({
      mensaje: 'Todavía no hay modelos cargados',
      ofrecerPrimeraPagina: false,
    });
  });

  it('con modelos que no coinciden, avisa que ninguno coincide con la búsqueda', () => {
    expect(emptyModelListMessage({ hayModelos: true, pagina: 1 })).toEqual({
      mensaje: 'No hay modelos que coincidan con la búsqueda',
      ofrecerPrimeraPagina: false,
    });
  });

  it('en una página que no existe no muestra ningún mensaje y ofrece volver a la primera', () => {
    for (const hayModelos of [true, false]) {
      expect(emptyModelListMessage({ hayModelos, pagina: 3 })).toEqual({
        mensaje: null,
        ofrecerPrimeraPagina: true,
      });
    }
  });
});

describe('escritoNotices (RF-39, RF-40)', () => {
  it('sin faltantes ni desactivados no hay ningún aviso', () => {
    expect(escritoNotices(escrito())).toEqual([]);
  });

  it('avisa los datos que faltan, con uno y con varios', () => {
    expect(escritoNotices(escrito({ faltantes: ['juzgado'] }))).toEqual([
      { mensaje: 'A esta causa le faltan datos que el modelo usa', detalle: ['juzgado'] },
    ]);
    expect(
      escritoNotices(
        escrito({ faltantes: ['número de expediente', 'juzgado', 'DNI de Luis Gómez'] }),
      ),
    ).toEqual([
      {
        mensaje: 'A esta causa le faltan datos que el modelo usa',
        detalle: ['número de expediente', 'juzgado', 'DNI de Luis Gómez'],
      },
    ]);
  });

  it('avisa los clientes con la cuenta desactivada, con uno y con varios', () => {
    expect(escritoNotices(escrito({ clientesDesactivados: ['Luis Gómez'] }))).toEqual([
      { mensaje: 'Hay clientes con la cuenta desactivada', detalle: ['Luis Gómez'] },
    ]);
    expect(
      escritoNotices(escrito({ clientesDesactivados: ['Acme S.A.', 'Luis Gómez'] }))[0].detalle,
    ).toEqual(['Acme S.A.', 'Luis Gómez']);
  });

  it('avisa el responsable desactivado', () => {
    expect(escritoNotices(escrito({ responsableDesactivado: true }))).toEqual([
      { mensaje: 'El responsable de esta causa está desactivado', detalle: [] },
    ]);
  });

  it('con todo a la vez, los avisos van en ese orden', () => {
    const notices = escritoNotices(
      escrito({
        faltantes: ['juzgado'],
        clientesDesactivados: ['Luis Gómez'],
        responsableDesactivado: true,
      }),
    );
    expect(notices.map((notice) => notice.mensaje)).toEqual([
      'A esta causa le faltan datos que el modelo usa',
      'Hay clientes con la cuenta desactivada',
      'El responsable de esta causa está desactivado',
    ]);
  });
});

describe('textos fijos (RF-16, RF-44, RF-45)', () => {
  it('son los de la spec', () => {
    expect(NO_VARIABLES_LEGEND).toBe('Este modelo no usa variables');
    expect(COPIED_MESSAGE).toBe('Escrito copiado');
    expect(COPY_FAILED_MESSAGE).toBe('No se pudo copiar. Seleccioná el texto y copialo a mano');
    expect(CLIPBOARD_LEGEND).toBe(
      'El escrito copiado queda en este equipo hasta que copies otra cosa o cierres sesión',
    );
  });
});
