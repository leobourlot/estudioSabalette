import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const MODELOS_DIR = fileURLToPath(new URL('.', import.meta.url));
const PORTAL_DIR = join(MODELOS_DIR, '..', 'portal');

/** Archivos .ts de una carpeta y sus subcarpetas, con su contenido. */
function sourceFiles(dir: string): { path: string; content: string }[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.ts'))
    .map((file) => ({ path: file, content: readFileSync(join(dir, file), 'utf8') }));
}

const isTest = (path: string) => path.endsWith('.spec.ts');

/** Rutas de todos los módulos que importa un archivo. */
const importedPaths = (content: string) =>
  [...content.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);

/**
 * RF-52: los modelos y los escritos completados no se exponen a nadie que no sea administrador
 * o abogado. Estos tests leen el código fuente y fallan si alguien abre un camino.
 */
describe('aislamiento de los modelos de escritos (RF-52)', () => {
  it('ningún archivo del portal importa nada de modelos de escritos', () => {
    const offenders = sourceFiles(PORTAL_DIR)
      .filter(({ content }) => importedPaths(content).some((path) => /modelos-escritos/.test(path)))
      .map(({ path }) => path);

    expect(sourceFiles(PORTAL_DIR).length).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });

  it('ModelosEscritosModule no exporta nada: ningún otro módulo puede usar sus services', () => {
    const module = readFileSync(join(MODELOS_DIR, 'modelos-escritos.module.ts'), 'utf8');

    expect(module).toContain('@Module({');
    expect(module).not.toMatch(/\bexports\s*:/);
  });

  it('todos los controllers solo admiten administradores y abogados', () => {
    const controllers = sourceFiles(MODELOS_DIR).filter(({ path }) =>
      path.endsWith('.controller.ts'),
    );

    expect(controllers.map(({ path }) => path).sort()).toEqual([
      'escritos.controller.ts',
      'modelos-escritos.controller.ts',
    ]);
    for (const { path, content } of controllers) {
      // El decorador va sobre la clase: vale para todas sus rutas.
      expect(content, path).toMatch(/@Roles\('admin', 'abogado'\)\r?\n@Controller\(/);
      expect(content, path).not.toContain("'cliente'");
      expect(content, path).not.toContain('@Public');
    }
  });
});

/** RF-53: los modelos no usan datos de la jurisprudencia. */
describe('modelos de escritos y jurisprudencia (RF-53)', () => {
  // Lo único que se reutiliza: las conversiones de texto y la comparación flexible, que son
  // funciones puras y no llegan a ningún fallo.
  const ALLOWED = [
    /\/jurisprudencia\/validadores\/texto-fallo\.js$/,
    /\/jurisprudencia\/reglas-jurisprudencia\.js$/,
  ];

  it('de jurisprudencia solo se importan las conversiones de texto y la comparación flexible', () => {
    const imports = sourceFiles(MODELOS_DIR)
      .filter(({ path }) => !isTest(path))
      .flatMap(({ path, content }) =>
        importedPaths(content)
          .filter((imported) => /jurisprudencia/.test(imported))
          .map((imported) => ({ path, imported })),
      );

    expect(imports.length).toBeGreaterThan(0);
    const offenders = imports.filter(
      ({ imported }) => !ALLOWED.some((allowed) => allowed.test(imported)),
    );
    expect(offenders).toEqual([]);
  });

  it('el módulo no importa JurisprudenciaModule ni registra sus entidades', () => {
    const module = readFileSync(join(MODELOS_DIR, 'modelos-escritos.module.ts'), 'utf8');

    expect(module).not.toMatch(/jurisprudencia/i);
    expect(module).not.toMatch(/\bFallo\b|\bPalabraClave\b/);
  });

  it('el catálogo no tiene ninguna variable de jurisprudencia', () => {
    const variables = readFileSync(join(MODELOS_DIR, 'variables.ts'), 'utf8');

    expect(variables).not.toMatch(/FALLO|SUMARIO|TRIBUNAL|PALABRA/);
  });
});

/** RNF de registros: ningún texto de un modelo ni de un escrito llega a los registros del servidor. */
describe('registros del servidor en modelos de escritos', () => {
  it('el código de modelos de escritos no usa Logger ni console', () => {
    const offenders = sourceFiles(MODELOS_DIR)
      .filter(({ path }) => !isTest(path))
      .filter(({ content }) => /\bLogger\b|\bconsole\s*\./.test(content))
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });
});

/** RF-43, RF-46: completar un modelo solo lee. */
describe('escritos completados: solo lectura', () => {
  it('el service de escritos no escribe en la base', () => {
    const service = readFileSync(join(MODELOS_DIR, 'escritos.service.ts'), 'utf8');

    expect(service).not.toMatch(/\.(save|insert|update|delete|remove|upsert|query)\(/);
    expect(service).not.toMatch(/transaction|createQueryBuilder/);
  });

  it('el controller de escritos solo tiene un GET', () => {
    const controller = readFileSync(join(MODELOS_DIR, 'escritos.controller.ts'), 'utf8');

    expect(controller.match(/@Get\(/g)).toHaveLength(1);
    expect(controller).not.toMatch(/@(Post|Put|Patch|Delete)\(/);
  });
});
