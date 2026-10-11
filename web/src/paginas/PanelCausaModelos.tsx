import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ListaModelos } from '../componentes/ListaModelos';
import { useCausasService } from '../componentes/ProveedorServicios';
import type { CausaDetalle } from '../servicios/causas';
import { errorMessage } from '../servicios/cliente-http';
import { modelListStateFrom, toModelListLocationState } from '../servicios/sesion-escrito';

const linkClass = 'text-sm text-slate-600 underline';

/**
 * Lista de modelos para completar desde una causa (RF-29): todos los modelos activos, sea cual
 * sea el fuero de la causa y el del modelo, con el buscador y los filtros de la sección de
 * modelos, sin ningún filtro elegido y sin "Mostrar desactivados". Cada fila lleva al escrito
 * de ese modelo en esta causa, con la página y los filtros de la lista en el estado de
 * navegación, para volver a ella tal como estaba (RF-32). En una causa desactivada no se
 * completa ningún modelo (RF-41); el control real lo hace la API.
 */
export function PanelCausaModelos() {
  const params = useParams();
  const causaId = Number(params.id);
  const location = useLocation();
  const causas = useCausasService();
  // Solo cuenta el estado con que se llegó: al volver desde un escrito, dónde estaba la lista.
  const [initialState] = useState(() => modelListStateFrom(location.state) ?? undefined);

  const [causa, setCausa] = useState<CausaDetalle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    causas
      .getCausa(causaId)
      .then((loaded) => {
        if (active) setCausa(loaded);
      })
      .catch((caught: unknown) => {
        if (active) setLoadError(errorMessage(caught));
      });
    return () => {
      active = false;
    };
  }, [causas, causaId]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-8">
      {causa ? (
        <Link to={`/panel/causas/${causa.id}`} className={linkClass}>
          Volver a la causa
        </Link>
      ) : (
        <Link to="/panel/causas" className={linkClass}>
          Volver a las causas
        </Link>
      )}

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-800">Completar un modelo</h1>
        {causa && <p className="break-words text-slate-700">{causa.caratula}</p>}
      </div>

      {loadError && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      )}
      {!causa && !loadError && <p className="text-slate-600">Cargando…</p>}

      {causa && !causa.activa && (
        <p className="rounded bg-slate-200 px-3 py-2 text-sm text-slate-800">
          La causa está desactivada
        </p>
      )}

      {causa?.activa && (
        <>
          <p className="text-sm text-slate-600">
            Elegí un modelo: el sistema reemplaza sus variables con los datos de esta causa.
          </p>
          <ListaModelos
            showDeactivated={false}
            initialState={initialState}
            rowLink={(modelo, state) => ({
              to: `/panel/causas/${causa.id}/modelos/${modelo.id}`,
              state: toModelListLocationState(state),
            })}
          />
        </>
      )}
    </main>
  );
}
