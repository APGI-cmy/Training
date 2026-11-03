FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends gnupg ca-certificates gosu && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json receiver.mjs recovery-public-key.asc ./
RUN node --check receiver.mjs
COPY entrypoint.sh ./
RUN chmod 755 entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]
