# Proyecto: `estudioSabalette`

Sitio web de un estudio jurídico con tres partes:

- **Sitio público**: el estudio, sus integrantes, servicios, contacto y WhatsApp.
- **Panel de administración**: para los integrantes del estudio. Permite cargar causas, partes, movimientos, jurisprudencia y modelos de escritos.
- **Portal de clientes**: cada cliente ve solo sus propias causas y los movimientos marcados como visibles para él.

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind 3 (`web/`).
- **Backend**: NestJS + TypeScript + TypeORM (`api/`).
- **Base de datos**: MySQL en VPS propio con Easypanel.
- **Alojamiento**: el frontend se publica como sitio estático en Hostinger, en el dominio del estudio. La API corre en Easypanel, en un subdominio del mismo dominio (por ejemplo, `api.estudio.com`), para que las cookies de sesión funcionen.
- **Monorepo**: pnpm workspaces.
- **Tests**: Vitest en `web/` y en `api/`.

## Estructura del proyecto

```
estudio-cli/
├── AGENTS.md
├── CLAUDE.md                        # una línea: @AGENTS.md
├── README.md
├── package.json                     # scripts de la raíz: dev, test, lint, format
├── pnpm-workspace.yaml
├── docs/
│   ├── constitution.md
│   └── specs/
│       ├── _plantilla.md            # plantilla de spec
│       ├── 001-autenticacion-y-roles/
│       │   ├── spec.md
│       │   ├── plan.md
│       │   └── tasks.md
│       ├── 002-causas-y-partes/
│       ├── 003-movimientos/
│       ├── 004-portal-del-cliente/
│       ├── 005-jurisprudencia/
│       ├── 006-modelos-de-escritos/
│       └── 007-sitio-publico/
├── web/                             # React + Vite
│   └── src/
│       ├── componentes/             # solo muestran datos y delegan
│       ├── paginas/
│       └── servicios/               # reglas, validaciones y llamadas a la API (no importa React)
└── api/                             # NestJS
    ├── src/
    │   ├── autenticacion/
    │   ├── usuarios/
    │   ├── causas/
    │   ├── movimientos/
    │   ├── jurisprudencia/
    │   ├── modelos-escritos/
    │   └── migraciones/
    └── test/                        # tests e2e
```

La estructura de `web/src` y `api/src` es orientativa. Cada `plan.md` define los módulos concretos que agrega.

## Hoja de ruta de specs

| Spec | Qué cubre | Depende de | Estado |
|------|-----------|------------|--------|
| 001-autenticacion-y-roles | Ingreso, sesión, roles, gestión de usuarios (incluye cuentas de clientes) | — | Terminada |
| 002-causas-y-partes | Alta, edición, listado y búsqueda de causas; partes; vinculación con clientes y abogados | 001 | Terminada |
| 003-movimientos | Registro e historial de movimientos; visibilidad para el cliente | 002 | Terminada |
| 004-portal-del-cliente | El cliente ve sus causas y los movimientos visibles | 001, 003 | Pendiente |
| 005-jurisprudencia | Carátula, palabras clave, resumen y búsqueda | 001 | Pendiente |
| 006-modelos-de-escritos | Plantillas con variables completadas con datos de una causa | 002 | Pendiente |
| 007-sitio-publico | Estudio, integrantes, servicios, contacto, WhatsApp | — | Pendiente |

Cada spec pasa por el ciclo completo (spec → clarificación → plan → tareas → implementación → validación) antes de empezar la siguiente.

## Uso

| Ruta | Quién accede |
|------|--------------|
| `/` y páginas públicas | Cualquier visitante |
| `/ingresar` | Cualquier visitante |
| `/cambiar-contrasena` | Cualquier usuario con sesión |
| `/panel/...` | Roles `admin` y `abogado` |
| `/panel/usuarios` | `admin` gestiona todas las cuentas; `abogado`, solo las de clientes |
| `/portal/...` | Rol `cliente` |

