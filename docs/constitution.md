# Constitución — estudioSabalette

Principios innegociables. Toda spec, plan y tarea debe cumplirlos.

1. **Stack mínimo.** Frontend React + Vite + Tailwind 3, backend NestJS + TypeORM, base MySQL en VPS propio con Easypanel. Gestor de paquetes: pnpm. No se agrega ninguna dependencia sin justificarla en la spec o el plan activos.
2. **La spec manda.** No se escribe código sin una spec en `docs/specs/` que lo cubra. Si código y spec divergen, se corrigen en el mismo commit.
3. **Lógica separada de la interfaz.** Los componentes React solo muestran datos y delegan. Las reglas de negocio, validaciones y llamadas a la API viven en `src/servicios/`, que no importa React. En NestJS, los controllers no contienen lógica: la delegan a los services.
4. **Tests obligatorios.** Toda regla de negocio y todo endpoint tiene al menos un test (Vitest en frontend y backend). Una tarea no está terminada si `pnpm test` no pasa.
5. **Persistencia única y aislada.** Los datos se guardan solo en MySQL y solo se accede a ellos a través de la API. No se guardan datos de casos en localStorage. El servidor filtra cada consulta de cliente por su propio id, así que un cliente nunca ve casos ajenos.
6. **Idioma.** Variables y funciones en inglés. Nombres de archivos y carpetas, entidades y campos del dominio (`caratula`, `numeroExpediente`, `movimientos`, `fecha`, `partes`) en español y sin tildes. Interfaz, mensajes de error, commits y documentación en español.
