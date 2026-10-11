import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AvisosEscrito } from '../componentes/AvisosEscrito';
import { useModelosService } from '../componentes/ProveedorServicios';
import { TextoLiteral } from '../componentes/TextoLiteral';
import { errorMessage } from '../servicios/cliente-http';
import type { EscritoCompletado } from '../servicios/modelos-escritos';
import { modelListStateFrom, toModelListLocationState } from '../servicios/sesion-escrito';

const linkClass = 'text-sm text-slate-600 underline';

/**
 * Escrito completado (RF-32): el texto de un modelo con los datos de una causa, que el servidor
 * arma en cada pedido. Muestra la carátula, el título del modelo, los avisos (RF-39, RF-40) y
 * el texto, como texto literal. El escrito vive solo en el estado de la página: no se guarda en
 * ningún lado (RF-46), y no hay opciones para descargarlo, imprimirlo, exportarlo, enviarlo ni
 * modificarlo (RF-47).
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

      <section aria-label="Escrito completado" className="rounded-lg bg-white p-6 shadow">
        <TextoLiteral texto={escrito.texto} className="font-mono text-sm text-slate-800" />
      </section>
    </main>
  );
}
