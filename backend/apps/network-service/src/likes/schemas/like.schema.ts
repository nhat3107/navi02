import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LikeDocument = Like & Document;

@Schema({ timestamps: true, collection: 'likes' })
export class Like {
  // UUID from auth-service
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  postId: Types.ObjectId;
}

export const LikeSchema = SchemaFactory.createForClass(Like);

// One like per user per post
LikeSchema.index({ userId: 1, postId: 1 }, { unique: true });
// Quick lookup: "who liked this post?"
LikeSchema.index({ postId: 1, createdAt: -1 });
