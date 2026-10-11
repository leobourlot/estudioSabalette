import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CAUSA_MESSAGES } from '../../causas/dto/reglas-causa.js';
import { allowedCharactersMessage as causaCharactersMessage } from '../../causas/validadores/texto-causa.js';
import { formatValidationErrors } from '../../configuracion/errores-de-validacion.js';
import { CreateModeloDto } from './crear-modelo.dto.js';
import { UpdateModeloDto } from './modificar-modelo.dto.js';
import { MODELO_MESSAGES } from './reglas-modelo.js';

type DtoClass<T> = new () => T;

/** Transforma y valida igual que el ValidationPipe global (whitelist + forbidNonWhitelisted). */
async function check<T extends object>(dto: DtoClass<T>, plain: object) {
  const instance = plainToInstance(dto, plain);
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
  return { instance, messages: formatValidationErrors(errors) };
}

const MINIMAL = {
  titulo: 'Oficio al Registro de la Propiedad',
  tipo: 'oficio',
  texto: 'Señor Director:\n\nEn los autos "#CARATULA#".',
};

const COMPLETE = {
  ...MINIMAL,
  fuero: 'civil',
  descripcion: 'Para pedir un informe de dominio',
  confirmarRepetido: true,
};

// Marca para verificar que ningún mensaje repite el valor recibido (RNF de registros).
const MARK = 'MARCASECRETA';

describe('mensajes de los modelos (RF-6, RF-7, RF-10)', () => {
  it('son los de la spec y del plan', () => {
    expect(MODELO_MESSAGES).toEqual({
      tituloRequired: 'Indicá el título del modelo',
      tipoRequired: 'Indicá el tipo de escrito',
      tipo: 'El tipo de escrito debe ser demanda, contestación de demanda, escrito de trámite, recurso, oficio, cédula u otro',
      descripcionTooLong: 'La descripción no puede tener más de 500 caracteres',
      descripcionCharacters:
        'La descripción solo puede tener letras, números, espacios y los símbolos . , ; : / - _ ( ) " \' $ & # ° º ª ¿ ? ¡ ! %',
      textoRequired: 'Indicá el texto del modelo',
      textoTooLong: 'El texto no puede tener más de 50.000 caracteres',
      textoCharacters:
        'El texto solo puede tener letras, números, espacios, saltos de línea y los símbolos . , ; : / - _ ( ) " \' $ & # ° º ª ¿ ? ¡ ! % @',
      joinedMarks: 'Las variables tienen que estar separadas',
      unknownVariables: 'El texto tiene variables que no existen',
    });
  });
});

