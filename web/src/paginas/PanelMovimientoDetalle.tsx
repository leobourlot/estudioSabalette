import { type ReactNode, useEffect, useId, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FormularioMovimiento } from '../componentes/FormularioMovimiento';
import { HistorialCambios } from '../componentes/HistorialCambios';
import { ListaDeErrores } from '../componentes/ListaDeErrores';
import { useMovimientosService } from '../componentes/ProveedorServicios';
import { TextoLiteral } from '../componentes/TextoLiteral';
import { ApiError, errorMessage } from '../servicios/cliente-http';
import {
  buildUpdateMovementData,
  type MovementForm,
  movementFormFrom,
  VISIBLE_TEXT_ORIGIN_LABELS,
} from '../servicios/formulario-movimiento';
import type { MovimientoDetalle } from '../servicios/movimientos';
import { EMPTY_VALUE } from '../servicios/presentacion';
import {
  formatMovementDate,
  movementAuditLines,
  tipoMovimientoLabel,
} from '../servicios/presentacion-movimientos';

const secondaryButton = 'rounded border border-slate-300 bg-white px-3 py-1.5 text-sm';
const badgeClass = 'rounded px-2 py-0.5 text-xs font-medium';

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-slate-800">{children}</dd>
    </div>
  );
}

const messagesOf = (caught: unknown) =>
  caught instanceof ApiError ? caught.messages : [errorMessage(caught)];

/**
 * Detalle de un movimiento (RF-22): sus datos, el texto que ve el cliente con su origen, la
 * auditoría y el historial de cambios. Permite editarlo, anularlo y restaurarlo (RF-11, RF-16,
 * RF-18). Un movimiento anulado no se edita: se restaura (RF-15). En una causa desactivada
 * solo se consulta (RF-28). El control real lo hace la API.
 */
