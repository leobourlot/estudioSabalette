import type { EscritoCompletado } from '../servicios/modelos-escritos';
import { escritoNotices } from '../servicios/presentacion-modelos';

/**
 * Avisos de un escrito completado (RF-39, RF-40): los datos que le faltan a la causa, los
 * clientes con la cuenta desactivada y el responsable desactivado. Van arriba del escrito y no
 * son parte de él. Son informativos: no exigen confirmación ni impiden copiar.
 */
export function AvisosEscrito({
  escrito,
}: {
  escrito: Pick<EscritoCompletado, 'faltantes' | 'clientesDesactivados' | 'responsableDesactivado'>;
}) {
  const notices = escritoNotices(escrito);
  if (notices.length === 0) return null;
  return (
    <div className="space-y-2">
      {notices.map((notice) => (
        <div
          key={notice.mensaje}
          role="status"
          className="space-y-1 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          <p className="font-medium">{notice.mensaje}</p>
          {notice.detalle.length > 0 && (
            <ul className="list-inside list-disc">
              {notice.detalle.map((item) => (
                <li key={item} className="break-words">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
