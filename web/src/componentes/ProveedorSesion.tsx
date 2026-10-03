import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { httpClient } from '../servicios/cliente-http';
import { type SessionService, sessionService, type UsuarioPropio } from '../servicios/sesion';

interface SessionContextValue {
  usuario: UsuarioPropio | null;
  /** True hasta saber si hay sesión (la primera consulta a la API). */
  cargando: boolean;
  login: (email: string, contrasena: string) => Promise<UsuarioPropio>;
  logout: () => Promise<void>;
  /** Cambia la contraseña propia y quita el cambio pendiente del usuario en memoria (RF-36). */
  changePassword: (contrasenaActual: string, contrasenaNueva: string) => Promise<void>;
  /** Para actualizar los datos propios después de un cambio. */
  setUsuario: (usuario: UsuarioPropio | null) => void;
  /**
   * Vacía la sesión porque la API la cerró, con un aviso para la pantalla de ingreso
   * (RF-38). RutaProtegida lleva a /ingresar al ver la sesión vacía.
   */
  endSession: (notice: string) => void;
  /** Aviso pendiente para la pantalla de ingreso, o null. */
  notice: string | null;
  clearNotice: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface ProveedorSesionProps {
  children: ReactNode;
  service?: SessionService;
  subscribeSessionClosed?: (listener: () => void) => () => void;
}

/**
 * Estado de la sesión, solo en memoria: nunca se guarda en localStorage ni sessionStorage
 * (principio 5). Al cargar pregunta a la API quién es el usuario; si el cliente HTTP avisa
 * que la sesión se cerró, el usuario pasa a null y RutaProtegida lleva a /ingresar (RF-17).
 */
export function ProveedorSesion({
  children,
  service = sessionService,
  subscribeSessionClosed = httpClient.onSessionClosed,
}: ProveedorSesionProps) {
  const [usuario, setUsuario] = useState<UsuarioPropio | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let active = true;
    service
      .fetchOwnUser()
      .catch(() => null)
      .then((result) => {
        if (!active) return;
        setUsuario(result);
        setCargando(false);
      });
    return () => {
      active = false;
    };
  }, [service]);

  useEffect(() => subscribeSessionClosed(() => setUsuario(null)), [subscribeSessionClosed]);

  const login = useCallback(
    async (email: string, contrasena: string) => {
      const result = await service.login(email, contrasena);
      setUsuario(result);
      return result;
    },
    [service],
  );

  const logout = useCallback(async () => {
    try {
      await service.logout();
    } finally {
      setUsuario(null);
    }
  }, [service]);

  const changePassword = useCallback(
    async (contrasenaActual: string, contrasenaNueva: string) => {
      await service.changePassword(contrasenaActual, contrasenaNueva);
      setUsuario((current) => (current ? { ...current, debeCambiarContrasena: false } : current));
    },
    [service],
  );

  const [notice, setNotice] = useState<string | null>(null);

  const endSession = useCallback((message: string) => {
    setUsuario(null);
    setNotice(message);
  }, []);

  const clearNotice = useCallback(() => setNotice(null), []);

  const value = useMemo(
    () => ({
      usuario,
      cargando,
      login,
      logout,
      changePassword,
      setUsuario,
      endSession,
      notice,
      clearNotice,
    }),
    [usuario, cargando, login, logout, changePassword, endSession, notice, clearNotice],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession se usa dentro de ProveedorSesion');
  return context;
}
