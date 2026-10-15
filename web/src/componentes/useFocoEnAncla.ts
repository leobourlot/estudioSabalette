import { useEffect } from 'react';

/**
 * Al abrir la página con un "#" (por ejemplo, /#servicios desde el menú) o al cambiarlo, lleva el
 * foco al destino: si el destino recibe foco, a él; si es una sección, a su título (spec 007,
 * RNF de accesibilidad). El navegador ya hizo el desplazamiento, así que el foco no lo repite. El
 * "#" solo se usa para buscar el elemento: nunca se muestra (RF-42).
 */
export function useFocoEnAncla(): void {
  useEffect(() => {
    const focusTarget = () => {
      const id = decodeHash(window.location.hash);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      const focusable = target.hasAttribute('tabindex')
        ? target
        : target.querySelector<HTMLElement>('[tabindex="-1"]');
      focusable?.focus({ preventScroll: true });
    };

    focusTarget();
    window.addEventListener('hashchange', focusTarget);
    return () => window.removeEventListener('hashchange', focusTarget);
  }, []);
}

function decodeHash(hash: string): string {
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return '';
  }
}
