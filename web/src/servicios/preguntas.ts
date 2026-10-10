import type { NewPartyData, PartyAnswers, ParteDetalle } from './causas';
import { ApiError } from './cliente-http';
import type { FalloReferencia } from './jurisprudencia';
import { partyDocument, partyName } from './presentacion-causas';

/**
 * Preguntas de la API (plan 002, "Preguntas"): un 409 con `codigo` que la interfaz le
 * muestra al integrante con sus opciones, para repetir la petición con la respuesta elegida.
 * No importa React (principio 3).
 */

export type QuestionCode =
  | 'EXPEDIENTE_REPETIDO'
  | 'DOCUMENTO_DE_CLIENTE'
  | 'NOMBRE_REPETIDO'
  | 'NOMBRE_DE_CLIENTE'
  // Spec 005, RF-18: el fallo que se carga, modifica o reactiva coincide con otro activo.
  | 'FALLO_REPETIDO';

/** Campo del cuerpo que lleva la respuesta afirmativa a una pregunta. */
export type ConfirmationField =
  'confirmarExpedienteRepetido' | 'confirmarRepetido' | keyof PartyAnswers;

export type QuestionOption =
  /** Repetir la petición con field en true. */
  | { kind: 'confirm'; field: ConfirmationField; label: string }
  /** Repetir con la parte como parte cliente de ese cliente. */
  | { kind: 'linkClient'; clienteId: number; label: string }
  /** No agregar la parte: es la misma persona que ya está. */
  | { kind: 'skipParty'; label: string }
  | { kind: 'cancel'; label: string };

export interface PendingQuestion {
  codigo: QuestionCode;
  message: string;
  /** Parte del alta a la que se refiere la pregunta. */
  indiceParte?: number;
  /** Parte existente con el mismo nombre (NOMBRE_REPETIDO). */
  parteId?: number;
  /** Fallo con el que coincide el que se guarda (FALLO_REPETIDO). */
  fallo?: FalloReferencia;
  options: QuestionOption[];
}

type ClientCandidate = Omit<
  ParteDetalle,
  'id' | 'rol' | 'esCliente' | 'clienteId' | 'clienteActivo'
> & {
  id: number;
};

const CANCEL: QuestionOption = { kind: 'cancel', label: 'Cancelar' };

/** "Juan Pérez · DNI 20.111.111", para distinguir homónimos (RF-19). */
function candidateLabel(candidate: ClientCandidate): string {
  const document = partyDocument(candidate);
  return document ? `${partyName(candidate)} · ${document}` : partyName(candidate);
}

function optionsFor(codigo: QuestionCode, details: Record<string, unknown>): QuestionOption[] {
  switch (codigo) {
    case 'EXPEDIENTE_REPETIDO':
      return [
        { kind: 'confirm', field: 'confirmarExpedienteRepetido', label: 'Guardar igual' },
        CANCEL,
      ];
    case 'DOCUMENTO_DE_CLIENTE': {
      const asNonClient: QuestionOption = {
        kind: 'confirm',
        field: 'confirmarDocumentoDeCliente',
        label: 'Agregar como no cliente',
      };
      // Un cliente desactivado no se puede vincular (RF-17): solo queda guardarla como no cliente.
      return details.clienteActivo === true
        ? [
            {
              kind: 'linkClient',
              clienteId: Number(details.clienteId),
              label: 'Agregar como cliente',
            },
            asNonClient,
          ]
        : [asNonClient, CANCEL];
    }
    case 'NOMBRE_REPETIDO':
      return [
        { kind: 'skipParty', label: 'Es la misma persona' },
        { kind: 'confirm', field: 'confirmarNombreRepetido', label: 'Es otra persona' },
      ];
    case 'NOMBRE_DE_CLIENTE': {
      const candidates = Array.isArray(details.clientes)
        ? (details.clientes as ClientCandidate[])
        : [];
      return [
        ...candidates.map((candidate): QuestionOption => ({
          kind: 'linkClient',
          clienteId: candidate.id,
          label: candidateLabel(candidate),
        })),
        {
          kind: 'confirm',
          field: 'confirmarNombreDeCliente',
          label: 'Ninguno: agregar como no cliente',
        },
      ];
    }
    case 'FALLO_REPETIDO':
      return [{ kind: 'confirm', field: 'confirmarRepetido', label: 'Guardar igual' }, CANCEL];
  }
}

const QUESTION_CODES: readonly string[] = [
  'EXPEDIENTE_REPETIDO',
  'DOCUMENTO_DE_CLIENTE',
  'NOMBRE_REPETIDO',
  'NOMBRE_DE_CLIENTE',
  'FALLO_REPETIDO',
];

/** Los datos del fallo repetido, si el error los trae completos. */
function repeatedRuling(value: unknown): FalloReferencia | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const fallo = value as Partial<FalloReferencia>;
  return typeof fallo.id === 'number' && typeof fallo.caratula === 'string'
    ? (fallo as FalloReferencia)
    : undefined;
}

/** La pregunta que trae un error de la API, o null si es un rechazo u otro error. */
export function pendingQuestion(error: unknown): PendingQuestion | null {
  if (!(error instanceof ApiError)) return null;
  const { codigo } = error.details;
  if (typeof codigo !== 'string' || !QUESTION_CODES.includes(codigo)) return null;

  const question: PendingQuestion = {
    codigo: codigo as QuestionCode,
    message: error.message,
    options: optionsFor(codigo as QuestionCode, error.details),
  };
  if (typeof error.details.indiceParte === 'number')
    question.indiceParte = error.details.indiceParte;
  if (typeof error.details.parteId === 'number') question.parteId = error.details.parteId;
  const fallo = repeatedRuling(error.details.fallo);
  if (fallo) question.fallo = fallo;
  return question;
}

/**
 * La parte con la respuesta aplicada, o null si hay que quitarla ("es la misma persona").
 * Al elegir un cliente se conservan el rol y las respuestas ya dadas, para no volver a
 * preguntar lo mismo.
 */
export function applyPartyAnswer(parte: NewPartyData, option: QuestionOption): NewPartyData | null {
  switch (option.kind) {
    case 'confirm':
      return { ...parte, [option.field]: true };
    case 'linkClient': {
      const answers: PartyAnswers = {};
      if (parte.confirmarDocumentoDeCliente) answers.confirmarDocumentoDeCliente = true;
      if (parte.confirmarNombreRepetido) answers.confirmarNombreRepetido = true;
      if (parte.confirmarNombreDeCliente) answers.confirmarNombreDeCliente = true;
      return { rol: parte.rol, clienteId: option.clienteId, ...answers };
    }
    case 'skipParty':
      return null;
    case 'cancel':
      return parte;
  }
}
