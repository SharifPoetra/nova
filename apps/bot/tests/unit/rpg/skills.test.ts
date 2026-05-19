import { describe, it, expect } from 'vitest';
import { getSkill, getSkillsByClass, getPassiveSkills, SKILLS } from '../../../src/lib/rpg/skills';
import type { IUser } from '@nova/db';

describe('Skills', () => {
  it('all skills have required fields', () => {
    Object.values(SKILLS).forEach((skill) => {
      expect(skill.id).toBeDefined();
      expect(skill.cooldownTurns).toBeGreaterThanOrEqual(0);
      expect(skill.use).toBeTypeOf('function');
    });
  });

  it('getSkill returns correct skill', () => {
    const rage = getSkill('rage');
    expect(rage?.name).toBe('Rage');
    expect(rage?.classLock).toContain('warrior');
  });

  it('warrior gets rage', () => {
    const skills = getSkillsByClass('warrior');
    expect(skills.some((s) => s.id === 'rage')).toBe(true);
  });

  it('passive unlocks at level 10', () => {
    const user = { class: 'warrior', level: 10 } as IUser;
    const passives = getPassiveSkills(user);
    expect(passives.length).toBeGreaterThan(0);
  });
});
