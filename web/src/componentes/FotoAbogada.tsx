import { useCallback, useState } from 'react';
import type { Abogada } from '../servicios/contenido-sitio';
import { initialsOf } from '../servicios/presentacion-sitio';

type Tamano = 'mediana' | 'grande';

const SIZES: Record<Tamano, { px: number; className: string; text: string }> = {
  mediana: { px: 128, className: 'h-32 w-32', text: 'text-3xl' },
  grande: { px: 192, className: 'h-48 w-48', text: 'text-5xl' },
};

interface FotoAbogadaProps {
  abogada: Abogada;
  tamano: Tamano;
  /** En las tarjetas, la foto se carga recién cuando se acerca a la pantalla. */
  diferida?: boolean;
}

type Estado = 'cargando' | 'lista' | 'error';

/**
 * La foto de una abogada en un círculo, la misma en la tarjeta y en su página (spec 007, RF-21).
 * Debajo siempre están sus iniciales, en blanco sobre el azul del logo: se ven mientras no hay
 * foto, mientras carga y si no se puede cargar. La foto tiene ancho y alto fijos, así que al
 * aparecer no mueve nada. Las iniciales no se anuncian, porque el nombre está al lado.
 */
export function FotoAbogada({ abogada, tamano, diferida = false }: FotoAbogadaProps) {
  const size = SIZES[tamano];
  const [estado, setEstado] = useState<Estado>('cargando');

  // Una imagen puede terminar de cargar, o fallar, antes de que React escuche sus eventos (por
  // ejemplo, al hidratar el HTML prerenderizado): se revisa al montarla.
  const checkLoaded = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete) setEstado(img.naturalWidth === 0 ? 'error' : 'lista');
  }, []);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-estudio-oscuro text-estudio-blanco ${size.className}`}
    >
      <span aria-hidden="true" className={`font-semibold tracking-wide ${size.text}`}>
        {initialsOf(abogada.nombre)}
      </span>
      {abogada.foto && estado !== 'error' && (
        <img
          ref={checkLoaded}
          src={abogada.foto}
          alt={`Foto de ${abogada.nombre}`}
          width={size.px}
          height={size.px}
          loading={diferida ? 'lazy' : undefined}
          onLoad={() => setEstado('lista')}
          onError={() => setEstado('error')}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity motion-reduce:transition-none ${estado === 'lista' ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </span>
  );
}
