import { describe, expect, it } from 'vitest';
import { rettungBereit, wuerfleEinklemmungsbedarf } from './rettung';
import type { EingeklemmtStatus } from './types';

describe('wuerfleEinklemmungsbedarf', () => {
  it('würfelt Material bei niedrigem Zufallswert, keins bei hohem', () => {
    expect(wuerfleEinklemmungsbedarf(() => 0).benoetigtesMaterial).toBe('kedsystem');
    expect(wuerfleEinklemmungsbedarf(() => 0.99).benoetigtesMaterial).toBeNull();
  });

  it('würfelt die Kollegenanzahl im Bereich 0-2', () => {
    expect(wuerfleEinklemmungsbedarf(() => 0).benoetigteKollegenAnzahl).toBe(0);
    expect(wuerfleEinklemmungsbedarf(() => 0.5).benoetigteKollegenAnzahl).toBe(1);
    expect(wuerfleEinklemmungsbedarf(() => 0.99).benoetigteKollegenAnzahl).toBe(2);
  });
});

describe('rettungBereit', () => {
  const basis: EingeklemmtStatus = {
    benoetigtesMaterial: null,
    materialBereitgestellt: false,
    benoetigteKollegenAnzahl: 0,
    anfragendeId: null,
    helfendeIds: [],
    gerettet: false,
    entdecktUmSek: 0,
  };

  it('ist ohne jeden Bedarf sofort bereit', () => {
    expect(rettungBereit(basis)).toBe(true);
  });

  it('fehlt Material trotz vollständigem Team', () => {
    expect(rettungBereit({ ...basis, benoetigtesMaterial: 'kedsystem', materialBereitgestellt: false })).toBe(
      false,
    );
    expect(rettungBereit({ ...basis, benoetigtesMaterial: 'kedsystem', materialBereitgestellt: true })).toBe(
      true,
    );
  });

  it('fehlen Kolleg:innen trotz bereitgestelltem Material', () => {
    expect(rettungBereit({ ...basis, benoetigteKollegenAnzahl: 2, helfendeIds: ['a'] })).toBe(false);
    expect(rettungBereit({ ...basis, benoetigteKollegenAnzahl: 2, helfendeIds: ['a', 'b'] })).toBe(true);
  });
});
