import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuthSessionDocument = AuthSession & Document;

@Schema({ timestamps: true, collection: 'auth_sessions' })
export class AuthSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  tokenHash: string;

  @Prop({ type: Boolean, default: false })
  rememberMe: boolean;

  @Prop({ type: Date, default: Date.now })
  lastUsedAt: Date;

  @Prop({ type: Date, default: null })
  expiresAt: Date | null;

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;
}

export const AuthSessionSchema = SchemaFactory.createForClass(AuthSession);

// ── Indexes ───────────────────────────────────────────────────
AuthSessionSchema.index({ userId: 1 });
AuthSessionSchema.index({ expiresAt: 1, revokedAt: 1 });
