import type { Bloque } from '../servicios/contenido-sitio';

interface BloquesTextoProps {
  bloques: readonly Bloque[];
}

/**
 * Los textos de la clienta tal cual (spec 007, RF-2 y RF-14): cada párrafo en un <p> y cada lista
 * en un <ul>, un punto por renglón. Siempre como texto, nunca como HTML.
 */
export function BloquesTexto({ bloques }: BloquesTextoProps) {
  return (
    <div className="space-y-4 text-slate-700">
      {bloques.map((bloque, index) =>
        bloque.tipo === 'parrafo' ? (
          <p key={index} className="break-words">
            {bloque.texto}
          </p>
        ) : (
          <ul key={index} className="list-disc space-y-2 pl-6 marker:text-estudio-azul">
            {bloque.items.map((item) => (
              <li key={item} className="break-words">
                {item}
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
