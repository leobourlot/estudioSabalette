import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AvisosEscrito } from '../componentes/AvisosEscrito';
import { useModelosService } from '../componentes/ProveedorServicios';
import { TextoLiteral } from '../componentes/TextoLiteral';
import { useCierrePorInactividad } from '../componentes/useCierrePorInactividad';
import { useUsoDeSesion } from '../componentes/useUsoDeSesion';
import { errorMessage } from '../servicios/cliente-http';
import type { EscritoCompletado } from '../servicios/modelos-escritos';
import { copyText } from '../servicios/portapapeles';
import {
  CLIPBOARD_LEGEND,
  COPIED_MESSAGE,
  COPY_FAILED_MESSAGE,
} from '../servicios/presentacion-modelos';
import { modelListStateFrom, toModelListLocationState } from '../servicios/sesion-escrito';

const linkClass = 'text-sm text-slate-600 underline';

/**
 * Escrito completado (RF-32): el texto de un modelo con los datos de una causa, que el servidor
 * arma en cada pedido. Muestra la carátula, el título del modelo, los avisos (RF-39, RF-40) y
 * el texto, como texto literal. El escrito vive solo en el estado de la página: no se guarda en
 * ningún lado (RF-46), y no hay opciones para descargarlo, imprimirlo, exportarlo, enviarlo ni
 * modificarlo (RF-47). Su única salida es "Copiar", que lo deja en el portapapeles (RF-44). El
 * uso de la pantalla mantiene la sesión, y sin uso la sesión vence y el escrito deja de
 * mostrarse (RF-48).
 */
export function PanelEscrito() {
  const params = useParams();
  const causaId = Number(params.id);
  const modeloId = Number(params.modeloId);
  const location = useLocation();
  const modelos = useModelosService();
  // Dónde estaba la lista de modelos al elegir este: se devuelve tal cual para volver (RF-32).
  const listState = modelListStateFrom(location.state);

  const [escrito, setEscrito] = useState<EscritoCompletado | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copyResult, setCopyResult] = useState<'copied' | 'failed' | null>(null);

  // Sin pedidos al servidor durante una hora, la sesión ya venció: el escrito deja de mostrarse
  // en ese momento (RF-48).
  useCierrePorInactividad();
  const notifyUse = useUsoDeSesion();

  // Recorrer la pantalla, usar el teclado, seleccionar texto o copiarlo cuenta como uso de la
  // sesión, para que no venza mientras se lee o se corrige el escrito (RF-48).
  useEffect(() => {
    const documentEvents = ['keydown', 'pointerdown', 'selectionchange', 'copy'] as const;
    window.addEventListener('scroll', notifyUse, { passive: true });
    for (const event of documentEvents) document.addEventListener(event, notifyUse);
    return () => {
      window.removeEventListener('scroll', notifyUse);
      for (const event of documentEvents) document.removeEventListener(event, notifyUse);
    };
  }, [notifyUse]);

  useEffect(() => {
    let active = true;
    modelos
      .completeModel(causaId, modeloId)
      .then((loaded) => {
        if (active) setEscrito(loaded);
      })
      .catch((caught: unknown) => {
        if (active) setLoadError(errorMessage(caught));
      });
    return () => {
      active = false;
    };
  }, [modelos, causaId, modeloId]);

  /** Copia solo el texto del escrito, sin el título, la carátula ni los avisos (RF-44). */
  async function copy(texto: string) {
    notifyUse();
    setCopyResult((await copyText(texto)) ? 'copied' : 'failed');
  }

  const backLinks = (
    <nav aria-label="Volver" className="flex flex-wrap gap-4">
      <Link
        to={`/panel/causas/${causaId}/modelos`}
        state={listState ? toModelListLocationState(listState) : null}
        className={linkClass}
      >
        Volver a la lista de modelos
      </Link>
      <Link to={`/panel/causas/${causaId}`} className={linkClass}>
        Volver a la causa
      </Link>
    </nav>
  );

  if (!escrito) {
    return (
      <main className="mx-auto max-w-5xl space-y-6 p-8">
        <h1 className="text-2xl font-semibold text-slate-800">Escrito</h1>
        {loadError ? (
          <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </p>
        ) : (
          <p className="text-slate-600">Cargando…</p>
        )}
        {backLinks}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      {backLinks}

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-800">Escrito</h1>
        <dl className="text-sm text-slate-700">
          <div className="flex flex-wrap gap-1">
            <dt className="text-slate-500">Causa:</dt>
            <dd className="break-words">{escrito.causa.caratula}</dd>
          </div>
          <div className="flex flex-wrap gap-1">
            <dt className="text-slate-500">Modelo:</dt>
            <dd className="break-words">{escrito.modelo.titulo}</dd>
          </div>
        </dl>
      </div>

      <AvisosEscrito escrito={escrito} />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void copy(escrito.texto)}
            className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Copiar
          </button>
          <p className="text-xs text-slate-500">{CLIPBOARD_LEGEND}</p>
        </div>
        {copyResult === 'copied' && (
          <p role="status" className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {COPIED_MESSAGE}
          </p>
        )}
        {copyResult === 'failed' && (
          <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {COPY_FAILED_MESSAGE}
          </p>
        )}
      </div>

      <section aria-label="Escrito completado" className="rounded-lg bg-white p-6 shadow">
        <TextoLiteral texto={escrito.texto} className="font-mono text-sm text-slate-800" />
      </section>
    </main>
  );
}
