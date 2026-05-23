import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Transport } from '@nestjs/microservices';
import { ContentModerationService } from './content-moderation.service';

@Controller()
export class ContentModerationController {
  private readonly logger = new Logger(ContentModerationController.name);

  constructor(private readonly moderation: ContentModerationService) {}

  /** Request–reply: network-service awaits this before returning the created post. */
  @MessagePattern('ai.moderate_content', Transport.KAFKA)
  async moderateContent(data: {
    contentId?: string;
    authorId?: string;
    text?: string;
    images?: string[];
  }): Promise<{ status: 'safe' | 'harmful' }> {
    const contentId = data?.contentId?.trim() ?? '';
    const authorId = data?.authorId?.trim() ?? '';
    const images = Array.isArray(data?.images) ? data.images : [];
    this.logger.log(
      `Moderating post ${contentId || '(unknown id)'} (text=${Boolean(data?.text?.trim())}, media=${images.length})`,
    );

    const status = await this.moderation.analyze(
      data?.text ?? '',
      images,
    );

    this.logger.log(
      `Moderation RPC result postId=${contentId} authorId=${authorId} status=${status}`,
    );

    return { status };
  }
}