describe('CreateModeloDto', () => {
  it.each([
    ['solo los datos obligatorios', MINIMAL],
    ['todos los datos', COMPLETE],
  ])('acepta %s', async (_case, plain) => {
    expect((await check(CreateModeloDto, plain)).messages).toEqual([]);
  });

  it('sin fuero, el fuero queda sin indicar: lo completa el service con "otro" (RF-1)', async () => {
    const { instance, messages } = await check(CreateModeloDto, MINIMAL);
    expect(messages).toEqual([]);
    expect(instance.fuero).toBeUndefined();
  });

  it('convierte los textos antes de validar (RF-3)', async () => {
    const { instance, messages } = await check(CreateModeloDto, {
      ...MINIMAL,
      titulo: '  Oficio   al “Registro”\n de la Propiedad ',
      descripcion: ' Para pedir\ninformes… ',
      texto: '\tSeñor Director:\r\n\r\n    Autos “#CARATULA#”… [sic]\r\n\t• estudio@ejemplo.com  ',
    });

    expect(messages).toEqual([]);
    expect(instance.titulo).toBe('Oficio al "Registro" de la Propiedad');
    expect(instance.descripcion).toBe('Para pedir informes...');
    expect(instance.texto).toBe(
      'Señor Director:\n\nAutos "#CARATULA#"... (sic)\n- estudio@ejemplo.com',
    );
  });

  it('guarda las marcas en la forma del catálogo (RF-8)', async () => {
    const { instance, messages } = await check(CreateModeloDto, {
      ...MINIMAL,
      texto: 'Autos #carátula#, #Numero_Expediente#, del #fecha_en_letras#. Local # 3.',
    });

    expect(messages).toEqual([]);
    expect(instance.texto).toBe(
      'Autos #CARATULA#, #NUMERO_EXPEDIENTE#, del #FECHA_EN_LETRAS#. Local # 3.',
    );
  });

  it('acepta un texto sin ninguna variable (RF-12)', async () => {
    expect(
      (await check(CreateModeloDto, { ...MINIMAL, texto: 'Texto fijo, sin variables.' })).messages,
    ).toEqual([]);
  });

  it('convierte la descripción vacía en null (RF-3)', async () => {
    for (const descripcion of ['', '   ', ' \n ']) {
      const { instance, messages } = await check(CreateModeloDto, { ...MINIMAL, descripcion });
      expect(messages).toEqual([]);
      expect(instance.descripcion).toBeNull();
    }
  });

  it('exige el título, el tipo y el texto (RF-6)', async () => {
    expect((await check(CreateModeloDto, {})).messages).toEqual([
      MODELO_MESSAGES.tituloRequired,
      MODELO_MESSAGES.tipoRequired,
      MODELO_MESSAGES.textoRequired,
    ]);
    expect(
      (await check(CreateModeloDto, { titulo: '   ', tipo: '', texto: ' \n \t ' })).messages,
    ).toEqual([
      MODELO_MESSAGES.tituloRequired,
      MODELO_MESSAGES.tipoRequired,
      MODELO_MESSAGES.textoRequired,
    ]);
  });

  it('controla el largo de cada texto', async () => {
    const tooLong = await check(CreateModeloDto, {
      titulo: 'a'.repeat(151),
      tipo: 'oficio',
      descripcion: 'a'.repeat(501),
      texto: 'a'.repeat(50_001),
    });
    expect(tooLong.messages).toEqual([
      'El título no puede tener más de 150 caracteres',
      MODELO_MESSAGES.descripcionTooLong,
      MODELO_MESSAGES.textoTooLong,
    ]);

    const fits = await check(CreateModeloDto, {
      titulo: 'a'.repeat(150),
      tipo: 'oficio',
      descripcion: 'a'.repeat(500),
      texto: 'a'.repeat(50_000),
    });
    expect(fits.messages).toEqual([]);
  });

  it('cuenta el largo del texto después de convertirlo (RF-3)', async () => {
    // 49.999 caracteres con un "…" son 50.001 después de convertir.
    const longer = await check(CreateModeloDto, { ...MINIMAL, texto: `${'a'.repeat(49_998)}…` });
    expect(longer.messages).toEqual([MODELO_MESSAGES.textoTooLong]);
    // La sangría que se quita no cuenta.
    const indented = await check(CreateModeloDto, {
      ...MINIMAL,
      texto: `        ${'a'.repeat(50_000)}`,
    });
    expect(indented.messages).toEqual([]);
  });

  it('rechaza los caracteres no permitidos de cada texto (RF-4)', async () => {
    const { messages } = await check(CreateModeloDto, {
      ...MINIMAL,
      titulo: 'Oficio <b>',
      descripcion: 'Para {x}',
      texto: 'a = b',
    });
    expect(messages).toEqual([
      causaCharactersMessage('El título'),
      MODELO_MESSAGES.descripcionCharacters,
      MODELO_MESSAGES.textoCharacters,
    ]);
  });

  it('el @ solo se acepta en el texto (RF-4)', async () => {
    expect(
      (await check(CreateModeloDto, { ...MINIMAL, titulo: 'Oficio a estudio@ejemplo.com' }))
        .messages,
    ).toEqual([causaCharactersMessage('El título')]);
    expect(
      (await check(CreateModeloDto, { ...MINIMAL, descripcion: 'Para estudio@ejemplo.com' }))
        .messages,
    ).toEqual([MODELO_MESSAGES.descripcionCharacters]);
    expect(
      (await check(CreateModeloDto, { ...MINIMAL, texto: 'Escribir a estudio@ejemplo.com' }))
        .messages,
    ).toEqual([]);
  });

  it('la descripción acepta ¿ ? ¡ ! %, y el título no', async () => {
    expect(
      (await check(CreateModeloDto, { ...MINIMAL, descripcion: '¿Para qué? ¡Para todo! 100%' }))
        .messages,
    ).toEqual([]);
    expect((await check(CreateModeloDto, { ...MINIMAL, titulo: '¿Oficio?' })).messages).toEqual([
      causaCharactersMessage('El título'),
    ]);
  });

  it.each(['Entre #ACTORES##DEMANDADOS#.', 'Entre #actores#demandados#.'])(
    'rechaza las variables pegadas: %s (RF-7)',
    async (texto) => {
      expect((await check(CreateModeloDto, { ...MINIMAL, texto })).messages).toEqual([
        MODELO_MESSAGES.joinedMarks,
      ]);
    },
  );

  it('rechaza las variables que no existen, con un mensaje que no las nombra (RF-10)', async () => {
    const { messages } = await check(CreateModeloDto, {
      ...MINIMAL,
      texto: `Autos #CARATUAL#, #DEMANDADO# y #${MARK}#.`,
    });
    expect(messages).toEqual([MODELO_MESSAGES.unknownVariables]);
    expect(messages.join(' ')).not.toContain(MARK);
    expect(messages.join(' ')).not.toContain('CARATUAL');
  });

  it('rechaza un tipo y un fuero fuera de la lista', async () => {
    expect(
      (await check(CreateModeloDto, { ...MINIMAL, tipo: 'carta', fuero: 'marítimo' })).messages,
    ).toEqual([MODELO_MESSAGES.tipo, CAUSA_MESSAGES.fuero]);
  });

  it('rechaza los textos que no son textos', async () => {
    const { messages } = await check(CreateModeloDto, {
      titulo: 7,
      tipo: 7,
      descripcion: ['x'],
      texto: { a: 1 },
    });
    expect(messages).toEqual([
      MODELO_MESSAGES.tituloRequired,
      MODELO_MESSAGES.tipo,
      MODELO_MESSAGES.descripcionCharacters,
      MODELO_MESSAGES.textoCharacters,
    ]);
  });

  it('rechaza una confirmación que no es booleana', async () => {
    expect(
      (await check(CreateModeloDto, { ...MINIMAL, confirmarRepetido: 'si' })).messages,
    ).toEqual([CAUSA_MESSAGES.confirmation]);
  });

  it('rechaza activo y otros campos desconocidos', async () => {
    const { messages } = await check(CreateModeloDto, { ...MINIMAL, activo: false, extra: 1 });
    expect(messages).toHaveLength(2);
    for (const message of messages) expect(message).toMatch(/no está permitido/);
  });

  it('ningún mensaje repite el valor recibido (RNF de registros)', async () => {
    const { messages } = await check(CreateModeloDto, {
      titulo: `${MARK} <`,
      tipo: MARK,
      fuero: MARK,
      descripcion: `${MARK} {`,
      texto: `${MARK} 😀 #${MARK}#`,
      confirmarRepetido: MARK,
    });
    expect(messages).toHaveLength(6);
    expect(messages.join(' ')).not.toContain(MARK);
  });
});

