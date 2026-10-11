import { Link } from 'react-router-dom';
import { ListaModelos } from '../componentes/ListaModelos';

/**
 * Sección de modelos de escritos (RF-18 a RF-24): la lista con su buscador, sus filtros y
 * "Mostrar desactivados", y el acceso para cargar un modelo. Cada fila lleva a la ficha del
 * modelo. Un modelo se completa desde una causa, no desde acá (RF-30).
 */
export function PanelModelos() {
  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Modelos</h1>
        <Link
          to="/panel/modelos/nuevo"
          className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Nuevo modelo
        </Link>
      </div>

      <div className="mt-6">
        <ListaModelos
          showDeactivated
          rowLink={(modelo) => ({ to: `/panel/modelos/${modelo.id}` })}
        />
      </div>
    </main>
  );
}
