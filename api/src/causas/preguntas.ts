import { ConflictException } from '@nestjs/common';

/**
 * Códigos de las preguntas que la interfaz le hace al integrante (plan 002, "Preguntas").
 * Llegan como 409 con `codigo`, para distinguirlas de un rechazo definitivo; la interfaz
 * repite la petición con la respuesta elegida.
 */
export const QUESTION_CODES = {
  repeatedCaseNumber: 'EXPEDIENTE_REPETIDO',
  clientDocument: 'DOCUMENTO_DE_CLIENTE',
  repeatedName: 'NOMBRE_REPETIDO',
  clientName: 'NOMBRE_DE_CLIENTE',
  // Spec 005, RF-18: el fallo que se carga, modifica o reactiva coincide con otro activo.
  repeatedRuling: 'FALLO_REPETIDO',
} as const;

export type QuestionCode = (typeof QUESTION_CODES)[keyof typeof QUESTION_CODES];

/** Pregunta al integrante: 409 con `codigo` y los datos que necesita para responderla. */
export class QuestionException extends ConflictException {
  constructor(
    readonly codigo: QuestionCode,
    readonly question: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super({ statusCode: 409, message: question, codigo, ...details });
  }

  /** La misma pregunta, indicando a qué parte del alta corresponde. */
  forParty(indiceParte: number): QuestionException {
    return new QuestionException(this.codigo, this.question, { ...this.details, indiceParte });
  }
}