describe('UpdateModeloDto', () => {
  it('acepta un cuerpo vacío y cada dato por separado', async () => {
    expect((await check(UpdateModeloDto, {})).messages).toEqual([]);
    for (const [campo, valor] of Object.entries(COMPLETE)) {
      expect((await check(UpdateModeloDto, { [campo]: valor })).messages).toEqual([]);
    }
  });

  it('convierte los textos y las marcas igual que en la carga', async () => {
    const { instance, messages } = await check(UpdateModeloDto, {
      titulo: ' Oficio  “nuevo” ',
      texto: '   Autos #carátula#…  ',
    });
    expect(messages).toEqual([]);
    expect(instance.titulo).toBe('Oficio "nuevo"');
    expect(instance.texto).toBe('Autos #CARATULA#...');
  });

  it('null o vacío borra la descripción', async () => {
    for (const descripcion of [null, '', '   ']) {
      const { instance, messages } = await check(UpdateModeloDto, { descripcion });
      expect(messages).toEqual([]);
      expect(instance.descripcion).toBeNull();
    }
  });

  it('un dato presente se valida como en la carga', async () => {
    const { messages } = await check(UpdateModeloDto, {
      titulo: '   ',
      tipo: 'carta',
      fuero: 'marítimo',
      descripcion: 'a'.repeat(501),
      texto: 'Autos #CARATUAL#.',
      confirmarRepetido: 'si',
    });
    expect(messages).toEqual([
      MODELO_MESSAGES.tituloRequired,
      MODELO_MESSAGES.tipo,
      CAUSA_MESSAGES.fuero,
      MODELO_MESSAGES.descripcionTooLong,
      MODELO_MESSAGES.unknownVariables,
      CAUSA_MESSAGES.confirmation,
    ]);
  });

  it('un título o un texto vacíos no se aceptan: no se pueden borrar', async () => {
    expect((await check(UpdateModeloDto, { titulo: '' })).messages).toEqual([
      MODELO_MESSAGES.tituloRequired,
    ]);
    expect((await check(UpdateModeloDto, { texto: ' \n ' })).messages).toEqual([
      MODELO_MESSAGES.textoRequired,
    ]);
    expect((await check(UpdateModeloDto, { tipo: '' })).messages).toEqual([
      MODELO_MESSAGES.tipoRequired,
    ]);
  });

  it('rechaza activo como campo desconocido (RF-14)', async () => {
    const { messages } = await check(UpdateModeloDto, { activo: false });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatch(/no está permitido/);
  });
});
