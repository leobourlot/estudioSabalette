import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { MovimientoCliente } from '../servicios/portal';
import { formatMovementDate, tipoMovimientoLabel } from '../servicios/presentacion-movimientos';
import { movementLegend, truncateClientText } from '../servicios/presentacion-portal';
import { TextoLiteral } from './TextoLiteral';

interface TarjetaMovimientoPortalProps {
  movimiento: MovimientoCliente;
  /** Dirección del movimiento abierto, con la página actual. */
  href: string;
}

/**
 * Un movimiento como lo ve el cliente (spec 004, RF-21): fecha, tipo, leyenda "Anulado" o
 * "Fecha futura" y el texto, recortado a 300 caracteres. "Ver más" lo despliega en el mismo
 * lugar, sin otra petición: la API ya lo envió completo.
 */
export function TarjetaMovimientoPortal({ movimiento, href }: TarjetaMovimientoPortalProps) {
  const [expanded, setExpanded] = useState(false);
  const preview = truncateClientText(movimiento.texto);
  const legend = movementLegend(movimiento);
  return (
    <article className="space-y-2 rounded-lg bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-slate-800">{formatMovementDate(movimiento.fecha)}</span>
        <span className="text-slate-600">{tipoMovimientoLabel(movimiento.tipo)}</span>
        {legend && (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            {legend}
          </span>
        )}
      </div>
      <TextoLiteral
        texto={expanded ? movimiento.texto : preview.texto}
        className={`text-sm text-slate-800 ${movimiento.anulado ? 'line-through' : ''}`}
      />
      <div className="flex gap-4 text-sm">
        {preview.recortado && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-slate-700 underline"
          >
            Ver más
          </button>
        )}
        <Link to={href} className="text-slate-700 underline">
          Abrir
        </Link>
      </div>
    </article>
  );
}
