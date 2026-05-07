import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommentLikeDocument = CommentLike & Document;

@Schema({ timestamps: true, collection: 'comment_likes' })
export class CommentLike {
  // UUID from auth-service
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: Types.ObjectId, ref: 'Comment', required: true })
  commentId: Types.ObjectId;
}

export const CommentLikeSchema = SchemaFactory.createForClass(CommentLike);

// One like per user per comment
CommentLikeSchema.index({ userId: 1, commentId: 1 }, { unique: true });
