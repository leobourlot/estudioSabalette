import { type FormEvent, useState } from 'react';
import type { NewPartyData, RolProcesal } from '../servicios/causas';
import { buildPartyData, type PartyForm, validatePartyForm } from '../servicios/formulario-causa';
import { PROCEDURAL_ROLE_OPTIONS } from '../servicios/presentacion-causas';
import type { TipoPersona } from '../servicios/sesion';
import { CampoTexto } from './CampoTexto';
import { ListaDeErrores } from './ListaDeErrores';
import { SelectorCliente } from './SelectorCliente';

interface FormularioParteProps {
  value: PartyForm;
  onChange: (value: PartyForm) => void;
  submitLabel: string;
  /**
   * Se llama con los datos para la API y el nombre visible de la parte, solo si el
   * formulario es válido.
   */
  onSubmit: (data: NewPartyData, name: string) => void | Promise<void>;
  /** Al modificar una parte: no se cambia entre cliente y no cliente. */
  fixedMode?: boolean;
  /** Nombre del cliente ya elegido (por ejemplo, al modificar una parte cliente). */
  clientLabel?: string | null;
  apiProblems?: string[];
  enviando?: boolean;
  onCancel?: () => void;
}

/** Nombre visible: el del cliente elegido, o el de los datos de la parte no cliente. */
function displayName(form: PartyForm, clientName: string | null): string {
  if (form.modo === 'cliente') return clientName ?? '';
  return form.tipoPersona === 'juridica'
    ? form.razonSocial.trim()
    : `${form.nombre.trim()} ${form.apellido.trim()}`;
}

const fieldClass =
  'w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none';

/**
 * Parte de una causa (RF-13 a RF-15): cliente del estudio, elegido con el buscador, o parte
 * no cliente con sus datos según el tipo de persona. Al modificar una parte cliente solo se
 * cambia el rol: sus datos se modifican desde su cuenta (RF-21).
 */
export function FormularioParte({
  value,
  onChange,
  submitLabel,
  onSubmit,
  fixedMode = false,
  clientLabel = null,
  apiProblems = [],
  enviando = false,
  onCancel,
}: FormularioParteProps) {
  const [problems, setProblems] = useState<string[]>([]);
  const [chosenLabel, setChosenLabel] = useState<string | null>(clientLabel);

  const set =
    <K extends keyof PartyForm>(field: K) =>
    (fieldValue: PartyForm[K]) =>
      onChange({ ...value, [field]: fieldValue });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validatePartyForm(value);
    setProblems(found);
    if (found.length > 0) return;
    await onSubmit(buildPartyData(value), displayName(value, chosenLabel ?? clientLabel));
  }

  const isClient = value.modo === 'cliente';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <ListaDeErrores messages={[...problems, ...apiProblems]} />

      {!fixedMode && (
        <fieldset className="flex gap-6 text-sm text-slate-700">
          <legend className="sr-only">Tipo de parte</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="modo"
              checked={isClient}
              onChange={() => set('modo')('cliente')}
            />
            Cliente del estudio
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="modo"
              checked={!isClient}
              onChange={() => set('modo')('noCliente')}
            />
            No es cliente
          </label>
        </fieldset>
      )}

      <div className="space-y-1">
        <label htmlFor="rolProcesal" className="block text-sm font-medium text-slate-700">
          Rol procesal
        </label>
        <select
          id="rolProcesal"
          value={value.rol}
          onChange={(event) => set('rol')(event.target.value as RolProcesal)}
          className={fieldClass}
        >
          {PROCEDURAL_ROLE_OPTIONS.map(([option, label]) => (
            <option key={option} value={option}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {isClient && fixedMode && <p className="text-sm text-slate-700">Cliente: {clientLabel}</p>}
      {isClient && !fixedMode && (
        <>
          <SelectorCliente
            onChoose={(clienteId, label) => {
              onChange({ ...value, clienteId });
              setChosenLabel(label);
            }}
          />
          {value.clienteId !== null && chosenLabel && (
            <p className="text-sm text-slate-700">Cliente elegido: {chosenLabel}</p>
          )}
        </>
      )}

      {!isClient && (
        <>
          <fieldset className="flex gap-6 text-sm text-slate-700">
            <legend className="sr-only">Tipo de persona</legend>
            {(
              [
                ['fisica', 'Persona física'],
                ['juridica', 'Persona jurídica'],
              ] as [TipoPersona, string][]
            ).map(([option, label]) => (
              <label key={option} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="tipoPersona"
                  checked={value.tipoPersona === option}
                  onChange={() => set('tipoPersona')(option)}
                />
                {label}
              </label>
            ))}
          </fieldset>

          {value.tipoPersona === 'fisica' ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <CampoTexto
                id="parteNombre"
                label="Nombre"
                value={value.nombre}
                onChange={set('nombre')}
              />
              <CampoTexto
                id="parteApellido"
                label="Apellido"
                value={value.apellido}
                onChange={set('apellido')}
              />
              <CampoTexto
                id="parteDni"
                label="DNI (opcional)"
                value={value.dni}
                onChange={set('dni')}
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoTexto
                id="parteRazonSocial"
                label="Razón social"
                value={value.razonSocial}
                onChange={set('razonSocial')}
              />
              <CampoTexto
                id="parteCuit"
                label="CUIT (opcional)"
                value={value.cuit}
                onChange={set('cuit')}
              />
            </div>
          )}
        </>
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
