import { describe, expect, it } from 'vitest';
import type { CausaPortalResumen, GrupoCausa } from './portal';
import {
  CLIENT_TEXT_PREVIEW_LENGTH,
  groupCausas,
  movementLegend,
  orNotAssigned,
  parsePageParam,
  truncateClientText,
} from './presentacion-portal';

const causa = (id: number, grupo: GrupoCausa): CausaPortalResumen => ({
  id,
  caratula: `Causa ${id}`,
  numeroExpediente: null,
  estado: grupo === 'en_curso' ? 'en_tramite' : 'archivada',
  grupo,
  fechaUltimoMovimiento: null,
});

describe('groupCausas (RF-10)', () => {
  it('agrupa la página en orden, cada grupo con su título', () => {
    const groups = groupCausas([
      causa(1, 'en_curso'),
      causa(2, 'en_curso'),
      causa(3, 'archivadas_y_finalizadas'),
    ]);

    expect(groups.map((group) => [group.titulo, group.causas.map((c) => c.id)])).toEqual([
      ['En curso', [1, 2]],
      ['Archivadas y finalizadas', [3]],
    ]);
  });

  it('una página que empieza a mitad de un grupo repite su título', () => {
    const groups = groupCausas([causa(21, 'en_curso'), causa(22, 'archivadas_y_finalizadas')]);

    expect(groups.map((group) => group.titulo)).toEqual(['En curso', 'Archivadas y finalizadas']);
  });

  it('un grupo sin causas no aparece', () => {
    const groups = groupCausas([causa(1, 'archivadas_y_finalizadas')]);

    expect(groups.map((group) => group.titulo)).toEqual(['Archivadas y finalizadas']);
    expect(groupCausas([])).toEqual([]);
  });
});

describe('orNotAssigned (RF-9, RF-13)', () => {
  it('muestra "Sin asignar" en un dato opcional vacío', () => {
    expect(orNotAssigned(null)).toBe('Sin asignar');
    expect(orNotAssigned('1234/2024')).toBe('1234/2024');
  });
});

describe('movementLegend (RF-21)', () => {
  it.each([
    [false, false, null],
    [false, true, 'Fecha futura'],
    [true, false, 'Anulado'],
    [true, true, 'Anulado'],
  ] as const)('anulado %s y fecha futura %s: %s', (anulado, esFechaFutura, legend) => {
    expect(movementLegend({ anulado, esFechaFutura })).toBe(legend);
  });
});

describe('truncateClientText (RF-21)', () => {
  it('con 300 caracteres no recorta', () => {
    const text = 'a'.repeat(CLIENT_TEXT_PREVIEW_LENGTH);

    expect(truncateClientText(text)).toEqual({ texto: text, recortado: false });
  });

  it('con 301 caracteres recorta a 300 y agrega "…"', () => {
    const result = truncateClientText(`${'a'.repeat(300)}b`);

    expect(result).toEqual({ texto: `${'a'.repeat(300)}…`, recortado: true });
  });

  it('cuenta en puntos de código: no parte un carácter de dos unidades UTF-16', () => {
    const text = '𝄞'.repeat(301);

    const result = truncateClientText(text);

    expect(result.recortado).toBe(true);
    expect(result.texto).toBe(`${'𝄞'.repeat(300)}…`);
  });

  it('el límite es de 300 caracteres', () => {
    expect(CLIENT_TEXT_PREVIEW_LENGTH).toBe(300);
  });
});

describe('parsePageParam (RF-25)', () => {
  it.each([
    [null, 1],
    ['1', 1],
    ['3', 3],
    ['0', null],
    ['-1', null],
    ['1.5', null],
    ['abc', null],
    ['', null],
    ['03', null],
  ])('%s → %s', (value, page) => {
    expect(parsePageParam(value)).toBe(page);
  });
});
