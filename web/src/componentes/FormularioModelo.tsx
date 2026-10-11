import { type FormEvent, useEffect, useRef, useState } from 'react';
import type { Fuero } from '../servicios/causas';
import {
  convertedTextLength,
  type ModelForm,
  unknownMarks,
  validateModelForm,
} from '../servicios/formulario-modelo';
import type { TipoEscrito } from '../servicios/modelos-escritos';
import { JURISDICTION_OPTIONS } from '../servicios/presentacion-causas';
import { TEMPLATE_TYPE_OPTIONS } from '../servicios/presentacion-modelos';
import { insertVariable, MAX_TEXTO_LENGTH, type VariableName } from '../servicios/texto-modelo';
import { CatalogoVariables } from './CatalogoVariables';
import { ListaDeErrores } from './ListaDeErrores';

interface FormularioModeloProps {
  value: ModelForm;
  onChange: (value: ModelForm) => void;
  submitLabel: string;
  /** Se llama solo si el formulario es válido. */
  onSubmit: () => void | Promise<void>;
  onCancel?: () => void;
  /** Mensajes que devolvió la API. */
  apiProblems?: string[];
  enviando?: boolean;
  /** Se llama en cada cambio de un campo, para mantener la sesión mientras se escribe (RF-17). */
  onTyping?: () => void;
}

const fieldClass =
  'w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none';
const labelClass = 'block text-sm font-medium text-slate-700';

// "50.000", con el punto de miles, como en los mensajes.
const formatCount = (count: number) => new Intl.NumberFormat('es-AR').format(count);

/**
 * Carga y modificación de un modelo de escrito (RF-1, RF-13, RF-14). Valida antes de enviar
 * con los mismos mensajes que la API. El texto es texto plano y se puede pegar tal como está
 * en un procesador de textos: se convierte al guardar (RF-3, RF-5), y el contador ya cuenta el
 * texto convertido. El catálogo muestra las variables y las inserta donde está el cursor
 * (RF-11), y debajo del texto se señalan las variables que no existen (RF-10).
 */
export function FormularioModelo({
  value,
  onChange,
  submitLabel,
  onSubmit,
  onCancel,
  apiProblems = [],
  enviando = false,
  onTyping,
}: FormularioModeloProps) {
  const [problems, setProblems] = useState<string[]>([]);
  const textRef = useRef<HTMLTextAreaElement>(null);
  // Dónde dejar el cursor después de insertar una variable. Se aplica cuando el texto nuevo ya
  // está en pantalla: antes, el navegador lo mandaría al final.
  const pendingCursor = useRef<number | null>(null);

  useEffect(() => {
    const cursor = pendingCursor.current;
    if (cursor === null) return;
    pendingCursor.current = null;
    textRef.current?.focus();
    textRef.current?.setSelectionRange(cursor, cursor);
  }, [value.texto]);

  const set =
    <K extends keyof ModelForm>(field: K) =>
    (fieldValue: ModelForm[K]) => {
      onChange({ ...value, [field]: fieldValue });
      onTyping?.();
    };

  function insert(nombre: VariableName) {
    const textArea = textRef.current;
    const start = textArea?.selectionStart ?? value.texto.length;
    const end = textArea?.selectionEnd ?? start;
    const inserted = insertVariable(value.texto, start, end, nombre);
    pendingCursor.current = inserted.cursor;
    set('texto')(inserted.texto);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateModelForm(value);
    setProblems(found);
    if (found.length > 0) return;
    await onSubmit();
  }

  const unknown = unknownMarks(value.texto);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <ListaDeErrores messages={[...problems, ...apiProblems]} />

      <div className="space-y-1">
        <label htmlFor="tituloModelo" className={labelClass}>
          Título
        </label>
        <input
          id="tituloModelo"
          type="text"
          autoComplete="off"
          value={value.titulo}
          onChange={(event) => set('titulo')(event.target.value)}
          className={fieldClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="tipoEscrito" className={labelClass}>
            Tipo de escrito
          </label>
          <select
            id="tipoEscrito"
            value={value.tipo}
            onChange={(event) => set('tipo')(event.target.value as TipoEscrito | '')}
            className={fieldClass}
          >
            <option value="">Elegí un tipo</option>
            {TEMPLATE_TYPE_OPTIONS.map(([option, label]) => (
              <option key={option} value={option}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="fueroModelo" className={labelClass}>
            Fuero
          </label>
          <select
            id="fueroModelo"
            value={value.fuero}
            onChange={(event) => set('fuero')(event.target.value as Fuero)}
            className={fieldClass}
          >
            {JURISDICTION_OPTIONS.map(([option, label]) => (
              <option key={option} value={option}>
                {option === 'otro' ? `${label} (sirve para cualquier fuero)` : label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="descripcionModelo" className={labelClass}>
          Descripción (opcional)
        </label>
        <input
          id="descripcionModelo"
          type="text"
          autoComplete="off"
          value={value.descripcion}
          onChange={(event) => set('descripcion')(event.target.value)}
          className={fieldClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="textoModelo" className={labelClass}>
          Texto del modelo
        </label>
        <textarea
          id="textoModelo"
          ref={textRef}
          rows={20}
          value={value.texto}
          onChange={(event) => set('texto')(event.target.value)}
          aria-describedby="texto-modelo-caracteres texto-modelo-ayuda"
          className={`${fieldClass} font-mono text-sm`}
        />
        <div className="flex justify-between gap-4 text-xs text-slate-500">
          <p id="texto-modelo-ayuda">
            Es texto plano: podés pegarlo desde tu procesador de textos, y la negrita, la sangría y
            los signos tipográficos se quitan o se convierten al guardar. Las variables se escriben
            entre numerales, como #CARATULA#, separadas entre sí.
          </p>
          <p id="texto-modelo-caracteres">
            {formatCount(convertedTextLength(value.texto))}/{formatCount(MAX_TEXTO_LENGTH)}
          </p>
        </div>
        {unknown.length > 0 && (
          <p role="status" className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Variables que no existen: {unknown.join(', ')}
          </p>
        )}
      </div>

      <CatalogoVariables onInsert={insert} />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-slate-300 px-4 py-2 text-sm"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
