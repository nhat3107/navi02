export class CreateCommentDto {
  postId: string;
  content?: string;
  mediaUrls?: string[];
  parentCommentId?: string | null;
}
