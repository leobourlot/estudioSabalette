import './index.css';
import { decideEntry } from './servicios/rutas-sitio';

/**
 * Arranque (plan 007, "Entrada"). Lleva una dirección con mayúsculas o barra final a la principal
 * (spec 007, RF-8), y después carga la aplicación (ingreso, cambio de contraseña, panel y portal)
 * o el sitio público, cada uno en su parte del código: una página pública no descarga el panel ni
 * el portal. Lo que viene después del "?" nunca se usa (RF-42).
 */
const entry = decideEntry(window.location.pathname, window.location.hash);

if (entry.tipo === 'redirigir') {
  window.location.replace(entry.destino);
} else if (entry.tipo === 'aplicacion') {
  void import('./entrada-aplicacion').then(({ start }) => start());
} else {
  void import('./entrada-sitio').then(({ start }) => start());
}
