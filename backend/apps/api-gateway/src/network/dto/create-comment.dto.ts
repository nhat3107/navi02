export class CreateCommentDto {
  postId: string;
  content: string;
  parentCommentId?: string | null;
}
