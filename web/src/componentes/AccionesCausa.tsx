import { useId, useState } from 'react';
import type { CausaDetalle } from '../servicios/causas';
import { errorMessage } from '../servicios/cliente-http';
import { pendingQuestion, type PendingQuestion } from '../servicios/preguntas';
import { PreguntaConfirmacion } from './PreguntaConfirmacion';
import { useCausasService } from './ProveedorServicios';

interface AccionesCausaProps {
  causa: CausaDetalle;
  onChanged: (causa: CausaDetalle) => void;
}

const secondaryButton = 'rounded border border-slate-300 bg-white px-3 py-1.5 text-sm';
const dangerButton =
  'rounded bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600';

/**
 * Desactivar y reactivar una causa (RF-40 a RF-43). Desactivar pide confirmación: reemplaza
 * al borrado y no es para causas terminadas. Una causa desactivada solo se reactiva; si su
 * número de expediente coincide con el de otra causa activa, primero se pregunta (RF-43).
 */
export function AccionesCausa({ causa, onChanged }: AccionesCausaProps) {
  const causas = useCausasService();
  const titleId = useId();
  const [confirming, setConfirming] = useState(false);
  const [question, setQuestion] = useState<PendingQuestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function run(action: () => Promise<void>) {
    setEnviando(true);
    setError(null);
    setQuestion(null);
    try {
      await action();
      onChanged(await causas.getCausa(causa.id));
    } catch (caught) {
      const pending = pendingQuestion(caught);
      if (pending) setQuestion(pending);
      else setError(errorMessage(caught));
    } finally {
      setEnviando(false);
    }
  }

  const deactivate = () => {
    setConfirming(false);
    return run(() => causas.deactivateCausa(causa.id));
  };

  const reactivate = (confirmed: boolean) => run(() => causas.reactivateCausa(causa.id, confirmed));

  return (
    <section aria-label="Acciones de la causa" className="space-y-3">
      {error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {causa.activa ? (
        !confirming && (
          <button
            type="button"
            disabled={enviando}
            onClick={() => setConfirming(true)}
            className={secondaryButton}
          >
            Desactivar
          </button>
        )
      ) : (
        <button
          type="button"
          disabled={enviando}
          onClick={() => void reactivate(false)}
          className={secondaryButton}
        >
          Reactivar
        </button>
      )}

      {confirming && (
        <div
          role="alertdialog"
          aria-labelledby={titleId}
          className="space-y-2 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <p id={titleId} className="font-medium">
            ¿Desactivar esta causa?
          </p>
          <p>
            La desactivación reemplaza al borrado: la causa sale del listado y sus clientes dejan de
            verla. Usala para causas cargadas por error o duplicadas. Una causa terminada se marca
            como Archivada o Finalizada.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => void deactivate()} className={dangerButton}>
              Sí, desactivar
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={secondaryButton}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {question && (
        <PreguntaConfirmacion
          question={question}
          onAnswer={(option) => {
            if (option.kind === 'cancel') setQuestion(null);
            else void reactivate(true);
          }}
        />
      )}
    </section>
  );
}
