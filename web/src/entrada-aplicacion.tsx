import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

/** Arranque de la aplicación: ingreso, cambio de contraseña, panel y portal (specs 001 a 006). */
export function start(root: HTMLElement = document.getElementById('root')!): void {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
