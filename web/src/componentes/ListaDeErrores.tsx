/** Problemas de un formulario o de la respuesta de la API, en un aviso. */
export function ListaDeErrores({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <div role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
      <ul className="list-inside list-disc space-y-0.5">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
