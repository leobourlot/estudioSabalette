import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { formatValidationErrors } from '../../configuracion/errores-de-validacion.js';
import { allowedCharactersMessage } from '../validadores/texto-causa.js';
import { CreateCausaDto } from './crear-causa.dto.js';
import { ListCausasQueryDto } from './listar-causas.dto.js';
import { UpdateCausaDto } from './modificar-causa.dto.js';
import { CAUSA_MESSAGES, principalCaseViolation } from './reglas-causa.js';

type DtoClass<T> = new () => T;

/** Transforma y valida igual que el ValidationPipe global (whitelist + forbidNonWhitelisted). */
async function check<T extends object>(dto: DtoClass<T>, plain: object) {
  const instance = plainToInstance(dto, plain);
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
  return { instance, messages: formatValidationErrors(errors) };
}

const PARTY = { rol: 'actor', tipoPersona: 'fisica', nombre: 'Juan', apellido: 'Pérez' };

const MINIMAL = {
  caratula: 'Pérez, Juan c/ Gómez S.A. s/ daños y perjuicios',
  fuero: 'civil',
  responsableId: 1,
  partes: [PARTY],
};

const COMPLETE = {
  ...MINIMAL,
  numeroExpediente: '1234/2024',
  juzgado: 'Juzgado Civil y Comercial N° 3',
  estado: 'paralizada',
  esIncidente: true,
  expedientePrincipal: '1000/2023',
  colaboradorIds: [2, 3],
  confirmarExpedienteRepetido: true,
};

