import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CAUSA_MESSAGES } from '../../causas/dto/reglas-causa.js';
import { formatValidationErrors } from '../../configuracion/errores-de-validacion.js';
import { LIST_MODELOS_MESSAGES, ListModelosQueryDto } from './listar-modelos.dto.js';
import { ReactivateModeloDto } from './reactivar-modelo.dto.js';
import { MODELO_MESSAGES } from './reglas-modelo.js';

/** Transforma y valida igual que el ValidationPipe global, con los parámetros como texto. */
async function check(query: Record<string, string>) {
  const instance = plainToInstance(ListModelosQueryDto, query);
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
  return { instance, messages: formatValidationErrors(errors) };
}

// Se arma con su código para que el archivo no lleve un carácter invisible.
const NO_BREAK_SPACE = String.fromCharCode(0xa0);

describe('ListModelosQueryDto (RF-18, RF-21, RF-22)', () => {
  it('sin parámetros no filtra nada', async () => {
    const { instance, messages } = await check({});
    expect(messages).toEqual([]);
    expect(instance).toEqual({});
  });

  it('acepta todos los parámetros y los convierte', async () => {
    const { instance, messages } = await check({
      pagina: '3',
      buscar: '  “cédula”   de notificación ',
      tipo: 'cedula',
      fuero: 'laboral',
      incluirDesactivados: 'true',
    });

    expect(messages).toEqual([]);
    expect(instance).toEqual({
      pagina: 3,
      buscar: '"cédula" de notificación',
      tipo: 'cedula',
      fuero: 'laboral',
      incluirDesactivados: true,
    });
  });

  it.each(['0', 'dos', '1.5', '-1'])('rechaza la página %j', async (pagina) => {
    expect((await check({ pagina })).messages).toEqual([LIST_MODELOS_MESSAGES.pagina]);
  });

  describe('buscar (RF-21)', () => {
    it('convierte "[sic]" en "(sic)" antes de buscar', async () => {
      expect((await check({ buscar: '[sic]' })).instance.buscar).toBe('(sic)');
    });

    it('con solo espacios equivale a no buscar', async () => {
      const { instance, messages } = await check({ buscar: `   ${NO_BREAK_SPACE} ` });
      expect(messages).toEqual([]);
      expect(instance.buscar).toBeUndefined();
    });

    it.each(['#JUZGADO#', '@ejemplo.com', 'estudio@ejemplo.com', '50%', 'a_b', '¿oficio?'])(
      'acepta %j',
      async (buscar) => {
        const { instance, messages } = await check({ buscar });
        expect(messages).toEqual([]);
        expect(instance.buscar).toBe(buscar);
      },
    );

    it.each(['<script>', 'a = b', '{x}', 'a | b', 'a \\ b', '😀', 'a * b'])(
      'rechaza %j',
      async (buscar) => {
        expect((await check({ buscar })).messages).toEqual([
          LIST_MODELOS_MESSAGES.buscarCharacters,
        ]);
      },
    );

    it('acepta hasta 100 caracteres, contados después de convertir', async () => {
      expect((await check({ buscar: 'a'.repeat(100) })).messages).toEqual([]);
      expect((await check({ buscar: 'a'.repeat(101) })).messages).toEqual([
        LIST_MODELOS_MESSAGES.buscarTooLong,
      ]);
      // 99 caracteres con un "…" son 101 después de convertir.
      expect((await check({ buscar: `${'a'.repeat(98)}…` })).messages).toEqual([
        LIST_MODELOS_MESSAGES.buscarTooLong,
      ]);
    });

    it('un salto de línea pasa a ser un espacio', async () => {
      expect((await check({ buscar: 'oficio\nal banco' })).instance.buscar).toBe('oficio al banco');
    });

    it('el mensaje no repite el texto buscado', async () => {
      const { messages } = await check({ buscar: 'MARCASECRETA <' });
      expect(messages.join(' ')).not.toContain('MARCASECRETA');
    });
  });

  it('rechaza un tipo y un fuero fuera de la lista', async () => {
    expect((await check({ tipo: 'carta' })).messages).toEqual([MODELO_MESSAGES.tipo]);
    expect((await check({ fuero: 'marítimo' })).messages).toEqual([CAUSA_MESSAGES.fuero]);
  });

  it('acepta el fuero otro, que filtra solo los modelos sin un fuero específico', async () => {
    expect((await check({ fuero: 'otro' })).instance.fuero).toBe('otro');
  });

  it.each(['si', '1', 'TRUE'])('rechaza incluirDesactivados %j', async (incluirDesactivados) => {
    expect((await check({ incluirDesactivados })).messages).toEqual([
      LIST_MODELOS_MESSAGES.incluirDesactivados,
    ]);
  });

  it('convierte incluirDesactivados false', async () => {
    expect((await check({ incluirDesactivados: 'false' })).instance.incluirDesactivados).toBe(
      false,
    );
  });

  it('rechaza un parámetro desconocido', async () => {
    const { messages } = await check({ desde: '2020-01-01' });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatch(/no está permitido/);
  });

  it('los mensajes son los del plan', () => {
    expect(LIST_MODELOS_MESSAGES).toEqual({
      pagina: 'La página debe ser un número entero mayor o igual a 1',
      buscarCharacters: 'La búsqueda tiene caracteres no permitidos',
      buscarTooLong: 'La búsqueda puede tener hasta 100 caracteres',
      incluirDesactivados: 'El filtro incluirDesactivados debe ser true o false',
    });
  });
});

describe('ReactivateModeloDto (RF-27)', () => {
  async function checkBody(body: object) {
    const instance = plainToInstance(ReactivateModeloDto, body);
    const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
    return formatValidationErrors(errors);
  }

  it('acepta un cuerpo vacío y la confirmación', async () => {
    expect(await checkBody({})).toEqual([]);
    expect(await checkBody({ confirmarRepetido: true })).toEqual([]);
    expect(await checkBody({ confirmarRepetido: false })).toEqual([]);
  });

  it('rechaza una confirmación que no es booleana', async () => {
    expect(await checkBody({ confirmarRepetido: 'si' })).toEqual([CAUSA_MESSAGES.confirmation]);
  });

  it('rechaza otros campos', async () => {
    const messages = await checkBody({ activo: true });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatch(/no está permitido/);
  });
});
