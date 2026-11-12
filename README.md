# Bengala

Bengala is a real-time web analytics and user presence tracking engine built with **TypeScript**, **Node.js 26**, **MongoDB Atlas**, **WebSockets**, and **Vite**.

It supports a **hybrid dual-transport architecture**:

1. **Fast-Refresh WebSocket Server (`@bengala/server-ws`)**: Persistent connection for high-frequency live presence, dwell time, and real-time active user counts (container/daemon deployment).
2. **Low-Budget Serverless Ingestion (`@bengala/client`)**: Ephemeral HTTP ingestion endpoint ready for **Vercel** (`POST /api/track`), powered by `fetch` and `navigator.sendBeacon`.
3. **Adaptive Client Tracker**: Runs in `'auto'`, `'websocket'`, or `'http'` mode with guaranteed exit-beacon delivery on tab close (`beforeunload` / `pagehide`).

---

## Architecture Overview

```
+-----------------------------------------------------------------------------------+
|                                  Browser Client                                   |
|                                                                                   |
|  1. Embeds script.js or imports BengalaTracker (@bengala/client)                  |
|  2. Resolves website ID (_beng$wid), session, and transport ('auto'|'ws'|'http')  |
|  3. Real-Time Tracking: Periodic heartbeats { ts, wid, uid, pid }                 |
|  4. Page Exit Hook: navigator.sendBeacon(httpUrl, payload)                        |
+--------------------------+------------------------------+-------------------------+
                           |                              |
             WebSocket     |                              | HTTP POST / sendBeacon
             (ws://, wss://)                              | (/api/track)
                           v                              v
+--------------------------------------+      +-------------------------------------+
|        @bengala/server-ws            |      |          @bengala/client            |
|  (Container: Docker / Railway / VPS) |      |        (Vercel Serverless)          |
|                                      |      |                                     |
|  - High-frequency persistent socket  |      |  - Ephemeral Serverless Function    |
|  - Sequential FIFO message queue     |      |  - Low budget, scales to zero       |
|  - Instant UID assignment            |      |  - Handles sendBeacon & fetch pings |
+------------------+-------------------+      +------------------+------------------+
                   |                                             |
                   +----------------------+----------------------+
                                          |
                                          | Ingests timelogs
                                          v
+-----------------------------------------------------------------------------------+
|                                MongoDB Atlas Cluster                              |
|                                                                                   |
|  - BengalaMongo dynamic routing & connection pooling                              |
|  - Multi-tenant database: beng-<wid>                                              |
|  - Partitioned page collection: beng-<wid>-<base64_encoded_page_path>             |
|  - Tenant permissions & refresh rates: beng-<wid>.permission                      |
+-----------------------------------------------------------------------------------+
```

---

## Monorepo Packages

Bengala is organized as a `pnpm` monorepo with three modular packages:

| Package                  | Path                 | Purpose                                                                                                                           | Deployment Target                                 |
| :----------------------- | :------------------- | :-------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------ |
| **`@bengala/shared`**    | `packages/shared`    | Models (`BengalaUser`, `BengalaUserPermission`), in-memory FIFO queue, types, and MongoDB Atlas connection pool (`BengalaMongo`). | Internal workspace dependency                     |
| **`@bengala/server-ws`** | `packages/server-ws` | Persistent WebSocket server handling concurrent socket streams, rapid timelog ingestion, and IP tracking.                         | Containers (Docker, Railway, Render, Fly.io, VPS) |
| **`@bengala/client`**    | `packages/client`    | Dual-mode tracking client (bundled with Vite into `script.js`, ESM, and UMD) + Vercel Serverless API (`api/track.ts`).            | **Vercel** / CDN / Static Hosting                 |

---

## Features

- **Hybrid Dual-Transport**: Switch between sub-second live WebSocket streams and serverless HTTP endpoints on the fly.
- **Adaptive Fallback**: If WebSocket connection fails, the client seamlessly falls back to HTTP beacon pings.
- **Guaranteed Exit Delivery**: Automatically captures tab close and page navigations via `navigator.sendBeacon`.
- **Multi-Tenant Isolation**: Automatically provisions and routes data to tenant databases (`beng-<wid>`) and page collections (`beng-<wid>-<page_path>`).
- **MongoDB Atlas Native**: Built-in support for `mongodb+srv://` connection strings with connection pooling and graceful health checks.
- **FIFO Event Ordering**: Server-side sequential processing queue prevents race conditions during high-volume spikes.
- **Vite-Powered Bundler**: Produces highly optimized standalone UMD and ESM client bundles.
- **Ready for Node 26**: Leverages native `--env-file` support and modern ES2023 language features.

---

## Workspace Structure

