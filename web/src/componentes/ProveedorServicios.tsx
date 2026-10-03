import { createContext, type ReactNode, useContext } from 'react';
import { type UsersService, usersService } from '../servicios/usuarios';

interface Services {
  users: UsersService;
}

// Por defecto, los servicios reales. Los tests los reemplazan con ProveedorServicios.
const ServicesContext = createContext<Services>({ users: usersService });

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
