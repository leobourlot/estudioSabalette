import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { SitioAbogada } from './paginas/SitioAbogada';
import { SitioDerechoLaboral } from './paginas/SitioDerechoLaboral';
import { SitioInicio } from './paginas/SitioInicio';
import { SitioNoEncontrada } from './paginas/SitioNoEncontrada';
import { SitioServicio } from './paginas/SitioServicio';
import {
  ABOGADAS,
  type ClavePestana,
  hasOwnPage,
  PESTANAS_LABORAL,
} from './servicios/contenido-sitio';
import { REDIRECTS } from './servicios/rutas-sitio';

/** Una pestaña de Derecho Laboral; otra cosa es una dirección inexistente (RF-9). */
function PestanaLaboral() {
  const { pestana } = useParams();
  const known = PESTANAS_LABORAL.some((p) => p.clave === pestana);
  return known ? <SitioDerechoLaboral pestana={pestana as ClavePestana} /> : <SitioNoEncontrada />;
}

/** La página de una abogada con sus textos; sin ellos, no tiene página (RF-20). */
function PaginaAbogada() {
  const { slug } = useParams();
  const abogada = ABOGADAS.find((a) => a.slug === slug && hasOwnPage(a));
  return abogada ? <SitioAbogada abogada={abogada} /> : <SitioNoEncontrada />;
}

/**
 * Rutas del sitio público (spec 007, RF-1, RF-8 y RF-9; plan 007, "Rutas del sitio público").
 * Las redirecciones también las hace el .htaccess en producción; acá cubren el desarrollo.
 */
export function RutasSitio() {
  return (
    <Routes>
      <Route path="/" element={<SitioInicio />} />
      <Route path="/servicios/derecho-laboral/:pestana" element={<PestanaLaboral />} />
      <Route
        path="/servicios/accidentes-de-trabajo"
        element={<SitioServicio clave="accidentes" />}
      />
      <Route path="/servicios/derecho-de-danos" element={<SitioServicio clave="danos" />} />
      <Route path="/servicios/sucesiones" element={<SitioServicio clave="sucesiones" />} />
      <Route path="/abogadas/:slug" element={<PaginaAbogada />} />
      {Object.entries(REDIRECTS).map(([from, to]) => (
        <Route key={from} path={from} element={<Navigate to={to} replace />} />
      ))}
      <Route path="*" element={<SitioNoEncontrada />} />
    </Routes>
  );
}
