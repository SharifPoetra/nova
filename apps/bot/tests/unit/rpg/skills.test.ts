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

  it('berserker_passive uses new generic format', () => {
    const p = getSkill('berserker_passive');
    expect(p?.passive).toBe(true);
    expect(p?.effects[0].type).toBe('buff');
    expect(p?.effects[0].value).toBe('passive:atk_pct:hp_loss:0.01');
    // validasi format: passive:stat:condition:value
    expect(p?.effects[0].value.split(':')).toHaveLength(4);
  });

  it('all passive effects follow format', () => {
    Object.values(SKILLS)
      .filter((s) => s.passive)
      .forEach((p) => {
        p.effects.forEach((e) => {
          if (e.value.startsWith('passive:')) {
            const parts = e.value.split(':');
            expect(parts[0]).toBe('passive');
            expect([
              'atk',
              'atk_pct',
              'def',
              'hp_pct',
              'critRate',
              'critDmg',
              'dodge',
              'flag',
            ]).toContain(parts[1]);
            expect(['always', 'hp>0.7', 'hp>0.5', 'hp<0.5', 'hp<0.3', 'hp_loss']).toContain(
              parts[2],
            );
          }
        });
      });
  });
});
