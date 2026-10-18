import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { MovimientoCliente } from '../servicios/portal';
import { formatMovementDate, tipoMovimientoLabel } from '../servicios/presentacion-movimientos';
import { movementLegend, truncateClientText } from '../servicios/presentacion-portal';
import { TEXT_LINK } from './estilos-aplicacion';
import { TextoLiteral } from './TextoLiteral';

interface TarjetaMovimientoPortalProps {
  movimiento: MovimientoCliente;
  /** Dirección del movimiento abierto, con la página actual. */
  href: string;
}

/**
 * Un movimiento como lo ve el cliente (spec 004, RF-21): fecha, tipo, leyenda "Anulado" o
 * "Fecha futura" y el texto, recortado a 300 caracteres. "Ver más" lo despliega en el mismo
 * lugar y "Ver menos" lo vuelve a recortar, sin otra petición: la API ya lo envió completo. Es
 * el contenido de cada elemento de la línea de tiempo (spec 008, RF-18).
 */
export function TarjetaMovimientoPortal({ movimiento, href }: TarjetaMovimientoPortalProps) {
  const [expanded, setExpanded] = useState(false);
  const preview = truncateClientText(movimiento.texto);
  const legend = movementLegend(movimiento);
  return (
    <article className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold text-estudio-oscuro">
          {formatMovementDate(movimiento.fecha)}
        </span>
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
        {preview.recortado && (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className={TEXT_LINK}
          >
            {expanded ? 'Ver menos' : 'Ver más'}
          </button>
        )}
        <Link to={href} className={TEXT_LINK}>
          Abrir
        </Link>
      </div>
    </article>
  );
}
