import type { MovimientoCliente } from '../servicios/portal';
import { AparecerAlCargar } from './AparecerAlCargar';
import { TarjetaMovimientoPortal } from './TarjetaMovimientoPortal';

interface LineaDeTiempoProps {
  movimientos: MovimientoCliente[];
  /** Dirección del movimiento abierto, con la página actual. */
  hrefFor: (movimiento: MovimientoCliente) => string;
}

/**
 * Los movimientos que ve el cliente como una línea de tiempo vertical, en el orden recibido
 * (spec 008, RF-18 y RF-19): una línea a la izquierda une un punto lleno por movimiento; el
 * cliente nunca recibe anulados. Cada movimiento queda separado del siguiente por un espacio y
 * una línea fina; el último no lleva línea hacia abajo. La línea y los puntos no se anuncian: la
 * fecha va escrita. Los movimientos aparecen escalonados (RF-26).
 */
export function LineaDeTiempo({ movimientos, hrefFor }: LineaDeTiempoProps) {
  return (
    <ol className="pt-1">
      {movimientos.map((movimiento, index) => (
        <AparecerAlCargar
          key={movimiento.id}
          como="li"
          indice={index}
          className="group relative pl-8"
        >
          <span
            aria-hidden="true"
            data-linea=""
            className="absolute bottom-0 left-[7px] top-5 w-0.5 bg-slate-300 group-last:hidden"
          />
          <span
            aria-hidden="true"
            data-punto=""
            className="absolute left-0 top-1 h-4 w-4 rounded-full border-2 border-estudio-oscuro bg-estudio-oscuro"
          />
          <div className="border-b border-slate-200 pb-5 mb-5 group-last:mb-0 group-last:border-b-0 group-last:pb-0">
            <TarjetaMovimientoPortal movimiento={movimiento} href={hrefFor(movimiento)} />
          </div>
        </AparecerAlCargar>
      ))}
    </ol>
  );
}