describe('CreateCausaDto', () => {
  it.each([
    ['solo los datos obligatorios', MINIMAL],
    ['todos los datos', COMPLETE],
  ])('acepta %s', async (_case, plain) => {
    expect((await check(CreateCausaDto, plain)).messages).toEqual([]);
  });

  it('recorta los textos, une las tildes combinables y convierte los vacíos en null (RF-3, RF-4)', async () => {
    const { instance, messages } = await check(CreateCausaDto, {
      ...MINIMAL,
      caratula: '  Pérez c/ Gómez  ',
      numeroExpediente: '   ',
      juzgado: '',
    });

    expect(messages).toEqual([]);
    expect(instance.caratula).toBe('Pérez c/ Gómez');
    expect(instance.numeroExpediente).toBeNull();
    expect(instance.juzgado).toBeNull();
  });

  it('no valida el interior de las partes: lo hace el service, una por una (RF-7)', async () => {
    const { instance, messages } = await check(CreateCausaDto, {
      ...MINIMAL,
      partes: [{ rol: 'inexistente', campoDesconocido: true }],
    });

    expect(messages).toEqual([]);
    expect(instance.partes).toEqual([{ rol: 'inexistente', campoDesconocido: true }]);
  });

  it.each([
    ['falta la carátula', { caratula: undefined }, 'La carátula es obligatoria'],
    ['la carátula está vacía', { caratula: '   ' }, 'La carátula es obligatoria'],
    [
      'la carátula es larga',
      { caratula: 'a'.repeat(256) },
      'La carátula no puede tener más de 255 caracteres',
    ],
    [
      'la carátula tiene un emoji',
      { caratula: 'Pérez 😀' },
      allowedCharactersMessage('La carátula'),
    ],
    [
      'la carátula tiene un salto de línea',
      { caratula: 'Pérez\nGómez' },
      allowedCharactersMessage('La carátula'),
    ],
    [
      'el número es largo',
      { numeroExpediente: '1'.repeat(51) },
      'El número de expediente no puede tener más de 50 caracteres',
    ],
    [
      'el número tiene un símbolo no permitido',
      { numeroExpediente: '1234*2024' },
      allowedCharactersMessage('El número de expediente'),
    ],
    [
      'el juzgado es largo',
      { juzgado: 'a'.repeat(151) },
      'El juzgado no puede tener más de 150 caracteres',
    ],
    [
      'el juzgado tiene una tabulación',
      { juzgado: 'Civil\t3' },
      allowedCharactersMessage('El juzgado'),
    ],
    ['falta el fuero', { fuero: undefined }, CAUSA_MESSAGES.fuero],
    ['el fuero no existe', { fuero: 'comercial' }, CAUSA_MESSAGES.fuero],
    ['el estado no existe', { estado: 'cerrada' }, CAUSA_MESSAGES.estado],
    ['la marca de incidente no es booleana', { esIncidente: 'si' }, CAUSA_MESSAGES.esIncidente],
    ['falta el responsable', { responsableId: undefined }, CAUSA_MESSAGES.responsableId],
    ['el responsable no es un id', { responsableId: 'uno' }, CAUSA_MESSAGES.responsableId],
    ['el responsable es cero', { responsableId: 0 }, CAUSA_MESSAGES.responsableId],
    ['los colaboradores no son una lista', { colaboradorIds: 2 }, CAUSA_MESSAGES.colaboradorIds],
    ['un colaborador no es un id', { colaboradorIds: [2, 'x'] }, CAUSA_MESSAGES.colaboradorIds],
    ['faltan las partes', { partes: undefined }, CAUSA_MESSAGES.partesList],
    ['las partes no son una lista', { partes: PARTY }, CAUSA_MESSAGES.partesList],
    ['la lista de partes está vacía', { partes: [] }, 'La causa debe tener al menos una parte'],
    ['una parte no es un objeto', { partes: [PARTY, 'Juan'] }, CAUSA_MESSAGES.parteObject],
    [
      'la confirmación no es booleana',
      { confirmarExpedienteRepetido: 'si' },
      CAUSA_MESSAGES.confirmation,
    ],
  ])('rechaza si %s (RF-1, RF-4, RF-5)', async (_case, changes, message) => {
    expect((await check(CreateCausaDto, { ...MINIMAL, ...changes })).messages).toEqual([message]);
  });

  describe('incidente (RF-10)', () => {
    it('exige el número del expediente principal en un incidente', async () => {
      expect((await check(CreateCausaDto, { ...MINIMAL, esIncidente: true })).messages).toEqual([
        'Indicá el número del expediente principal',
      ]);
      expect(
        (await check(CreateCausaDto, { ...MINIMAL, esIncidente: true, expedientePrincipal: ' ' }))
          .messages,
      ).toEqual(['Indicá el número del expediente principal']);
    });

    it('rechaza el número del expediente principal si no es incidente', async () => {
      expect(
        (await check(CreateCausaDto, { ...MINIMAL, expedientePrincipal: '1000/2023' })).messages,
      ).toEqual(['Solo un incidente lleva número de expediente principal']);
    });

    it('valida largo y caracteres del número del expediente principal', async () => {
      const incident = { ...MINIMAL, esIncidente: true };
      expect(
        (await check(CreateCausaDto, { ...incident, expedientePrincipal: '1'.repeat(51) }))
          .messages,
      ).toEqual(['El número del expediente principal no puede tener más de 50 caracteres']);
      expect(
        (await check(CreateCausaDto, { ...incident, expedientePrincipal: '1000😀' })).messages,
      ).toEqual([allowedCharactersMessage('El número del expediente principal')]);
    });
  });

  it.each(['activa', 'claveExpediente', 'numeroExpedienteBusqueda', 'creadoPorId'])(
    'no permite enviar %s',
    async (field) => {
      expect((await check(CreateCausaDto, { ...MINIMAL, [field]: 1 })).messages).toEqual([
        `El campo ${field} no está permitido`,
      ]);
    },
  );
});

