/**
 * Arma el escrito completado a partir de una causa ya cargada (spec 006, RF-31 a RF-40; plan
 * 006, "Completar un modelo"). Funciones puras, sin acceso a la base: reciben la causa con su
 * responsable y sus partes, y el momento en que se completa.
 */
import type { Causa, Fuero } from '../causas/causa.entity.js';
import type { Parte, RolProcesal } from '../causas/parte.entity.js';
import { partyIdentity, type PartySource } from '../causas/reglas-causas.js';
import { todayInBuenosAires } from '../movimientos/reglas-movimientos.js';
import {
  comparePeople,
  formatCuit,
  formatDate,
  formatDateInWords,
  formatDni,
  joinPeople,
  personName,
  personSortKeys,
  type PersonSortKeys,
} from './formato-escrito.js';
import type { VariableName } from './variables.js';

/** Una parte con la cuenta de su cliente cargada, si es cliente. */
export type CasePartySource = Pick<
  Parte,
  | 'id'
  | 'rol'
  | 'vigente'
  | 'clienteId'
  | 'tipoPersona'
  | 'nombre'
  | 'apellido'
  | 'razonSocial'
  | 'dni'
  | 'cuit'
> & {
  cliente:
    | (NonNullable<PartySource['cliente']> & {
        domicilio: string | null;
        usuario: { nombre: string; apellido: string; activo: boolean };
      })
    | null;
};

/** Lo que hace falta de una causa para completar un modelo. */
export type CaseSource = Pick<
  Causa,
  'caratula' | 'numeroExpediente' | 'juzgado' | 'fuero' | 'expedientePrincipal'
> & {
  responsable: { nombre: string; apellido: string; activo: boolean };
  partes: CasePartySource[];
};

/** Lo que una variable pone en el escrito y los datos que le faltan a la causa para armarlo. */
export interface VariableValue {
  texto: string;
  /** Ya redactados para el aviso de RF-39: "juzgado", "DNI de Luis Gómez". */
  faltantes: string[];
}

export interface CaseValues {
  valores: Record<VariableName, VariableValue>;
  /** Nombres de los clientes de la causa con la cuenta desactivada (RF-40). */
  clientesDesactivados: string[];
  responsableDesactivado: boolean;
}

// El nombre del fuero como se muestra en el panel (RF-9).
const FUERO_LABELS: Readonly<Record<Fuero, string>> = {
  civil: 'Civil',
  penal: 'Penal',
  familia: 'Familia',
  laboral: 'Laboral',
  federal: 'Federal',
  otro: 'Otro',
};

/** Marcas de los datos que faltan, en mayúsculas y entre paréntesis (RF-9, RF-39). */
const MISSING = {
  numeroExpediente: '(FALTA NÚMERO DE EXPEDIENTE)',
  juzgado: '(FALTA JUZGADO)',
  expedientePrincipal: '(FALTA EXPEDIENTE PRINCIPAL)',
  actores: '(FALTAN ACTORES)',
  demandados: '(FALTAN DEMANDADOS)',
  terceros: '(FALTAN TERCEROS)',
  clientes: '(FALTAN CLIENTES)',
  dni: '(FALTA DNI)',
  cuit: '(FALTA CUIT)',
  domicilio: '(FALTA DOMICILIO)',
} as const;

/** Una parte vigente, con sus datos ya resueltos para el escrito. */
interface CasePerson extends PersonSortKeys {
  id: number;
  rol: RolProcesal;
  nombre: string;
  /** "DNI 20.111.222" o "CUIT 30-71234567-8"; null si no tiene. */
  documento: string | null;
  /** El documento que le corresponde por su tipo de persona. */
  tipoDocumento: 'DNI' | 'CUIT';
  esCliente: boolean;
  domicilio: string | null;
  /** false solo si es un cliente con la cuenta desactivada. */
  activo: boolean;
}

function toPerson(parte: CasePartySource): CasePerson {
  const identity = partyIdentity(parte);
  const documento = identity.dni
    ? formatDni(identity.dni)
    : identity.cuit
      ? formatCuit(identity.cuit)
      : null;
  return {
    id: parte.id,
    rol: parte.rol,
    nombre: personName(identity),
    documento,
    tipoDocumento: identity.tipoPersona === 'juridica' ? 'CUIT' : 'DNI',
    esCliente: parte.cliente !== null,
    domicilio: parte.cliente?.domicilio || null,
    activo: parte.cliente?.usuario.activo ?? true,
    ...personSortKeys(identity),
  };
}

