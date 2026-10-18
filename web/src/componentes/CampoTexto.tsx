import type { HTMLInputTypeAttribute } from 'react';
import { INPUT, LABEL } from './estilos-aplicacion';

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
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT}
      />
    </div>
  );
}
