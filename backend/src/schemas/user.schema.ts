import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, trim: true, minlength: 3, maxlength: 30 })
  username: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ default: null })
  avatar: string | null;

  @Prop({ default: '', maxlength: 200 })
  bio: string;

  @Prop({ default: false })
  isAdmin: boolean;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: false })
  isBlocked: boolean;

  @Prop({ enum: ['online', 'away', 'offline'], default: 'offline' })
  onlineStatus: string;

  @Prop({ type: Object, default: null })
  currentActivity: {
    type: 'watching' | 'in_session' | 'browsing' | 'idle';
    movieId?: string;
    movieTitle?: string;
    sessionId?: string;
  } | null;

  @Prop({ default: null, select: false })
  refreshToken: string | null;

  @Prop({ default: null, select: false })
  emailVerificationToken: string | null;

  @Prop({ default: null, select: false })
  emailVerificationExpiry: Date | null;

  @Prop({ default: null, select: false })
  passwordResetToken: string | null;

  @Prop({ default: null, select: false })
  passwordResetExpiry: Date | null;

  @Prop({ default: null })
  lastSeen: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

// ── Indexes ───────────────────────────────────────────────────
UserSchema.index({ username: 'text', email: 'text' });
UserSchema.index({ onlineStatus: 1 });
