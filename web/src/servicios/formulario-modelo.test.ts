import { describe, expect, it } from 'vitest';
import {
  buildCreateModelData,
  buildUpdateModelData,
  convertedTextLength,
  EMPTY_MODEL_FILTERS,
  EMPTY_MODEL_FORM,
  MODELO_MESSAGES,
  type ModelForm,
  modelFormFrom,
  toListQuery,
  unknownMarks,
  validateModelFilters,
  validateModelForm,
} from './formulario-modelo';
import type { ModeloDetalle } from './modelos-escritos';

const VALID: ModelForm = {
  titulo: 'Oficio al Registro de la Propiedad',
  tipo: 'oficio',
  fuero: 'civil',
  descripcion: 'Para pedir un informe de dominio',
  texto: 'Señor Director:\n\nEn los autos "#CARATULA#", Expte. Nº #NUMERO_EXPEDIENTE#.',
};

const MODELO: ModeloDetalle = {
  id: 8,
  titulo: VALID.titulo,
  tipo: 'oficio',
  fuero: 'civil',
  descripcion: VALID.descripcion,
  texto: VALID.texto,
  variables: ['CARATULA', 'NUMERO_EXPEDIENTE'],
  activo: true,
  creadoPor: { id: 1, nombre: 'Laura', apellido: 'Sabalette', activo: true },
  creadoEn: '2026-10-10T12:00:00.000Z',
  modificadoPor: null,
  modificadoEn: null,
};

// Marca para verificar que ningún mensaje repite lo escrito.
const MARK = 'MARCASECRETA';

