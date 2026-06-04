import { describe, expect, it } from 'vitest';
import { normalizeNetworkPost } from './network.types';

describe('normalizeNetworkPost', () => {
  it('maps Mongo-style _id and nested originalPost', () => {
    const raw = {
      _id: 'post-1',
      authorId: 'author-1',
      content: 'hello',
      mediaUrls: ['https://cdn.example/a.jpg', 42],
      visibility: 'public',
      likeCount: 3,
      commentCount: 1,
      shareCount: 0,
      originalPostId: 'orig-1',
      originalPost: {
        _id: { $oid: 'orig-1' },
        authorId: 'author-0',
        content: 'original',
        mediaUrls: [],
        visibility: 'public',
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      createdAt: '2026-02-01T00:00:00.000Z',
    };

    const post = normalizeNetworkPost(raw);

    expect(post.id).toBe('post-1');
    expect(post.mediaUrls).toEqual(['https://cdn.example/a.jpg']);
    expect(post.originalPostId).toBe('orig-1');
    expect(post.originalPost?.id).toBe('orig-1');
    expect(post.originalPost?.content).toBe('original');
  });

  it('defaults missing fields', () => {
    const post = normalizeNetworkPost({ id: 'p2' });
    expect(post.id).toBe('p2');
    expect(post.content).toBe('');
    expect(post.mediaUrls).toEqual([]);
    expect(post.visibility).toBe('public');
    expect(post.likeCount).toBe(0);
  });
});
