import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ShareDocument = Share & Document;

@Schema({ timestamps: true, collection: 'shares' })
export class Share {
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  originalPostId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  repostPostId: Types.ObjectId;
}

export const ShareSchema = SchemaFactory.createForClass(Share);

ShareSchema.index({ userId: 1, originalPostId: 1 }, { unique: true });