No hay registro público: los administradores crean las cuentas de los integrantes, y administradores y abogados crean las de los clientes. El administrador principal se crea con un comando de consola del paquete `api`, que también permite restablecer su contraseña (ver el plan de la spec 001).

Los datos se guardan únicamente en MySQL y solo se accede a ellos a través de la API. El frontend no guarda datos de casos en `localStorage`. La API filtra cada consulta de un cliente por su propio id, así que un cliente nunca ve causas ajenas.

## Desarrollo

Requisitos: Node 24 LTS, pnpm 9 y acceso a dos bases MySQL en Easypanel, una de desarrollo y otra de tests, separadas de la de producción (nunca se usa la de producción para desarrollar ni para tests).

```bash
pnpm install        # instala las dependencias de web y api
pnpm dev            # levanta web y api
pnpm test           # Vitest en web y en api
pnpm lint           # ESLint
pnpm format         # Prettier
```

- Las variables de entorno se documentan en `web/.env.example` y `api/.env.example`. Los archivos `.env` reales no se versionan.
- El esquema de la base cambia solo mediante migraciones de TypeORM. `synchronize` siempre está en `false`.
- Una tarea está terminada solo si `pnpm test` y `pnpm lint` pasan sin errores.

## Prompts SDD

Los prompts usan como ejemplo la spec `001-autenticacion-y-roles`. Para las siguientes, cambia el número, el nombre de la carpeta y la idea inicial.

### 1. Setup, constitución y AGENTS.md

**Constitución:**

```text
Vamos a crear la constitución de un proyecto nuevo: el sitio web de un estudio
jurídico con páginas públicas, un panel de administración para los integrantes
del estudio y un portal donde cada cliente sigue solo sus causas. Monorepo pnpm
con React + Vite + TypeScript en web/ y NestJS + TypeORM en api/, base MySQL.

Proponme un docs/constitution.md con 6 principios innegociables, cortos y
verificables, que cubran: simplicidad del stack, relación entre spec y código,
separación entre lógica e interfaz, política de tests, persistencia y
aislamiento de los datos de cada cliente, e idioma del código y los mensajes.
Máximo 15 líneas. Espera mi aprobación.
```

*Genera el [docs/constitution.md](./docs/constitution.md)*

*Escribimos el [AGENTS.md](./AGENTS.md) y el [CLAUDE.md](./CLAUDE.md)*

### 2. Especificación

```text
NO escribas código en ningún momento. Vamos a redactar la especificación de la
primera funcionalidad de estudioSabalette. Lee docs/constitution.md y
docs/specs/_plantilla.md.

Idea inicial: autenticación y roles. Los integrantes del estudio (administrador
y abogados) y los clientes ingresan con su cuenta. No hay registro público: el
administrador crea, edita, desactiva y restablece las cuentas. Cada rol accede
solo a su parte: el panel para el estudio, el portal para los clientes.

Tu trabajo:
1. Hazme preguntas de UNA en UNA para eliminar ambigüedades (roles, cómo
   ingresan los clientes, duración de la sesión, qué pasa con cuentas
   desactivadas, qué queda fuera del MVP). Máximo 6 preguntas.
2. Con mis respuestas, genera docs/specs/001-autenticacion-y-roles/spec.md
   siguiendo la plantilla: contexto y objetivo, usuarios, historias de usuario,
   requisitos funcionales numerados (RF-x) con criterios de aceptación en
   notación EARS en español, requisitos no funcionales, casos límite, fuera de
   alcance, criterios de finalización y dudas abiertas marcadas como
   [NECESITA ACLARACIÓN].
3. El QUÉ y el POR QUÉ. Nada de stack, librerías, endpoints, arquitectura ni
   nombres de archivos: eso irá en el plan.
```

*Genera el [docs/specs/001-autenticacion-y-roles/spec.md](./docs/specs/001-autenticacion-y-roles/spec.md)*

### 3. Clarificación

```text
Revisa docs/specs/001-autenticacion-y-roles/spec.md como si fueras un QA muy
profesional con experiencia en seguridad. Lista:
(1) ambigüedades restantes,
(2) contradicciones entre requisitos,
(3) casos límite no cubiertos,
(4) conflictos con docs/constitution.md,
(5) cualquier camino por el que un usuario podría ver o modificar datos que no
    le corresponden.
No propongas soluciones todavía: solo detecta. Formato: lista numerada.
```

