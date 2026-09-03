import { describe, expect, it } from 'vitest';
import { ALL_NAV_ITEMS, NAV, detailEyebrow, screenHeaderProps, screenIdentity } from './nav';

describe('canonical screen taxonomy', () => {
  it('gives every rail destination a title and an eyebrow', () => {
    for (const item of ALL_NAV_ITEMS) {
      const id = screenIdentity(item.to);
      expect(id.title, item.to).toBeTruthy();
      expect(id.eyebrow, item.to).toBeTruthy();
    }
  });

  it('never repeats a screen title inside its own eyebrow', () => {
    for (const item of ALL_NAV_ITEMS) {
      const { title, eyebrow } = screenIdentity(item.to);
      expect(eyebrow.split(' · '), item.to).not.toContain(title);
    }
  });

  it('starts every eyebrow with the layer the rail groups it under', () => {
    for (const group of NAV) {
      for (const item of group.items) {
        expect(screenIdentity(item.to).eyebrow.startsWith(group.layer), item.to).toBe(true);
      }
    }
  });

  it('requires a declared canonical title whenever the rail label is a short form', () => {
    for (const item of ALL_NAV_ITEMS) {
      if (item.label === screenIdentity(item.to).title) continue;
      expect(item.title, `${item.to} shortens its label, so it must declare title`).toBeTruthy();
    }
  });

  it('drops the pillar when the screen is its own pillar', () => {
    expect(screenIdentity('/monitor').eyebrow).toBe('Know');
    expect(screenIdentity('/rotate').eyebrow).toBe('Act');
  });

  it('keeps the pillar when it names a module the screen sits inside', () => {
    expect(screenIdentity('/discover').eyebrow).toBe('See · Discover');
    expect(screenIdentity('/intelligence').eyebrow).toBe('Know · Intelligence');
  });

  it('resolves a child route to its parent screen', () => {
    expect(screenIdentity('/discover/idn_000001').title).toBe('Identity Inventory');
  });

  it('gives a detail screen the layer plus its parent screen name', () => {
    expect(detailEyebrow('/intelligence')).toBe('Know · Agent Sessions');
    expect(detailEyebrow('/rotate')).toBe('Act · Rotate');
  });

  it('spreads straight onto ScreenHeader', () => {
    expect(screenHeaderProps('/')).toEqual({ eyebrow: 'See', title: 'Dashboard' });
    expect(screenHeaderProps('/settings/users')).toEqual({ eyebrow: 'Platform', title: 'Manage Users' });
  });
});
