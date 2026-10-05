import { Link } from 'react-router-dom';
import type { CausaReferencia } from '../servicios/causas';

export interface Avisos {
  /** Qué no se guardó en el alta y por qué (RF-7), ya redactado. */
  rechazos: string[];
  /** Causas donde un cliente recién vinculado figura como parte no cliente (RF-20). */
  causasComoNoCliente: CausaReferencia[];
}

/** Avisos que deja una operación sobre la causa: rechazos del alta y causas como no cliente. */
export function AvisosResultado({ rechazos, causasComoNoCliente }: Avisos) {
  return (
    <>
      {rechazos.length > 0 && (
        <section
          role="status"
          aria-label="No se guardaron"
          className="rounded bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <p className="font-medium">La causa se creó, pero esto no se guardó:</p>
          <ul className="mt-1 list-inside list-disc">
            {rechazos.map((rechazo) => (
              <li key={rechazo}>{rechazo}</li>
            ))}
          </ul>
        </section>
      )}
      {causasComoNoCliente.length > 0 && (
        <section
          role="status"
          aria-label="Causas como no cliente"
          className="rounded bg-sky-50 px-4 py-3 text-sm text-sky-900"
        >
          <p className="font-medium">
            El cliente figura como parte no cliente en estas causas. No quedan vinculadas y el
            cliente no las ve:
          </p>
          <ul className="mt-1 list-inside list-disc">
            {causasComoNoCliente.map((causa) => (
              <li key={causa.id}>
                <Link to={`/panel/causas/${causa.id}`} className="underline">
                  {causa.numeroExpediente
                    ? `${causa.caratula} (${causa.numeroExpediente})`
                    : causa.caratula}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
