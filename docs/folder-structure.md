# INTERLUDE — Annotated Folder Structure

```
interlude/
├── frontend/                     # Next.js 14 App Router Frontend
│   ├── src/
│   │   ├── app/                 # App Router pages and layouts
│   │   │   ├── (app)/          # Authenticated routes (home, movies, watch, friends, etc.)
│   │   │   ├── auth/           # Authentication pages (login, register, forgot/reset password)
│   │   │   └── page.tsx        # High-impact landing page
│   │   ├── components/         # Reusable UI components
│   │   │   ├── auth/           # Auth form layouts
│   │   │   ├── friends/        # Friend management panels
│   │   │   ├── groups/         # Group management & detail views
│   │   │   ├── home/           # Home feeds & rows
│   │   │   ├── landing/        # Landing page sections
│   │   │   ├── layout/         # AppShell, Navbar, Sidebar
│   │   │   ├── messages/       # Conversation lists & DM windows
│   │   │   ├── movies/         # MovieCard, MovieRow, Skeletons
│   │   │   └── watch/          # VideoPlayer, ChatWindow, VoiceChat
│   │   ├── hooks/              # Custom React hooks (useSocket, useVoiceChat)
│   │   ├── lib/                # Axios API client & endpoints
│   │   └── store/              # Zustand stores (authStore, playerStore, voiceStore)
│   ├── tailwind.config.js       # Custom neomorphic & cinematic styling tokens
│   └── package.json
│
├── backend/                      # NestJS Server Application
│   ├── src/
│   │   ├── admin/              # Admin dashboard module
│   │   ├── auth/               # Auth controller, service, JWT & refresh strategies
│   │   ├── chat/               # DMs and group chat module
│   │   ├── common/             # Email & Cloudinary upload services
│   │   ├── friends/            # Friend request & suggestion service
│   │   ├── gateways/           # Socket.io gateways (chat, watch, voice, presence)
│   │   ├── groups/             # Group management service
│   │   ├── movies/             # Movies service & provider factory architecture
│   │   │   └── providers/      # StreamingProvider interface & Internet Archive implementation
│   │   ├── notifications/      # Real-time notifications service
│   │   ├── schemas/            # Mongoose schemas (User, Movie, Session, Group, etc.)
│   │   ├── streaming/          # Server-authoritative stream proxy controller & service
│   │   ├── voice/              # WebRTC ICE configuration service
│   │   └── watch-sessions/     # Playback synchronization engine
│   └── package.json
│
├── shared/                       # Shared TypeScript definitions
│   └── src/
│       ├── constants.ts        # Socket events, genres, API route definitions
│       └── types.ts            # DTOs & domain model interfaces
│
├── docker/                       # Docker orchestration files
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
│
├── scripts/                      # Setup & seed scripts
│   ├── seed.js
│   └── setup.js
│
├── docs/                         # Technical documentation
│   ├── api.md
│   ├── architecture.md
│   ├── database-schema.md
│   ├── deployment.md
│   └── folder-structure.md
│
├── .env.example                  # Comprehensive environment template
└── README.md                     # Main project guide
```
