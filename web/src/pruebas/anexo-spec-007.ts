import specText from '../../../docs/specs/007-sitio-publico/spec.md?raw';
import type { Bloque } from '../servicios/contenido-sitio';

/**
 * Lector del anexo "Textos aprobados" de la spec 007, para comparar el contenido del sitio con
 * la spec palabra por palabra (RF-2). Lee el archivo de la spec, así que si alguien cambia un
 * texto en un solo lado, los tests fallan.
 */

const lines = specText.replace(/\r\n/g, '\n').split('\n');
const annexStart = lines.findIndex((line) => line.startsWith('## Anexo'));

/** Renglones de una sección del anexo ("T-8", "T-3 a T-6"), sin su título. */
export function annexSection(id: string): string[] {
  const start = lines.findIndex(
    (line, index) =>
      index > annexStart && (line.startsWith(`### ${id} `) || line.startsWith(`### ${id}—`)),
  );
  if (start === -1) throw new Error(`No está la sección ${id} en el anexo`);
  const end = lines.findIndex((line, index) => index > start && line.startsWith('### '));
  return lines.slice(start + 1, end === -1 ? undefined : end);
}

const QUOTE = /^\s*>\s?/;

/** Los bloques de una cita: cada renglón es un párrafo y los "- " seguidos forman una lista. */
export function quoteBlocks(section: string[]): Bloque[] {
  const blocks: Bloque[] = [];
  for (const raw of section) {
    if (!QUOTE.test(raw)) continue;
    const text = raw.replace(QUOTE, '');
    if (text === '') continue;
    if (text.startsWith('- ')) {
      const last = blocks.at(-1);
      const item = text.slice(2);
      if (last?.tipo === 'lista')
        blocks[blocks.length - 1] = { ...last, items: [...last.items, item] };
      else blocks.push({ tipo: 'lista', items: [item] });
    } else {
      blocks.push({ tipo: 'parrafo', texto: text });
    }
  }
  return blocks;
}

/** Los párrafos de una cita sin listas. */
export function quoteParagraphs(section: string[]): string[] {
  return quoteBlocks(section).map((block) => {
    if (block.tipo !== 'parrafo') throw new Error('La cita tiene una lista');
    return block.texto;
  });
}

/** El texto de una cita de un solo párrafo. */
export function quoteText(section: string[]): string {
  const paragraphs = quoteParagraphs(section);
  if (paragraphs.length !== 1) throw new Error('La cita no tiene un solo párrafo');
  return paragraphs[0];
}

/** Los puntos de una lista común (sin cita): "- texto". */
export function listItems(section: string[]): string[] {
  return section.filter((line) => line.startsWith('- ')).map((line) => line.slice(2));
}

/**
 * Las citas que siguen a cada punto de una lista, por la etiqueta del punto. Por ejemplo, en
 * T-15: "Sucesiones:" → "Hola, me contacto…".
 */
export function quotesByItem(section: string[]): Map<string, string> {
  const result = new Map<string, string>();
  let label: string | null = null;
  for (const line of section) {
    if (line.startsWith('- ')) label = line.slice(2);
    else if (label !== null && QUOTE.test(line)) result.set(label, line.replace(QUOTE, ''));
  }
  return result;
}

/** Los textos entre comillas de un renglón ("Servicios", "Abogadas"…). */
export function quotedStrings(line: string): string[] {
  return Array.from(line.matchAll(/"([^"]+)"/g), (match) => match[1]);
}