describe('validateModelForm (RF-1, RF-6)', () => {
  it('acepta un formulario completo y uno solo con lo obligatorio', () => {
    expect(validateModelForm(VALID)).toEqual([]);
    expect(validateModelForm({ ...VALID, descripcion: '', fuero: 'otro' })).toEqual([]);
  });

  it('el formulario vacío nace con el fuero Otro y le faltan el título, el tipo y el texto', () => {
    expect(EMPTY_MODEL_FORM.fuero).toBe('otro');
    expect(validateModelForm(EMPTY_MODEL_FORM)).toEqual([
      'Indicá el título del modelo',
      'Indicá el tipo de escrito',
      'Indicá el texto del modelo',
    ]);
  });

  it('un título o un texto con solo espacios cuentan como vacíos', () => {
    expect(validateModelForm({ ...VALID, titulo: '   ', texto: ' \n \n ' })).toEqual([
      'Indicá el título del modelo',
      'Indicá el texto del modelo',
    ]);
  });

  it('controla el largo del título y de la descripción', () => {
    expect(validateModelForm({ ...VALID, titulo: 'a'.repeat(150) })).toEqual([]);
    expect(validateModelForm({ ...VALID, titulo: 'a'.repeat(151) })).toEqual([
      'El título no puede tener más de 150 caracteres',
    ]);
    expect(validateModelForm({ ...VALID, descripcion: 'a'.repeat(500) })).toEqual([]);
    expect(validateModelForm({ ...VALID, descripcion: 'a'.repeat(501) })).toEqual([
      'La descripción no puede tener más de 500 caracteres',
    ]);
  });

  it('controla el largo del texto después de convertirlo', () => {
    expect(validateModelForm({ ...VALID, texto: 'a'.repeat(50_000) })).toEqual([]);
    expect(validateModelForm({ ...VALID, texto: 'a'.repeat(50_001) })).toEqual([
      'El texto no puede tener más de 50.000 caracteres',
    ]);
    // 49.999 caracteres con un "…" son 50.001 después de convertir.
    expect(validateModelForm({ ...VALID, texto: `${'a'.repeat(49_998)}…` })).toEqual([
      'El texto no puede tener más de 50.000 caracteres',
    ]);
    // La sangría que se quita no cuenta.
    expect(validateModelForm({ ...VALID, texto: `      ${'a'.repeat(50_000)}` })).toEqual([]);
  });

  it('acepta un texto pegado con caracteres tipográficos y sangría, y un email', () => {
    const texto = '\t“Señor Juez”…\r\n\r\n\t• Domicilio: estudio@ejemplo.com [sic]';
    expect(validateModelForm({ ...VALID, texto })).toEqual([]);
  });

  it('rechaza los caracteres no permitidos de cada campo, sin repetir lo escrito', () => {
    const problems = validateModelForm({
      ...VALID,
      titulo: `${MARK} <b>`,
      descripcion: `${MARK} {x}`,
      texto: `${MARK} a = b`,
    });
    expect(problems).toEqual([
      'El título solo puede tener letras, números, espacios y los símbolos . , ; : / - _ ( ) " \' $ & # ° º ª',
      'La descripción solo puede tener letras, números, espacios y los símbolos . , ; : / - _ ( ) " \' $ & # ° º ª ¿ ? ¡ ! %',
      'El texto solo puede tener letras, números, espacios, saltos de línea y los símbolos . , ; : / - _ ( ) " \' $ & # ° º ª ¿ ? ¡ ! % @',
    ]);
    expect(problems.join(' ')).not.toContain(MARK);
  });

  it('el @ solo se acepta en el texto', () => {
    expect(validateModelForm({ ...VALID, titulo: 'Oficio a estudio@ejemplo.com' })).toHaveLength(1);
    expect(validateModelForm({ ...VALID, descripcion: 'Para estudio@ejemplo.com' })).toHaveLength(
      1,
    );
    expect(validateModelForm({ ...VALID, texto: 'Escribir a estudio@ejemplo.com' })).toEqual([]);
  });

  it('la descripción acepta los signos de pregunta y de exclamación; el título no', () => {
    expect(
      validateModelForm({ ...VALID, descripcion: '¿Para qué sirve? ¡Para todo! 100%' }),
    ).toEqual([]);
    expect(validateModelForm({ ...VALID, titulo: '¿Oficio?' })).toHaveLength(1);
  });

  it('rechaza las variables pegadas (RF-7)', () => {
    expect(validateModelForm({ ...VALID, texto: 'Entre #ACTORES##DEMANDADOS#.' })).toEqual([
      'Las variables tienen que estar separadas',
    ]);
    expect(validateModelForm({ ...VALID, texto: 'Entre #ACTORES#DEMANDADOS#.' })).toEqual([
      'Las variables tienen que estar separadas',
    ]);
    expect(validateModelForm({ ...VALID, texto: 'Entre #ACTORES# y #DEMANDADOS#.' })).toEqual([]);
  });

  it('rechaza las variables que no existen, con un mensaje que no las nombra (RF-10)', () => {
    const problems = validateModelForm({ ...VALID, texto: `Autos #CARATUAL# y #${MARK}#.` });
    expect(problems).toEqual(['El texto tiene variables que no existen']);
    expect(problems.join(' ')).not.toContain(MARK);
  });

  it('acepta las variables en minúsculas y con tilde, y un texto sin variables (RF-8, RF-12)', () => {
    expect(validateModelForm({ ...VALID, texto: 'Autos #carátula# del #Fecha#.' })).toEqual([]);
    expect(validateModelForm({ ...VALID, texto: 'Texto fijo, local # 3.' })).toEqual([]);
  });

  it('los mensajes son los de la API', () => {
    expect(MODELO_MESSAGES).toMatchObject({
      tituloRequired: 'Indicá el título del modelo',
      tipoRequired: 'Indicá el tipo de escrito',
      textoRequired: 'Indicá el texto del modelo',
      textoTooLong: 'El texto no puede tener más de 50.000 caracteres',
      descripcionTooLong: 'La descripción no puede tener más de 500 caracteres',
      joinedMarks: 'Las variables tienen que estar separadas',
      unknownVariables: 'El texto tiene variables que no existen',
      buscarCharacters: 'La búsqueda tiene caracteres no permitidos',
      buscarTooLong: 'La búsqueda puede tener hasta 100 caracteres',
    });
  });
});

describe('convertedTextLength y unknownMarks', () => {
  it('cuenta el texto como lo cuenta la API: después de convertirlo', () => {
    expect(convertedTextLength('   uno  \r\n   dos…  ')).toBe('uno\ndos...'.length);
    expect(convertedTextLength('')).toBe(0);
  });

  it('devuelve las marcas que no existen tal como se escribieron, sin repetir (RF-10)', () => {
    const texto = 'Autos #Caratual# de #demandado#, otra vez #Caratual# y #fecha#.';
    expect(unknownMarks(texto)).toEqual(['#Caratual#', '#demandado#']);
    expect(unknownMarks('Autos #carátula#.')).toEqual([]);
  });
});

describe('buildCreateModelData (RF-3, RF-8, RF-13)', () => {
  it('envía los textos convertidos y las marcas en la forma del catálogo', () => {
    expect(
      buildCreateModelData({
        titulo: '  Oficio   al “Registro” ',
        tipo: 'oficio',
        fuero: 'laboral',
        descripcion: ' Para pedir\ninformes ',
        texto: '\tSeñor Director:\r\n\r\n   Autos “#carátula#”… ',
      }),
    ).toEqual({
      titulo: 'Oficio al "Registro"',
      tipo: 'oficio',
      fuero: 'laboral',
      descripcion: 'Para pedir informes',
      texto: 'Señor Director:\n\nAutos "#CARATULA#"...',
    });
  });

  it('envía la descripción vacía como null', () => {
    expect(buildCreateModelData({ ...VALID, descripcion: '   ' }).descripcion).toBeNull();
  });
});

