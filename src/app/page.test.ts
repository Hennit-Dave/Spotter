import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth/member-session', () => ({ getSignedInMember: vi.fn() }));
vi.mock('@/components/home/HomeShell', () => ({ HomeShell: () => null }));
vi.mock('@/components/home/Landing', () => ({ Landing: () => null }));

import { getSignedInMember } from '@/server/auth/member-session';
import { generateMetadata } from './page';

describe('homepage metadata visibility', () => {
  beforeEach(() => vi.resetAllMocks());

  it('publishes the approved marketing metadata for signed-out visitors', async () => {
    vi.mocked(getSignedInMember).mockResolvedValue(null);
    const metadata = await generateMetadata();
    expect(metadata.title).toEqual({ absolute: 'Spotter | Your gym’s answer desk' });
    expect(metadata.description).toBe('Your gym’s answer desk.');
    expect(metadata.description?.split(/\s+/)).toHaveLength(4);
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.openGraph).toMatchObject({ type: 'website', siteName: 'Spotter' });
    expect(metadata.twitter).toMatchObject({ card: 'summary' });
  });

  it('excludes the member view from indexing and publishes no member details', async () => {
    vi.mocked(getSignedInMember).mockResolvedValue({
      accountId: 'test-account', memberId: 'test-member', name: 'Private name',
      email: 'private@example.test',
    });
    expect(await generateMetadata()).toEqual({
      title: { absolute: 'Home | Spotter' },
      robots: { index: false, follow: false },
    });
  });

  it('does not fall back to indexable metadata when the session check fails', async () => {
    vi.mocked(getSignedInMember).mockRejectedValue(new Error('Session unavailable'));
    await expect(generateMetadata()).rejects.toThrow('Session unavailable');
  });
});
