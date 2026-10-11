import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormularioModelo } from '../componentes/FormularioModelo';
import { PreguntaModeloRepetido } from '../componentes/PreguntaModeloRepetido';
import { useModelosService } from '../componentes/ProveedorServicios';
import { useUsoDeSesion } from '../componentes/useUsoDeSesion';
import { ApiError, errorMessage } from '../servicios/cliente-http';
import { buildCreateModelData, EMPTY_MODEL_FORM } from '../servicios/formulario-modelo';
import { pendingQuestion, type PendingQuestion, type QuestionOption } from '../servicios/preguntas';

/**
 * Carga de un modelo de escrito (RF-13). Si la API pregunta por un título repetido (RF-15),
 * muestra con qué modelos coincide: "Guardar igual" repite la carga con la confirmación, y
 * "Cancelar" deja el formulario como estaba. Al guardarlo lleva a su ficha. Lo escrito vive
 * solo en el estado del componente (principio 5).
 */
export function PanelModeloNuevo() {
  const modelos = useModelosService();
  const navigate = useNavigate();
  const notifyUse = useUsoDeSesion();
  const [form, setForm] = useState(EMPTY_MODEL_FORM);
  const [question, setQuestion] = useState<PendingQuestion | null>(null);
  const [apiProblems, setApiProblems] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  async function save(confirmarRepetido: boolean) {
    setEnviando(true);
    setApiProblems([]);
    setQuestion(null);
    try {
      const modelo = await modelos.createModel({
        ...buildCreateModelData(form),
        ...(confirmarRepetido ? { confirmarRepetido: true } : {}),
      });
      navigate(`/panel/modelos/${modelo.id}`);
    } catch (caught) {
      const pending = pendingQuestion(caught);
      if (pending) setQuestion(pending);
      else {
        setApiProblems(
          caught instanceof ApiError && caught.messages.length > 0
            ? caught.messages
            : [errorMessage(caught)],
        );
      }
      setEnviando(false);
    }
  }

  function answer(option: QuestionOption) {
    if (option.kind === 'confirm') void save(true);
    else setQuestion(null);
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold text-slate-800">Nuevo modelo</h1>

      {question && <PreguntaModeloRepetido question={question} onAnswer={answer} />}

      <div className="rounded-lg bg-white p-6 shadow">
        <FormularioModelo
          value={form}
          onChange={setForm}
          submitLabel="Guardar modelo"
          onSubmit={() => save(false)}
          onCancel={() => navigate('/panel/modelos')}
          apiProblems={apiProblems}
          enviando={enviando}
          onTyping={notifyUse}
        />
      </div>
    </main>
  );
}
