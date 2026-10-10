import type { PendingQuestion, QuestionOption } from '../servicios/preguntas';
import { formatMovementDate } from '../servicios/presentacion-movimientos';
import { PreguntaConfirmacion } from './PreguntaConfirmacion';

/**
 * Pregunta de fallo repetido (RF-18, RF-31): el mensaje de la API, los datos del fallo con el
 * que coincide y las opciones "Guardar igual" y "Cancelar". El enlace a ese fallo se abre en
 * otra pestaña, para no perder lo que se está cargando.
 */
export function PreguntaFalloRepetido({
  question,
  onAnswer,
}: {
  question: PendingQuestion;
  onAnswer: (option: QuestionOption) => void;
}) {
  const { fallo } = question;
  return (
    <div className="space-y-2">
      <PreguntaConfirmacion question={question} onAnswer={onAnswer} />
      {fallo && (
        <p
          aria-label="Fallo con el que coincide"
          className="rounded border border-amber-200 bg-white px-4 py-2 text-sm text-slate-700"
        >
          <span className="font-medium">{formatMovementDate(fallo.fecha)}</span>
          {' · '}
          <span className="break-words">{fallo.tribunal}</span>
          {fallo.numero !== null && <> · Nº {fallo.numero}</>}
          {' · '}
          <a
            href={`/panel/jurisprudencia/${fallo.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="break-words text-slate-800 underline"
          >
            {fallo.caratula}
          </a>
        </p>
      )}
    </div>
  );
}
