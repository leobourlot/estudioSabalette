import { type FormEvent, type ReactNode, useState } from 'react';
import type { EstadoCausa, Fuero } from '../servicios/causas';
import { type CausaForm, validateCausaForm } from '../servicios/formulario-causa';
import { CASE_STATUS_OPTIONS, JURISDICTION_OPTIONS } from '../servicios/presentacion-causas';
import { CampoTexto } from './CampoTexto';
import { ListaDeErrores } from './ListaDeErrores';

interface FormularioCausaProps {
  /** Para asociar un botón ubicado fuera del formulario (atributo form). */
  id?: string;
  /** Con false, el botón de envío va fuera del formulario, asociado por su id. */
  renderSubmit?: boolean;
  value: CausaForm;
  onChange: (value: CausaForm) => void;
  submitLabel: string;
  /** Se llama solo si el formulario es válido. */
  onSubmit: () => void | Promise<void>;
  /** Problemas de las secciones extra (por ejemplo, el responsable), en el mismo aviso. */
  extraProblems?: () => string[];
  /** Mensajes que devolvió la API. */
  apiProblems?: string[];
  enviando?: boolean;
  /** Secciones extra antes del botón, como los abogados y las partes del alta. */
  children?: ReactNode;
}

const selectClass =
  'w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none';

/**
 * Datos de una causa (RF-1): carátula, número de expediente, juzgado, fuero, estado y la
 * marca de incidente con el número del expediente principal (RF-10). Valida antes de enviar
 * con los mismos mensajes que la API (RF-4, RF-5).
 */
export function FormularioCausa({
  id,
  renderSubmit = true,
  value,
  onChange,
  submitLabel,
  onSubmit,
  extraProblems,
  apiProblems = [],
  enviando = false,
  children,
}: FormularioCausaProps) {
  const [problems, setProblems] = useState<string[]>([]);

  const set =
    <K extends keyof CausaForm>(field: K) =>
    (fieldValue: CausaForm[K]) =>
      onChange({ ...value, [field]: fieldValue });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = [...validateCausaForm(value), ...(extraProblems?.() ?? [])];
    setProblems(found);
    if (found.length > 0) return;
    await onSubmit();
  }

  return (
    <form id={id} onSubmit={handleSubmit} noValidate className="space-y-4">
      <ListaDeErrores messages={[...problems, ...apiProblems]} />

      <CampoTexto
        id="caratula"
        label="Carátula"
        value={value.caratula}
        onChange={set('caratula')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto
          id="numeroExpediente"
          label="Número de expediente"
          value={value.numeroExpediente}
          onChange={set('numeroExpediente')}
        />
        <CampoTexto id="juzgado" label="Juzgado" value={value.juzgado} onChange={set('juzgado')} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="fuero" className="block text-sm font-medium text-slate-700">
            Fuero
          </label>
          <select
            id="fuero"
            value={value.fuero}
            onChange={(event) => set('fuero')(event.target.value as Fuero | '')}
            className={selectClass}
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
          <label htmlFor="estado" className="block text-sm font-medium text-slate-700">
            Estado
          </label>
          <select
            id="estado"
            value={value.estado}
            onChange={(event) => set('estado')(event.target.value as EstadoCausa)}
            className={selectClass}
          >
            {CASE_STATUS_OPTIONS.map(([option, label]) => (
              <option key={option} value={option}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={value.esIncidente}
          onChange={(event) => set('esIncidente')(event.target.checked)}
        />
        Es incidente
      </label>
      {value.esIncidente && (
        <CampoTexto
          id="expedientePrincipal"
          label="Número del expediente principal"
          value={value.expedientePrincipal}
          onChange={set('expedientePrincipal')}
        />
      )}

      {children}

      {renderSubmit && (
        <button
          type="submit"
          disabled={enviando}
          className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {submitLabel}
        </button>
      )}
    </form>
  );
}
