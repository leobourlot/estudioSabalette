import { type ReactNode, useEffect, useId, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EnlaceFuente } from '../componentes/EnlaceFuente';
import { FormularioFallo } from '../componentes/FormularioFallo';
import { ListaDeErrores } from '../componentes/ListaDeErrores';
import { PreguntaFalloRepetido } from '../componentes/PreguntaFalloRepetido';
import { useJurisprudenciaService } from '../componentes/ProveedorServicios';
import { TextoLiteral } from '../componentes/TextoLiteral';
import { useMantenerSesion } from '../componentes/useMantenerSesion';
import { ApiError, errorMessage } from '../servicios/cliente-http';
import {
  buildUpdateRulingData,
  type RulingForm,
  rulingFormFrom,
} from '../servicios/formulario-fallo';
import type { FalloDetalle } from '../servicios/jurisprudencia';
import { pendingQuestion, type PendingQuestion, type QuestionOption } from '../servicios/preguntas';
import { EMPTY_VALUE } from '../servicios/presentacion';
import { fueroLabel } from '../servicios/presentacion-causas';
import { formatMovementDate, movementAuditLines } from '../servicios/presentacion-movimientos';

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

/** Acción que quedó esperando la respuesta a la pregunta de fallo repetido (RF-18). */
type PendingAction = 'modificar' | 'reactivar';

/**
 * Ficha de un fallo (RF-19): sus datos, sus palabras clave, el sumario completo, el enlace a
 * la fuente con su dominio y quién lo cargó y lo modificó. Permite modificarlo (RF-17),
 * desactivarlo (RF-29) y reactivarlo (RF-31). Un fallo desactivado solo se consulta y se
 * reactiva (RF-30). El control real lo hace la API.
 */
export function PanelFalloDetalle() {
  const params = useParams();
  const falloId = Number(params.id);
  const jurisprudencia = useJurisprudenciaService();
  const notifyTyping = useMantenerSesion();
  const confirmTitleId = useId();

  const [fallo, setFallo] = useState<FalloDetalle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<RulingForm | null>(null);
  const [confirmingDeactivation, setConfirmingDeactivation] = useState(false);
  const [question, setQuestion] = useState<{
    pending: PendingQuestion;
    action: PendingAction;
  } | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let active = true;
    jurisprudencia
      .getRuling(falloId)
      .then((loaded) => {
        if (active) setFallo(loaded);
      })
      .catch((caught: unknown) => {
        if (active) setLoadError(errorMessage(caught));
      });
    return () => {
      active = false;
    };
  }, [jurisprudencia, falloId]);

  /** Ejecuta una acción; si la API pregunta por un repetido, deja la pregunta pendiente. */
  async function run(action: () => Promise<FalloDetalle>, kind?: PendingAction) {
    setEnviando(true);
    setProblems([]);
    setQuestion(null);
    try {
      setFallo(await action());
      setEditing(false);
    } catch (caught) {
      const pending = kind ? pendingQuestion(caught) : null;
      if (pending && kind) setQuestion({ pending, action: kind });
      else setProblems(messagesOf(caught));
    } finally {
      setEnviando(false);
    }
  }

  function startEditing(current: FalloDetalle) {
    setForm(rulingFormFrom(current));
    setProblems([]);
    setQuestion(null);
    setEditing(true);
  }

  const save = (current: FalloDetalle, values: RulingForm, confirmarRepetido = false) =>
    run(
      () =>
        jurisprudencia.updateRuling(falloId, {
          ...buildUpdateRulingData(values, current),
          ...(confirmarRepetido ? { confirmarRepetido: true } : {}),
        }),
      'modificar',
    );

  const deactivate = () => {
    setConfirmingDeactivation(false);
    return run(() => jurisprudencia.deactivateRuling(falloId));
  };

  const reactivate = (confirmarRepetido = false) =>
    run(() => jurisprudencia.reactivateRuling(falloId, confirmarRepetido), 'reactivar');

  function answer(current: FalloDetalle, option: QuestionOption) {
    if (!question) return;
    if (option.kind !== 'confirm') {
      setQuestion(null);
      return;
    }
    if (question.action === 'reactivar') void reactivate(true);
    else if (form) void save(current, form, true);
  }

  const backLink = (
    <Link to="/panel/jurisprudencia" className="text-sm text-slate-600 underline">
      Volver a la jurisprudencia
    </Link>
  );

  if (!fallo) {
    return (
      <main className="mx-auto max-w-5xl space-y-6 p-8">
        <h1 className="text-2xl font-semibold text-slate-800">Fallo</h1>
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
        <h1 className="text-2xl font-semibold text-slate-800">Fallo</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="break-words text-slate-700">{fallo.caratula}</span>
          {!fallo.activo && (
            <span className={`${badgeClass} bg-slate-200 text-slate-700`}>Desactivado</span>
          )}
        </div>
      </div>

      {!fallo.activo && (
        <p className="rounded bg-slate-200 px-3 py-2 text-sm text-slate-800">
          Este fallo está desactivado: solo se puede consultar y reactivar.
        </p>
      )}

      {question && (
        <PreguntaFalloRepetido
          question={question.pending}
          onAnswer={(option) => answer(fallo, option)}
        />
      )}

      <ListaDeErrores messages={editing ? [] : problems} />

      <section aria-label="Datos del fallo" className="space-y-4 rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Datos</h2>
          {!editing && (
            <div className="flex gap-2">
              {fallo.activo ? (
                <>
                  <button
                    type="button"
                    onClick={() => startEditing(fallo)}
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
              ¿Desactivar este fallo?
            </p>
            <p>
              No se borra: sale del listado y se puede reactivar. Mientras esté desactivado no se
              puede modificar.
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
          <FormularioFallo
            value={form}
            onChange={setForm}
            submitLabel="Guardar cambios"
            onSubmit={() => save(fallo, form)}
            onCancel={() => {
              setEditing(false);
              setQuestion(null);
            }}
            apiProblems={problems}
            enviando={enviando}
            onTyping={notifyTyping}
          />
        ) : (
          <dl className="space-y-4">
            <Dato label="Carátula">{fallo.caratula}</Dato>
            <div className="grid gap-4 sm:grid-cols-2">
              <Dato label="Tribunal">{fallo.tribunal}</Dato>
              <Dato label="Fuero">{fueroLabel(fallo.fuero)}</Dato>
              <Dato label="Fecha del fallo">{formatMovementDate(fallo.fecha)}</Dato>
              <Dato label="Número de expediente o de registro">{fallo.numero ?? EMPTY_VALUE}</Dato>
            </div>
            <Dato label="Palabras clave">
              <ul aria-label="Palabras clave del fallo" className="flex flex-wrap gap-2">
                {fallo.palabrasClave.map((palabra) => (
                  <li
                    key={palabra.id}
                    className={`${badgeClass} break-words bg-sky-100 text-sky-900`}
                  >
                    {palabra.texto}
                  </li>
                ))}
              </ul>
            </Dato>
            <Dato label="Sumario">
              <TextoLiteral texto={fallo.sumario} />
            </Dato>
            <Dato label="Fuente">
              {fallo.enlace === null ? EMPTY_VALUE : <EnlaceFuente enlace={fallo.enlace} />}
            </Dato>
          </dl>
        )}
      </section>

      <section aria-label="Registro" className="text-sm text-slate-600">
        {movementAuditLines(fallo).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>
    </main>
  );
}
