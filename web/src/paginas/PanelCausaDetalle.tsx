import { type ReactNode, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { AccionesCausa } from '../componentes/AccionesCausa';
import { type Avisos, AvisosResultado } from '../componentes/AvisosResultado';
import { EditorAbogados } from '../componentes/EditorAbogados';
import { FormularioCausa } from '../componentes/FormularioCausa';
import { HistorialMovimientos } from '../componentes/HistorialMovimientos';
import { PreguntaConfirmacion } from '../componentes/PreguntaConfirmacion';
import { useCausasService } from '../componentes/ProveedorServicios';
import { TablaPartes } from '../componentes/TablaPartes';
import type { CausaDetalle } from '../servicios/causas';
import { ApiError, errorMessage } from '../servicios/cliente-http';
import {
  buildUpdateCausaData,
  type CausaForm,
  causaFormFrom,
  EMPTY_CAUSA_FORM,
} from '../servicios/formulario-causa';
import { pendingQuestion, type PendingQuestion } from '../servicios/preguntas';
import { EMPTY_VALUE } from '../servicios/presentacion';
import {
  auditLines,
  estadoLabel,
  fueroLabel,
  incidentLabel,
  memberName,
  needsResponsableWarning,
  RESPONSABLE_WARNING,
} from '../servicios/presentacion-causas';

const apiMessages = (caught: unknown) =>
  caught instanceof ApiError && caught.messages.length > 0
    ? caught.messages
    : [errorMessage(caught)];

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-slate-800">{children}</dd>
    </div>
  );
}

/**
 * Detalle de una causa (RF-12): datos, abogados, partes, registro y edición de los datos (RF-11) con
 * la pregunta de expediente repetido (RF-9). Avisa si el responsable está desactivado
 * (RF-33). Una causa desactivada no se edita y solo se reactiva (RF-40 a RF-43). Muestra los
 * avisos que deja el alta.
 */
export function PanelCausaDetalle() {
  const { id } = useParams();
  const location = useLocation();
  const causas = useCausasService();
  const avisos = (location.state as { avisos?: Avisos } | null)?.avisos;

  const [causa, setCausa] = useState<CausaDetalle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CausaForm>(EMPTY_CAUSA_FORM);
  const [question, setQuestion] = useState<PendingQuestion | null>(null);
  const [apiProblems, setApiProblems] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [actionAvisos, setActionAvisos] = useState<Avisos | null>(null);

  useEffect(() => {
    let active = true;
    causas
      .getCausa(Number(id))
      .then((loaded) => {
        if (active) setCausa(loaded);
      })
      .catch((caught: unknown) => {
        if (active) setLoadError(errorMessage(caught));
      });
    return () => {
      active = false;
    };
  }, [causas, id]);

  if (!causa) {
    return (
      <main className="mx-auto max-w-5xl space-y-4 p-8">
        <h1 className="text-2xl font-semibold text-slate-800">Causa</h1>
        {loadError && (
          <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </p>
        )}
      </main>
    );
  }

  function startEditing(current: CausaDetalle) {
    setForm(causaFormFrom(current));
    setApiProblems([]);
    setQuestion(null);
    setEditing(true);
  }

  async function saveData(current: CausaDetalle, confirmed = false) {
    const changes = buildUpdateCausaData(form, current);
    if (Object.keys(changes).length === 0) {
      setEditing(false);
      return;
    }
    setEnviando(true);
    setApiProblems([]);
    setQuestion(null);
    try {
      const updated = await causas.updateCausa(
        current.id,
        confirmed ? { ...changes, confirmarExpedienteRepetido: true } : changes,
      );
      setCausa(updated);
      setEditing(false);
    } catch (caught) {
      const pending = pendingQuestion(caught);
      if (pending) setQuestion(pending);
      else setApiProblems(apiMessages(caught));
    } finally {
      setEnviando(false);
    }
  }

  const incident = incidentLabel(causa);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold text-slate-800">{causa.caratula}</h1>
      {avisos && <AvisosResultado {...avisos} />}
      {actionAvisos && <AvisosResultado {...actionAvisos} />}

      {!causa.activa && (
        <p className="rounded bg-slate-200 px-3 py-2 text-sm text-slate-800">
          Esta causa está desactivada
        </p>
      )}
      {needsResponsableWarning(causa) && (
        <p role="status" className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {RESPONSABLE_WARNING}
        </p>
      )}

      <section aria-label="Datos de la causa" className="space-y-4 rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Datos</h2>
          {causa.activa && !editing && (
            <button
              type="button"
              onClick={() => startEditing(causa)}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm"
            >
              Editar datos
            </button>
          )}
        </div>
        {incident && <p className="text-sm text-slate-600">{incident}</p>}
        <dl className="grid gap-4 sm:grid-cols-3">
          <Dato label="Número de expediente">{causa.numeroExpediente ?? EMPTY_VALUE}</Dato>
          <Dato label="Juzgado">{causa.juzgado ?? EMPTY_VALUE}</Dato>
          <Dato label="Fuero">{fueroLabel(causa.fuero)}</Dato>
          <Dato label="Estado">{estadoLabel(causa.estado)}</Dato>
          <Dato label="Responsable">{memberName(causa.responsable)}</Dato>
          <Dato label="Colaboradores">
            {causa.colaboradores.length === 0 ? (
              EMPTY_VALUE
            ) : (
              <ul>
                {causa.colaboradores.map((member) => (
                  <li key={member.id}>{memberName(member)}</li>
                ))}
              </ul>
            )}
          </Dato>
        </dl>
        <EditorAbogados causa={causa} onSaved={setCausa} />
      </section>

      {editing && (
        <section aria-label="Editar datos" className="space-y-4 rounded-lg bg-white p-6 shadow">
          <FormularioCausa
            value={form}
            onChange={setForm}
            submitLabel="Guardar cambios"
            onSubmit={() => saveData(causa)}
            apiProblems={apiProblems}
            enviando={enviando}
          >
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm"
            >
              Cancelar
            </button>
          </FormularioCausa>
          {question && (
            <PreguntaConfirmacion
              question={question}
              onAnswer={(option) => {
                if (option.kind === 'cancel') setQuestion(null);
                else void saveData(causa, true);
              }}
            />
          )}
        </section>
      )}

      <TablaPartes
        causa={causa}
        onChanged={(updated, newAvisos) => {
          setCausa(updated);
          setActionAvisos(newAvisos ?? null);
        }}
      />

      <HistorialMovimientos causaId={causa.id} causaActiva={causa.activa} />

      <AccionesCausa
        causa={causa}
        onChanged={(updated) => {
          setCausa(updated);
          setEditing(false);
        }}
      />

      <section aria-label="Registro" className="text-sm text-slate-600">
        {auditLines(causa).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>
    </main>
  );
}
