FROM postgres:latest AS runner
USER root
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates nodejs npm \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
RUN npm ci --omit=dev -w server

COPY package.json package-lock.json ./
COPY server ./server

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app/server
EXPOSE 3000
CMD ["npm", "run", "start"]
