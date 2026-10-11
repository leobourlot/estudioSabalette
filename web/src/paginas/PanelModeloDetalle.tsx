import { type ReactNode, useEffect, useId, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FormularioModelo } from '../componentes/FormularioModelo';
import { ListaDeErrores } from '../componentes/ListaDeErrores';
import { PreguntaModeloRepetido } from '../componentes/PreguntaModeloRepetido';
import { useModelosService } from '../componentes/ProveedorServicios';
import { TextoLiteral } from '../componentes/TextoLiteral';
import { useUsoDeSesion } from '../componentes/useUsoDeSesion';
import { ApiError, errorMessage } from '../servicios/cliente-http';
import {
  buildUpdateModelData,
  type ModelForm,
  modelFormFrom,
} from '../servicios/formulario-modelo';
import type { ModeloDetalle } from '../servicios/modelos-escritos';
import { pendingQuestion, type PendingQuestion, type QuestionOption } from '../servicios/preguntas';
import { EMPTY_VALUE } from '../servicios/presentacion';
import { fueroLabel } from '../servicios/presentacion-causas';
import { NO_VARIABLES_LEGEND, tipoEscritoLabel } from '../servicios/presentacion-modelos';
import { movementAuditLines } from '../servicios/presentacion-movimientos';

const secondaryButton = 'rounded border border-slate-300 bg-white px-3 py-1.5 text-sm';
const badgeClass = 'rounded px-2 py-0.5 text-xs font-medium';

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="break-words text-slate-800">{children}</dd>
    </div>
  );
}

const messagesOf = (caught: unknown) =>
  caught instanceof ApiError && caught.messages.length > 0
    ? caught.messages
    : [errorMessage(caught)];

/** Acción que quedó esperando la respuesta a la pregunta de título repetido (RF-15). */
type PendingAction = 'modificar' | 'reactivar';

/**
 * Ficha de un modelo de escrito (RF-16): sus datos, el texto completo con sus marcas sin
 * reemplazar, las variables que usa y quién lo cargó y lo modificó. Permite modificarlo
 * (RF-14), desactivarlo (RF-25) y reactivarlo (RF-27). Un modelo desactivado solo se consulta y
 * se reactiva (RF-26). El control real lo hace la API. Un modelo se completa desde una causa,
 * no desde acá (RF-30).
 */
