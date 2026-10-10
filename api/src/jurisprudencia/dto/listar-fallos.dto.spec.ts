import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CAUSA_MESSAGES } from '../../causas/dto/reglas-causa.js';
import { formatValidationErrors } from '../../configuracion/errores-de-validacion.js';
import { todayInBuenosAires } from '../../movimientos/reglas-movimientos.js';
import { LIST_FALLOS_MESSAGES, ListFallosQueryDto } from './listar-fallos.dto.js';
import { FALLO_MESSAGES } from './reglas-fallo.js';

/** Transforma y valida igual que el ValidationPipe global, con los parámetros como texto. */
async function check(query: Record<string, string>) {
  const instance = plainToInstance(ListFallosQueryDto, query);
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
  return { instance, messages: formatValidationErrors(errors) };
}

describe('ListFallosQueryDto (RF-21, RF-23 a RF-26)', () => {
  it('sin parámetros no filtra nada', async () => {
    const { instance, messages } = await check({});
    expect(messages).toEqual([]);
    expect(instance).toEqual({});
  });

  it('acepta todos los parámetros y los convierte', async () => {
    const { instance, messages } = await check({
      pagina: '3',
      buscar: '  “daño”   moral ',
      palabrasClave: '3, 7,12',
      fuero: 'civil',
      desde: '1887-01-01',
      hasta: todayInBuenosAires(new Date()),
      incluirDesactivados: 'true',
    });

    expect(messages).toEqual([]);
    expect(instance).toMatchObject({
      pagina: 3,
      buscar: '"daño" moral',
      palabrasClave: [3, 7, 12],
      fuero: 'civil',
      incluirDesactivados: true,
    });
  });

  it.each([
    ['0', LIST_FALLOS_MESSAGES.pagina],
    ['dos', LIST_FALLOS_MESSAGES.pagina],
    ['1.5', LIST_FALLOS_MESSAGES.pagina],
  ])('rechaza la página %j', async (pagina, message) => {
    expect((await check({ pagina })).messages).toEqual([message]);
  });

  describe('buscar (RF-24)', () => {
    it('convierte "[...]" en "(...)" antes de buscar', async () => {
      expect((await check({ buscar: '[...]' })).instance.buscar).toBe('(...)');
    });

    it('con solo espacios equivale a no buscar', async () => {
      const { instance, messages } = await check({ buscar: '   \u00A0 ' });
      expect(messages).toEqual([]);
      expect(instance.buscar).toBeUndefined();
    });

    it.each(['<script>', 'a{b}', 'a=b', 'a|b', 'a\\b', 'a`b', '😀'])(
      'rechaza %j por caracteres no permitidos',
      async (buscar) => {
        expect((await check({ buscar })).messages).toEqual([LIST_FALLOS_MESSAGES.buscarCharacters]);
      },
    );

    it('acepta % y _ (se buscan como texto)', async () => {
      expect((await check({ buscar: '50% art_1' })).messages).toEqual([]);
    });

    it('acepta 100 caracteres y rechaza 101', async () => {
      expect((await check({ buscar: 'a'.repeat(100) })).messages).toEqual([]);
      expect((await check({ buscar: 'a'.repeat(101) })).messages).toEqual([
        LIST_FALLOS_MESSAGES.buscarTooLong,
      ]);
    });
  });

  describe('palabrasClave (RF-25)', () => {
    it.each([
      ['un valor que no es un id', '3,x'],
      ['un id cero', '0,2'],
      ['más de 10 ids', '1,2,3,4,5,6,7,8,9,10,11'],
    ])('rechaza %s', async (_case, palabrasClave) => {
      expect((await check({ palabrasClave })).messages).toEqual([
        LIST_FALLOS_MESSAGES.palabrasClave,
      ]);
    });

    it('acepta 10 ids, y vacío equivale a no filtrar', async () => {
      expect((await check({ palabrasClave: '1,2,3,4,5,6,7,8,9,10' })).messages).toEqual([]);
      expect((await check({ palabrasClave: '' })).instance.palabrasClave).toBeUndefined();
    });
  });

  it('rechaza un fuero fuera de la lista', async () => {
    expect((await check({ fuero: 'comercial' })).messages).toEqual([CAUSA_MESSAGES.fuero]);
  });

  describe('fechas (RF-26)', () => {
    it.each([
      ['inexistente', '2023-02-29', FALLO_MESSAGES.fechaInvalid],
      ['con formato dd/mm/aaaa', '01/03/2024', FALLO_MESSAGES.fechaInvalid],
      ['de 1790', '1790-01-01', FALLO_MESSAGES.fechaBeforeMin],
      ['futura', '2999-01-01', FALLO_MESSAGES.fechaFuture],
    ])('rechaza una fecha desde %s', async (_case, desde, message) => {
      expect((await check({ desde })).messages).toEqual([message]);
    });

    it('rechaza una fecha hasta inválida con su propio mensaje', async () => {
      expect((await check({ hasta: '2023-02-29' })).messages).toEqual([
        FALLO_MESSAGES.fechaInvalid,
      ]);
    });

    it('rechaza desde posterior a hasta', async () => {
      expect((await check({ desde: '2020-01-02', hasta: '2020-01-01' })).messages).toEqual([
        LIST_FALLOS_MESSAGES.rangoInvertido,
      ]);
    });

    it('acepta desde igual a hasta', async () => {
      expect((await check({ desde: '2020-01-01', hasta: '2020-01-01' })).messages).toEqual([]);
    });
  });

  it('rechaza incluirDesactivados que no es booleano', async () => {
    expect((await check({ incluirDesactivados: 'si' })).messages).toEqual([
      LIST_FALLOS_MESSAGES.incluirDesactivados,
    ]);
  });
});
