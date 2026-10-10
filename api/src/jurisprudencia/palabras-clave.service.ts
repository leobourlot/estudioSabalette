import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import type { DestinoSugerencias } from './dto/sugerencias.dto.js';
import { type PalabraClaveSugerencia, toPalabraClaveSugerencia } from './fallo-detalle.js';
import { flexibleKey, uniqueKeywords } from './reglas-jurisprudencia.js';

const MAX_SUGGESTIONS = 10;

/** Escapa los comodines de LIKE, para que % y _ se busquen como texto. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

/** Catálogo compartido de palabras clave (plan 005, "Palabras clave"). */
@Injectable()
export class PalabrasClaveService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Sugerencias de palabras clave (RF-13, RF-25): hasta 10 palabras del catálogo que contienen
   * lo escrito, con la cantidad de fallos activos que las usan, de la más usada a la menos
   * usada y, a igual cantidad, en orden alfabético. La intercalación utf8mb4_unicode_ci
   * compara sin distinguir mayúsculas, minúsculas ni tildes, y con la ñ como n (RF-9).
   *
   * Para la carga solo aparecen las que usa al menos un fallo activo: un fallo desactivado no
   * cuenta (RF-30). Para el filtro aparecen todas, aunque su cantidad sea 0.
   */
  async suggest(buscar: string, para: DestinoSugerencias): Promise<PalabraClaveSugerencia[]> {
    const join = para === 'carga' ? 'INNER JOIN' : 'LEFT JOIN';
    const filas: { id: number; texto: string; cantidad: number | string }[] =
      await this.dataSource.query(
        `SELECT pc.id AS id, pc.texto AS texto, COUNT(f.id) AS cantidad
         FROM palabras_clave pc
         ${join} fallo_palabras_clave fpc ON fpc.palabraClaveId = pc.id
         ${join} fallos f ON f.id = fpc.falloId AND f.activo = 1
         WHERE pc.texto LIKE ?
         GROUP BY pc.id, pc.texto
         ORDER BY cantidad DESC, pc.texto ASC, pc.id ASC
         LIMIT ${MAX_SUGGESTIONS}`,
        [`%${escapeLike(buscar)}%`],
      );
    return filas.map(toPalabraClaveSugerencia);
  }

  /**
   * Resuelve las palabras clave de un fallo contra el catálogo, dentro de la transacción que
   * guarda el fallo: si algo se rechaza, no queda ninguna palabra nueva (RF-12). Devuelve
   * sus ids, sin repetidas (RF-14).
   *
   * Cada palabra se guarda con una sola sentencia: si su clave ya existe, la forma escrita
   * reemplaza a la anterior (RF-12). Enviar el texto exacto del catálogo, como hace la
   * interfaz al elegir una sugerencia, no cambia nada. El índice único sobre la clave deja una
   * sola fila aunque dos guardados lleguen a la vez.
   */
  async resolve(manager: EntityManager, textos: readonly string[]): Promise<number[]> {
    // En orden de clave: dos guardados simultáneos con las mismas palabras las bloquean en
    // el mismo orden y no se traban entre sí.
    const palabras = uniqueKeywords(textos)
      .map((texto) => ({ texto, clave: flexibleKey(texto) }))
      .sort((a, b) => (a.clave < b.clave ? -1 : a.clave > b.clave ? 1 : 0));
    const ahora = new Date();
    const ids: number[] = [];
    for (const { texto, clave } of palabras) {
      await manager.query(
        `INSERT INTO palabras_clave (texto, clave, creadoEn) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE texto = VALUES(texto)`,
        [texto, clave, ahora],
      );
      const [fila]: { id: number }[] = await manager.query(
        'SELECT id FROM palabras_clave WHERE clave = ?',
        [clave],
      );
      ids.push(Number(fila.id));
    }
    return ids;
  }
}
