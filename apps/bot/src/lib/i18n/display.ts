import type { TFunction } from 'i18next';

/**
 * Core translator RPG Nova  — domain/category/id.field
 * contoh: t('dungeon/monsters:green_slime.name')
 */
const tx = (
  domain: 'dungeon' | 'hunt' | 'fish' | 'explore' | 'shop' | 'cook',
  category: 'monsters' | 'items' | 'species' | 'events' | 'lore',
  id: string,
  t: TFunction,
  field = 'name',
): string => {
  return t(`${domain}/${category}:${id}.${field}`, { defaultValue: id });
};

export const i18nMonster = (domain: 'dungeon' | 'hunt', id: string, t: TFunction) =>
  tx(domain, 'monsters', id, t);

export const i18nItem = (
  domain: 'dungeon' | 'shop' | 'hunt' | 'cook' | 'explore',
  id: string,
  t: TFunction,
) => tx(domain, 'items', id, t);

export const i18nItemDesc = (
  domain: 'dungeon' | 'shop' | 'hunt' | 'cook' | 'explore',
  id: string,
  t: TFunction,
) => tx(domain, 'items', id, t, 'desc');

export const i18nFish = (id: string, t: TFunction) => tx('fish', 'species', id, t);

export const i18nFishDesc = (id: string, t: TFunction) => tx('fish', 'species', id, t, 'desc');

export const i18nEvent = (domain: 'dungeon' | 'explore', id: string, t: TFunction) =>
  tx(domain, 'events', id, t, 'text');

export const i18nLore = (id: string, t: TFunction) => tx('dungeon', 'lore', id, t, 'text');
