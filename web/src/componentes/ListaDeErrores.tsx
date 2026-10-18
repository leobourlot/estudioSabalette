import { ERROR_ALERT } from './estilos-aplicacion';
/** Problemas de un formulario o de la respuesta de la API, en un aviso. */
export function ListaDeErrores({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <div role="alert" className={ERROR_ALERT}>
      <ul className="list-inside list-disc space-y-0.5">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
