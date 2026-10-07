import { type FormEvent, useState } from 'react';
import {
  MAX_MOVEMENT_DATE,
  MAX_MOVEMENT_TEXT_LENGTH,
  MIN_MOVEMENT_DATE,
  type MovementForm,
  needsVisibleChangeWarning,
  normalizeMovementText,
  textLength,
  validateMovementForm,
  VISIBLE_CHANGE_WARNING,
  VISIBLE_TEXT_ORIGIN_LABELS,
  visibleTextPreview,
} from '../servicios/formulario-movimiento';
import type { MovimientoDetalle, TipoMovimiento } from '../servicios/movimientos';
import { EMPTY_VALUE } from '../servicios/presentacion';
import { MOVEMENT_TYPE_OPTIONS } from '../servicios/presentacion-movimientos';
import { ListaDeErrores } from './ListaDeErrores';
import { TextoLiteral } from './TextoLiteral';

interface FormularioMovimientoProps {
  value: MovementForm;
  onChange: (value: MovementForm) => void;
  submitLabel: string;
  /** Se llama solo si el formulario es válido. */
  onSubmit: () => void | Promise<void>;
  onCancel?: () => void;
  /** En la edición, el movimiento como está guardado: decide el aviso de RF-13. */
  original?: MovimientoDetalle;
  /** Mensajes que devolvió la API. */
  apiProblems?: string[];
  enviando?: boolean;
}

const fieldClass =
  'w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none';
const labelClass = 'block text-sm font-medium text-slate-700';

/** Caracteres usados sobre el máximo, contados como la API (RF-1, RF-4). */
const usedCharacters = (text: string) =>
  `${textLength(normalizeMovementText(text))}/${MAX_MOVEMENT_TEXT_LENGTH}`;

/**
 * Alta y edición de un movimiento (RF-1, RF-8, RF-11). Nace no visible. Valida antes de
 * enviar con los mismos mensajes que la API. Los avisos de RF-9 y RF-13 son informativos: no
 * impiden guardar.
 */
export function FormularioMovimiento({
  value,
  onChange,
  submitLabel,
  onSubmit,
  onCancel,
  original,
  apiProblems = [],
  enviando = false,
}: FormularioMovimientoProps) {
  const [problems, setProblems] = useState<string[]>([]);

  const set =
    <K extends keyof MovementForm>(field: K) =>
    (fieldValue: MovementForm[K]) =>
      onChange({ ...value, [field]: fieldValue });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateMovementForm(value);
    setProblems(found);
    if (found.length > 0) return;
    await onSubmit();
  }

  const preview = visibleTextPreview(value);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <ListaDeErrores messages={[...problems, ...apiProblems]} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="fecha" className={labelClass}>
            Fecha
          </label>
          <input
            id="fecha"
            type="date"
            min={MIN_MOVEMENT_DATE}
            max={MAX_MOVEMENT_DATE}
            value={value.fecha}
            onChange={(event) => set('fecha')(event.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="tipo" className={labelClass}>
            Tipo
          </label>
          <select
            id="tipo"
            value={value.tipo}
            onChange={(event) => set('tipo')(event.target.value as TipoMovimiento | '')}
            className={fieldClass}
          >
            <option value="">Elegí un tipo</option>
            {MOVEMENT_TYPE_OPTIONS.map(([option, label]) => (
              <option key={option} value={option}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="descripcion" className={labelClass}>
          Descripción
        </label>
        <textarea
          id="descripcion"
          rows={5}
          value={value.descripcion}
          onChange={(event) => set('descripcion')(event.target.value)}
          aria-describedby="descripcion-caracteres"
          className={fieldClass}
        />
        <p id="descripcion-caracteres" className="text-right text-xs text-slate-500">
          {usedCharacters(value.descripcion)}
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="textoCliente" className={labelClass}>
          Texto para el cliente (opcional)
        </label>
        <textarea
          id="textoCliente"
          rows={3}
          value={value.textoCliente}
          onChange={(event) => set('textoCliente')(event.target.value)}
          aria-describedby="textoCliente-caracteres textoCliente-ayuda"
          className={fieldClass}
        />
        <div className="flex justify-between gap-4 text-xs text-slate-500">
          <p id="textoCliente-ayuda">Si queda vacío, el cliente ve la descripción.</p>
          <p id="textoCliente-caracteres">{usedCharacters(value.textoCliente)}</p>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={value.visible}
          onChange={(event) => set('visible')(event.target.checked)}
        />
        Visible para el cliente
      </label>

      {value.visible && (
        <div
          role="status"
          aria-label="Lo que verá el cliente"
          className="space-y-1 rounded bg-sky-50 px-3 py-2 text-sm text-sky-900"
        >
          <p className="font-medium">
            El cliente verá ({VISIBLE_TEXT_ORIGIN_LABELS[preview.origen]}):
          </p>
          <TextoLiteral texto={preview.texto === '' ? EMPTY_VALUE : preview.texto} />
        </div>
      )}

      {original && needsVisibleChangeWarning(original, value) && (
        <p role="status" className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {VISIBLE_CHANGE_WARNING}
        </p>
      )}

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
