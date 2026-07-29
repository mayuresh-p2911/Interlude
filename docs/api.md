# INTERLUDE — REST API Reference

Swagger documentation is available interactively at `/api/docs` when running the backend in development.

## Auth Endpoints
- `POST /api/auth/register` — Register a new account
- `POST /api/auth/login` — Sign in with email & password
- `POST /api/auth/logout` — Logout user & clear cookies
- `POST /api/auth/refresh` — Refresh access token using refresh cookie
- `POST /api/auth/forgot-password` — Request password reset link
- `POST /api/auth/reset-password` — Reset password with token
- `POST /api/auth/verify-email` — Verify email address
- `GET /api/auth/me` — Fetch current user profile

## Movies Endpoints
- `GET /api/movies/trending` — List trending movies
- `GET /api/movies/recent` — List recently added movies
- `GET /api/movies/genres` — List movie genres
- `GET /api/movies/search?q=query` — Search movies
- `GET /api/movies/recommended` — Get personalized recommendations
- `GET /api/movies/:id` — Get movie details
- `GET /api/movies/:id/stream` — Get HLS stream URL

## Watch Sessions Endpoints
- `POST /api/sessions` — Create a watch party session
- `POST /api/sessions/:id/join` — Join session
- `DELETE /api/sessions/:id/leave` — Leave session
- `POST /api/sessions/:id/sync` — Sync playback state
- `GET /api/sessions/:id` — Get session state

## Friends Endpoints
- `GET /api/friends` — List friends
- `GET /api/friends/requests` — List pending incoming requests
- `POST /api/friends/request/:userId` — Send friend request
- `POST /api/friends/accept/:requestId` — Accept request
- `DELETE /api/friends/remove/:friendId` — Remove friend

## Groups Endpoints
- `GET /api/groups` — List user groups
- `POST /api/groups` — Create a private group
- `GET /api/groups/:id` — Get group details
- `POST /api/groups/:id/invite` — Invite members
- `POST /api/groups/:id/queue` — Add movie to group queue

## WebSocket Events (Socket.io)
- `session:join` / `session:sync` / `session:play` / `session:pause` / `session:seek`
- `dm:send` / `dm:receive` / `group:message:send`
- `voice:join` / `voice:offer` / `voice:answer` / `voice:ice:candidate`
