import { Link } from 'react-router-dom';
import { ListaModelos } from '../componentes/ListaModelos';
import { PAGE, PAGE_TITLE, PRIMARY_BUTTON_SMALL } from '../componentes/estilos-aplicacion';

/**
 * Sección de modelos de escritos (RF-18 a RF-24): la lista con su buscador, sus filtros y
 * "Mostrar desactivados", y el acceso para cargar un modelo. Cada fila lleva a la ficha del
 * modelo. Un modelo se completa desde una causa, no desde acá (RF-30).
 */
export function PanelModelos() {
  return (
    <main className={PAGE}>
      <div className="flex items-center justify-between">
        <h1 className={PAGE_TITLE}>Modelos</h1>
        <Link to="/panel/modelos/nuevo" className={PRIMARY_BUTTON_SMALL}>
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
