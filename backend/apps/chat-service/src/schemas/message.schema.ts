import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

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

  /** Caption; optional when `media_url` is set */
  @Prop({ required: false, default: '' })
  content: string;

  @Prop({ default: '' })
  media_url: string;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ conversation_id: 1, createdAt: 1 });
