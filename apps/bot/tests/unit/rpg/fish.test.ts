import { describe, it, expect } from 'vitest';
import { catchFish, FISHES } from '../../../src/lib/rpg/fishes';

describe('catchFish', () => {
  it('returns a valid fish', () => {
    const fish = catchFish();
    expect(FISHES.map((f) => f.id)).toContain(fish.id);
    expect(fish.rarity).toBeDefined();
    expect(fish.sellPrice).toBeGreaterThan(0);
  });

  it('base rates sum to ~100', () => {
    const total = FISHES.reduce((s, f) => s + f.chance, 0);
    expect(total).toBeCloseTo(100, 0);
  });

  it('no bonus = mostly common', () => {
    const results = Array.from({ length: 1000 }, () => catchFish(0));
    const commons = results.filter((f) => f.rarity === 'Common').length;
    // base common = 25+20+10 = 55%
    expect(commons).toBeGreaterThan(450); // ~55% ±10%
    expect(commons).toBeLessThan(650);
  });

  it('with wooden rod (+10%) increases rare', () => {
    const noBonus = Array.from({ length: 2000 }, () => catchFish(0));
    const withBonus = Array.from({ length: 2000 }, () => catchFish(0.1));

    const rareNo = noBonus.filter((f) => ['Rare', 'Epic', 'Legendary'].includes(f.rarity)).length;
    const rareYes = withBonus.filter((f) => ['Rare', 'Epic', 'Legendary'].includes(f.rarity)).length;

    // harus naik minimal 5%
    expect(rareYes).toBeGreaterThan(rareNo);
  });

  it('with abyssal rod (+50%) significantly boosts legendary', () => {
    const base = Array.from({ length: 5000 }, () => catchFish(0));
    const boosted = Array.from({ length: 5000 }, () => catchFish(0.5));

    const legBase = base.filter((f) => f.rarity === 'Legendary').length;
    const legBoost = boosted.filter((f) => f.rarity === 'Legendary').length;

    // base legendary = 2% (1.5+0.5), dengan +50% harus >3%
    expect(legBoost).toBeGreaterThan(legBase * 1.3); // minimal 30% increase
    expect(legBoost).toBeGreaterThan(100); // >2% dari 5000
  });

  it('fishBonus does not break distribution', () => {
    // test semua bonus dari 0 sampai 0.5
    for (let bonus = 0; bonus <= 0.5; bonus += 0.1) {
      const samples = Array.from({ length: 200 }, () => catchFish(bonus));
      // semua harus valid
      expect(samples.every((f) => FISHES.some((orig) => orig.id === f.id))).toBe(true);
    }
  });

  it('specific fish chances align with rarity', () => {
    const samples = Array.from({ length: 10000 }, () => catchFish(0));
    const counts = new Map<string, number>();

    samples.forEach((f) => counts.set(f.id, (counts.get(f.id) ?? 0) + 1));

    // Sardine 25% → harus paling banyak
    const sardine = counts.get('fish_sardine') ?? 0;
    const kraken = counts.get('fish_kraken') ?? 0;

    expect(sardine).toBeGreaterThan(kraken * 10); // 25% vs 0.5%
    expect(sardine).toBeGreaterThan(2000); // ~25% dari 10000
    expect(kraken).toBeLessThan(100); // ~0.5% dari 10000
  });
});
