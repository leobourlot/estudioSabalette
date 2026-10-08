import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { STUDIO_CONTACT } from '../servicios/datos-estudio';
import { fullName } from '../servicios/presentacion';
import { ROUTES } from '../servicios/sesion';
import { useSession } from './ProveedorSesion';

export interface SectionLink {
  to: string;
  label: string;
  /** True si el enlace solo se marca como activo en su ruta exacta (el inicio de la sección). */
  end?: boolean;
}

interface DisenoSeccionProps {
  title: string;
  links: SectionLink[];
}

/** Encabezado con navegación, nombre del usuario y "Cerrar sesión" (RF-16), y la página debajo. */
export function DisenoSeccion({ title, links }: DisenoSeccionProps) {
  const { usuario, logout } = useSession();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate(ROUTES.login, { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <p className="font-semibold text-slate-800">
            <span>{STUDIO_CONTACT.nombre}</span>{' '}
            <span className="font-normal text-slate-500">· {title}</span>
          </p>
          <nav className="flex gap-4 text-sm">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  isActive ? 'font-medium text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            {usuario && <span className="text-slate-600">{fullName(usuario)}</span>}
            <button type="button" onClick={handleLogout} className="text-slate-600 underline">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
