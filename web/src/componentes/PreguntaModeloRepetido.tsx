import { fueroLabel } from '../servicios/presentacion-causas';
import { tipoEscritoLabel } from '../servicios/presentacion-modelos';
import type { PendingQuestion, QuestionOption } from '../servicios/preguntas';
import { PreguntaConfirmacion } from './PreguntaConfirmacion';

/**
 * Pregunta de título repetido (RF-15, RF-27): el mensaje de la API, todos los modelos activos
 * con los que coincide el título y las opciones "Guardar igual" y "Cancelar". El enlace a cada
 * modelo se abre en otra pestaña, para no perder lo que se está cargando.
 */
export function PreguntaModeloRepetido({
  question,
  onAnswer,
}: {
  question: PendingQuestion;
  onAnswer: (option: QuestionOption) => void;
}) {
  const modelos = question.modelos ?? [];
  return (
    <div className="space-y-2">
      <PreguntaConfirmacion question={question} onAnswer={onAnswer} />
      {modelos.length > 0 && (
        <ul
          aria-label="Modelos con ese título"
          className="space-y-1 rounded border border-amber-200 bg-white px-4 py-2 text-sm text-slate-700"
        >
          {modelos.map((modelo) => (
            <li key={modelo.id}>
              <a
                href={`/panel/modelos/${modelo.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="break-words text-slate-800 underline"
              >
                {modelo.titulo}
              </a>
              {' · '}
              {tipoEscritoLabel(modelo.tipo)}
              {' · '}
              {fueroLabel(modelo.fuero)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
