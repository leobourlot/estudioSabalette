import { describe, expect, it } from 'vitest';
import type { RolProcesal } from '../causas/parte.entity.js';
import { type CasePartySource, type CaseSource, caseValues } from './completar-escrito.js';
import { VARIABLES } from './variables.js';

const NOW = new Date('2026-10-10T15:00:00Z');

let nextId = 1;

/** Parte que no es cliente: guarda sus propios datos. */
function fisica(
  rol: RolProcesal,
  nombre: string,
  apellido: string,
  dni: string | null = null,
): CasePartySource {
  return {
    id: nextId++,
    rol,
    vigente: true,
    clienteId: null,
    tipoPersona: 'fisica',
    nombre,
    apellido,
    razonSocial: null,
    dni,
    cuit: null,
    cliente: null,
  };
}

function juridica(
  rol: RolProcesal,
  razonSocial: string,
  cuit: string | null = null,
): CasePartySource {
  return {
    id: nextId++,
    rol,
    vigente: true,
    clienteId: null,
    tipoPersona: 'juridica',
    nombre: null,
    apellido: null,
    razonSocial,
    dni: null,
    cuit,
    cliente: null,
  };
}

interface AccountOptions {
  domicilio?: string | null;
  activo?: boolean;
}

/** Parte cliente: sus datos están en la cuenta, no en la parte. */
function clienteFisico(
  rol: RolProcesal,
  nombre: string,
  apellido: string,
  dni: string,
  { domicilio = null, activo = true }: AccountOptions = {},
): CasePartySource {
  const id = nextId++;
  return {
    id,
    rol,
    vigente: true,
    clienteId: 1000 + id,
    tipoPersona: null,
    nombre: null,
    apellido: null,
    razonSocial: null,
    dni: null,
    cuit: null,
    cliente: {
      tipoPersona: 'fisica',
      razonSocial: null,
      dni,
      cuit: null,
      domicilio,
      usuario: { nombre, apellido, activo },
    },
  };
}

function clienteJuridico(
  rol: RolProcesal,
  razonSocial: string,
  cuit: string,
  { domicilio = null, activo = true }: AccountOptions = {},
): CasePartySource {
  const id = nextId++;
  return {
    id,
    rol,
    vigente: true,
    clienteId: 1000 + id,
    tipoPersona: null,
    nombre: null,
    apellido: null,
    razonSocial: null,
    dni: null,
    cuit: null,
    cliente: {
      tipoPersona: 'juridica',
      razonSocial,
      dni: null,
      cuit,
      domicilio,
      // Persona de contacto: nunca figura en un escrito (RF-34).
      usuario: { nombre: 'Carla', apellido: 'Contacto', activo },
    },
  };
}

function causa(overrides: Partial<CaseSource> = {}): CaseSource {
  return {
    caratula: 'Gómez, Luis c/ Acme S.A. s/ daños',
    numeroExpediente: '1234/2026',
    juzgado: 'Juzgado Civil Nº 3',
    fuero: 'civil',
    expedientePrincipal: null,
    responsable: { nombre: 'Laura', apellido: 'Sabalette', activo: true },
    partes: [],
    ...overrides,
  };
}

const valuesOf = (source: CaseSource, ahora: Date = NOW) => caseValues(source, ahora).valores;

describe('caseValues: datos de la causa (RF-9)', () => {
  it('devuelve un valor para cada variable del catálogo', () => {
    const valores = valuesOf(causa());
    expect(Object.keys(valores).sort()).toEqual(VARIABLES.map((v) => v.nombre).sort());
  });

  it('pone la carátula, el número, el juzgado y el fuero como se muestra en el panel', () => {
    const valores = valuesOf(causa({ fuero: 'laboral' }));
    expect(valores.CARATULA).toEqual({ texto: 'Gómez, Luis c/ Acme S.A. s/ daños', faltantes: [] });
    expect(valores.NUMERO_EXPEDIENTE).toEqual({ texto: '1234/2026', faltantes: [] });
    expect(valores.JUZGADO).toEqual({ texto: 'Juzgado Civil Nº 3', faltantes: [] });
    expect(valores.FUERO).toEqual({ texto: 'Laboral', faltantes: [] });
  });

  it.each([
    ['civil', 'Civil'],
    ['penal', 'Penal'],
    ['familia', 'Familia'],
    ['laboral', 'Laboral'],
    ['federal', 'Federal'],
    ['otro', 'Otro'],
  ] as const)('el fuero %s se escribe %s', (fuero, etiqueta) => {
    expect(valuesOf(causa({ fuero })).FUERO.texto).toBe(etiqueta);
  });

  it('marca el número de expediente y el juzgado que faltan', () => {
    const valores = valuesOf(causa({ numeroExpediente: null, juzgado: null }));
    expect(valores.NUMERO_EXPEDIENTE).toEqual({
      texto: '(FALTA NÚMERO DE EXPEDIENTE)',
      faltantes: ['número de expediente'],
    });
    expect(valores.JUZGADO).toEqual({ texto: '(FALTA JUZGADO)', faltantes: ['juzgado'] });
  });

  it('pone el expediente principal de un incidente', () => {
    const valores = valuesOf(causa({ expedientePrincipal: '987/2025' }));
    expect(valores.EXPEDIENTE_PRINCIPAL).toEqual({ texto: '987/2025', faltantes: [] });
  });

  it('marca el expediente principal como faltante en una causa que no es incidente', () => {
    expect(valuesOf(causa()).EXPEDIENTE_PRINCIPAL).toEqual({
      texto: '(FALTA EXPEDIENTE PRINCIPAL)',
      faltantes: ['expediente principal'],
    });
  });
});

