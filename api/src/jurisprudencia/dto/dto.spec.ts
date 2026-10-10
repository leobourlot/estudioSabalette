import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CAUSA_MESSAGES } from '../../causas/dto/reglas-causa.js';
import { allowedCharactersMessage as causaCharactersMessage } from '../../causas/validadores/texto-causa.js';
import { formatValidationErrors } from '../../configuracion/errores-de-validacion.js';
import { todayInBuenosAires } from '../../movimientos/reglas-movimientos.js';
import { allowedCharactersMessage as movementCharactersMessage } from '../../movimientos/validadores/texto-movimiento.js';
import { CreateFalloDto } from './crear-fallo.dto.js';
import { UpdateFalloDto } from './modificar-fallo.dto.js';
import { FALLO_MESSAGES } from './reglas-fallo.js';

type DtoClass<T> = new () => T;

/** Transforma y valida igual que el ValidationPipe global (whitelist + forbidNonWhitelisted). */
async function check<T extends object>(dto: DtoClass<T>, plain: object) {
  const instance = plainToInstance(dto, plain);
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
  return { instance, messages: formatValidationErrors(errors) };
}

const MINIMAL = {
  caratula: 'Pérez c/ López s/ daños',
  tribunal: 'CNCiv., Sala A',
  fuero: 'civil',
  fecha: '2019-05-03',
  sumario: 'La responsabilidad del dueño de la cosa es objetiva.',
  palabrasClave: ['daño moral'],
};

const COMPLETE = {
  ...MINIMAL,
  numero: '1234/2018',
  enlace:
    'https://sjconsulta.csjn.gov.ar/sjconsulta/documentos/verDocumentoById.html?idDocumento=7867721',
  confirmarRepetido: true,
};

// Marca para verificar que ningún mensaje repite el valor recibido (RNF de registros).
const MARK = 'MARCA-SECRETA-7731';