export function PanelMovimientoDetalle() {
  const params = useParams();
  const causaId = Number(params.id);
  const movimientoId = Number(params.movimientoId);
  const movimientos = useMovimientosService();
  const confirmTitleId = useId();

  const [movimiento, setMovimiento] = useState<MovimientoDetalle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<MovementForm | null>(null);
  const [confirmingAnnul, setConfirmingAnnul] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let active = true;
    movimientos
      .getMovement(causaId, movimientoId)
      .then((loaded) => {
        if (active) setMovimiento(loaded);
      })
      .catch((caught: unknown) => {
        if (active) setLoadError(errorMessage(caught));
      });
    return () => {
      active = false;
    };
  }, [movimientos, causaId, movimientoId]);

  async function run(action: () => Promise<MovimientoDetalle>) {
    setEnviando(true);
    setProblems([]);
    try {
      setMovimiento(await action());
      setEditing(false);
    } catch (caught) {
      setProblems(messagesOf(caught));
    } finally {
      setEnviando(false);
    }
  }

  function startEditing(current: MovimientoDetalle) {
    setForm(movementFormFrom(current));
    setProblems([]);
    setEditing(true);
  }

  const save = (current: MovimientoDetalle, values: MovementForm) =>
    run(() =>
      movimientos.updateMovement(causaId, movimientoId, buildUpdateMovementData(values, current)),
    );

  const annul = () => {
    setConfirmingAnnul(false);
    return run(() => movimientos.annulMovement(causaId, movimientoId));
  };

  const restore = () => run(() => movimientos.restoreMovement(causaId, movimientoId));

  const backLink = (
    <Link to={`/panel/causas/${causaId}`} className="text-sm text-slate-600 underline">
      Volver a la causa
    </Link>
  );

  if (!movimiento) {
    return (
      <main className="mx-auto max-w-5xl space-y-6 p-8">
        <h1 className="text-2xl font-semibold text-slate-800">Movimiento</h1>
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

  const canChange = movimiento.causaActiva;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      {backLink}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-800">Movimiento</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-700">
            {formatMovementDate(movimiento.fecha)} · {tipoMovimientoLabel(movimiento.tipo)}
          </span>
          {movimiento.visible ? (
            <span className={`${badgeClass} bg-sky-100 text-sky-900`}>Visible</span>
          ) : (
            <span className={`${badgeClass} bg-slate-100 text-slate-700`}>Oculto</span>
          )}
          {movimiento.anulado && (
            <span className={`${badgeClass} bg-red-100 text-red-800`}>Anulado</span>
          )}
          {movimiento.esFechaFutura && (
            <span className={`${badgeClass} bg-amber-100 text-amber-900`}>Fecha futura</span>
          )}
        </div>
      </div>

      {!canChange && (
        <p className="rounded bg-slate-200 px-3 py-2 text-sm text-slate-800">
          La causa está desactivada: sus movimientos solo se pueden consultar.
        </p>
      )}

      <ListaDeErrores messages={editing ? [] : problems} />

      <section
        aria-label="Datos del movimiento"
        className="space-y-4 rounded-lg bg-white p-6 shadow"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Datos</h2>
          {canChange && !editing && (
            <div className="flex gap-2">
              {movimiento.anulado ? (
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => void restore()}
                  className={secondaryButton}
                >
                  Restaurar
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => startEditing(movimiento)}
                    className={secondaryButton}
                  >
                    Editar
                  </button>
                  {!confirmingAnnul && (
                    <button
                      type="button"
                      disabled={enviando}
                      onClick={() => setConfirmingAnnul(true)}
                      className={secondaryButton}
                    >
                      Anular
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {confirmingAnnul && (
          <div
            role="alertdialog"
            aria-labelledby={confirmTitleId}
            className="space-y-2 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          >
            <p id={confirmTitleId} className="font-medium">
              ¿Anular este movimiento?
            </p>
            <p>
              No se borra: queda en el historial marcado como anulado y se puede restaurar. Si es
              visible, el cliente lo sigue viendo, marcado como anulado.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void annul()}
                className="rounded bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600"
              >
                Sí, anular
              </button>
              <button
                type="button"
                onClick={() => setConfirmingAnnul(false)}
                className={secondaryButton}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {editing && form ? (
          <FormularioMovimiento
            value={form}
            onChange={setForm}
            submitLabel="Guardar cambios"
            onSubmit={() => save(movimiento, form)}
            onCancel={() => setEditing(false)}
            original={movimiento}
            apiProblems={problems}
            enviando={enviando}
          />
        ) : (
          <dl className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Dato label="Fecha">{formatMovementDate(movimiento.fecha)}</Dato>
              <Dato label="Tipo">{tipoMovimientoLabel(movimiento.tipo)}</Dato>
              <Dato label="Visible para el cliente">{movimiento.visible ? 'Sí' : 'No'}</Dato>
            </div>
            <Dato label="Descripción">
              <TextoLiteral texto={movimiento.descripcion} />
            </Dato>
            <Dato label="Texto para el cliente">
              <TextoLiteral texto={movimiento.textoCliente ?? EMPTY_VALUE} />
            </Dato>
          </dl>
        )}
      </section>

      <section
        aria-label="Lo que ve el cliente"
        className="space-y-2 rounded-lg bg-white p-6 shadow"
      >
        <h2 className="text-lg font-semibold text-slate-800">Lo que ve el cliente</h2>
        <p className="text-sm text-slate-600">
          {movimiento.visible
            ? `El cliente ve este movimiento${movimiento.anulado ? ', marcado como anulado,' : ''} con ${VISIBLE_TEXT_ORIGIN_LABELS[movimiento.origenTextoVisible]}:`
            : `El cliente no ve este movimiento. Si se lo hace visible, verá ${VISIBLE_TEXT_ORIGIN_LABELS[movimiento.origenTextoVisible]}:`}
        </p>
        <TextoLiteral texto={movimiento.textoVisible} className="text-slate-800" />
      </section>

      <section aria-label="Historial de cambios del movimiento" className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Historial de cambios</h2>
        <HistorialCambios cambios={movimiento.cambios} />
      </section>

      <section aria-label="Registro" className="text-sm text-slate-600">
        {movementAuditLines(movimiento).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>
    </main>
  );
}
