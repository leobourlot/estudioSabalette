import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { FalloResumen } from '../servicios/jurisprudencia';
import { fueroLabel } from '../servicios/presentacion-causas';
import { formatMovementDate } from '../servicios/presentacion-movimientos';
import { truncateClientText } from '../servicios/presentacion-portal';
import { TextoLiteral } from './TextoLiteral';

const badgeClass = 'rounded px-2 py-0.5 text-xs font-medium';

/**
 * Un fallo del listado (RF-22): fecha, tribunal, carátula, fuero, número si lo tiene, sus
 * palabras clave y el sumario, recortado a 300 caracteres. "Ver más" lo despliega en el mismo
 * lugar y "Ver menos" lo vuelve a recortar, sin otra petición: la API ya lo envió completo.
 * Un fallo desactivado lleva la etiqueta "Desactivado" (RF-25).
 */
export function FilaFallo({ fallo }: { fallo: FalloResumen }) {
  const [expanded, setExpanded] = useState(false);
  const preview = truncateClientText(fallo.sumario);
  const fecha = formatMovementDate(fallo.fecha);

  return (
    <li
      aria-label={`${fecha} ${fallo.caratula}`}
      className={`space-y-2 rounded-lg border border-slate-200 bg-white p-4 ${fallo.activo ? '' : 'opacity-75'}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-slate-800">{fecha}</span>
        <span className="break-words text-slate-700">{fallo.tribunal}</span>
        <span className={`${badgeClass} bg-slate-100 text-slate-700`}>
          {fueroLabel(fallo.fuero)}
        </span>
        {fallo.numero !== null && (
          <span className="break-words text-slate-600">Nº {fallo.numero}</span>
        )}
        {!fallo.activo && (
          <span className={`${badgeClass} bg-slate-200 text-slate-700`}>Desactivado</span>
        )}
      </div>

      <Link
        to={`/panel/jurisprudencia/${fallo.id}`}
        className="block break-words font-medium text-slate-800 underline"
      >
        {fallo.caratula}
      </Link>

      <ul aria-label="Palabras clave del fallo" className="flex flex-wrap gap-2">
        {fallo.palabrasClave.map((palabra) => (
          <li key={palabra.id} className={`${badgeClass} break-words bg-sky-100 text-sky-900`}>
            {palabra.texto}
          </li>
        ))}
      </ul>

      <TextoLiteral
        texto={expanded ? fallo.sumario : preview.texto}
        className="text-sm text-slate-700"
      />
      {preview.recortado && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="text-sm text-slate-600 underline"
        >
          {expanded ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </li>
  );
}
