import { linkDomain } from '../servicios/texto-fallo';

/**
 * Enlace a la fuente de un fallo (RF-19): la dirección completa como texto literal y,
 * destacado junto a ella, el dominio al que lleva, para ver a qué sitio va antes de abrirlo.
 * Se abre en una pestaña nueva sin que el sitio de destino reciba la dirección del panel ni
 * pueda controlar su pestaña.
 *
 * Solo arma un enlace si la dirección cumple RF-6; si no, la muestra como texto. Es una
 * segunda barrera: la API ya rechaza esos enlaces.
 */
export function EnlaceFuente({ enlace }: { enlace: string }) {
  const domain = linkDomain(enlace);
  if (domain === null) return <span className="break-all text-slate-700">{enlace}</span>;

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <a
        href={enlace}
        target="_blank"
        rel="noopener noreferrer"
        referrerPolicy="no-referrer"
        className="break-all text-slate-800 underline"
      >
        {enlace}
      </a>
      <span
        aria-label={`Sitio: ${domain}`}
        className="rounded bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900"
      >
        {domain}
      </span>
    </span>
  );
}
