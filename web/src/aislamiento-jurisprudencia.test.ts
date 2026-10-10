import { describe, expect, it } from 'vitest';

/**
 * RF-36: la jurisprudencia no se expone a nadie que no sea administrador o abogado. Este test
 * lee el código fuente de la web y falla si algún archivo del portal importa algo de
 * jurisprudencia. El control real lo hace la API; esto evita abrir un camino por descuido.
 */

// Contenido de todos los archivos fuente, por su ruta relativa a src/.
const sources = import.meta.glob<string>(['./**/*.ts', './**/*.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Archivos del portal del cliente: sus páginas, sus componentes y sus servicios. */
const isPortalFile = (path: string) =>
  /^\.\/paginas\/Portal/.test(path) ||
  /^\.\/componentes\/[A-Za-z]*Portal/.test(path) ||
  /^\.\/componentes\/(BloqueContactoEstudio|BotonWhatsapp)\./.test(path) ||
  /^\.\/servicios\/(portal|presentacion-portal|datos-estudio)\./.test(path) ||
  /^\.\/pruebas\/portal-de-prueba\./.test(path);

/** Módulos de la spec 005: servicios, componentes y páginas de jurisprudencia. */
const RULING_MODULES = [
  'jurisprudencia',
  'texto-fallo',
  'formulario-fallo',
  'mantener-sesion',
  'useMantenerSesion',
  'FilaFallo',
  'EnlaceFuente',
  'FormularioFallo',
  'FiltrosJurisprudencia',
  'SelectorPalabrasClave',
  'PreguntaFalloRepetido',
  'PanelFallo',
  'PanelJurisprudencia',
];

const IMPORTS_RULINGS = new RegExp(`from\\s+['"][^'"]*(${RULING_MODULES.join('|')})[^'"]*['"]`);

const usesRulings = (content: string) =>
  IMPORTS_RULINGS.test(content) || content.includes('useJurisprudenciaService');

describe('aislamiento de la jurisprudencia en la web (RF-36)', () => {
  const portalFiles = Object.keys(sources).filter(isPortalFile);

  it('reconoce los archivos del portal', () => {
    expect(portalFiles).toEqual(
      expect.arrayContaining([
        './paginas/PortalInicio.tsx',
        './paginas/PortalCausaDetalle.tsx',
        './paginas/PortalMovimientoDetalle.tsx',
        './componentes/DisenoPortal.tsx',
        './componentes/MovimientosPortal.tsx',
        './servicios/portal.ts',
      ]),
    );
  });

  it('la regla detecta un archivo que sí usa jurisprudencia', () => {
    // Si la regla dejara de reconocer los imports, el test siguiente pasaría sin verificar nada.
    expect(usesRulings(sources['./paginas/PanelJurisprudencia.tsx'])).toBe(true);
    expect(usesRulings(sources['./componentes/FiltrosJurisprudencia.tsx'])).toBe(true);
    expect(usesRulings(sources['./componentes/FormularioFallo.tsx'])).toBe(true);
  });

  it('ningún archivo del portal importa ni usa nada de jurisprudencia', () => {
    const offenders = portalFiles.filter((path) => usesRulings(sources[path]));

    expect(offenders).toEqual([]);
  });

  it('ningún archivo del portal nombra la jurisprudencia en lo que muestra', () => {
    // Los archivos de prueba del portal no cuentan: no se muestran al cliente.
    const shown = portalFiles.filter((path) => !/\.test\.|\/pruebas\//.test(path));
    const offenders = shown.filter((path) => /jurisprudencia|sumario|fallo/i.test(sources[path]));

    expect(offenders).toEqual([]);
  });
});