describe('caseValues: partes por rol (RF-9, RF-34 a RF-36)', () => {
  it('pone los nombres de cada rol, ordenados y enumerados', () => {
    const valores = valuesOf(
      causa({
        partes: [
          fisica('actor', 'Luis', 'Gómez'),
          fisica('demandado', 'María', 'López'),
          juridica('demandado', 'Acme S.A.'),
          fisica('demandado', 'Luis', 'Gómez'),
          fisica('tercero', 'Ana', 'Paz'),
          fisica('tercero', 'Inés', 'Ruiz'),
        ],
      }),
    );
    expect(valores.ACTORES).toEqual({ texto: 'Luis Gómez', faltantes: [] });
    expect(valores.DEMANDADOS).toEqual({
      texto: 'Acme S.A., Luis Gómez y María López',
      faltantes: [],
    });
    expect(valores.TERCEROS).toEqual({ texto: 'Ana Paz y Inés Ruiz', faltantes: [] });
  });

  it('marca los roles sin partes', () => {
    const valores = valuesOf(causa());
    expect(valores.ACTORES).toEqual({ texto: '(FALTAN ACTORES)', faltantes: ['actores'] });
    expect(valores.DEMANDADOS).toEqual({ texto: '(FALTAN DEMANDADOS)', faltantes: ['demandados'] });
    expect(valores.TERCEROS).toEqual({ texto: '(FALTAN TERCEROS)', faltantes: ['terceros'] });
    expect(valores.ACTORES_CON_DOCUMENTO).toEqual({
      texto: '(FALTAN ACTORES)',
      faltantes: ['actores'],
    });
  });

  it('pone a cada parte con su documento', () => {
    const valores = valuesOf(
      causa({
        partes: [
          fisica('demandado', 'María', 'López', '27333444'),
          juridica('demandado', 'Acme S.A.', '30712345678'),
          fisica('demandado', 'Luis', 'Gómez', '05111222'),
          fisica('actor', 'Ana', 'Paz', '5123456'),
          fisica('tercero', 'Inés', 'Ruiz', '20111222'),
          juridica('tercero', 'Hierros S.R.L.', '30500010912'),
        ],
      }),
    );
    expect(valores.ACTORES_CON_DOCUMENTO.texto).toBe('Ana Paz, DNI 5.123.456');
    expect(valores.DEMANDADOS_CON_DOCUMENTO).toEqual({
      texto:
        'Acme S.A., CUIT 30-71234567-8; Luis Gómez, DNI 05.111.222; y María López, DNI 27.333.444',
      faltantes: [],
    });
    expect(valores.TERCEROS_CON_DOCUMENTO.texto).toBe(
      'Hierros S.R.L., CUIT 30-50001091-2 y Inés Ruiz, DNI 20.111.222',
    );
  });

  it('una parte sin documento lleva la marca que corresponde a su tipo de persona', () => {
    const valores = valuesOf(
      causa({
        partes: [
          fisica('demandado', 'Luis', 'Gómez'),
          juridica('demandado', 'Acme S.A.'),
          fisica('demandado', 'María', 'López', '27333444'),
        ],
      }),
    );
    expect(valores.DEMANDADOS_CON_DOCUMENTO).toEqual({
      texto: 'Acme S.A., (FALTA CUIT); Luis Gómez, (FALTA DNI); y María López, DNI 27.333.444',
      faltantes: ['CUIT de Acme S.A.', 'DNI de Luis Gómez'],
    });
    // La variable de nombres no usa el documento: no le falta nada.
    expect(valores.DEMANDADOS.faltantes).toEqual([]);
  });

  it('las partes desvinculadas no figuran', () => {
    const desvinculada = { ...fisica('actor', 'Pedro', 'Viejo', '20111222'), vigente: false };
    const valores = valuesOf(causa({ partes: [desvinculada, fisica('actor', 'Luis', 'Gómez')] }));
    expect(valores.ACTORES.texto).toBe('Luis Gómez');
    expect(valores.ACTORES_CON_DOCUMENTO.texto).toBe('Luis Gómez, (FALTA DNI)');
  });

  it('una causa cuyas únicas partes de un rol están desvinculadas no tiene partes de ese rol', () => {
    const desvinculada = { ...fisica('demandado', 'Pedro', 'Viejo'), vigente: false };
    expect(valuesOf(causa({ partes: [desvinculada] })).DEMANDADOS.texto).toBe(
      '(FALTAN DEMANDADOS)',
    );
  });

  it('una parte con rol Otro no figura en ninguna variable de rol', () => {
    const valores = valuesOf(causa({ partes: [fisica('otro', 'Olga', 'Otra', '20111222')] }));
    expect(valores.ACTORES.texto).toBe('(FALTAN ACTORES)');
    expect(valores.DEMANDADOS.texto).toBe('(FALTAN DEMANDADOS)');
    expect(valores.TERCEROS.texto).toBe('(FALTAN TERCEROS)');
  });

  it('dos partes homónimas figuran las dos, primero la que se cargó antes', () => {
    const primera = fisica('actor', 'Luis', 'Gómez', '20111222');
    const segunda = fisica('actor', 'Luis', 'Gómez', '30999888');
    const valores = valuesOf(causa({ partes: [segunda, primera] }));
    expect(valores.ACTORES_CON_DOCUMENTO.texto).toBe(
      'Luis Gómez, DNI 20.111.222 y Luis Gómez, DNI 30.999.888',
    );
  });
});

