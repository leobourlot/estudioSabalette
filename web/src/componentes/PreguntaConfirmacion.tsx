import { useId } from 'react';
import type { PendingQuestion, QuestionOption } from '../servicios/preguntas';
import { PRIMARY_BUTTON_SMALL, SECONDARY_BUTTON_SMALL } from './estilos-aplicacion';

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
            className={option.kind === 'cancel' ? SECONDARY_BUTTON_SMALL : PRIMARY_BUTTON_SMALL}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
