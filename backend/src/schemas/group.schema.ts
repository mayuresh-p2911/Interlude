import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GroupDocument = Group & Document;

class QueueItem {
  @Prop({ required: true })
  movieId: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  poster: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  addedBy: Types.ObjectId;

  @Prop({ default: Date.now })
  addedAt: Date;
}

@Schema({ timestamps: true, collection: 'groups' })
export class Group {
  @Prop({ required: true, trim: true, minlength: 2, maxlength: 50 })
  name: string;

  @Prop({ default: null })
  picture: string | null;

  @Prop({ default: '', maxlength: 300 })
  description: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  members: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: [Object], default: [] })
  movieQueue: QueueItem[];
}

export const GroupSchema = SchemaFactory.createForClass(Group);
GroupSchema.index({ name: 'text' });
GroupSchema.index({ members: 1 });
