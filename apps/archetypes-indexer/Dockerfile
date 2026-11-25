# Archetypes indexer: crawler, SQLite event store, and the daily static build of apps/archetypes.
# Build from the repository root:  docker build -f apps/archetypes-indexer/Dockerfile .
FROM node:24-bookworm-slim AS deps
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true ASTRO_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.8.0 --activate
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter "@napplet/archetypes-indexer..." --filter "@napplet/archetypes..." \
 && rm -rf apps/archetypes/dist

FROM node:24-bookworm-slim
ENV NODE_ENV=production ASTRO_TELEMETRY_DISABLED=1 ARCHETYPES_CONFIG=/config/archetypes.yaml
WORKDIR /repo
COPY --from=deps --chown=node:node /repo /repo
RUN mkdir -p /data /config && chown node:node /data /config && touch /config/archetypes.yaml
USER node
WORKDIR /repo/apps/archetypes-indexer
# The default config file is empty; built-in defaults apply. Mount your own at /config/archetypes.yaml.
ENV ARCHETYPES_DATA_DIR=/data
EXPOSE 8080
HEALTHCHECK --interval=60s --timeout=5s --start-period=60s CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/main.ts"]
