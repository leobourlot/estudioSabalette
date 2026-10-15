import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SitioPublico } from './SitioPublico';

/**
 * Arranque del sitio público en el navegador (spec 007, RF-35; plan 007, "Entrada"). Si #root
 * trae el HTML prerenderizado, lo hidrata: el primer render es idéntico, porque el acceso arranca
 * en "Ingresar" en los dos. En desarrollo #root llega vacío (solo con la marca <!--app-->) y lo
 * monta desde cero.
 */
export function start(root: HTMLElement = document.getElementById('root')!): void {
  const tree = (
    <StrictMode>
      <BrowserRouter>
        <SitioPublico />
      </BrowserRouter>
    </StrictMode>
  );
  // La marca <!--app--> es un comentario: solo un elemento indica HTML prerenderizado.
  if (root.firstElementChild) hydrateRoot(root, tree);
  else createRoot(root).render(tree);
}
