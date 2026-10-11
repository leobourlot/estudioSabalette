import { describe, expect, it } from 'vitest';

/**
 * Spec 006, RF-52 y RF-53: los modelos y los escritos completados son solo del panel, y no usan
 * datos de la jurisprudencia. Este test lee el código fuente de la web y falla si algún archivo
 * del portal importa algo de modelos, o si algún archivo de modelos usa el servicio de
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

/** Módulos de la spec 006: servicios, componentes y páginas de modelos y de escritos. */
const MODEL_MODULES = [
  'modelos-escritos',
  'texto-modelo',
  'formulario-modelo',
  'presentacion-modelos',
  'sesion-escrito',
  'useUsoDeSesion',
  'useCierrePorInactividad',
  'FilaModelo',
  'FiltrosModelos',
  'ListaModelos',
  'FormularioModelo',
  'CatalogoVariables',
  'PreguntaModeloRepetido',
  'AvisosEscrito',
  'PanelModelo',
  'PanelCausaModelos',
  'PanelEscrito',
  'modelos-de-prueba',
];

const IMPORTS_MODELS = new RegExp(`from\\s+['"][^'"]*(${MODEL_MODULES.join('|')})[^'"]*['"]`);

const usesModels = (content: string) =>
  IMPORTS_MODELS.test(content) || content.includes('useModelosService');

/** Archivos propios de la spec 006 (sin sus tests, que arman la aplicación completa). */
const isModelFile = (path: string) =>
  !/\.test\.|\/pruebas\//.test(path) &&
  new RegExp(`^\\./(servicios|componentes|paginas)/(${MODEL_MODULES.join('|')})`).test(path);

const IMPORTS_RULINGS_SERVICE = /from\s+['"][^'"]*servicios\/jurisprudencia['"]/;

const usesRulingsService = (content: string) =>
  IMPORTS_RULINGS_SERVICE.test(content) ||
  /from\s+['"]\.\/jurisprudencia['"]/.test(content) ||
  content.includes('useJurisprudenciaService') ||
  content.includes('useMantenerSesion');

describe('aislamiento de los modelos en la web (RF-52)', () => {
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

  it('la regla detecta un archivo que sí usa modelos', () => {
    // Si la regla dejara de reconocer los imports, el test siguiente pasaría sin verificar nada.
    expect(usesModels(sources['./paginas/PanelModelos.tsx'])).toBe(true);
    expect(usesModels(sources['./paginas/PanelEscrito.tsx'])).toBe(true);
    expect(usesModels(sources['./componentes/ListaModelos.tsx'])).toBe(true);
    expect(usesModels(sources['./componentes/FormularioModelo.tsx'])).toBe(true);
    expect(usesModels(sources['./paginas/PanelCausaDetalle.tsx'])).toBe(false);
  });

  it('ningún archivo del portal importa ni usa nada de modelos ni de escritos', () => {
    const offenders = portalFiles.filter((path) => usesModels(sources[path]));

    expect(offenders).toEqual([]);
  });

  it('ningún archivo del portal nombra los modelos ni los escritos completados en lo que muestra', () => {
    // Los archivos de prueba del portal no cuentan: no se muestran al cliente.
    const shown = portalFiles.filter((path) => !/\.test\.|\/pruebas\//.test(path));
    const offenders = shown.filter((path) =>
      /modelos? de escrito|escrito completado|completar un modelo/i.test(sources[path]),
    );

    expect(offenders).toEqual([]);
  });
});

describe('modelos y jurisprudencia en la web (RF-53)', () => {
  const modelFiles = Object.keys(sources).filter(isModelFile);

  it('reconoce los archivos de modelos', () => {
    expect(modelFiles).toEqual(
      expect.arrayContaining([
        './servicios/modelos-escritos.ts',
        './servicios/texto-modelo.ts',
        './servicios/formulario-modelo.ts',
        './componentes/useUsoDeSesion.ts',
        './componentes/FormularioModelo.tsx',
        './componentes/ListaModelos.tsx',
        './paginas/PanelModelos.tsx',
        './paginas/PanelModeloNuevo.tsx',
        './paginas/PanelModeloDetalle.tsx',
        './paginas/PanelCausaModelos.tsx',
        './paginas/PanelEscrito.tsx',
      ]),
    );
  });

  it('la regla detecta un archivo que sí usa el servicio de jurisprudencia', () => {
    expect(usesRulingsService(sources['./paginas/PanelJurisprudencia.tsx'])).toBe(true);
    expect(usesRulingsService(sources['./componentes/useMantenerSesion.ts'])).toBe(true);
    expect(usesRulingsService(sources['./servicios/formulario-fallo.ts'])).toBe(true);
  });

  it('ningún archivo de modelos usa el servicio de jurisprudencia', () => {
    const offenders = modelFiles.filter((path) => usesRulingsService(sources[path]));

    expect(offenders).toEqual([]);
  });

  it('de jurisprudencia, los modelos solo reutilizan las conversiones de texto', () => {
    // texto-fallo.ts son funciones puras de texto: no llegan a ningún fallo.
    const importsOfRulings = modelFiles.flatMap((path) =>
      [...sources[path].matchAll(/from\s+['"]([^'"]*(?:fallo|jurisprudencia)[^'"]*)['"]/gi)].map(
        (match) => `${path} -> ${match[1]}`,
      ),
    );

    expect(importsOfRulings.length).toBeGreaterThan(0);
    for (const imported of importsOfRulings) expect(imported).toMatch(/-> \.\/texto-fallo$/);
  });
});
