import { createContext, type ReactNode, useContext } from 'react';
import { type CausasService, causasService } from '../servicios/causas';
import { type JurisprudenciaService, jurisprudenciaService } from '../servicios/jurisprudencia';
import { type ModelosService, modelosService } from '../servicios/modelos-escritos';
import { type MovimientosService, movimientosService } from '../servicios/movimientos';
import { type PortalService, portalService } from '../servicios/portal';
import { type UsersService, usersService } from '../servicios/usuarios';

interface Services {
  users: UsersService;
  causas: CausasService;
  movimientos: MovimientosService;
  portal: PortalService;
  jurisprudencia: JurisprudenciaService;
  modelos: ModelosService;
}

// Por defecto, los servicios reales. Los tests los reemplazan con ProveedorServicios.
const ServicesContext = createContext<Services>({
  users: usersService,
  causas: causasService,
  movimientos: movimientosService,
  portal: portalService,
  jurisprudencia: jurisprudenciaService,
  modelos: modelosService,
});

/** Permite reemplazar los servicios de la API, por ejemplo con versiones simuladas en tests. */
export function ProveedorServicios({
  children,
  services,
}: {
  children: ReactNode;
  services: Partial<Services>;
}) {
  const current = useContext(ServicesContext);
  return (
    <ServicesContext.Provider value={{ ...current, ...services }}>
      {children}
    </ServicesContext.Provider>
  );
}

export const useUsersService = () => useContext(ServicesContext).users;

export const useCausasService = () => useContext(ServicesContext).causas;

export const useMovimientosService = () => useContext(ServicesContext).movimientos;

export const usePortalService = () => useContext(ServicesContext).portal;

/** Solo para el panel: ningún componente del portal lo usa (spec 005, RF-36). */
export const useJurisprudenciaService = () => useContext(ServicesContext).jurisprudencia;

/** Solo para el panel: ningún componente del portal lo usa (spec 006, RF-52). */
export const useModelosService = () => useContext(ServicesContext).modelos;