### 4. Planificación

```text
Lee docs/constitution.md y docs/specs/001-autenticacion-y-roles/spec.md.
NO escribas código. Genera docs/specs/001-autenticacion-y-roles/plan.md con:
- módulos de NestJS y carpetas de web/ que se agregan o modifican,
- entidades de TypeORM con sus campos y la migración necesaria,
- contrato de la API: método, ruta, cuerpo, respuesta, códigos HTTP y roles
  permitidos de cada endpoint,
- flujo de la sesión (ingreso, renovación, cierre) en pseudocódigo,
- rutas y guards del frontend, y qué vive en src/servicios/,
- dependencias nuevas, cada una justificada con su alternativa descartada,
- otras decisiones técnicas justificadas, con su alternativa descartada,
- estrategia de tests: unitarios y e2e con Vitest en api y en web.
Todo debe respetar la constitución y cubrir todos los RF. Marca qué RF cubre
cada parte.
```

*Genera el [docs/specs/001-autenticacion-y-roles/plan.md](./docs/specs/001-autenticacion-y-roles/plan.md)*

### 5. Tareas

```text
A partir de spec.md y plan.md de docs/specs/001-autenticacion-y-roles/, genera
tasks.md: tareas pequeñas (máx. 20-30 min cada una), en orden de dependencia,
separando las de api/ y las de web/. Cada una con los RF que cubre y una línea
"Hecho cuando:" verificable. Ninguna tarea toca archivos .env ni la base de
producción. Usa checkboxes.
```

*Genera el [docs/specs/001-autenticacion-y-roles/tasks.md](./docs/specs/001-autenticacion-y-roles/tasks.md)*

### 6. Implementación

```text
Implementa SOLO la tarea T2 de docs/specs/001-autenticacion-y-roles/tasks.md,
siguiendo plan.md, la constitución y AGENTS.md. Escribe primero los tests,
luego el código. Si necesitas modificar un archivo existente o agregar una
dependencia no prevista en el plan, pregúntame antes. Ejecuta pnpm test y
pnpm lint y muéstrame el resultado. Al terminar: marca T2 en tasks.md, indica
qué RF cubre y PÁRATE. No hagas commit y no empieces T3.
```

*Genera la implementación dentro de `api/` y `web/`*

### 7. Validación

```text
Recorre docs/specs/001-autenticacion-y-roles/spec.md requisito por requisito.
Para cada RF indica: qué test lo cubre y el resultado de ejecutarlo.
Si algún RF no está cubierto o falla, dilo claramente. Verifica además que
ningún endpoint del panel responda a un cliente y que ninguna respuesta
incluya datos de otro usuario. Después comprueba los criterios de finalización
y dame un veredicto: ¿la spec está cumplida?
```

### 8. Siguiente spec

```text
NO escribas código. Pasamos a la spec 002-causas-y-partes. Lee
docs/constitution.md, docs/specs/_plantilla.md y las specs ya terminadas para
no contradecirlas.

Idea inicial: los integrantes del estudio dan de alta, editan, listan y buscan
causas (carátula, número de expediente, juzgado, fuero, estado), registran sus
partes y vinculan cada causa con sus clientes y con los abogados que
intervienen.

Sigue el mismo proceso: preguntas de UNA en UNA (máximo 6) y después genera
docs/specs/002-causas-y-partes/spec.md. Solo el QUÉ y el POR QUÉ.
```

### 9. Cambios sobre una spec existente

```text
Nuevo requisito para 003-movimientos: poder corregir un movimiento ya cargado.
NO toques código. Primero: actualiza docs/specs/003-movimientos/spec.md (nuevo
RF con EARS + casos límite: ¿quién puede corregirlo? ¿se conserva la versión
anterior? ¿qué pasa si el movimiento ya era visible para el cliente?) y
muéstrame el diff de la spec.
```
