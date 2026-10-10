import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { flexibleKey, uniqueKeywords } from './reglas-jurisprudencia.js';

/** Catálogo compartido de palabras clave (plan 005, "Palabras clave"). */
@Injectable()
export class PalabrasClaveService {
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
