import i18next from 'i18next';
import type { LocalizationMap } from 'discord.js';

const SUPPORTED = ['en-US', 'en-GB', 'id'] as const;

export function localized(key: string) {
  const localizations = {} as LocalizationMap;

  for (const lng of SUPPORTED) {
    const val = i18next.t(key, { lng, defaultValue: key });
    (localizations as any)[lng] = typeof val === 'string' ? val : key;
  }

  return {
    default: (localizations['en-US'] as string) ?? key,
    localizations,
  };
}
