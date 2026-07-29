# INTERLUDE

> Premium Social Movie Streaming Platform — Watch Together, Stay Together.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org)

---

## Overview

INTERLUDE is a full-stack, production-ready social movie streaming platform that combines:

- 🎬 **Server-based movie streaming** via HLS (Internet Archive catalogue by default)
- 🤝 **Watch Together** — real-time synchronized playback sessions
- 👥 **Friend System** — requests, online status, activity
- 💬 **Live Chat** — group and direct messaging with typing indicators
- 🔊 **Voice Chat** — WebRTC-powered in-session voice
- 🎭 **Groups** — private movie clubs with shared queues
- 🔔 **Notifications** — real-time alerts for everything

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, TypeScript, TailwindCSS, Framer Motion |
| State | Zustand, React Query |
| Realtime | Socket.io Client |
| Backend | NestJS, Node.js, TypeScript |
| Realtime | Socket.io |
| Voice | WebRTC |
| Database | MongoDB, Mongoose |
| Streaming | HLS, FFmpeg (optional self-hosted) |
| Auth | JWT, Refresh Tokens, bcrypt |
| Storage | Cloudinary (avatars) |
| Cache | Redis |
| Container | Docker, Docker Compose |

---

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis (local or cloud)
- Docker & Docker Compose (optional, recommended)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/interlude.git
cd interlude
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Run with Docker (Recommended)

```bash
npm run docker:up
```

This starts MongoDB, Redis, the NestJS backend, and the Next.js frontend.

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/api
- API Docs (Swagger): http://localhost:4000/api/docs

### 4. Run Locally (Without Docker)

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

### 5. Seed the Database

```bash
npm run seed
```

Creates an admin user and imports sample movie metadata from Internet Archive.

---

## Project Structure

```
interlude/
├── frontend/          # Next.js 14 application
├── backend/           # NestJS API + Socket.io server
├── database/          # Mongoose schemas + seed data
├── shared/            # Shared TypeScript types & constants
├── docs/              # Architecture, API, DB documentation
├── scripts/           # Setup and seed scripts
├── docker/            # Docker Compose + Dockerfiles
├── .env.example       # Environment variable template
└── README.md
```

See [docs/folder-structure.md](docs/folder-structure.md) for a full annotated file tree.

---

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/architecture.md) | System architecture and component diagram |
| [API Reference](docs/api.md) | Full REST API documentation |
| [Database Schema](docs/database-schema.md) | MongoDB collections and fields |
| [Deployment Guide](docs/deployment.md) | Production deployment instructions |
| [Folder Structure](docs/folder-structure.md) | Annotated project file tree |

---

## Streaming Providers

INTERLUDE ships with an **Internet Archive** streaming adapter. The backend implements a `StreamingProvider` interface making it straightforward to add:

- Self-hosted HLS content
- Licensed streaming catalogues
- Future providers

Switch providers by setting `STREAMING_PROVIDER` in `.env` — no frontend changes required.

---

## Security

- Helmet HTTP headers
- CORS configuration
- Rate limiting (100 req/min per IP)
- JWT + refresh token rotation
- bcrypt password hashing
- Input validation (class-validator)
- XSS sanitization
- Secure, HttpOnly cookies

---

## License

MIT © INTERLUDE Team
