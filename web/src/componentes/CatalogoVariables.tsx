import { VARIABLE_GROUP_OPTIONS } from '../servicios/presentacion-modelos';
import { type VariableName, VARIABLES } from '../servicios/texto-modelo';

/**
 * Catálogo de variables de un modelo (RF-9, RF-11): cada variable con lo que pone en el
 * escrito, agrupadas por lo que usan. Al elegir una, quien lo usa la inserta en el texto, sin
 * tener que escribirla.
 */
export function CatalogoVariables({ onInsert }: { onInsert: (nombre: VariableName) => void }) {
  return (
    <section
      aria-label="Variables"
      className="space-y-3 rounded border border-slate-200 bg-slate-50 p-4"
    >
      <p className="text-sm text-slate-600">
        Elegí una variable para insertarla en el texto, donde está el cursor. Al completar el modelo
        desde una causa, cada una se reemplaza por su dato.
      </p>
      {VARIABLE_GROUP_OPTIONS.map(([group, label]) => (
        <div key={group} className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</h3>
          <ul className="space-y-1">
            {VARIABLES.filter((variable) => variable.grupo === group).map((variable) => (
              <li key={variable.nombre} className="flex flex-wrap items-baseline gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => onInsert(variable.nombre)}
                  className="rounded border border-slate-300 bg-white px-2 py-0.5 font-mono text-xs text-slate-800 hover:bg-slate-100"
                >
                  #{variable.nombre}#
                </button>
                <span className="text-slate-600">{variable.descripcion}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