const present = (texto: string): VariableValue => ({ texto, faltantes: [] });

const missing = (texto: string, faltante: string): VariableValue => ({
  texto,
  faltantes: [faltante],
});

const optional = (value: string | null, mark: string, faltante: string): VariableValue =>
  value === null ? missing(mark, faltante) : present(value);

/** Los nombres de un grupo de personas, enumerados (RF-36). */
function names(people: CasePerson[], mark: string, faltante: string): VariableValue {
  if (people.length === 0) return missing(mark, faltante);
  return present(
    joinPeople(
      people.map((person) => person.nombre),
      false,
    ),
  );
}

/** Cada persona con su documento; la que no tiene lleva la marca en su lugar (RF-35). */
function withDocuments(people: CasePerson[], mark: string, faltante: string): VariableValue {
  if (people.length === 0) return missing(mark, faltante);
  return {
    texto: joinPeople(
      people.map(
        (person) =>
          `${person.nombre}, ${person.documento ?? (person.tipoDocumento === 'CUIT' ? MISSING.cuit : MISSING.dni)}`,
      ),
      true,
    ),
    faltantes: people
      .filter((person) => person.documento === null)
      .map((person) => `${person.tipoDocumento} de ${person.nombre}`),
  };
}

/** RF-37: con un solo cliente, su domicilio; con varios, el nombre de cada uno y su domicilio. */
function addresses(clients: CasePerson[]): VariableValue {
  if (clients.length === 0) return missing(MISSING.clientes, 'clientes');
  const address = (client: CasePerson) => client.domicilio ?? MISSING.domicilio;
  return {
    texto:
      clients.length === 1
        ? address(clients[0])
        : joinPeople(
            clients.map((client) => `${client.nombre}: ${address(client)}`),
            true,
          ),
    faltantes: clients
      .filter((client) => client.domicilio === null)
      .map((client) => `domicilio de ${client.nombre}`),
  };
}

/**
 * Valor de cada variable del catálogo para una causa (RF-9). Solo cuentan las partes vigentes
 * (RF-36). Los datos se toman tal cual están cargados: no se vuelven a validar ni a convertir.
 */
export function caseValues(causa: CaseSource, ahora: Date): CaseValues {
  const people = causa.partes
    .filter((parte) => parte.vigente)
    .map(toPerson)
    .sort(comparePeople);
  const byRole = (rol: RolProcesal) => people.filter((person) => person.rol === rol);
  const actores = byRole('actor');
  const demandados = byRole('demandado');
  const terceros = byRole('tercero');
  const clientes = people.filter((person) => person.esCliente);
  const hoy = todayInBuenosAires(ahora);

  return {
    valores: {
      CARATULA: present(causa.caratula),
      NUMERO_EXPEDIENTE: optional(
        causa.numeroExpediente,
        MISSING.numeroExpediente,
        'número de expediente',
      ),
      JUZGADO: optional(causa.juzgado, MISSING.juzgado, 'juzgado'),
      FUERO: present(FUERO_LABELS[causa.fuero]),
      EXPEDIENTE_PRINCIPAL: optional(
        causa.expedientePrincipal,
        MISSING.expedientePrincipal,
        'expediente principal',
      ),
      ACTORES: names(actores, MISSING.actores, 'actores'),
      DEMANDADOS: names(demandados, MISSING.demandados, 'demandados'),
      TERCEROS: names(terceros, MISSING.terceros, 'terceros'),
      ACTORES_CON_DOCUMENTO: withDocuments(actores, MISSING.actores, 'actores'),
      DEMANDADOS_CON_DOCUMENTO: withDocuments(demandados, MISSING.demandados, 'demandados'),
      TERCEROS_CON_DOCUMENTO: withDocuments(terceros, MISSING.terceros, 'terceros'),
      CLIENTES: names(clientes, MISSING.clientes, 'clientes'),
      CLIENTES_CON_DOCUMENTO: withDocuments(clientes, MISSING.clientes, 'clientes'),
      CLIENTES_DOMICILIO: addresses(clientes),
      ABOGADO_RESPONSABLE: present(`${causa.responsable.nombre} ${causa.responsable.apellido}`),
      FECHA: present(formatDate(hoy)),
      FECHA_EN_LETRAS: present(formatDateInWords(hoy)),
    },
    clientesDesactivados: clientes
      .filter((client) => !client.activo)
      .map((client) => client.nombre),
    responsableDesactivado: !causa.responsable.activo,
  };
}