```text
bengala/
├── packages/
│   ├── shared/                     # @bengala/shared: Core types & MongoDB Atlas connector
│   │   ├── src/
│   │   │   ├── mongo.ts            # MongoDB Atlas connection manager & timelog writer
│   │   │   ├── user.ts             # User model and database/collection path resolver
│   │   │   ├── permission.ts       # Tenant permission configuration model
│   │   │   ├── queue.ts            # Generic in-memory FIFO queue
│   │   │   ├── types.ts            # Shared TypeScript interfaces & configurations
│   │   │   └── index.ts            # Public library exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── server-ws/                  # @bengala/server-ws: High-frequency WebSocket engine
│   │   ├── src/
│   │   │   ├── server.ts           # WebSocketServer lifecycle and client registry
│   │   │   ├── socket.ts           # Connection handler, queue, and handshake manager
│   │   │   ├── app.ts              # Node 26 CLI entry point with graceful shutdown
│   │   │   └── index.ts            # Export entry point
│   │   ├── Dockerfile              # Multi-stage production container build
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── client/                     # @bengala/client: Tracker bundle & Vercel serverless
│       ├── src/
│       │   └── tracker.ts          # Dual-transport tracker (WebSocket + fetch/sendBeacon)
│       ├── api/
│       │   └── track.ts            # Vercel Serverless Function (POST /api/track)
│       ├── public/                 # Static assets for demo & testing
│       ├── index.html              # Interactive client demo page with transport selector
│       ├── test.html               # Secondary tracking validation page
│       ├── vercel.json             # Vercel deployment configuration & CORS headers
│       ├── vite.config.mts         # Vite build configuration (UMD, ESM, script.js)
│       ├── package.json
│       └── tsconfig.json
│
├── package.json                    # Monorepo root scripts & dev dependencies
├── pnpm-workspace.yaml             # Workspace definitions
├── tsconfig.base.json              # Shared TypeScript compiler options
├── tsconfig.json                   # Root TypeScript configuration
├── eslint.config.js                # Flat ESLint configuration
├── commitlint.config.js            # Conventional Commitlint rules
└── .env.example                    # Template environment variables
```

---

## Prerequisites

- **Node.js**: `>= 26.0.0`
- **pnpm**: `>= 10.0.0`
- **MongoDB**: MongoDB Atlas cluster (or local MongoDB `>= 7.0`)

---

## Configuration

Bengala uses Node 26's native `--env-file-if-exists=.env` support. Copy the example file:

```bash
cp .env.example .env
```

### Environment Variables

```env
# MongoDB Atlas Connection URI
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/?retryWrites=true&w=majority

# Or individual parameters
MONGO_HOST=cluster0.abcde.mongodb.net
MONGO_PROTOCOL=mongodb+srv
MONGO_USER=myUser
MONGO_PASSWORD=myPassword
MONGO_OPTIONS=retryWrites=true&w=majority
MONGO_PREFIX=beng-

# WebSocket Server Port (default 9080)
PORT=9080

# Environment Mode
NODE_ENV=development
```

---

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build All Packages

Builds `@bengala/shared`, `@bengala/server-ws`, and bundles `@bengala/client` with Vite:

```bash
pnpm run build
```

Or build individual workspaces:

```bash
pnpm run build:shared
pnpm run build:server
pnpm run build:client
```

### 3. Development Workflow

- **Run WebSocket Server locally**:

  ```bash
  pnpm run dev
  # Runs tsx watch on packages/server-ws/src/app.ts (listening on ws://localhost:9080)
  ```

- **Run Client & Demo locally**:
  ```bash
  pnpm run dev:client
  # Starts Vite dev server at http://localhost:5173
  ```

---

## Deployment Guide

### Deploying the Client to Vercel (Low-Budget Serverless)

The `packages/client` folder is pre-configured for instant deployment on **Vercel**:

1. **Link your repository to Vercel** via CLI or Dashboard:
   ```bash
   cd packages/client
   npx vercel
   ```
2. **Set Root Directory** in Vercel Project Settings to `packages/client` (or deploy the root with Framework Preset: `Vite`).
3. **Configure Environment Variables** in Vercel:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
4. **Deploy**:
   - The Vite build publishes `dist/script.js`, `dist/bengala.es.js`, and demo HTML pages.
   - The serverless function handles `POST /api/track` directly into MongoDB Atlas.

### Deploying the WebSocket Server to Containers (Fast-Refresh)

The `packages/server-ws` package includes an optimized multi-stage `Dockerfile`:

```bash
# Build the Docker image
docker build -f packages/server-ws/Dockerfile -t bengala-server-ws .

# Run the container
docker run -p 9080:9080 \
  -e MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority" \
  bengala-server-ws
```

Deployable to **Railway**, **Render**, **Fly.io**, **AWS ECS**, or any VPS.

---

## Client Integration

Embed Bengala into any website by adding the tracker script:

```html
<!-- 1. Define website ID and optional transport preference -->
<script type="text/javascript">
  var _beng$wid = '00001';
  // Optional: 'auto' (default), 'websocket', or 'http'
  var _beng$transport = 'auto';
  // Optional custom endpoints:
  var _beng$wsUrl = 'wss://ws.yourdomain.com';
  var _beng$httpUrl = 'https://analytics.yourdomain.com/api/track';
</script>

<!-- 2. Load the Bengala Tracker script -->
<script
  type="text/javascript"
  src="https://analytics.yourdomain.com/script.js"
  async
></script>
```

### ESM Module Usage

```typescript
import createTracker from '@bengala/client';

const tracker = createTracker({
  transport: 'auto',
  wsUrl: 'wss://ws.yourdomain.com',
  httpUrl: 'https://analytics.yourdomain.com/api/track'
});

tracker.init();
```

---

## Code Quality & Verification

Bengala enforces strict code quality standards:

- **Type Checking**:
  ```bash
  pnpm run typecheck
  ```
- **Linting**:
  ```bash
  pnpm run lint:check
  pnpm run lint
  ```
- **Formatting**:
  ```bash
  pnpm run format:check
  pnpm run format
  ```
- **Unified Test Pipeline**:
  ```bash
  pnpm test
  ```
- **Git Hooks**:
  - `pre-commit`: Automatically runs `lint-staged` with ESLint and Prettier.
  - `commit-msg`: Enforces Conventional Commits via `commitlint`.
