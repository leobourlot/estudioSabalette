import type { CambioCampo, CambioMovimiento } from '../servicios/movimientos';
import { formatDateTime } from '../servicios/presentacion';
import {
  accionLabel,
  authorName,
  campoLabel,
  formatChangeValue,
} from '../servicios/presentacion-movimientos';
import { TextoLiteral } from './TextoLiteral';

/** Un dato del cambio: en la carga, su valor inicial; si no, el anterior y el nuevo. */
function Dato({ cambio, isLoad }: { cambio: CambioCampo; isLoad: boolean }) {
  const nuevo = formatChangeValue(cambio.campo, cambio.nuevo);
  return (
    <div className="space-y-1">
      <dt className="font-medium text-slate-700">{campoLabel(cambio.campo)}</dt>
      {isLoad ? (
        <dd>
          <TextoLiteral texto={nuevo} />
        </dd>
      ) : (
        <dd className="grid gap-1 sm:grid-cols-2">
          <div>
            <span className="text-xs text-slate-500">Antes</span>
            <TextoLiteral texto={formatChangeValue(cambio.campo, cambio.anterior)} />
          </div>
          <div>
            <span className="text-xs text-slate-500">Después</span>
            <TextoLiteral texto={nuevo} />
          </div>
        </dd>
      )}
    </div>
  );
}

/**
 * Historial de cambios de un movimiento (RF-22), del más reciente al más antiguo: fecha y
 * hora en Buenos Aires, acción, autor y, por cada dato, el valor anterior y el nuevo. Los
 * textos se muestran completos y literales.
 */
export function HistorialCambios({ cambios }: { cambios: CambioMovimiento[] }) {
  return (
    <ol aria-label="Historial de cambios" className="space-y-4">
      {cambios.map((cambio) => {
        const header = `${formatDateTime(cambio.fechaHora)} · ${accionLabel(cambio.accion)} · ${authorName(cambio.usuario)}`;
        return (
          <li
            key={cambio.id}
            aria-label={header}
            className="space-y-2 rounded border border-slate-200 p-3 text-sm"
          >
            <p className="text-slate-800">{header}</p>
            <dl className="space-y-2">
              {cambio.cambios.map((dato) => (
                <Dato key={dato.campo} cambio={dato} isLoad={cambio.accion === 'carga'} />
              ))}
            </dl>
          </li>
        );
      })}
    </ol>
  );
}
