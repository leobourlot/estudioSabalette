import { Route, Routes } from 'react-router-dom';
import { RutaProtegida } from './componentes/RutaProtegida';
import { MiCuenta } from './paginas/MiCuenta';
import { PaginaCambiarContrasena } from './paginas/PaginaCambiarContrasena';
import { PaginaIngreso } from './paginas/PaginaIngreso';
import { PaginaInicio } from './paginas/PaginaInicio';
import { PaginaNoEncontrada } from './paginas/PaginaNoEncontrada';
import { PanelInicio } from './paginas/PanelInicio';
import { PanelUsuarioDetalle } from './paginas/PanelUsuarioDetalle';
import { PanelUsuarioNuevo } from './paginas/PanelUsuarioNuevo';
import { PanelUsuarios } from './paginas/PanelUsuarios';
import { PortalInicio } from './paginas/PortalInicio';

/**
 * Rutas de la aplicación (plan 001, "Rutas"). Están separadas del router para poder
 * probarlas con un MemoryRouter. RutaProtegida decide el acceso de todas las rutas que
 * dependen de la sesión, incluida /ingresar (que con sesión lleva al inicio de la sección).
 */
export function RutasAplicacion() {
  return (
    <Routes>
      <Route path="/" element={<PaginaInicio />} />
      <Route element={<RutaProtegida />}>
        <Route path="/ingresar" element={<PaginaIngreso />} />
        <Route path="/cambiar-contrasena" element={<PaginaCambiarContrasena />} />
        <Route path="/panel" element={<PanelInicio />} />
        <Route path="/panel/usuarios" element={<PanelUsuarios />} />
        <Route path="/panel/usuarios/nuevo" element={<PanelUsuarioNuevo />} />
        <Route path="/panel/usuarios/:id" element={<PanelUsuarioDetalle />} />
        <Route path="/panel/mi-cuenta" element={<MiCuenta />} />
        <Route path="/portal" element={<PortalInicio />} />
        <Route path="/portal/mi-cuenta" element={<MiCuenta />} />
      </Route>
      <Route path="*" element={<PaginaNoEncontrada />} />
    </Routes>
  );
}
