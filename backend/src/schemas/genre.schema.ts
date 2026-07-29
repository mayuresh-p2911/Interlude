import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GenreDocument = Genre & Document;

@Schema({ timestamps: true, collection: 'genres' })
export class Genre {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ default: null })
  icon: string | null;
}

export const GenreSchema = SchemaFactory.createForClass(Genre);