describe('caseValues: clientes (RF-9, RF-34, RF-37)', () => {
  it('toma los datos de la cuenta del cliente, y de una persona jurídica solo la razón social', () => {
    const valores = valuesOf(
      causa({
        partes: [
          clienteFisico('actor', 'Luis', 'Gómez', '20111222'),
          clienteJuridico('actor', 'Acme S.A.', '30712345678'),
        ],
      }),
    );
    expect(valores.CLIENTES).toEqual({ texto: 'Acme S.A. y Luis Gómez', faltantes: [] });
    expect(valores.CLIENTES_CON_DOCUMENTO).toEqual({
      texto: 'Acme S.A., CUIT 30-71234567-8 y Luis Gómez, DNI 20.111.222',
      faltantes: [],
    });
    expect(valores.ACTORES.texto).toBe('Acme S.A. y Luis Gómez');
    expect(JSON.stringify(valores)).not.toContain('Contacto');
  });

  it('un cliente figura en la variable de su rol y en las de clientes, cualquiera sea su rol', () => {
    const valores = valuesOf(
      causa({
        partes: [
          clienteFisico('demandado', 'Luis', 'Gómez', '20111222'),
          clienteFisico('otro', 'Olga', 'Otra', '27333444'),
          fisica('actor', 'Ana', 'Paz'),
        ],
      }),
    );
    expect(valores.DEMANDADOS.texto).toBe('Luis Gómez');
    expect(valores.CLIENTES.texto).toBe('Luis Gómez y Olga Otra');
    expect(valores.ACTORES.texto).toBe('Ana Paz');
  });

  it('marca las tres variables de clientes si ninguna parte vigente es cliente', () => {
    const desvinculado = { ...clienteFisico('actor', 'Luis', 'Gómez', '20111222'), vigente: false };
    const valores = valuesOf(causa({ partes: [fisica('actor', 'Ana', 'Paz'), desvinculado] }));
    for (const nombre of ['CLIENTES', 'CLIENTES_CON_DOCUMENTO', 'CLIENTES_DOMICILIO'] as const) {
      expect(valores[nombre]).toEqual({ texto: '(FALTAN CLIENTES)', faltantes: ['clientes'] });
    }
  });

  it('con un solo cliente, el domicilio va solo', () => {
    const valores = valuesOf(
      causa({
        partes: [
          clienteFisico('actor', 'Luis', 'Gómez', '20111222', { domicilio: 'San Martín 100' }),
        ],
      }),
    );
    expect(valores.CLIENTES_DOMICILIO).toEqual({ texto: 'San Martín 100', faltantes: [] });
  });

  it('con dos clientes, cada domicilio va con su nombre, unidos por "y"', () => {
    const valores = valuesOf(
      causa({
        partes: [
          clienteFisico('actor', 'María', 'López', '27333444', { domicilio: 'Urquiza 250' }),
          clienteFisico('actor', 'Luis', 'Gómez', '20111222', { domicilio: 'San Martín 100' }),
        ],
      }),
    );
    expect(valores.CLIENTES_DOMICILIO.texto).toBe(
      'Luis Gómez: San Martín 100 y María López: Urquiza 250',
    );
  });

  it('con tres clientes, van separados por punto y coma', () => {
    const valores = valuesOf(
      causa({
        partes: [
          clienteFisico('actor', 'María', 'López', '27333444', { domicilio: 'Urquiza 250' }),
          clienteFisico('actor', 'Luis', 'Gómez', '20111222', { domicilio: 'San Martín 100' }),
          clienteJuridico('demandado', 'Acme S.A.', '30712345678', { domicilio: 'Ruta 12 km 4' }),
        ],
      }),
    );
    expect(valores.CLIENTES_DOMICILIO.texto).toBe(
      'Acme S.A.: Ruta 12 km 4; Luis Gómez: San Martín 100; y María López: Urquiza 250',
    );
  });

  it('un cliente sin domicilio lleva la marca en su lugar', () => {
    const solo = valuesOf(causa({ partes: [clienteFisico('actor', 'Luis', 'Gómez', '20111222')] }));
    expect(solo.CLIENTES_DOMICILIO).toEqual({
      texto: '(FALTA DOMICILIO)',
      faltantes: ['domicilio de Luis Gómez'],
    });

    const varios = valuesOf(
      causa({
        partes: [
          clienteFisico('actor', 'Luis', 'Gómez', '20111222', { domicilio: 'San Martín 100' }),
          clienteFisico('actor', 'María', 'López', '27333444', { domicilio: '' }),
        ],
      }),
    );
    expect(varios.CLIENTES_DOMICILIO).toEqual({
      texto: 'Luis Gómez: San Martín 100 y María López: (FALTA DOMICILIO)',
      faltantes: ['domicilio de María López'],
    });
  });

  it('inserta los datos tal cual, aunque tengan caracteres que un modelo no acepta', () => {
    const valores = valuesOf(
      causa({
        partes: [
          clienteFisico('actor', 'Luis', 'Gómez', '20111222', { domicilio: 'Calle <1> #FECHA#' }),
        ],
      }),
    );
    expect(valores.CLIENTES_DOMICILIO.texto).toBe('Calle <1> #FECHA#');
  });
});

