import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({ timestamps: true, collection: 'conversations' })
export class Conversation {
  @Prop({ default: false })
  is_group: boolean;

  @Prop()
  group_name?: string;

  @Prop()
  last_message?: string;

  @Prop()
  last_message_at?: Date;

  @Prop({ type: [String], default: [] })
  participant_ids: string[];
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ is_group: 1, participant_ids: 1 });
