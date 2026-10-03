import type { HTMLInputTypeAttribute } from 'react';

interface CampoTextoProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: HTMLInputTypeAttribute;
  autoComplete?: string;
}

/** Campo de texto con su etiqueta, con el estilo de los formularios del panel. */
export function CampoTexto({
  id,
  label,
  value,
  onChange,
  type = 'text',
  autoComplete = 'off',
}: CampoTextoProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
      />
    </div>
  );
}