describe('CreateFalloDto', () => {
  it.each([
    ['solo los datos obligatorios', MINIMAL],
    ['todos los datos', COMPLETE],
  ])('acepta %s', async (_case, plain) => {
    expect((await check(CreateFalloDto, plain)).messages).toEqual([]);
  });

  it('convierte los textos antes de validar (RF-3)', async () => {
    const { instance, messages } = await check(CreateFalloDto, {
      ...MINIMAL,
      caratula: '  “Pérez”   c/ López\n s/ daños ',
      tribunal: 'CNCiv. – Sala A',
      numero: ' 1234/2018 ',
      sumario: '“La responsabilidad…”\r\n\r\n\t• Ver [...] el considerando §3.',
      palabrasClave: [' Daño  moral ', '“culpa”'],
    });

    expect(messages).toEqual([]);
    expect(instance.caratula).toBe('"Pérez" c/ López s/ daños');
    expect(instance.tribunal).toBe('CNCiv. - Sala A');
    expect(instance.numero).toBe('1234/2018');
    expect(instance.sumario).toBe(
      '"La responsabilidad..."\n\n - Ver (...) el considerando párr. 3.',
    );
    expect(instance.palabrasClave).toEqual(['Daño moral', '"culpa"']);
  });

  it('convierte el número y el enlace vacíos en null (RF-4, RF-6)', async () => {
    const { instance, messages } = await check(CreateFalloDto, {
      ...MINIMAL,
      numero: '  ',
      enlace: '   ',
    });

    expect(messages).toEqual([]);
    expect(instance.numero).toBeNull();
    expect(instance.enlace).toBeNull();
  });

  it('descarta las palabras clave repetidas: cuentan una sola vez para el máximo (RF-14)', async () => {
    const diez = Array.from({ length: 10 }, (_, index) => `palabra ${index}`);
    const { instance, messages } = await check(CreateFalloDto, {
      ...MINIMAL,
      palabrasClave: [...diez, 'PALABRA 0', 'palábra 1'],
    });

    expect(messages).toEqual([]);
    expect(instance.palabrasClave).toEqual(diez);
  });

  it.each([
    ['sin carátula', { caratula: undefined }, FALLO_MESSAGES.caratulaRequired],
    ['con la carátula solo con espacios', { caratula: '   ' }, FALLO_MESSAGES.caratulaRequired],
    [
      'con una carátula de 256 caracteres',
      { caratula: 'a'.repeat(256) },
      'La carátula no puede tener más de 255 caracteres',
    ],
    ['con < en la carátula', { caratula: 'Pérez <b>' }, causaCharactersMessage('La carátula')],
    ['sin tribunal', { tribunal: undefined }, FALLO_MESSAGES.tribunalRequired],
    [
      'con un tribunal de 151 caracteres',
      { tribunal: 'a'.repeat(151) },
      'El tribunal no puede tener más de 150 caracteres',
    ],
    ['con = en el tribunal', { tribunal: 'Sala=A' }, causaCharactersMessage('El tribunal')],
    ['sin fuero', { fuero: undefined }, CAUSA_MESSAGES.fuero],
    ['con un fuero fuera de la lista', { fuero: 'comercial' }, CAUSA_MESSAGES.fuero],
    [
      'con un número de 51 caracteres',
      { numero: '1'.repeat(51) },
      'El número no puede tener más de 50 caracteres',
    ],
    ['con { en el número', { numero: '12{3}' }, causaCharactersMessage('El número')],
    ['sin sumario', { sumario: undefined }, FALLO_MESSAGES.sumarioRequired],
    ['con el sumario solo con espacios', { sumario: ' \n\t ' }, FALLO_MESSAGES.sumarioRequired],
    [
      'con un sumario de 5.001 caracteres',
      { sumario: 'a'.repeat(5001) },
      FALLO_MESSAGES.sumarioTooLong,
    ],
    [
      'con un sumario de 4.999 caracteres y un "…"',
      { sumario: `${'a'.repeat(4998)}…` },
      FALLO_MESSAGES.sumarioTooLong,
    ],
    [
      'con un emoji en el sumario',
      { sumario: 'Fallo 😀' },
      movementCharactersMessage('El sumario'),
    ],
    ['con | en el sumario', { sumario: 'a | b' }, movementCharactersMessage('El sumario')],
  ])('rechaza un fallo %s', async (_case, changes, message) => {
    expect((await check(CreateFalloDto, { ...MINIMAL, ...changes })).messages).toEqual([message]);
  });

  it('acepta un sumario de exactamente 5.000 caracteres', async () => {
    expect(
      (await check(CreateFalloDto, { ...MINIMAL, sumario: 'a'.repeat(5000) })).messages,
    ).toEqual([]);
  });

  describe('fecha (RF-7, RF-8)', () => {
    const today = todayInBuenosAires(new Date());

    it.each([
      ['sin fecha', undefined, FALLO_MESSAGES.fechaRequired],
      ['con la fecha vacía', '', FALLO_MESSAGES.fechaRequired],
      ['con formato dd/mm/aaaa', '03/05/2019', FALLO_MESSAGES.fechaInvalid],
      ['con una fecha inexistente', '2023-02-29', FALLO_MESSAGES.fechaInvalid],
      ['con una fecha anterior al 01/01/1800', '1799-12-31', FALLO_MESSAGES.fechaBeforeMin],
      ['con una fecha futura', '2999-01-01', FALLO_MESSAGES.fechaFuture],
    ])('rechaza un fallo %s', async (_case, fecha, message) => {
      expect((await check(CreateFalloDto, { ...MINIMAL, fecha })).messages).toEqual([message]);
    });

    it.each([
      ['el 01/01/1800', '1800-01-01'],
      ['un fallo histórico de 1887', '1887-05-03'],
      ['el día actual en Buenos Aires', today],
    ])('acepta %s', async (_case, fecha) => {
      expect((await check(CreateFalloDto, { ...MINIMAL, fecha })).messages).toEqual([]);
    });
  });

  describe('palabras clave (RF-10, RF-14)', () => {
    it.each([
      ['sin palabras clave', undefined, FALLO_MESSAGES.keywordsList],
      ['con una lista vacía', [], FALLO_MESSAGES.keywordsRequired],
      ['con algo que no es una lista', 'daño moral', FALLO_MESSAGES.keywordsList],
      ['con un elemento que no es texto', ['daño', 3], FALLO_MESSAGES.keywordsList],
      [
        'con 11 palabras distintas',
        Array.from({ length: 11 }, (_, index) => `palabra ${index}`),
        FALLO_MESSAGES.keywordsMax,
      ],
      ['con una vacía después de convertir', ['daño', ' \u200B '], FALLO_MESSAGES.keywordEmpty],
      ['con una de 51 caracteres', ['a'.repeat(51)], FALLO_MESSAGES.keywordTooLong],
      ['con < en una palabra', ['daño <moral>'], causaCharactersMessage('La palabra clave')],
    ])('rechaza un fallo %s', async (_case, palabrasClave, message) => {
      expect((await check(CreateFalloDto, { ...MINIMAL, palabrasClave })).messages).toEqual([
        message,
      ]);
    });

    it('acepta una palabra de exactamente 50 caracteres y una formada solo por símbolos', async () => {
      expect(
        (await check(CreateFalloDto, { ...MINIMAL, palabrasClave: ['a'.repeat(50), '()'] }))
          .messages,
      ).toEqual([]);
    });
  });

  describe('enlace (RF-6, RF-8)', () => {
    it.each([
      ['http://', 'http://csjn.gov.ar', FALLO_MESSAGES.linkScheme],
      ['HTTPS://', 'HTTPS://csjn.gov.ar', FALLO_MESSAGES.linkScheme],
      ['javascript:', 'javascript:alert(1)', FALLO_MESSAGES.linkScheme],
      [
        'usuario antes del dominio',
        'https://csjn.gov.ar@sitio-falso.com',
        FALLO_MESSAGES.linkFormat,
      ],
      ['comillas', 'https://csjn.gov.ar/?q="x"', FALLO_MESSAGES.linkFormat],
      ['un valor que no es texto', 42, FALLO_MESSAGES.linkFormat],
      ['501 caracteres', `https://csjn.gov.ar/${'a'.repeat(481)}`, FALLO_MESSAGES.linkTooLong],
    ])('rechaza un enlace con %s', async (_case, enlace, message) => {
      expect((await check(CreateFalloDto, { ...MINIMAL, enlace })).messages).toEqual([message]);
    });

    it('acepta un enlace de exactamente 500 caracteres', async () => {
      const enlace = `https://csjn.gov.ar/${'a'.repeat(480)}`;
      expect(enlace).toHaveLength(500);
      expect((await check(CreateFalloDto, { ...MINIMAL, enlace })).messages).toEqual([]);
    });
  });

  it('rechaza una confirmación que no es booleana', async () => {
    expect((await check(CreateFalloDto, { ...MINIMAL, confirmarRepetido: 'si' })).messages).toEqual(
      [CAUSA_MESSAGES.confirmation],
    );
  });

  it('rechaza activo y otros campos desconocidos', async () => {
    const { messages } = await check(CreateFalloDto, { ...MINIMAL, activo: false, extra: 1 });
    expect(messages).toHaveLength(2);
    for (const message of messages) expect(message).toMatch(/no está permitido/);
  });

  it('ningún mensaje repite el valor recibido (RNF de registros)', async () => {
    const { messages } = await check(CreateFalloDto, {
      caratula: `${MARK} <`,
      tribunal: `${MARK} {`,
      fuero: MARK,
      fecha: MARK,
      numero: `${MARK}|`,
      sumario: `${MARK} 😀`,
      palabrasClave: [`${MARK} <`],
      enlace: `https://${MARK}`,
    });

    expect(messages.length).toBeGreaterThanOrEqual(7);
    for (const message of messages) expect(message).not.toContain(MARK);
  });
});

