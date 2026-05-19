FROM postgres:latest AS build
USER root
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates nodejs npm \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY client/package.json client/package.json
RUN npm ci -w client

COPY client ./client
RUN npm run build -w client

FROM postgres:latest AS runner
USER root

RUN apt-get update \
  && apt-get install -y --no-install-recommends nginx-light \
  && rm -rf /var/lib/apt/lists/* \
  && rm -f /etc/nginx/sites-enabled/default

COPY client/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
