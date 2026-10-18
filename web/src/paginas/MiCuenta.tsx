import { Link } from 'react-router-dom';
import { CARD, PAGE, PAGE_TITLE, TEXT_LINK } from '../componentes/estilos-aplicacion';
import { useSession } from '../componentes/ProveedorSesion';
import { accountRows } from '../servicios/presentacion';
import { ROUTES } from '../servicios/sesion';

/** Datos propios (RF-35). Solo se consultan: los modifican administradores y abogados. */
export function MiCuenta() {
  const { usuario } = useSession();
  if (!usuario) return null;

  return (
    <main className={PAGE}>
      <h1 className={PAGE_TITLE}>Mi cuenta</h1>
      <dl className={`max-w-3xl divide-y divide-slate-200 ${CARD}`}>
        {accountRows(usuario).map(([label, value]) => (
          <div key={label} className="grid grid-cols-3 gap-4 px-4 py-3">
            <dt className="text-sm text-slate-600">{label}</dt>
            <dd className="col-span-2 text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm">
        <Link to={ROUTES.changePassword} className={TEXT_LINK}>
          Cambiar contraseña
        </Link>
      </p>
    </main>
  );
}