describe('caseValues: avisos (RF-40)', () => {
  it('informa los clientes con la cuenta desactivada, que igual figuran', () => {
    const result = caseValues(
      causa({
        partes: [
          clienteFisico('actor', 'María', 'López', '27333444', { activo: false }),
          clienteFisico('actor', 'Luis', 'Gómez', '20111222'),
          clienteJuridico('demandado', 'Acme S.A.', '30712345678', { activo: false }),
        ],
      }),
      NOW,
    );
    expect(result.clientesDesactivados).toEqual(['Acme S.A.', 'María López']);
    expect(result.valores.CLIENTES.texto).toBe('Acme S.A., Luis Gómez y María López');
  });

  it('no informa ninguno si todos están activos o si la parte desactivada está desvinculada', () => {
    const desvinculado = {
      ...clienteFisico('actor', 'Pedro', 'Viejo', '20111222', { activo: false }),
      vigente: false,
    };
    const result = caseValues(
      causa({ partes: [desvinculado, clienteFisico('actor', 'Luis', 'Gómez', '27333444')] }),
      NOW,
    );
    expect(result.clientesDesactivados).toEqual([]);
  });
});

describe('caseValues: responsable (RF-9, RF-40)', () => {
  it('pone el nombre y el apellido del responsable', () => {
    const result = caseValues(causa(), NOW);
    expect(result.valores.ABOGADO_RESPONSABLE).toEqual({ texto: 'Laura Sabalette', faltantes: [] });
    expect(result.responsableDesactivado).toBe(false);
  });

  it('pone al responsable aunque esté desactivado, y lo informa', () => {
    const result = caseValues(
      causa({ responsable: { nombre: 'Laura', apellido: 'Sabalette', activo: false } }),
      NOW,
    );
    expect(result.valores.ABOGADO_RESPONSABLE.texto).toBe('Laura Sabalette');
    expect(result.responsableDesactivado).toBe(true);
  });
});

describe('caseValues: fecha (RF-9)', () => {
  it('pone el día actual en números y en letras', () => {
    const valores = valuesOf(causa());
    expect(valores.FECHA).toEqual({ texto: '10/10/2026', faltantes: [] });
    expect(valores.FECHA_EN_LETRAS).toEqual({ texto: '10 de octubre de 2026', faltantes: [] });
  });

  it('el día cambia a las 00:00 de Buenos Aires, que son las 03:00 UTC', () => {
    const antes = valuesOf(causa(), new Date('2026-03-01T02:59:59Z'));
    expect(antes.FECHA.texto).toBe('28/02/2026');
    expect(antes.FECHA_EN_LETRAS.texto).toBe('28 de febrero de 2026');

    const despues = valuesOf(causa(), new Date('2026-03-01T03:00:00Z'));
    expect(despues.FECHA.texto).toBe('01/03/2026');
    expect(despues.FECHA_EN_LETRAS.texto).toBe('1 de marzo de 2026');
  });
});