describe('UpdateCausaDto (RF-11)', () => {
  it('acepta un cuerpo vacío y cambios parciales', async () => {
    expect((await check(UpdateCausaDto, {})).messages).toEqual([]);
    expect((await check(UpdateCausaDto, { estado: 'finalizada' })).messages).toEqual([]);
  });

  it('borra un opcional con null o con texto vacío', async () => {
    const { instance, messages } = await check(UpdateCausaDto, {
      numeroExpediente: null,
      juzgado: '  ',
    });

    expect(messages).toEqual([]);
    expect(instance.numeroExpediente).toBeNull();
    expect(instance.juzgado).toBeNull();
  });

  it('no deja la carátula vacía', async () => {
    expect((await check(UpdateCausaDto, { caratula: null })).messages).toEqual([
      'La carátula es obligatoria',
    ]);
    expect((await check(UpdateCausaDto, { caratula: '' })).messages).toEqual([
      'La carátula es obligatoria',
    ]);
  });

  it('aplica las mismas reglas de formato que el alta', async () => {
    expect((await check(UpdateCausaDto, { fuero: 'comercial' })).messages).toEqual([
      CAUSA_MESSAGES.fuero,
    ]);
    expect((await check(UpdateCausaDto, { juzgado: 'Civil 😀' })).messages).toEqual([
      allowedCharactersMessage('El juzgado'),
    ]);
  });

  it('controla el expediente principal cuando el cuerpo trae la marca de incidente (RF-10)', async () => {
    expect(
      (await check(UpdateCausaDto, { esIncidente: true, expedientePrincipal: null })).messages,
    ).toEqual(['Indicá el número del expediente principal']);
    expect(
      (await check(UpdateCausaDto, { esIncidente: false, expedientePrincipal: '1000/2023' }))
        .messages,
    ).toEqual(['Solo un incidente lleva número de expediente principal']);
    // Sin el número en el cuerpo, el service lo controla contra lo guardado.
    expect((await check(UpdateCausaDto, { esIncidente: true })).messages).toEqual([]);
    expect((await check(UpdateCausaDto, { expedientePrincipal: '1000/2023' })).messages).toEqual(
      [],
    );
  });

  it.each(['activa', 'responsableId', 'partes', 'colaboradorIds'])(
    'no permite enviar %s: tiene su propia acción (RF-11)',
    async (field) => {
      expect((await check(UpdateCausaDto, { [field]: 1 })).messages).toEqual([
        `El campo ${field} no está permitido`,
      ]);
    },
  );
});

describe('principalCaseViolation (RF-10)', () => {
  it('exige el número en un incidente y lo rechaza fuera de él', () => {
    expect(principalCaseViolation(true, '1000/2023')).toBeNull();
    expect(principalCaseViolation(true, null)).toBe('Indicá el número del expediente principal');
    expect(principalCaseViolation(false, null)).toBeNull();
    expect(principalCaseViolation(false, '1000/2023')).toBe(
      'Solo un incidente lleva número de expediente principal',
    );
  });
});

describe('ListCausasQueryDto (RF-36 a RF-39)', () => {
  it('convierte los parámetros de la URL', async () => {
    const { instance, messages } = await check(ListCausasQueryDto, {
      pagina: '2',
      buscar: '  pérez ',
      fuero: 'laboral',
      estado: 'archivada',
      responsableId: '4',
      mias: 'true',
      responsableDesactivado: 'false',
      incluirDesactivadas: 'true',
    });

    expect(messages).toEqual([]);
    expect(instance).toMatchObject({
      pagina: 2,
      buscar: 'pérez',
      fuero: 'laboral',
      estado: 'archivada',
      responsableId: 4,
      mias: true,
      responsableDesactivado: false,
      incluirDesactivadas: true,
    });
  });

  it('acepta la consulta sin parámetros', async () => {
    expect((await check(ListCausasQueryDto, {})).messages).toEqual([]);
  });

  it.each([
    ['la página es cero', { pagina: '0' }, 'La página debe ser un número entero mayor o igual a 1'],
    [
      'la búsqueda es larga',
      { buscar: 'a'.repeat(101) },
      'La búsqueda no puede tener más de 100 caracteres',
    ],
    ['el fuero no existe', { fuero: 'comercial' }, CAUSA_MESSAGES.fuero],
    ['el estado no existe', { estado: 'cerrada' }, CAUSA_MESSAGES.estado],
    ['el responsable no es un id', { responsableId: 'x' }, CAUSA_MESSAGES.responsableId],
    ['un filtro no es booleano', { mias: 'si' }, 'El filtro mias debe ser true o false'],
  ])('rechaza si %s', async (_case, query, message) => {
    expect((await check(ListCausasQueryDto, query)).messages).toEqual([message]);
  });

  it('rechaza parámetros desconocidos', async () => {
    expect((await check(ListCausasQueryDto, { orden: 'asc' })).messages).toEqual([
      'El campo orden no está permitido',
    ]);
  });
});
