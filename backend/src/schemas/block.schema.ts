import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BlockDocument = Block & Document;

@Schema({ timestamps: true, collection: 'blocks' })
export class Block {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  blocker: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  blocked: Types.ObjectId;
}

export const BlockSchema = SchemaFactory.createForClass(Block);
BlockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
