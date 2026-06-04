import { canDeleteComment } from './comment-delete.policy';

describe('canDeleteComment', () => {
  const author = 'user-author';
  const postOwner = 'user-post-owner';
  const other = 'user-other';

  it('allows the comment author', () => {
    expect(canDeleteComment(author, author, postOwner)).toBe(true);
  });

  it('allows the post owner', () => {
    expect(canDeleteComment(postOwner, author, postOwner)).toBe(true);
  });

  it('denies everyone else', () => {
    expect(canDeleteComment(other, author, postOwner)).toBe(false);
  });
});
