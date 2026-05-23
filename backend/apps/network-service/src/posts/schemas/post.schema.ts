import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PostDocument = Post & Document;

/** Single source of truth for post lifecycle (see prompt/backend/ai). */
export enum PostVisibility {
  PUBLIC = 'public',
  FOLLOWERS = 'followers',
  PRIVATE = 'private',
  /** AI or policy hold — hidden from public feed. */
  PENDING = 'pending',
  /** Admin rejection — never shown. */
  DELETED = 'deleted',
}

@Schema({ timestamps: true, collection: 'posts' })
export class Post {
  @Prop({ type: String, required: true, index: true })
  authorId: string;

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

PostSchema.index({ authorId: 1, createdAt: -1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ visibility: 1, createdAt: -1 });
