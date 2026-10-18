# API del estudio (NestJS) para Easypanel.
# Se construye desde la raíz del monorepo, porque necesita pnpm-lock.yaml y pnpm-workspace.yaml:
#   docker build -f api/Dockerfile .
# Las variables de entorno (DB_*, JWT_SECRET, FRONTEND_ORIGINS, TRUST_PROXY_HOPS, PORT) se cargan
# en el servicio de Easypanel: la imagen no lleva ningún .env (ver .dockerignore).

FROM node:24-slim AS build
RUN npm install -g pnpm@9.15.9
WORKDIR /repo

# Primero solo los manifiestos: la capa de dependencias se reutiliza mientras no cambien.
# web/package.json va para que el lockfile del monorepo coincida con --frozen-lockfile.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY api/package.json api/
COPY web/package.json web/
RUN pnpm install --frozen-lockfile --filter api...

COPY api/ api/
RUN pnpm --filter api build

# Copia de la API con solo las dependencias de producción, sin enlaces al resto del monorepo.
RUN pnpm --filter api --prod deploy /prod/api

FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# package.json hace falta en ejecución: declara "type": "module".
COPY --from=build /prod/api/package.json ./
COPY --from=build /prod/api/node_modules ./node_modules
COPY --from=build /repo/api/dist ./dist

# Los archivos quedan del usuario root y la API corre como node: no puede modificar su código.
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
