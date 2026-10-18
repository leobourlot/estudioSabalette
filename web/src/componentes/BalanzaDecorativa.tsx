/**
 * Balanza de la justicia de fondo en la apertura del inicio (spec 007, RF-11). Es la imagen de
 * public/decoracion/balanza.svg, con sus propios colores. Una máscara la desvanece hacia la
 * izquierda, para que se integre con el degradado y no compita con el texto. Es decorativa: no se
 * anuncia.
 */

interface BalanzaDecorativaProps {
  className?: string;
}

export function BalanzaDecorativa({ className = '' }: BalanzaDecorativaProps) {
  return (
    <img
      data-balanza
      src="/decoracion/balanza.svg"
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`pointer-events-none select-none object-contain [mask-image:linear-gradient(to_right,rgb(0_0_0/0.3),black_50%)] ${className}`}
    />
  );
}
