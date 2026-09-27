import { describe, it, expect } from 'vitest';
import { dedupLeads, normalizeEmail, normalizeHandle, nameKey } from '../src/lib/dedup';
import type { LeadInput } from '../src/lib/types';

function lead(over: Partial<LeadInput> = {}): LeadInput {
  return {
    first_name: 'Kyla',
    last_name: 'Santos',
    email: 'kyla@x.com',
    handle: '@kyla',
    location: 'Quezon City, PH',
    channel: 'facebook_group',
    platforms: ['instagram'],
    ...over,
  };
}

describe('归一化', () => {
  it('normalizeEmail 小写去空白', () => {
    expect(normalizeEmail('  Foo@BAR.com ')).toBe('foo@bar.com');
  });

  it('normalizeHandle 去 @、去 URL 前缀', () => {
    expect(normalizeHandle('@KylaSantos')).toBe('kylasantos');
    expect(normalizeHandle('https://x.com/KylaSantos')).toBe('kylasantos');
    expect(normalizeHandle('instagram.com/kyla.s')).toBe('kyla.s');
    expect(normalizeHandle('')).toBe('');
  });

  it('nameKey 只留字母数字', () => {
    expect(nameKey('Kyla', 'Dela Cruz')).toBe('kyladelacruz');
  });
});

describe('dedupLeads', () => {
  it('批内邮箱重复只保留先出现的', () => {
    const a = { ...lead(), _row: 1 };
    const b = { ...lead({ first_name: 'Kyla', last_name: 'SANTOS', email: 'KYLA@x.com', handle: '@other' }), _row: 2 };
    const r = dedupLeads([a, b], []);
    expect(r.kept.length).toBe(1);
    expect(r.duplicates.length).toBe(1);
    expect(r.duplicates[0].matchedKey).toBe('email');
    expect(r.duplicates[0].against).toBe('file:1');
  });

  it('批内 handle 大小写差异判重', () => {
    const a = { ...lead({ email: 'a@x.com', handle: '@KylaSantos' }), _row: 1 };
    const b = { ...lead({ email: 'b@x.com', handle: 'kylasantos' }), _row: 2 };
    const r = dedupLeads([a, b], []);
    expect(r.duplicates[0].matchedKey).toBe('handle');
  });

  it('与库内邮箱撞车判重并标注 db:id', () => {
    const existing = [
      { id: 42, email: 'kyla@x.com', handle: '@k', first_name: 'Kyla', last_name: 'Santos', location: 'Quezon City, PH' },
    ];
    const r = dedupLeads([{ ...lead(), _row: 1 }], existing);
    expect(r.kept.length).toBe(0);
    expect(r.duplicates[0].against).toBe('db:42');
  });

  it('换邮箱换号但姓名+地区一致仍判重', () => {
    const existing = [
      { id: 7, email: 'old@x.com', handle: '@old', first_name: 'Kyla', last_name: 'Santos', location: 'Quezon City, PH' },
    ];
    const r = dedupLeads([{ ...lead({ email: 'new@y.com', handle: '@new' }), _row: 1 }], existing);
    expect(r.duplicates[0].matchedKey).toBe('name_location');
  });

  it('地区不同且邮箱/号不同 → 不算重复', () => {
    const existing = [
      { id: 7, email: 'kyla@x.com', handle: '@kyla', first_name: 'Kyla', last_name: 'Santos', location: 'Manila, PH' },
    ];
    const r = dedupLeads([{ ...lead({ email: 'other@y.com', handle: '@other', location: 'Lagos, NG' }), _row: 1 }], existing);
    expect(r.kept.length).toBe(1);
  });

  it('保留顺序且 kept 不含 _row', () => {
    const r = dedupLeads(
      [
        { ...lead({ email: 'a@x.com', handle: '@a' }), _row: 1 },
        { ...lead({ email: 'b@x.com', handle: '@b', first_name: 'Emeka' }), _row: 2 },
      ],
      []
    );
    expect(r.kept.map((k) => k.first_name)).toEqual(['Kyla', 'Emeka']);
    expect((r.kept[0] as Record<string, unknown>)['_row']).toBeUndefined();
  });
});
