import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PostDocument = Post & Document;

export enum PostVisibility {
  PUBLIC = 'public',
  FOLLOWERS = 'followers',
  PRIVATE = 'private',
}

@Schema({ timestamps: true, collection: 'posts' })
export class Post {
  // UUID string from auth-service (Postgres User.id / JWT `sub`).
  // NOT a Mongo ObjectId — User is in a different database, so no `ref`.
  @Prop({ type: String, required: true, index: true })
  authorId: string;

  /** May be empty when `mediaUrls` is non-empty (validated in service). */
  @Prop({ type: String, default: '', trim: true, maxlength: 5000 })
  content: string;

  @Prop({ type: [String], default: [] })
  mediaUrls: string[];

  @Prop({
    type: String,
    enum: PostVisibility,
    default: PostVisibility.PUBLIC,
    index: true,
  })
  visibility: PostVisibility;

  @Prop({ type: Number, default: 0, min: 0 })
  likeCount: number;

  @Prop({ type: Number, default: 0, min: 0 })
  commentCount: number;

  @Prop({ type: Number, default: 0, min: 0 })
  shareCount: number;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Feed queries: newest posts per author, and newest public posts globally.
PostSchema.index({ authorId: 1, createdAt: -1 });
PostSchema.index({ createdAt: -1 });
