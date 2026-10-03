import { Link } from 'react-router-dom';
import { useSession } from '../componentes/ProveedorSesion';
import { accountRows } from '../servicios/presentacion';
import { ROUTES } from '../servicios/sesion';

/** Datos propios (RF-35). Solo se consultan: los modifican administradores y abogados. */
export function MiCuenta() {
  const { usuario } = useSession();
  if (!usuario) return null;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold text-slate-800">Mi cuenta</h1>
      <dl className="mt-6 divide-y divide-slate-200 rounded-lg bg-white shadow">
        {accountRows(usuario).map(([label, value]) => (
          <div key={label} className="grid grid-cols-3 gap-4 px-4 py-3">
            <dt className="text-sm text-slate-500">{label}</dt>
            <dd className="col-span-2 text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 text-sm">
        <Link to={ROUTES.changePassword} className="text-slate-700 underline">
          Cambiar contraseña
        </Link>
      </p>
    </main>
  );
}
