/** Post owner or comment author may delete a comment. */
export function canDeleteComment(
  actorId: string,
  commentAuthorId: string,
  postAuthorId: string,
): boolean {
  return commentAuthorId === actorId || postAuthorId === actorId;
}