describe('UpdateFalloDto', () => {
  it('acepta un cuerpo vacío y cambios parciales', async () => {
    expect((await check(UpdateFalloDto, {})).messages).toEqual([]);
    expect((await check(UpdateFalloDto, { tribunal: 'CNCiv., Sala B' })).messages).toEqual([]);
  });

  it('null o vacío borra el número y el enlace', async () => {
    const { instance, messages } = await check(UpdateFalloDto, { numero: null, enlace: '' });

    expect(messages).toEqual([]);
    expect(instance.numero).toBeNull();
    expect(instance.enlace).toBeNull();
  });

  it('aplica las mismas validaciones que la carga', async () => {
    const { messages } = await check(UpdateFalloDto, {
      caratula: '',
      fecha: '2999-01-01',
      sumario: 'a'.repeat(5001),
      palabrasClave: [],
      enlace: 'http://csjn.gov.ar',
    });

    expect(messages).toEqual([
      FALLO_MESSAGES.caratulaRequired,
      FALLO_MESSAGES.fechaFuture,
      FALLO_MESSAGES.sumarioTooLong,
      FALLO_MESSAGES.keywordsRequired,
      FALLO_MESSAGES.linkScheme,
    ]);
  });

  it('rechaza activo como campo desconocido (RF-17)', async () => {
    const { messages } = await check(UpdateFalloDto, { activo: false });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatch(/no está permitido/);
  });
});
