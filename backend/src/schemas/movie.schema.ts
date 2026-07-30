import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MovieDocument = Movie & Document;

class SubtitleTrack {
  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  language: string;

  @Prop({ required: true })
  url: string;
}

class AudioTrack {
  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  language: string;
}

@Schema({ timestamps: true, collection: 'movies' })
export class Movie {
  @Prop({ required: true })
  providerId: string;

  @Prop({ required: true })
  provider: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: String, default: null })
  poster: string | null;

  @Prop({ type: String, default: null })
  backdrop: string | null;

  @Prop({ type: Number, default: null })
  year: number | null;

  @Prop({ type: Number, default: null })
  runtime: number | null;

  @Prop({ type: [String], default: [] })
  genres: string[];

  @Prop({ type: String, default: null })
  language: string | null;

  @Prop({ type: Number, default: null })
  rating: number | null;

  @Prop({ type: [String], default: [] })
  cast: string[];

  @Prop({ type: String, default: null })
  director: string | null;

  @Prop({ type: String, default: null })
  streamUrl: string | null;

  @Prop({ type: [Object], default: [] })
  subtitleTracks: SubtitleTrack[];

  @Prop({ type: [Object], default: [] })
  audioTracks: AudioTrack[];

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const MovieSchema = SchemaFactory.createForClass(Movie);
MovieSchema.index({ title: 'text', description: 'text' });
MovieSchema.index({ provider: 1, providerId: 1 }, { unique: true });
MovieSchema.index({ genres: 1 });
MovieSchema.index({ viewCount: -1 });
MovieSchema.index({ createdAt: -1 });
