import { STUDIO_CONTACT, type StudioContact } from '../servicios/datos-estudio';

interface NombreEstudioProps {
  className?: string;
  /** Los tests pasan otros datos; la aplicación usa siempre los del estudio. */
  contact?: StudioContact;
  /** "Abogadas" centrado debajo de la primera línea, como cuando va junto al logo. */
  centrado?: boolean;
}

/**
 * El nombre del estudio en dos líneas: "Pertusatti | Sabalette", que nunca se corta, y
 * "Abogadas" debajo (spec 007, RF-3). El guion del medio solo lo lee el lector de pantalla, así el
 * nombre se anuncia completo y el texto del elemento es el nombre exacto. Los espacios van fuera
 * de los elementos: en una caja flexible no ocupan lugar, pero separan las palabras del nombre.
 */
export function NombreEstudio({
  className = '',
  contact = STUDIO_CONTACT,
  centrado = false,
}: NombreEstudioProps) {
  const [first, second] = contact.nombreLineas;
  const alignment = centrado ? 'items-center text-center' : '';
  return (
    <span className={`inline-flex flex-col leading-tight ${alignment} ${className}`}>
      <span className="whitespace-nowrap">{first}</span> <span className="sr-only">-</span>{' '}
      <span>{second}</span>
    </span>
  );
}
