# Webhook Control Center

[![CI](https://github.com/loweblein/webhook-control-center/actions/workflows/ci.yml/badge.svg)](https://github.com/loweblein/webhook-control-center/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169e1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-BullMQ-dc382d?logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ed?logo=docker&logoColor=white)

Webhook Control Center é um projeto de portfólio com aparência e arquitetura de produto real para gerenciar endpoints de webhook, receber eventos, entregar payloads de forma assíncrona, reexecutar falhas e inspecionar tentativas de entrega.

Ele é inspirado conceitualmente em Stripe Webhooks e Svix, com API real, persistência em PostgreSQL, fila Redis/BullMQ, isolamento por workspace e um dashboard React alimentado por dados do banco.

## Repositório

```bash
git clone https://github.com/loweblein/webhook-control-center.git
cd webhook-control-center
```

## Como iniciar rápido

### Opção 1: Docker

```bash
docker compose up --build
```

Depois acesse:

- Dashboard: `http://localhost:5173`
- API: `http://localhost:4000`
- Swagger/OpenAPI: `http://localhost:4000/docs`

Login de demonstração:

```text
demo@example.com
password123
```

### Opção 2: Desenvolvimento local

Você precisa ter PostgreSQL e Redis rodando localmente.

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

URLs:

- Dashboard: `http://localhost:5173`
- API: `http://localhost:4000`
- Documentação: `http://localhost:4000/docs`

## Funcionalidades

- Autenticação com cadastro, login, JWT e hash de senha com Argon2
- Isolamento completo por workspace com papéis `OWNER` e `MEMBER`
- API keys por workspace no formato `whk_live_xxx`
- API keys armazenadas apenas como hash + prefixo
- CRUD de endpoints com secret, status ativo/inativo e assinaturas de eventos
- Ingestão de eventos via `POST /v1/events`
- Entrega assíncrona com Redis e BullMQ
- Assinatura HMAC SHA-256 em cada webhook enviado
- Histórico próprio para cada tentativa de entrega
- Replay manual pela API e pelo dashboard
- Retry real: imediato, 10s, 30s, 2min, 10min
- Estados de delivery: `PENDING`, `PROCESSING`, `SUCCESS`, `FAILED`, `DEAD`
- Métricas calculadas a partir de dados reais do banco
- Proteção SSRF com validação de hostname e resolução DNS
- Swagger/OpenAPI em `/docs`
- Docker Compose com Postgres, Redis, API, worker e web

## Demonstração visual

O dashboard foi construído para parecer uma ferramenta SaaS real, com visão geral de métricas, tabelas operacionais, filtros, timeline de tentativas, replay manual, modo escuro, gerenciamento de endpoints e API keys.

Fluxo recomendado para avaliação:

1. Entrar com o usuário demo.
2. Criar um endpoint apontando para uma URL do Webhook.site.
3. Gerar eventos em `POST /v1/events`.
4. Acompanhar entregas, falhas, retries, replay e métricas no dashboard.

## Arquitetura

```mermaid
flowchart TD
  Cliente[Cliente] -->|POST /v1/events| API[API Fastify]
  API -->|persiste evento e deliveries| Postgres[(PostgreSQL)]
  API -->|enfileira jobs de entrega| Redis[(Redis / BullMQ)]
  Redis --> Worker[Processo worker]
  Worker -->|POST com payload assinado| Endpoint[Webhook externo]
  Worker -->|histórico de tentativas e status| Postgres
  Web[Dashboard React] -->|chamadas JWT| API
```

A API apenas valida, persiste e enfileira. Ela não entrega webhooks durante a requisição de ingestão. A entrega acontece em um processo worker separado.

## Stack

- Node.js, TypeScript, monorepo pnpm
- Fastify, Prisma, PostgreSQL
- Redis, BullMQ
- React, Vite, Tailwind, TanStack Query, React Router, Recharts
- Zod, JWT, Argon2, Pino
- Vitest, ESLint, Prettier
- Docker Compose, GitHub Actions

## Estrutura do repositório

```text
apps/
  api/       API Fastify, schema Prisma, migrations e seed
  worker/    worker BullMQ e motor de entrega
  web/       dashboard React

packages/
  shared/    schemas, IDs, HMAC e helpers de retry compartilhados
  database/  saída gerada do Prisma Client
```

## Variáveis de ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Principais variáveis:

```text
DATABASE_URL=postgresql://wcc:wcc@localhost:5432/webhook_control_center?schema=public
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace-with-at-least-32-random-characters
API_PORT=4000
WEB_ORIGIN=http://localhost:5173
VITE_API_URL=http://localhost:4000
```

## Comandos úteis

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## Exemplo de API

Crie uma API key no dashboard e envie um evento:

```bash
curl -X POST http://localhost:4000/v1/events \
  -H "authorization: Bearer whk_live_xxxxxxxxx" \
  -H "content-type: application/json" \
  -d '{
    "type": "payment.completed",
    "data": {
      "customerId": "cus_123",
      "amount": 4990,
      "currency": "BRL"
    }
  }'
```

Resposta:

```json
{
  "id": "evt_xxx",
  "type": "payment.completed",
  "status": "queued",
  "deliveries": 2
}
```

## Verificação HMAC

Cada delivery envia:

```text
x-webhook-id
x-webhook-timestamp
x-webhook-signature
```

O conteúdo assinado é:

```text
timestamp.payload
```

Exemplo de verificação em Node.js:

```js
const crypto = require("crypto");

function verifyWebhook({ secret, timestamp, payload, signatureHeader }) {
  const signature = signatureHeader
    .split(",")
    .map((part) => part.trim())
    .find((part) => part.startsWith("v1="))
    ?.slice(3);

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}
```

No receiver, rejeite timestamps antigos para reduzir risco de replay attack.

## Retries

O worker usa uma régua de retry real:

```text
tentativa 1: imediato
tentativa 2: 10s
tentativa 3: 30s
tentativa 4: 2min
tentativa 5: 10min
```

Depois da última tentativa com falha, a delivery vira `DEAD`. O histórico de tentativas é append-only, então o replay preserva as tentativas anteriores.

## Segurança

- Senhas com hash Argon2id
- API keys de alta entropia armazenadas somente como SHA-256 hash + prefixo
- JWT protegendo rotas do dashboard
- Membership do workspace verificada em todas as rotas escopadas
- Zod validando payloads e filtros
- Rate limiting, CORS, Helmet e limite de payload no Fastify
- Timeout nas requisições do worker
- Response body salvo com limite e truncamento
- Proteção SSRF bloqueando localhost, faixas privadas, metadata IP e DNS que resolve para IP privado
- Logs com redaction de authorization headers, API keys, secrets e hashes

## Métricas

O dashboard calcula a partir do banco:

- total de deliveries
- deliveries de hoje
- taxa de sucesso
- falhas
- latência média
- P50, P95, P99
- retries
- eventos nas últimas 24h
- endpoints com mais erros

## Testes e qualidade

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Os testes cobrem assinatura/verificação HMAC, régua de retry, transições de retry/dead state, hash/formato de API key e bloqueio de endereços privados contra SSRF.

## CI

GitHub Actions executa:

1. instalação
2. geração do Prisma Client
3. lint
4. typecheck
5. testes
6. build

## Decisões técnicas

O projeto mantém API e worker como processos separados. A API é otimizada para ingestão rápida e enfileiramento; o worker é responsável por entrega de rede, assinatura HMAC, medição de latência, histórico de tentativas e agendamento de retries.
