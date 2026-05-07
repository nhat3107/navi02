import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommentDocument = Comment & Document;

@Schema({ timestamps: true, collection: 'comments' })
export class Comment {
  // UUID string from auth-service (Postgres). Not a Mongo ObjectId.
  @Prop({ type: String, required: true, index: true })
  authorId: string;

  // Mongo ObjectId — refers to Post in this same database.
  @Prop({ type: Types.ObjectId, ref: 'Post', required: true, index: true })
  postId: Types.ObjectId;

  // Flat threading model: null = top-level comment, otherwise points to parent.
  // Avoids the 16 MB document limit that embedded `replies: Comment[]` would hit.
  @Prop({ type: Types.ObjectId, ref: 'Comment', default: null, index: true })
  parentCommentId: Types.ObjectId | null;

  @Prop({ type: String, required: true, trim: true, maxlength: 2000 })
  content: string;

  @Prop({ type: Number, default: 0, min: 0 })
  replyCount: number;

  @Prop({ type: Number, default: 0, min: 0 })
  likeCount: number;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

CommentSchema.index({ postId: 1, createdAt: -1 });
CommentSchema.index({ parentCommentId: 1, createdAt: 1 });
