import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CAUSA_MESSAGES } from '../../causas/dto/reglas-causa.js';
import { formatValidationErrors } from '../../configuracion/errores-de-validacion.js';
import { ReactivateFalloDto } from './reactivar-fallo.dto.js';
import { SUGGESTION_MESSAGES, SuggestionsQueryDto } from './sugerencias.dto.js';

type DtoClass<T> = new () => T;

async function check<T extends object>(dto: DtoClass<T>, plain: object) {
  const instance = plainToInstance(dto, plain);
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
  return { instance, messages: formatValidationErrors(errors) };
}

describe('SuggestionsQueryDto (RF-13, RF-25)', () => {
  it('acepta lo escrito sin destino: son sugerencias para la carga', async () => {
    const { instance, messages } = await check(SuggestionsQueryDto, { buscar: 'da' });
    expect(messages).toEqual([]);
    expect(instance.para).toBeUndefined();
  });

  it.each(['carga', 'filtro'])('acepta el destino %s', async (para) => {
    expect((await check(SuggestionsQueryDto, { buscar: 'daño', para })).messages).toEqual([]);
  });

  it('convierte lo escrito antes de validar', async () => {
    const { instance } = await check(SuggestionsQueryDto, { buscar: '  “daño”  ' });
    expect(instance.buscar).toBe('"daño"');
  });

  it.each([
    ['sin texto', undefined],
    ['vacío', ''],
    ['con un solo carácter', 'd'],
    ['con un carácter y espacios', '  d  '],
  ])('rechaza una búsqueda %s', async (_case, buscar) => {
    expect((await check(SuggestionsQueryDto, { buscar })).messages).toEqual([
      SUGGESTION_MESSAGES.buscarTooShort,
    ]);
  });

  it('rechaza más de 50 caracteres', async () => {
    expect((await check(SuggestionsQueryDto, { buscar: 'a'.repeat(51) })).messages).toEqual([
      SUGGESTION_MESSAGES.buscarTooLong,
    ]);
  });

  it.each(['<b>', 'a=b', 'a|b'])('rechaza %j por caracteres no permitidos', async (buscar) => {
    expect((await check(SuggestionsQueryDto, { buscar })).messages).toEqual([
      SUGGESTION_MESSAGES.buscarCharacters,
    ]);
  });

  it('rechaza un destino inválido', async () => {
    expect(
      (await check(SuggestionsQueryDto, { buscar: 'daño', para: 'listado' })).messages,
    ).toEqual([SUGGESTION_MESSAGES.para]);
  });
});

describe('ReactivateFalloDto (RF-31)', () => {
  it('acepta un cuerpo vacío y la confirmación', async () => {
    expect((await check(ReactivateFalloDto, {})).messages).toEqual([]);
    expect((await check(ReactivateFalloDto, { confirmarRepetido: true })).messages).toEqual([]);
  });

  it('rechaza una confirmación que no es booleana', async () => {
    expect((await check(ReactivateFalloDto, { confirmarRepetido: 'si' })).messages).toEqual([
      CAUSA_MESSAGES.confirmation,
    ]);
  });
});
