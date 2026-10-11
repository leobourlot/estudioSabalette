/**
 * Portapapeles del navegador (spec 006, RF-44 y RF-45; plan 006, "Portapapeles"). Es la única
 * salida de un escrito completado, además de la pantalla. Las funciones reciben el portapapeles
 * como parámetro para poder probarlas. No importa React (principio 3).
 */

/** Lo que se usa del portapapeles del navegador. */
export interface ClipboardLike {
  writeText(text: string): Promise<void>;
}

/** El portapapeles del navegador; no existe fuera de https o en navegadores viejos. */
function browserClipboard(): ClipboardLike | null {
  return typeof navigator === 'undefined' ? null : (navigator.clipboard ?? null);
}

/**
 * Copia el texto como texto plano. Devuelve false si el navegador no tiene portapapeles o no
 * permite escribirlo: quien llama muestra el mensaje para copiar a mano (RF-45).
 */
export async function copyText(
  texto: string,
  clipboard: ClipboardLike | null = browserClipboard(),
): Promise<boolean> {
  if (!clipboard) return false;
  try {
    await clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

/**
 * Vacía el portapapeles, si el navegador lo permite (RF-44). Solo funciona ante una acción del
 * usuario y con la pestaña en foco: por eso se llama dentro del clic de "Cerrar sesión". Si
 * falla, no hay nada que hacer: el cierre de sesión sigue igual.
 */
export async function clearClipboard(
  clipboard: ClipboardLike | null = browserClipboard(),
): Promise<void> {
  await copyText('', clipboard);
}
