import { APP_TITLES } from '../servicios/rutas-sitio';
import { BloqueContactoEstudio } from './BloqueContactoEstudio';
import { BotonWhatsapp } from './BotonWhatsapp';
import { DisenoSeccion } from './DisenoSeccion';
import { useTituloDocumento } from './useTituloDocumento';

/**
 * Diseño del portal de clientes. Debajo de cada página, el contacto del estudio (spec 004,
 * RF-18), y siempre visible, el botón de WhatsApp (RF-19). El contacto deja al final un margen
 * mayor que el botón, para que este nunca tape contenido.
 */
export function DisenoPortal() {
  useTituloDocumento(APP_TITLES.portal);
  return (
    <>
      <DisenoSeccion
        title="Portal de clientes"
        links={[
          { to: '/portal', label: 'Mis causas', end: true },
          { to: '/portal/mi-cuenta', label: 'Mi cuenta' },
          { to: '/cambiar-contrasena', label: 'Cambiar contraseña' },
        ]}
        footer={<BloqueContactoEstudio />}
      />
      <BotonWhatsapp />
    </>
  );
}
