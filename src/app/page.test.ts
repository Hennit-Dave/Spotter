import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/home/Landing', () => ({ Landing: () => null }));
vi.mock('@/components/home/LegalView', () => ({ LegalView: () => null }));

import HomePage, { generateMetadata } from './page';
import { Landing } from '@/components/home/Landing';
import { LegalView } from '@/components/home/LegalView';

const homeProps = () => ({ searchParams: Promise.resolve({}) });

describe('home page', () => {
  it('publishes the approved marketing metadata on the landing page', async () => {
    const metadata = await generateMetadata(homeProps());
    expect(metadata.title).toEqual({ absolute: 'Spotter | Your gym’s answer desk' });
    expect(metadata.description).toBe('Your gym’s answer desk.');
    expect(metadata.description?.split(/\s+/)).toHaveLength(4);
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.openGraph).toMatchObject({ type: 'website', siteName: 'Spotter' });
    expect(metadata.twitter).toMatchObject({ card: 'summary' });
    expect((await HomePage(homeProps())).type).toBe(Landing);
  });

  it.each([
    ['privacy', 'Privacy Policy'],
    ['terms', 'Terms of Service'],
  ])('renders the public %s view without marketing metadata', async (view, title) => {
    const props = { searchParams: Promise.resolve({ view }) };
    expect(await generateMetadata(props)).toEqual({
      title: { absolute: `${title} | Spotter` },
      robots: { index: false, follow: false },
    });
    const rendered = await HomePage(props);
    expect(rendered.type).toBe(LegalView);
    expect(rendered.props.document.title).toBe(title);
  });
});