describe('buildUpdateModelData (RF-14)', () => {
  it('modelFormFrom arma el formulario con los datos del modelo', () => {
    expect(modelFormFrom(MODELO)).toEqual(VALID);
    expect(modelFormFrom({ ...MODELO, descripcion: null }).descripcion).toBe('');
  });

  it('sin cambios, no envía nada', () => {
    expect(buildUpdateModelData(modelFormFrom(MODELO), MODELO)).toEqual({});
  });

  it('escribir de otra forma una variable que ya estaba no es un cambio', () => {
    const form = { ...VALID, texto: VALID.texto.replace('#CARATULA#', '#carátula#') };
    expect(buildUpdateModelData(form, MODELO)).toEqual({});
  });

  it('envía solo lo que cambió', () => {
    expect(buildUpdateModelData({ ...VALID, titulo: 'Oficio al Banco' }, MODELO)).toEqual({
      titulo: 'Oficio al Banco',
    });
    expect(
      buildUpdateModelData(
        { ...VALID, tipo: 'cedula', fuero: 'otro', texto: 'Otro texto.' },
        MODELO,
      ),
    ).toEqual({ tipo: 'cedula', fuero: 'otro', texto: 'Otro texto.' });
  });

  it('una descripción vaciada se envía como null, y una agregada, con su texto', () => {
    expect(buildUpdateModelData({ ...VALID, descripcion: '' }, MODELO)).toEqual({
      descripcion: null,
    });
    expect(
      buildUpdateModelData({ ...VALID, descripcion: 'Nueva' }, { ...MODELO, descripcion: null }),
    ).toEqual({ descripcion: 'Nueva' });
  });
});

describe('filtros del listado (RF-21, RF-22)', () => {
  it('los filtros abren vacíos', () => {
    expect(EMPTY_MODEL_FILTERS).toEqual({
      buscar: '',
      tipo: '',
      fuero: '',
      incluirDesactivados: false,
    });
    expect(validateModelFilters(EMPTY_MODEL_FILTERS)).toEqual([]);
  });

  it('acepta una búsqueda con una variable, con un email y con signos permitidos', () => {
    for (const buscar of ['#JUZGADO#', '@ejemplo.com', '50% de (algo)', '   ']) {
      expect(validateModelFilters({ ...EMPTY_MODEL_FILTERS, buscar })).toEqual([]);
    }
  });

  it('rechaza una búsqueda con signos que permiten inyectar código', () => {
    for (const buscar of ['<script>', 'a = b', '{x}', 'a | b']) {
      expect(validateModelFilters({ ...EMPTY_MODEL_FILTERS, buscar })).toEqual([
        'La búsqueda tiene caracteres no permitidos',
      ]);
    }
  });

  it('una búsqueda entre corchetes se convierte a paréntesis y se acepta', () => {
    expect(validateModelFilters({ ...EMPTY_MODEL_FILTERS, buscar: '[sic]' })).toEqual([]);
  });

  it('acepta hasta 100 caracteres en la búsqueda', () => {
    expect(validateModelFilters({ ...EMPTY_MODEL_FILTERS, buscar: 'a'.repeat(100) })).toEqual([]);
    expect(validateModelFilters({ ...EMPTY_MODEL_FILTERS, buscar: 'a'.repeat(101) })).toEqual([
      'La búsqueda puede tener hasta 100 caracteres',
    ]);
  });

  it('toListQuery no envía los filtros vacíos', () => {
    expect(toListQuery(EMPTY_MODEL_FILTERS, 1)).toEqual({ pagina: 1 });
    expect(toListQuery({ ...EMPTY_MODEL_FILTERS, buscar: '   ' }, 3)).toEqual({ pagina: 3 });
  });

  it('toListQuery envía la búsqueda convertida y los filtros elegidos', () => {
    expect(
      toListQuery(
        {
          buscar: ' “cédula”  [sic] ',
          tipo: 'cedula',
          fuero: 'laboral',
          incluirDesactivados: true,
        },
        2,
      ),
    ).toEqual({
      pagina: 2,
      buscar: '"cédula" (sic)',
      tipo: 'cedula',
      fuero: 'laboral',
      incluirDesactivados: true,
    });
  });
});
