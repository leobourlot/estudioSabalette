/**
 * Texto de un movimiento tal como se cargó (RNF de textos seguros, RF-3). React lo escapa, así
 * que nunca se interpreta como código ni como formato, y `whitespace-pre-wrap` muestra los
 * saltos de línea y las líneas en blanco.
 */
export function TextoLiteral({ texto, className = '' }: { texto: string; className?: string }) {
  return <p className={`whitespace-pre-wrap break-words ${className}`.trim()}>{texto}</p>;
}
