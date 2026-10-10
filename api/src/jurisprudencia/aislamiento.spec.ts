import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const JURISPRUDENCIA_DIR = fileURLToPath(new URL('.', import.meta.url));
const PORTAL_DIR = join(JURISPRUDENCIA_DIR, '..', 'portal');

/** Archivos .ts de una carpeta y sus subcarpetas, con su contenido. */
function sourceFiles(dir: string): { path: string; content: string }[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.ts'))
    .map((file) => ({ path: file, content: readFileSync(join(dir, file), 'utf8') }));
}

const isTest = (path: string) => path.endsWith('.spec.ts');

/**
 * RF-36: la jurisprudencia no se expone a nadie que no sea administrador o abogado. Estos
 * tests leen el código fuente y fallan si alguien abre un camino desde el portal.
 */
describe('aislamiento de la jurisprudencia (RF-36)', () => {
  it('ningún archivo del portal importa nada de jurisprudencia', () => {
    const offenders = sourceFiles(PORTAL_DIR)
      .filter(({ content }) => /from\s+['"][^'"]*jurisprudencia[^'"]*['"]/.test(content))
      .map(({ path }) => path);

    expect(sourceFiles(PORTAL_DIR).length).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });

  it('JurisprudenciaModule no exporta nada: ningún otro módulo puede usar sus services', () => {
    const module = readFileSync(join(JURISPRUDENCIA_DIR, 'jurisprudencia.module.ts'), 'utf8');

    expect(module).toContain('@Module({');
    expect(module).not.toMatch(/\bexports\s*:/);
  });

  it('el controller solo admite administradores y abogados', () => {
    const controller = readFileSync(
      join(JURISPRUDENCIA_DIR, 'jurisprudencia.controller.ts'),
      'utf8',
    );

    expect(controller).toContain("@Roles('admin', 'abogado')");
    expect(controller).not.toContain("'cliente'");
    expect(controller).not.toContain('@Public');
  });
});

/** RNF de registros: ningún dato de los fallos se escribe en los registros del servidor. */
describe('registros del servidor en jurisprudencia', () => {
  it('el código de jurisprudencia no usa Logger ni console', () => {
    const offenders = sourceFiles(JURISPRUDENCIA_DIR)
      .filter(({ path }) => !isTest(path))
      .filter(({ content }) => /\bLogger\b|\bconsole\s*\./.test(content))
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });
});
