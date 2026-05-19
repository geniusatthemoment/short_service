# Short Service

Сервис сокращения ссылок на React, Node.js и Postgres.

## Запуск

```bash
npm install
cp .env.example server/.env
npm run db:up
npm run db:migrate
npm run dev
```

Frontend: http://localhost:5173  
API: http://localhost:3000

Если Docker недоступен, можно использовать локальный Postgres:

```bash
psql -d postgres -c "CREATE ROLE short_service WITH LOGIN PASSWORD 'short_service';"
psql -d postgres -c "CREATE DATABASE short_service OWNER short_service;"
npm run db:migrate
npm run dev
```

## API

- `POST /api/links` — создать короткую ссылку.
- `GET /api/links` — последние ссылки.
- `GET /api/links/:code/stats` — статистика ссылки.
- `GET /:code` — редирект на исходный URL и инкремент кликов.

Тело `POST /api/links`:

```json
{
  "url": "https://example.com/a/very/long/path",
  "customCode": "demo"
}
```

## Docker images

```bash
npm run image:build
```

Будут собраны:

- `short-service-server:1.0.0`
- `short-service-client:1.0.0`

Сохранить images как tar-артефакты:

```bash
npm run image:save
```

Для локального Kubernetes:

```bash
kind load docker-image short-service-server:1.0.0
kind load docker-image short-service-client:1.0.0

# или для minikube
minikube image load short-service-server:1.0.0
minikube image load short-service-client:1.0.0
```

Push в registry:

```bash
docker tag short-service-server:1.0.0 bakr123/short_service:1.0.0
docker tag short-service-client:1.0.0 bakr123/short_service_client:1.0.0
docker push bakr123/short_service:1.0.0
docker push bakr123/short_service_client:1.0.0
```

Манифесты `k8s/` уже настроены на эти Docker Hub образы.

## Kubernetes

Манифесты лежат в `k8s/`.

```bash
kubectl apply -k k8s
```

Схема:

- browser -> `http://<NODE_IP>:30080` (`Service frontend`, `NodePort`)
- frontend nginx -> `/api/*` -> `http://backend:3000/api/*`
- backend service `backend` (`ClusterIP`) -> backend pods -> postgres

Проверка:

```bash
curl -X POST http://<NODE_IP>:30080/api/links \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/"}'
```

Деплой по умолчанию использует namespace `url-shortener` и ресурсы:

- `deployment/frontend`, `service/frontend` (NodePort `30080`)
- `deployment/backend`, `service/backend` (ClusterIP `3000`)

Rollout:

```bash
kubectl rollout restart deployment/frontend -n url-shortener
kubectl rollout restart deployment/backend -n url-shortener
kubectl rollout status deployment/frontend -n url-shortener
kubectl rollout status deployment/backend -n url-shortener
```

Для production замените `CLIENT_ORIGIN` и `PUBLIC_BASE_URL` в [server-configmap.yaml](/Users/sergeyromanov/short_service/k8s/server-configmap.yaml).
