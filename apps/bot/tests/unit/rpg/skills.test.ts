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

  it('passive unlocks at level 5', () => {
    const warrior = { class: 'warrior', level: 5 } as IUser;
    const rogue = { class: 'rogue', level: 5 } as IUser;
    const mage = { class: 'mage', level: 5 } as IUser;

    expect(getPassiveSkills(warrior).map((p) => p.id)).toContain('shield_wall');
    expect(getPassiveSkills(rogue).map((p) => p.id)).toContain('evasion');
    expect(getPassiveSkills(mage).map((p) => p.id)).toContain('mana_shield');
  });

  it('passive does not unlock before level 5', () => {
    const user = { class: 'rogue', level: 4 } as IUser;
    const passives = getPassiveSkills(user);
    expect(passives.length).toBe(0);
  });

  it('level 10 passives unlock correctly', () => {
    const warrior = { class: 'warrior', level: 10 } as IUser;
    const rogue = { class: 'rogue', level: 10 } as IUser;
    const mage = { class: 'mage', level: 10 } as IUser;

    expect(getPassiveSkills(warrior).length).toBe(2);
    expect(getPassiveSkills(rogue).length).toBe(2);
    expect(getPassiveSkills(mage).length).toBe(2);
  });

  it('berserker_passive uses new generic format', () => {
    const p = getSkill('berserker_passive');
    expect(p?.passive).toBe(true);
    expect(p?.effects[0].type).toBe('buff');
    expect(p?.effects[0].value).toBe('passive:atk_pct:hp_loss:0.01');
    expect(String(p?.effects[0].value).split(':')).toHaveLength(4);
  });

  it('shadow_dance uses correct format', () => {
    const p = getSkill('shadow_dance');
    expect(p?.passive).toBe(true);
    expect(p?.name).toBe('Shadow Dance');
    expect(p?.effects[0].value).toBe('passive:critRate:hp>0.7:0.15');
  });

  it('arcane_intellect uses correct format', () => {
    const p = getSkill('arcane_intellect');
    expect(p?.passive).toBe(true);
    expect(p?.name).toBe('Arcane Intellect');
    expect(p?.effects[0].value).toBe('passive:critDmg:hp>0.5:0.25');
  });

  it('new level 5 passives use correct format', () => {
    const shield = getSkill('shield_wall');
    const evasion = getSkill('evasion');
    const mana = getSkill('mana_shield');

    expect(shield?.effects[0].value).toBe('passive:flag:always:warrior_block');
    expect(evasion?.effects[0].value).toBe('passive:dodge:hp>0.7:0.10');
    expect(mana?.effects[0].value).toBe('passive:flag:always:mana_shield');
  });

  it('all passive effects follow format', () => {
    Object.values(SKILLS)
      .filter((s) => s.passive)
      .forEach((p) => {
        p.effects.forEach((e) => {
          if (typeof e.value === 'string' && e.value.startsWith('passive:')) {
            const parts = e.value.split(':');
            expect(parts[0]).toBe('passive');
            expect(parts).toHaveLength(4);
            expect(['atk', 'atk_pct', 'def', 'hp_pct', 'critRate', 'critDmg', 'dodge', 'flag']).toContain(parts[1]);
            expect(['always', 'hp>0.7', 'hp>0.5', 'hp<0.5', 'hp<0.3', 'hp_loss']).toContain(parts[2]);
            // value harus parseable KECUALI untuk flag
            if (parts[1] !== 'flag') {
              expect(parseFloat(parts[3])).not.toBeNaN();
            } else {
              expect(parts[3]).toMatch(/^[a-z_]+$/); // flag harus snake_case
            }
          }
        });
      });
  });

  it('getPassiveSkills returns correct for each class', () => {
    const warrior = getPassiveSkills({ class: 'warrior', level: 15 } as IUser);
    const rogue = getPassiveSkills({ class: 'rogue', level: 15 } as IUser);
    const mage = getPassiveSkills({ class: 'mage', level: 15 } as IUser);

    expect(warrior.map((p) => p.id)).toContain('shield_wall');
    expect(warrior.map((p) => p.id)).toContain('berserker_passive');
    expect(rogue.map((p) => p.id)).toContain('evasion');
    expect(rogue.map((p) => p.id)).toContain('shadow_dance');
    expect(mage.map((p) => p.id)).toContain('mana_shield');
    expect(mage.map((p) => p.id)).toContain('arcane_intellect');
  });
});
