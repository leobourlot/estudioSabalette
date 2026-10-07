import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { MovimientoResumen } from '../servicios/movimientos';
import {
  authorName,
  formatMovementDate,
  tipoMovimientoLabel,
  truncateDescription,
} from '../servicios/presentacion-movimientos';
import { TextoLiteral } from './TextoLiteral';

const badgeClass = 'rounded px-2 py-0.5 text-xs font-medium';

/**
 * Un movimiento del historial (RF-24): fecha, tipo, descripción recortada con "Ver completa",
 * si es visible u oculto para el cliente, si tiene texto para el cliente, su autor y las
 * etiquetas "Anulado" y "Fecha futura".
 */
export function FilaMovimiento({
  movimiento,
  causaId,
}: {
  movimiento: MovimientoResumen;
  causaId: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = truncateDescription(movimiento.descripcion);
  const fecha = formatMovementDate(movimiento.fecha);
  const tipo = tipoMovimientoLabel(movimiento.tipo);

  return (
    <li
      aria-label={`${fecha} ${tipo}`}
      className={`space-y-2 rounded-lg border border-slate-200 bg-white p-4 ${movimiento.anulado ? 'opacity-75' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-slate-800">{fecha}</span>
        <span className="text-slate-700">{tipo}</span>
        {movimiento.visible ? (
          <span className={`${badgeClass} bg-sky-100 text-sky-900`}>Visible</span>
        ) : (
          <span className={`${badgeClass} bg-slate-100 text-slate-700`}>Oculto</span>
        )}
        {movimiento.tieneTextoCliente && (
          <span className={`${badgeClass} bg-slate-100 text-slate-700`}>
            Con texto para el cliente
          </span>
        )}
        {movimiento.anulado && (
          <span className={`${badgeClass} bg-red-100 text-red-800`}>Anulado</span>
        )}
        {movimiento.esFechaFutura && (
          <span className={`${badgeClass} bg-amber-100 text-amber-900`}>Fecha futura</span>
        )}
      </div>

      <TextoLiteral
        texto={expanded ? movimiento.descripcion : preview.texto}
        className={`text-sm text-slate-700 ${movimiento.anulado ? 'line-through' : ''}`}
      />
      {preview.recortada && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="text-sm text-slate-600 underline"
        >
          {expanded ? 'Ver menos' : 'Ver completa'}
        </button>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Cargado por {authorName(movimiento.creadoPor)}</span>
        <Link
          to={`/panel/causas/${causaId}/movimientos/${movimiento.id}`}
          className="text-sm text-slate-700 underline"
        >
          Ver detalle
        </Link>
      </div>
    </li>
  );
}
