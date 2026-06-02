import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';


export enum MessageType {
  TEXT = 'text',
  POST_SHARE = 'post_share',
  SYSTEM = 'system',
}

export type MessageDocument = HydratedDocument<Message>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'messages',
})
export class Message {
  @Prop({ required: true, index: true })
  conversation_id: string;

  @Prop({ required: true })
  sender_id: string;

  /** Caption; optional when `media_url` or `shared_post_id` is set */
  @Prop({ required: false, default: '' })
  content: string;

  @Prop({ default: '' })
  media_url: string;

  @Prop({
    type: String,
    enum: MessageType,
    default: MessageType.TEXT,
    index: true,
  })
  type: MessageType;

  /** Only set when type = 'post_share'. Stores the Post ObjectId as string. */
  @Prop({ type: String, default: null })
  shared_post_id: string | null;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ conversation_id: 1, createdAt: 1 });
