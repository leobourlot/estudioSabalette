import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { formatValidationErrors } from '../../configuracion/errores-de-validacion.js';
import { LIST_MESSAGES, ListMovimientosQueryDto } from './listar-movimientos.dto.js';
import { MOVIMIENTO_MESSAGES } from './reglas-movimiento.js';

/** Como el ValidationPipe global: los parámetros llegan como texto en la URL. */
async function check(query: Record<string, string>) {
  const instance = plainToInstance(ListMovimientosQueryDto, query);
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
  return { instance, messages: formatValidationErrors(errors) };
}

describe('ListMovimientosQueryDto (RF-23, RF-25, RF-26)', () => {
  it('acepta la consulta sin parámetros, con los valores por defecto del service', async () => {
    const { instance, messages } = await check({});
    expect(messages).toEqual([]);
    expect(instance).toEqual({});
  });

  it('acepta y convierte todos los parámetros', async () => {
    const { instance, messages } = await check({
      pagina: '2',
      buscar: '  audiencia  ',
      tipo: 'audiencia',
      visibilidad: 'visibles',
      desde: '2024-01-01',
      hasta: '2024-12-31',
      ocultarAnulados: 'true',
    });

    expect(messages).toEqual([]);
    expect(instance).toEqual({
      pagina: 2,
      buscar: 'audiencia',
      tipo: 'audiencia',
      visibilidad: 'visibles',
      desde: '2024-01-01',
      hasta: '2024-12-31',
      ocultarAnulados: true,
    });
  });

  it('une las tildes combinables del buscador', async () => {
    const { instance } = await check({ buscar: 'notificación' });
    expect(instance.buscar).toBe('notificación');
  });

  it('acepta el mismo día como desde y hasta', async () => {
    expect((await check({ desde: '2024-03-01', hasta: '2024-03-01' })).messages).toEqual([]);
  });

  it.each([
    ['una página 0', { pagina: '0' }, LIST_MESSAGES.pagina],
    ['una página que no es un número', { pagina: 'dos' }, LIST_MESSAGES.pagina],
    ['un buscador de más de 100 caracteres', { buscar: 'a'.repeat(101) }, LIST_MESSAGES.buscar],
    ['un tipo fuera de la lista', { tipo: 'cedula' }, MOVIMIENTO_MESSAGES.tipo],
    ['una visibilidad fuera de la lista', { visibilidad: 'algunos' }, LIST_MESSAGES.visibilidad],
    ['una fecha desde inválida', { desde: '2024-02-30' }, LIST_MESSAGES.desde],
    ['una fecha hasta inválida', { hasta: '31/12/2024' }, LIST_MESSAGES.hasta],
    [
      'ocultarAnulados que no es booleano',
      { ocultarAnulados: 'si' },
      LIST_MESSAGES.ocultarAnulados,
    ],
    [
      'la fecha desde posterior a la fecha hasta',
      { desde: '2024-03-02', hasta: '2024-03-01' },
      LIST_MESSAGES.rangoInvertido,
    ],
  ])('rechaza %s', async (_case, query, message) => {
    expect((await check(query)).messages).toEqual([message]);
  });

  it('el mensaje de desde > hasta es el de RF-26', () => {
    expect(LIST_MESSAGES.rangoInvertido).toBe(
      'La fecha desde no puede ser posterior a la fecha hasta',
    );
  });

  it('rechaza un parámetro desconocido', async () => {
    expect((await check({ causaId: '3' })).messages).toEqual([
      'El campo causaId no está permitido',
    ]);
  });
});
