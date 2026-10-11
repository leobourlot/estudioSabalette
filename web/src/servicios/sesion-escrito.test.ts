import { describe, expect, it } from 'vitest';
import { EMPTY_MODEL_FILTERS, type ModelFilters } from './formulario-modelo';
import { isIdleExpired } from './inactividad';
import {
  INITIAL_MODEL_LIST_STATE,
  modelListStateFrom,
  STAFF_IDLE_LIMIT_MS,
  toModelListLocationState,
} from './sesion-escrito';

describe('límite de inactividad de un integrante (RF-48)', () => {
  it('es de 60 minutos, como la sesión de un integrante en el servidor', () => {
    expect(STAFF_IDLE_LIMIT_MS).toBe(60 * 60_000);
  });

  it('con ese límite, la pantalla vence a la hora del último pedido y no antes', () => {
    const lastRequest = 1_000_000;
    expect(isIdleExpired(lastRequest, lastRequest + 59 * 60_000, STAFF_IDLE_LIMIT_MS)).toBe(false);
    expect(isIdleExpired(lastRequest, lastRequest + 60 * 60_000, STAFF_IDLE_LIMIT_MS)).toBe(true);
  });
});

describe('estado de la lista de modelos para volver desde un escrito (RF-32)', () => {
  const filtros: ModelFilters = {
    buscar: 'oficio',
    tipo: 'oficio',
    fuero: 'laboral',
    incluirDesactivados: false,
  };

  it('la lista abre en la página 1 y sin ningún filtro', () => {
    expect(INITIAL_MODEL_LIST_STATE).toEqual({ filtros: EMPTY_MODEL_FILTERS, pagina: 1 });
  });

  it('lo que se guarda en el estado de navegación se recupera igual', () => {
    const state = toModelListLocationState({ filtros, pagina: 3 });
    expect(modelListStateFrom(state)).toEqual({ filtros, pagina: 3 });
  });

  it('nunca incluye otra cosa que los filtros y la página', () => {
    const state = toModelListLocationState({ filtros, pagina: 3 });
    expect(state).toEqual({ listaDeModelos: { filtros, pagina: 3 } });
  });

  it.each([
    ['no hay estado', null],
    ['el estado no es un objeto', 'texto'],
    ['el estado es de otra pantalla', { avisos: { rechazos: [] } }],
    ['falta la página', { listaDeModelos: { filtros } }],
    ['la página no es un entero desde 1', { listaDeModelos: { filtros, pagina: 0 } }],
    ['la página no es un número', { listaDeModelos: { filtros, pagina: '2' } }],
    ['faltan los filtros', { listaDeModelos: { pagina: 2 } }],
    [
      'un filtro no es un texto',
      { listaDeModelos: { filtros: { ...filtros, buscar: 7 }, pagina: 2 } },
    ],
    [
      'el tipo no es de la lista',
      { listaDeModelos: { filtros: { ...filtros, tipo: 'carta' }, pagina: 2 } },
    ],
    [
      'el fuero no es de la lista',
      { listaDeModelos: { filtros: { ...filtros, fuero: 'marítimo' }, pagina: 2 } },
    ],
  ])('devuelve null si %s', (_case, state) => {
    expect(modelListStateFrom(state)).toBeNull();
  });

  it('al volver, la casilla de desactivados no se recupera: en una causa no existe', () => {
    const state = {
      listaDeModelos: { filtros: { ...filtros, incluirDesactivados: true }, pagina: 2 },
    };
    expect(modelListStateFrom(state)?.filtros.incluirDesactivados).toBe(false);
  });
});
