import { Link } from 'react-router-dom';

interface PaginacionProps {
  pagina: number;
  haySiguiente: boolean;
  /** Dirección de una página, por ejemplo `/portal?pagina=3`. */
  hrefFor: (pagina: number) => string;
}

/**
 * Paginación del portal: solo "Anterior" y "Siguiente", nunca totales (spec 004, RF-24). La
 * página va en la dirección, para que "atrás" y "Volver" lleven a la misma (RF-22).
 */
export function Paginacion({ pagina, haySiguiente, hrefFor }: PaginacionProps) {
  if (pagina <= 1 && !haySiguiente) return null;
  return (
    <nav aria-label="Paginación" className="mt-6 flex justify-between text-sm">
      {pagina > 1 ? (
        <Link to={hrefFor(pagina - 1)} className="text-slate-700 underline">
          Anterior
        </Link>
      ) : (
        <span />
      )}
      {haySiguiente && (
        <Link to={hrefFor(pagina + 1)} className="text-slate-700 underline">
          Siguiente
        </Link>
      )}
    </nav>
  );
}
