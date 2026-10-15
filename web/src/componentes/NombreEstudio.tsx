import { STUDIO_CONTACT, type StudioContact } from '../servicios/datos-estudio';

interface NombreEstudioProps {
  className?: string;
  /** Los tests pasan otros datos; la aplicación usa siempre los del estudio. */
  contact?: StudioContact;
}

/**
 * El nombre del estudio en dos líneas: "Pertusatti | Sabalette", que nunca se corta, y
 * "Abogadas" debajo (spec 007, RF-3). El " - " del medio solo lo lee el lector de pantalla, así
 * el nombre se anuncia completo y el texto del elemento es el nombre exacto.
 */
export function NombreEstudio({ className = '', contact = STUDIO_CONTACT }: NombreEstudioProps) {
  const [first, second] = contact.nombreLineas;
  return (
    <span className={`inline-flex flex-col leading-tight ${className}`}>
      <span className="whitespace-nowrap">{first}</span>
      <span className="sr-only"> - </span>
      <span>{second}</span>
    </span>
  );
}
