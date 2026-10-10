import { type FormEvent, useState } from 'react';
import type { Fuero } from '../servicios/causas';
import {
  convertedSumarioLength,
  MIN_FALLO_DATE,
  type RulingForm,
  todayInBuenosAires,
  validateRulingForm,
} from '../servicios/formulario-fallo';
import { JURISDICTION_OPTIONS } from '../servicios/presentacion-causas';
import { MAX_SUMARIO_LENGTH } from '../servicios/texto-fallo';
import { ListaDeErrores } from './ListaDeErrores';
import { SelectorPalabrasClave } from './SelectorPalabrasClave';

interface FormularioFalloProps {
  value: RulingForm;
  onChange: (value: RulingForm) => void;
  submitLabel: string;
  /** Se llama solo si el formulario es válido. */
  onSubmit: () => void | Promise<void>;
  onCancel?: () => void;
  /** Mensajes que devolvió la API. */
  apiProblems?: string[];
  enviando?: boolean;
  /** Se llama en cada cambio de un campo, para mantener la sesión mientras se escribe (RF-20). */
  onTyping?: () => void;
}

const fieldClass =
  'w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none';
const labelClass = 'block text-sm font-medium text-slate-700';

/**
 * Carga y modificación de un fallo (RF-1, RF-16, RF-17). Valida antes de enviar con los mismos
 * mensajes que la API. Los textos se pueden pegar tal como vienen de una base jurídica: se
 * convierten al guardar (RF-3), y el contador del sumario ya cuenta el texto convertido.
 */
export function FormularioFallo({
  value,
  onChange,
  submitLabel,
  onSubmit,
  onCancel,
  apiProblems = [],
  enviando = false,
  onTyping,
}: FormularioFalloProps) {
  const [problems, setProblems] = useState<string[]>([]);
  const today = todayInBuenosAires();

  const set =
    <K extends keyof RulingForm>(field: K) =>
    (fieldValue: RulingForm[K]) => {
      onChange({ ...value, [field]: fieldValue });
      onTyping?.();
    };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateRulingForm(value);
    setProblems(found);
    if (found.length > 0) return;
    await onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <ListaDeErrores messages={[...problems, ...apiProblems]} />

      <div className="space-y-1">
        <label htmlFor="caratula" className={labelClass}>
          Carátula
        </label>
        <input
          id="caratula"
          type="text"
          autoComplete="off"
          value={value.caratula}
          onChange={(event) => set('caratula')(event.target.value)}
          className={fieldClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="tribunal" className={labelClass}>
            Tribunal
          </label>
          <input
            id="tribunal"
            type="text"
            autoComplete="off"
            value={value.tribunal}
            onChange={(event) => set('tribunal')(event.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="fuero" className={labelClass}>
            Fuero
          </label>
          <select
            id="fuero"
            value={value.fuero}
            onChange={(event) => set('fuero')(event.target.value as Fuero | '')}
            className={fieldClass}
          >
            <option value="">Elegí un fuero</option>
            {JURISDICTION_OPTIONS.map(([option, label]) => (
              <option key={option} value={option}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="fecha" className={labelClass}>
            Fecha del fallo
          </label>
          <input
            id="fecha"
            type="date"
            min={MIN_FALLO_DATE}
            max={today}
            value={value.fecha}
            onChange={(event) => set('fecha')(event.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="numero" className={labelClass}>
            Número de expediente o de registro (opcional)
          </label>
          <input
            id="numero"
            type="text"
            autoComplete="off"
            value={value.numero}
            onChange={(event) => set('numero')(event.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="sumario" className={labelClass}>
          Sumario
        </label>
        <textarea
          id="sumario"
          rows={10}
          value={value.sumario}
          onChange={(event) => set('sumario')(event.target.value)}
          aria-describedby="sumario-caracteres sumario-ayuda"
          className={fieldClass}
        />
        <div className="flex justify-between gap-4 text-xs text-slate-500">
          <p id="sumario-ayuda">
            Podés pegarlo tal como está en la fuente: las comillas, los guiones y otros signos
            tipográficos se convierten al guardar.
          </p>
          <p id="sumario-caracteres">
            {convertedSumarioLength(value.sumario)}/{MAX_SUMARIO_LENGTH}
          </p>
        </div>
      </div>

      <SelectorPalabrasClave
        modo="carga"
        value={value.palabrasClave}
        onChange={set('palabrasClave')}
        onTyping={onTyping}
      />

      <div className="space-y-1">
        <label htmlFor="enlace" className={labelClass}>
          Enlace a la fuente (opcional)
        </label>
        <input
          id="enlace"
          type="text"
          inputMode="url"
          autoComplete="off"
          placeholder="https://"
          value={value.enlace}
          onChange={(event) => set('enlace')(event.target.value)}
          className={fieldClass}
        />
      </div>

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
