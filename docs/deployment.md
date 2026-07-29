# INTERLUDE — Production Deployment Guide

## Production Checklist

1. Set strong secrets in `.env`:
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `SESSION_SECRET`
   - `ADMIN_PASSWORD`

2. Configure domain and CORS:
   - `CORS_ORIGIN=https://yourdomain.com`
   - `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api`
   - `NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com`

3. Configure TURN Server (WebRTC Voice):
   - `TURN_SERVER_URL=turn:your-coturn-server.com:3478`
   - `TURN_USERNAME=username`
   - `TURN_PASSWORD=password`

4. Deploy with Docker Compose:
   ```bash
   docker-compose -f docker/docker-compose.yml up -d --build
   ```

5. Seed Initial Database Data:
   ```bash
   npm run seed
   ```
