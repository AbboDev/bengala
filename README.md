# Bengala

Bengala is a lightweight, real-time web analytics and user presence tracking engine built with **Node.js**, **WebSockets**, and **MongoDB**.

It tracks user activity, page dwell time, and concurrent visits across websites in real time by establishing persistent WebSocket connections and logging periodic heartbeat pings into MongoDB collections.

---

## Architecture Overview

```
+-----------------------------------------------------------+
|                        Browser Client                     |
|                                                           |
|   1. Loads public/script.js                               |
|   2. Resolves website ID (_beng$wid) & cookie (uid)       |
|   3. Connects via WebSocket to ws://<host>:9080/          |
|   4. Sends periodic heartbeats: { ts, wid, uid, pid }     |
+-----------------------------+-----------------------------+
                              |
                              | WebSockets (ws://)
                              v
+-----------------------------------------------------------+
|                     Bengala Server                        |
|                                                           |
|   - BengalaServer (classes/bengala/bengala-server.js)     |
|       Manages incoming socket connections & IP tracking   |
|   - BengalaWebSocket (classes/bengala/bengala-socket.js)  |
|       Handles handshakes, assigns UIDs, queues messages   |
|   - BengalaUser (classes/bengala/bengala-user.js)         |
|       Encapsulates website, page path, user ID & perms    |
+-----------------------------+-----------------------------+
                              |
                              | Ingests timelogs
                              v
+-----------------------------------------------------------+
|                     MongoDB Storage                       |
|                                                           |
|   - BengalaMongo (classes/bengala/bengala-mongo.js)       |
|       Dynamic multi-tenant database & collection routing: |
|       Database:   beng-<wid>                              |
|       Collection: beng-<wid>-<decoded_page_path>          |
+-----------------------------------------------------------+
```

---

## Features

- **Real-Time Presence Tracking**: Measures exact dwell time and active presence through periodic heartbeats (default every 1000ms).
- **Multi-Tenant Architecture**: Automatically isolates data per website by creating and routing to dedicated databases (`beng-<wid>`).
- **Dynamic Page Collections**: Generates collection names based on base64-encoded URL paths, isolating metrics per page (`beng-<wid>-<page_path>`).
- **Passive Mode & Permissions**: Reads tenant configuration from a `permission` collection in the target database to control automatic collection provisioning (`passive_mode`), heartbeat interval (`refresh_rate`), and cookie persistence.
- **Message Queuing**: Processes socket messages sequentially through an internal FIFO queue to maintain event ordering and prevent race conditions.
- **Anonymous User Identification**: Issues unique IDs (`uid`) using `uniqid` stored in client-side cookies to track return visits across sessions.
- **Built-in Static Server**: Includes a minimal static HTTP server (`static-server.js`) to serve demo pages and the client tracking script.

---

## Data Protocol

### 1. Initial Handshake

When a client visits a tracked page:

1. The client script connects to the WebSocket server.
2. If no user ID cookie exists, it sends an initial handshake:
   ```json
   {
     "ts": 1731405000000,
     "wid": "00001",
     "pid": "L2luZGV4Lmh0bWw="
   }
   ```
3. The server generates a unique `uid` and replies:
   ```json
   {
     "uid": "1k3f9a7z..."
   }
   ```
4. The client saves the `uid` in a cookie for future visits.

### 2. Heartbeat Ping

While the page remains open, the client sends a periodic heartbeat at the configured clock rate:

```json
{
  "ts": 1731405001000,
  "wid": "00001",
  "uid": "1k3f9a7z...",
  "pid": "L2luZGV4Lmh0bWw="
}
```

The server strips routing metadata (`wid`, `pid`) and inserts the timelog `{ ts: ..., uid: ... }` directly into the corresponding page collection in MongoDB.

---

## Project Structure

```text
├── app.js                          # Main application entry point (WebSocket server + static server)
├── static-server.js                # Standalone HTTP static file server for public/ assets
├── classes/
│   ├── bengala.js                  # Primary export module combining server & storage
│   ├── bengala/
│   │   ├── bengala-server.js       # WebSocket server lifecycle (ws listener, IP detection)
│   │   ├── bengala-socket.js       # Socket connection handler, message queue, UID assignment
│   │   ├── bengala-mongo.js        # MongoDB connection pooling, collection routing & timelogs
│   │   ├── bengala-user.js         # User model, database/collection name resolution
│   │   └── bengala-user-permission.js # Tenant permission model (passive_mode, refresh_rate)
│   └── utilities/
│       └── queue.js                # In-memory FIFO queue for sequential event processing
├── public/                         # Client-side demo & integration scripts
│   ├── index.html                  # Sample web page demonstrating tracker activation
│   ├── test.html                   # Secondary test page for multi-page tracking
│   └── script.js                   # Client-side tracking script (embeddable on external sites)
├── package.json                    # Project metadata, dependencies, scripts, engines
├── pnpm-lock.yaml                  # pnpm lockfile
├── pnpm-workspace.yaml             # pnpm workspace & build approval settings
├── eslint.config.js                # ESLint configuration (Flat config)
└── commitlint.config.js            # Conventional commit validation rules
```

---

## Prerequisites

- **Node.js**: `>= 26`
- **pnpm**: `>= 10`
- **MongoDB**: `27017` (running locally or accessible via URI)

---

## Getting Started

### 1. Installation

```bash
pnpm install
```

### 2. MongoDB Setup

Ensure MongoDB is running locally on the default port:

```bash
# Using the package script (pointing to local mongod)
pnpm run mongo

# Or start your system MongoDB service
mongod --dbpath /path/to/data/db
```

### 3. Run Development Server

```bash
pnpm run dev
```

This starts:

- The **WebSocket server** on port `9080` (or `PORT` environment variable).
- The **Static file server** on port `3000`.

### 4. Run Production Server

```bash
pnpm start
```

---

## Client Integration

To track a web page, include the `script.js` client tracker and declare your website ID:

```html
<!-- Define the Website ID -->
<script type="text/javascript">
  var _beng$wid = '00001';
</script>

<!-- Load Bengala Client Tracker -->
<script type="text/javascript" src="http://localhost:3000/script.js"></script>
```

---

## Code Quality & Tooling

- **Linting**:
  ```bash
  pnpm run lint
  ```
- **Code Formatting**:
  ```bash
  pnpm run format
  pnpm run format:check
  ```
- **Git Hooks**:
  - `pre-commit`: Automatically runs `lint-staged` (ESLint `--fix` and Prettier `--write`).
  - `commit-msg`: Enforces Conventional Commits using `commitlint`.
