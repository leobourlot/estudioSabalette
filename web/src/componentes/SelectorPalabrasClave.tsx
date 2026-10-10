import { type KeyboardEvent, useEffect, useState } from 'react';
import { errorMessage } from '../servicios/cliente-http';
import {
  addKeyword,
  keywordSearchText,
  removeKeyword,
  SUGGESTION_DELAY_MS,
  withoutChosen,
} from '../servicios/formulario-fallo';
import type { PalabraClave, PalabraClaveSugerencia } from '../servicios/jurisprudencia';
import { suggestionLabel } from '../servicios/presentacion-jurisprudencia';
import { useJurisprudenciaService } from './ProveedorServicios';

interface CommonProps {
  /** Id del campo de texto, para su etiqueta. */
  id?: string;
  label?: string;
  /** Se llama en cada tecla, para mantener la sesión mientras se escribe (RF-20). */
  onTyping?: () => void;
}

type SelectorPalabrasClaveProps = CommonProps &
  (
    | {
        /** Para cargar o modificar un fallo: se puede escribir una palabra nueva (RF-13). */
        modo: 'carga';
        value: string[];
        onChange: (value: string[]) => void;
      }
    | {
        /** Para el filtro del listado: solo se eligen palabras del catálogo (RF-25). */
        modo: 'filtro';
        value: PalabraClave[];
        onChange: (value: PalabraClave[]) => void;
      }
  );

interface Suggestions {
  /** Texto con el que se pidieron: solo se muestran si sigue siendo lo escrito. */
  query: string;
  items: PalabraClaveSugerencia[];
}

/**
 * Palabras clave de un fallo o del filtro (RF-12 a RF-14, RF-25). Muestra las elegidas como
 * etiquetas y, desde 2 caracteres escritos, sugiere las del catálogo con la cantidad de fallos
 * que las usan. No es un formulario propio: puede ir dentro de otro, y Enter no lo envía.
 */
export function SelectorPalabrasClave(props: SelectorPalabrasClaveProps) {
  const { id = 'palabrasClave', label = 'Palabras clave', modo, onTyping } = props;
  const jurisprudencia = useJurisprudenciaService();
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chosen = props.modo === 'carga' ? props.value : props.value.map((palabra) => palabra.texto);
  const query = keywordSearchText(text);

  // Pide las sugerencias cuando se deja de escribir un momento, para no consultar en cada tecla.
  useEffect(() => {
    if (query === null) return;
    let active = true;
    const timer = setTimeout(() => {
      jurisprudencia
        .suggestKeywords(query, modo)
        .then((items) => {
          if (!active) return;
          setSuggestions({ query, items });
          setError(null);
        })
        .catch((caught: unknown) => {
          if (active) setError(errorMessage(caught));
        });
    }, SUGGESTION_DELAY_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [jurisprudencia, modo, query]);

  const visible =
    query !== null && suggestions?.query === query ? withoutChosen(suggestions.items, chosen) : [];

  function clearText() {
    setText('');
    setError(null);
  }

  function choose(sugerencia: PalabraClaveSugerencia) {
    if (props.modo === 'carga') {
      // El texto exacto del catálogo: elegir una sugerencia no cambia su forma (RF-12).
      props.onChange(addKeyword(props.value, sugerencia.texto));
    } else if (!props.value.some((palabra) => palabra.id === sugerencia.id)) {
      props.onChange([...props.value, { id: sugerencia.id, texto: sugerencia.texto }]);
    }
    clearText();
  }

  function remove(texto: string) {
    if (props.modo === 'carga') props.onChange(removeKeyword(props.value, texto));
    else props.onChange(props.value.filter((palabra) => palabra.texto !== texto));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' && event.key !== ',') return;
    // Enter no envía el formulario que lo contiene, y la coma no se escribe.
    event.preventDefault();
    // En el filtro solo se eligen sugerencias: el filtro envía ids del catálogo.
    if (props.modo !== 'carga') return;
    props.onChange(addKeyword(props.value, text));
    clearText();
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>

      {chosen.length > 0 && (
        <ul aria-label={`${label} elegidas`} className="flex flex-wrap gap-2">
          {chosen.map((texto) => (
            <li
              key={texto}
              className="flex items-center gap-1 rounded bg-slate-200 px-2 py-0.5 text-sm text-slate-800"
            >
              <span className="break-words">{texto}</span>
              <button
                type="button"
                aria-label={`Quitar ${texto}`}
                onClick={() => remove(texto)}
                className="px-1 text-slate-600 hover:text-slate-900"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        id={id}
        type="text"
        autoComplete="off"
        value={text}
        placeholder={
          modo === 'carga'
            ? 'Escribí y presioná Enter o coma'
            : 'Escribí para buscar en el catálogo'
        }
        onChange={(event) => {
          setText(event.target.value);
          onTyping?.();
        }}
        onKeyDown={handleKeyDown}
        className="w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
      />

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {visible.length > 0 && (
        <ul aria-label="Sugerencias" className="flex flex-wrap gap-2">
          {visible.map((sugerencia) => (
            <li key={sugerencia.id}>
              <button
                type="button"
                onClick={() => choose(sugerencia)}
                className="rounded border border-slate-300 bg-white px-2 py-0.5 text-sm text-slate-800 hover:bg-slate-50"
              >
                {suggestionLabel(sugerencia)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