export function PanelModeloDetalle() {
  const params = useParams();
  const modeloId = Number(params.id);
  const modelos = useModelosService();
  const notifyUse = useUsoDeSesion();
  const confirmTitleId = useId();

  const [modelo, setModelo] = useState<ModeloDetalle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ModelForm | null>(null);
  const [confirmingDeactivation, setConfirmingDeactivation] = useState(false);
  const [question, setQuestion] = useState<{
    pending: PendingQuestion;
    action: PendingAction;
  } | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let active = true;
    modelos
      .getModel(modeloId)
      .then((loaded) => {
        if (active) setModelo(loaded);
      })
      .catch((caught: unknown) => {
        if (active) setLoadError(errorMessage(caught));
      });
    return () => {
      active = false;
    };
  }, [modelos, modeloId]);

  /** Ejecuta una acción; si la API pregunta por un título repetido, deja la pregunta pendiente. */
  async function run(action: () => Promise<ModeloDetalle>, kind?: PendingAction) {
    setEnviando(true);
    setProblems([]);
    setQuestion(null);
    try {
      setModelo(await action());
      setEditing(false);
    } catch (caught) {
      const pending = kind ? pendingQuestion(caught) : null;
      if (pending && kind) setQuestion({ pending, action: kind });
      else setProblems(messagesOf(caught));
    } finally {
      setEnviando(false);
    }
  }

  function startEditing(current: ModeloDetalle) {
    setForm(modelFormFrom(current));
    setProblems([]);
    setQuestion(null);
    setEditing(true);
  }

  function closeEditing() {
    setEditing(false);
    setQuestion(null);
  }

  async function save(current: ModeloDetalle, values: ModelForm, confirmarRepetido = false) {
    const changes = buildUpdateModelData(values, current);
    // Guardar sin cambios no es una modificación (RF-14): no hace falta pedir nada.
    if (Object.keys(changes).length === 0) {
      closeEditing();
      return;
    }
    await run(
      () =>
        modelos.updateModel(modeloId, {
          ...changes,
          ...(confirmarRepetido ? { confirmarRepetido: true } : {}),
        }),
      'modificar',
    );
  }

  const deactivate = () => {
    setConfirmingDeactivation(false);
    return run(() => modelos.deactivateModel(modeloId));
  };

  const reactivate = (confirmarRepetido = false) =>
    run(() => modelos.reactivateModel(modeloId, confirmarRepetido), 'reactivar');

  function answer(current: ModeloDetalle, option: QuestionOption) {
    if (!question) return;
    if (option.kind !== 'confirm') {
      setQuestion(null);
      return;
    }
    if (question.action === 'reactivar') void reactivate(true);
    else if (form) void save(current, form, true);
  }

  const backLink = (
    <Link to="/panel/modelos" className="text-sm text-slate-600 underline">
      Volver a los modelos
    </Link>
  );

  if (!modelo) {
    return (
      <main className="mx-auto max-w-5xl space-y-6 p-8">
        <h1 className="text-2xl font-semibold text-slate-800">Modelo</h1>
        {loadError ? (
          <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </p>
        ) : (
          <p className="text-slate-600">Cargando…</p>
        )}
        {backLink}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      {backLink}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-800">Modelo</h1>
        {!modelo.activo && (
          <span className={`${badgeClass} bg-slate-200 text-slate-700`}>Desactivado</span>
        )}
      </div>

      {!modelo.activo && (
        <p className="rounded bg-slate-200 px-3 py-2 text-sm text-slate-800">
          Este modelo está desactivado: solo se puede consultar y reactivar.
        </p>
      )}

      {question && (
        <PreguntaModeloRepetido
          question={question.pending}
          onAnswer={(option) => answer(modelo, option)}
        />
      )}

      <ListaDeErrores messages={editing ? [] : problems} />

      <section aria-label="Datos del modelo" className="space-y-4 rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Datos</h2>
          {!editing && (
            <div className="flex gap-2">
              {modelo.activo ? (
                <>
                  <button
                    type="button"
                    onClick={() => startEditing(modelo)}
                    className={secondaryButton}
                  >
                    Editar
                  </button>
                  {!confirmingDeactivation && (
                    <button
                      type="button"
                      disabled={enviando}
                      onClick={() => setConfirmingDeactivation(true)}
                      className={secondaryButton}
                    >
                      Desactivar
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => void reactivate()}
                  className={secondaryButton}
                >
                  Reactivar
                </button>
              )}
            </div>
          )}
        </div>

        {confirmingDeactivation && (
          <div
            role="alertdialog"
            aria-labelledby={confirmTitleId}
            className="space-y-2 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          >
            <p id={confirmTitleId} className="font-medium">
              ¿Desactivar este modelo?
            </p>
            <p>
              No se borra: sale del listado, deja de ofrecerse en las causas y se puede reactivar.
              Mientras esté desactivado no se puede modificar ni completar.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void deactivate()}
                className="rounded bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600"
              >
                Sí, desactivar
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDeactivation(false)}
                className={secondaryButton}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {editing && form ? (
          <FormularioModelo
            value={form}
            onChange={setForm}
            submitLabel="Guardar cambios"
            onSubmit={() => save(modelo, form)}
            onCancel={closeEditing}
            apiProblems={problems}
            enviando={enviando}
            onTyping={notifyUse}
          />
        ) : (
          <dl className="space-y-4">
            <Dato label="Título">{modelo.titulo}</Dato>
            <div className="grid gap-4 sm:grid-cols-2">
              <Dato label="Tipo de escrito">{tipoEscritoLabel(modelo.tipo)}</Dato>
              <Dato label="Fuero">{fueroLabel(modelo.fuero)}</Dato>
            </div>
            <Dato label="Descripción">
              {modelo.descripcion === null ? (
                EMPTY_VALUE
              ) : (
                <TextoLiteral texto={modelo.descripcion} />
              )}
            </Dato>
            <Dato label="Variables que usa">
              {modelo.variables.length === 0 ? (
                NO_VARIABLES_LEGEND
              ) : (
                <ul aria-label="Variables que usa el modelo" className="flex flex-wrap gap-2">
                  {modelo.variables.map((variable) => (
                    <li
                      key={variable}
                      className={`${badgeClass} bg-sky-100 font-mono text-sky-900`}
                    >
                      #{variable}#
                    </li>
                  ))}
                </ul>
              )}
            </Dato>
            <Dato label="Texto">
              <TextoLiteral texto={modelo.texto} className="font-mono text-sm" />
            </Dato>
          </dl>
        )}
      </section>

      <section aria-label="Registro" className="text-sm text-slate-600">
        {movementAuditLines(modelo).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>
    </main>
  );
}
