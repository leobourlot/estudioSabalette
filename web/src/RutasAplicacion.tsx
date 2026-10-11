import { Route, Routes } from 'react-router-dom';
import { DisenoPanel } from './componentes/DisenoPanel';
import { DisenoPortal } from './componentes/DisenoPortal';
import { RutaProtegida } from './componentes/RutaProtegida';
import { MiCuenta } from './paginas/MiCuenta';
import { PaginaCambiarContrasena } from './paginas/PaginaCambiarContrasena';
import { PaginaIngreso } from './paginas/PaginaIngreso';
import { PaginaInicio } from './paginas/PaginaInicio';
import { PaginaNoEncontrada } from './paginas/PaginaNoEncontrada';
import { PanelCausaDetalle } from './paginas/PanelCausaDetalle';
import { PanelCausaModelos } from './paginas/PanelCausaModelos';
import { PanelCausaNueva } from './paginas/PanelCausaNueva';
import { PanelCausas } from './paginas/PanelCausas';
import { PanelEscrito } from './paginas/PanelEscrito';
import { PanelFalloDetalle } from './paginas/PanelFalloDetalle';
import { PanelFalloNuevo } from './paginas/PanelFalloNuevo';
import { PanelInicio } from './paginas/PanelInicio';
import { PanelJurisprudencia } from './paginas/PanelJurisprudencia';
import { PanelModeloDetalle } from './paginas/PanelModeloDetalle';
import { PanelModeloNuevo } from './paginas/PanelModeloNuevo';
import { PanelModelos } from './paginas/PanelModelos';
import { PanelMovimientoDetalle } from './paginas/PanelMovimientoDetalle';
import { PanelUsuarioDetalle } from './paginas/PanelUsuarioDetalle';
import { PanelUsuarioNuevo } from './paginas/PanelUsuarioNuevo';
import { PanelUsuarios } from './paginas/PanelUsuarios';
import { PortalCausaDetalle } from './paginas/PortalCausaDetalle';
import { PortalInicio } from './paginas/PortalInicio';
import { PortalMovimientoDetalle } from './paginas/PortalMovimientoDetalle';

/**
 * Rutas de la aplicación (planes 001 a 006, "Rutas"). Están separadas del router para poder
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
        <Route element={<DisenoPanel />}>
          <Route path="/panel" element={<PanelInicio />} />
          <Route path="/panel/causas" element={<PanelCausas />} />
          <Route path="/panel/causas/nueva" element={<PanelCausaNueva />} />
          <Route path="/panel/causas/:id" element={<PanelCausaDetalle />} />
          <Route
            path="/panel/causas/:id/movimientos/:movimientoId"
            element={<PanelMovimientoDetalle />}
          />
          <Route path="/panel/jurisprudencia" element={<PanelJurisprudencia />} />
          <Route path="/panel/jurisprudencia/nuevo" element={<PanelFalloNuevo />} />
          <Route path="/panel/jurisprudencia/:id" element={<PanelFalloDetalle />} />
          <Route path="/panel/modelos" element={<PanelModelos />} />
          <Route path="/panel/modelos/nuevo" element={<PanelModeloNuevo />} />
          <Route path="/panel/modelos/:id" element={<PanelModeloDetalle />} />
          <Route path="/panel/causas/:id/modelos" element={<PanelCausaModelos />} />
          <Route path="/panel/causas/:id/modelos/:modeloId" element={<PanelEscrito />} />
          <Route path="/panel/usuarios" element={<PanelUsuarios />} />
          <Route path="/panel/usuarios/nuevo" element={<PanelUsuarioNuevo />} />
          <Route path="/panel/usuarios/:id" element={<PanelUsuarioDetalle />} />
          <Route path="/panel/mi-cuenta" element={<MiCuenta />} />
        </Route>
        <Route element={<DisenoPortal />}>
          <Route path="/portal" element={<PortalInicio />} />
          <Route path="/portal/causas/:id" element={<PortalCausaDetalle />} />
          <Route
            path="/portal/causas/:id/movimientos/:movimientoId"
            element={<PortalMovimientoDetalle />}
          />
          <Route path="/portal/mi-cuenta" element={<MiCuenta />} />
        </Route>
      </Route>
      <Route path="*" element={<PaginaNoEncontrada />} />
    </Routes>
  );
}
