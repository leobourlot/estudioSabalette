import { Link } from 'react-router-dom';
import type { ModeloResumen } from '../servicios/modelos-escritos';
import { fueroLabel } from '../servicios/presentacion-causas';
import { tipoEscritoLabel } from '../servicios/presentacion-modelos';
import { TextoLiteral } from './TextoLiteral';

const badgeClass = 'rounded px-2 py-0.5 text-xs font-medium';

/** A dónde lleva el título de un modelo, con el estado de navegación que haga falta. */
export interface ModelRowLink {
  to: string;
  state?: unknown;
}

/**
 * Un modelo del listado (RF-19): título, tipo de escrito, fuero y descripción, si la tiene.
 * Nunca muestra el texto: la API no lo envía en el listado. Un modelo desactivado lleva la
 * etiqueta "Desactivado" (RF-22).
 */
export function FilaModelo({ modelo, link }: { modelo: ModeloResumen; link: ModelRowLink }) {
  return (
    <li
      aria-label={modelo.titulo}
      className={`space-y-2 rounded-lg border border-slate-200 bg-white p-4 ${modelo.activo ? '' : 'opacity-75'}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={`${badgeClass} bg-sky-100 text-sky-900`}>
          {tipoEscritoLabel(modelo.tipo)}
        </span>
        <span className={`${badgeClass} bg-slate-100 text-slate-700`}>
          {fueroLabel(modelo.fuero)}
        </span>
        {!modelo.activo && (
          <span className={`${badgeClass} bg-slate-200 text-slate-700`}>Desactivado</span>
        )}
      </div>

      <Link
        to={link.to}
        state={link.state}
        className="block break-words font-medium text-slate-800 underline"
      >
        {modelo.titulo}
      </Link>

      {modelo.descripcion !== null && (
        <TextoLiteral texto={modelo.descripcion} className="text-sm text-slate-700" />
      )}
    </li>
  );
}
