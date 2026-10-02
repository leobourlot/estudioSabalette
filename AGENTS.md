# AGENTS.md — estudioSabalette

## Proyecto
Sitio web de un estudio jurídico: páginas públicas (estudio, integrantes, servicios, contacto, WhatsApp), portal donde cada cliente sigue solo sus causas, y panel de administración para cargar causas, partes, movimientos, jurisprudencia y modelos de escritos. En el portal, el cliente ve solo los movimientos marcados como visibles para él.
Monorepo pnpm con dos paquetes: `web/` (React + Vite + TypeScript + Tailwind 3) y `api/` (NestJS + TypeScript + TypeORM). La base es MySQL, en un VPS propio con Easypanel.

## Comandos (desde la raíz)
- Instalar: `pnpm install`
- Ejecutar: `pnpm dev` (levanta web y api)
- Tests: `pnpm test` (Vitest en web y en api)
- Lint/formato: `pnpm lint` y `pnpm format` (ESLint + Prettier)

## Estilo y convenciones
- TypeScript estricto en los dos paquetes.
- Variables y funciones en inglés.
- Nombres de archivos y carpetas, entidades y campos del dominio en español y sin tildes (`caratula`, `numeroExpediente`, `movimientos`).
- Interfaz, mensajes de error, commits y documentación en español.

## Reglas
- Lee docs/constitution.md y la spec activa antes de tocar código.
- No hagas commits ni push sin un pedido explícito.
- Pregunta antes de modificar archivos existentes o de agregar dependencias.
- No toques `.env` ni credenciales, y no te conectes a la base de producción.
- El esquema de la base solo cambia mediante migraciones de TypeORM; `synchronize` siempre en `false`.

## Al terminar cualquier tarea
- `pnpm test` y `pnpm lint` sin errores.
- Confirma que el cambio coincide con la spec activa. Si no coincide, avisa en lugar de seguir.
