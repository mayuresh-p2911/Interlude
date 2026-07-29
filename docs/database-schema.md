# INTERLUDE — Database Schema Reference

The database is built on MongoDB using Mongoose.

## Collections

### 1. `users`
- `username`: String (Unique, Indexed)
- `email`: String (Unique, Lowercase, Indexed)
- `password`: String (Hashed with bcrypt)
- `avatar`: String (Cloudinary URL)
- `bio`: String
- `isAdmin`: Boolean
- `isVerified`: Boolean
- `onlineStatus`: Enum ('online', 'away', 'offline')

### 2. `movies`
- `providerId`: String
- `provider`: String ('internet_archive', 'self_hosted', 'licensed')
- `title`: String (Text Indexed)
- `description`: String
- `poster`: String
- `backdrop`: String
- `genres`: Array of Strings
- `streamUrl`: String

### 3. `watch_sessions`
- `host`: ObjectId (ref: User)
- `movie`: ObjectId (ref: Movie)
- `participants`: Array of `{ user, joinedAt, isActive }`
- `state`: Enum ('waiting', 'playing', 'paused', 'ended')
- `currentTime`: Number
- `playbackRate`: Number

### 4. `groups`
- `name`: String
- `description`: String
- `members`: Array of ObjectId (ref: User)
- `createdBy`: ObjectId (ref: User)
- `movieQueue`: Array of `{ movieId, title, poster, addedBy, addedAt }`

### 5. `messages`
- `sender`: ObjectId (ref: User)
- `recipient`: ObjectId (ref: User, Optional)
- `group`: ObjectId (ref: Group, Optional)
- `conversationId`: String (Indexed)
- `content`: String
- `type`: Enum ('text', 'image', 'movie_share')

### 6. `friendships` & `friend_requests`
- Bidirectional relationship models with status lifecycle (`pending`, `accepted`, `declined`, `cancelled`).
