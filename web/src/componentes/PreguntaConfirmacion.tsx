import { useId } from 'react';
import type { PendingQuestion, QuestionOption } from '../servicios/preguntas';

interface PreguntaConfirmacionProps {
  question: PendingQuestion;
  /** Nombre de la parte del alta a la que se refiere la pregunta, si corresponde. */
  partyName?: string;
  onAnswer: (option: QuestionOption) => void;
}

/**
 * Pregunta de la API al integrante (RF-9, RF-16, RF-19, RF-43): el mensaje y un botón por
 * opción. La página repite la petición con la respuesta elegida.
 */
export function PreguntaConfirmacion({ question, partyName, onAnswer }: PreguntaConfirmacionProps) {
  const messageId = useId();

  return (
    <section
      role="alertdialog"
      aria-labelledby={messageId}
      className="space-y-3 rounded border border-amber-300 bg-amber-50 px-4 py-3"
    >
      <p id={messageId} className="text-sm font-medium text-amber-900">
        {question.message}
      </p>
      {question.indiceParte !== undefined && partyName && (
        <p className="text-sm text-amber-900">
          Parte {question.indiceParte + 1}: {partyName}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {question.options.map((option) => (
          <button
            key={option.kind === 'linkClient' ? `cliente-${option.clienteId}` : option.label}
            type="button"
            onClick={() => onAnswer(option)}
            className={
              option.kind === 'cancel'
                ? 'rounded border border-slate-300 bg-white px-3 py-1.5 text-sm'
                : 'rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700'
            }
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
