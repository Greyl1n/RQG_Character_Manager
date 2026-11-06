import rulesData from '../data/rqgRulesData.json';

// Skill Category Modifiers calculations from RQG Core Book (p. 58)
// Supports optional customCategoryMods overrides for house rules while preserving rulebook calculations
export function calculateCategoryModifiers(stats = {}, customCategoryMods = null) {
  const { STR = 10, CON = 10, SIZ = 10, DEX = 10, INT = 10, POW = 10, CHA = 10 } = stats;

  const getPrimaryMod = (val) => {
    if (val <= 4) return -10;
    if (val <= 8) return -5;
    if (val <= 12) return 0;
    if (val <= 16) return 5;
    if (val <= 20) return 10;
    return 10 + Math.ceil((val - 20) / 4) * 5;
  };

  const getSecondaryMod = (val) => {
    if (val <= 4) return -5;
    if (val <= 16) return 0;
    if (val <= 20) return 5;
    return 5 + Math.ceil((val - 20) / 4) * 5;
  };

  const getNegSecondaryMod = (val) => {
    // SIZ for Agility & POW for Stealth: 1-4: +5, 5-16: 0, 17-20: -5, each +4: -5
    if (val <= 4) return 5;
    if (val <= 16) return 0;
    if (val <= 20) return -5;
    return -5 - Math.ceil((val - 20) / 4) * 5;
  };

  const getNegPrimaryMod = (val) => {
    // SIZ for Stealth: 1-4: +10, 5-8: +5, 9-12: 0, 13-16: -5, 17-20: -10, each +4: -5
    if (val <= 4) return 10;
    if (val <= 8) return 5;
    if (val <= 12) return 0;
    if (val <= 16) return -5;
    if (val <= 20) return -10;
    return -10 - Math.ceil((val - 20) / 4) * 5;
  };

  const agility = getSecondaryMod(STR) + getNegSecondaryMod(SIZ) + getPrimaryMod(DEX) + getSecondaryMod(POW);
  const communication = getSecondaryMod(INT) + getSecondaryMod(POW) + getPrimaryMod(CHA);
  const knowledge = getPrimaryMod(INT) + getSecondaryMod(POW);
  const magic = getPrimaryMod(POW) + getSecondaryMod(CHA);
  const manipulation = getSecondaryMod(STR) + getPrimaryMod(DEX) + getPrimaryMod(INT) + getSecondaryMod(POW);
  const perception = getPrimaryMod(INT) + getSecondaryMod(POW);
  const stealth = getNegPrimaryMod(SIZ) + getPrimaryMod(DEX) + getPrimaryMod(INT) + getNegSecondaryMod(POW);

  const rulebookMods = {
    Agility: agility,
    Communication: communication,
    Knowledge: knowledge,
    Magic: magic,
    Manipulation: manipulation,
    Perception: perception,
    Stealth: stealth
  };

  if (customCategoryMods && typeof customCategoryMods === 'object') {
    Object.keys(rulebookMods).forEach(cat => {
      if (customCategoryMods[cat] !== undefined && customCategoryMods[cat] !== null && customCategoryMods[cat] !== '') {
        const parsed = parseInt(customCategoryMods[cat], 10);
        if (!Number.isNaN(parsed)) {
          rulebookMods[cat] = parsed;
        }
      }
    });
  }

  return rulebookMods;
}

// Half Damage Bonus for Thrown Missile Weapons (RQG Core Rules p. 56)
export function getThrownDamageBonus(damageBonus) {
  if (!damageBonus || damageBonus === 'None') return 'None';
  if (damageBonus === '-1D4') return '-1D2';
  if (damageBonus === '+1D4') return '+1D2';
  if (damageBonus === '+1D6') return '+1D3';
  if (damageBonus === '+2D6') return '+1D6';
  const match = damageBonus.match(/^\+(\d+)D6$/i);
  if (match) {
    const dice = parseInt(match[1], 10);
    const halfD6 = Math.floor(dice / 2);
    const rem = dice % 2;
    return rem ? `+${halfD6}D6+1D3` : `+${halfD6}D6`;
  }
  return damageBonus;
}

// Derived Attributes (RQG Core Rules pp. 55-57)
export function calculateDerivedAttributes(stats) {
  const { STR = 10, CON = 10, SIZ = 10, DEX = 10, INT = 10, POW = 10, CHA = 10 } = stats;

  // Hit Points: Base HP = CON + SIZ modifier + POW modifier (RQG p. 55)
  const sizMod = SIZ <= 4 ? -2 : SIZ <= 8 ? -1 : SIZ <= 12 ? 0 : SIZ <= 16 ? 1 : SIZ <= 20 ? 2 : 2 + Math.ceil((SIZ - 20) / 4);
  const powMod = POW <= 4 ? -1 : POW <= 16 ? 0 : POW <= 20 ? 1 : 1 + Math.ceil((POW - 20) / 4);
  const hpMod = sizMod + powMod;
  const totalHp = Math.max(1, CON + hpMod);

  // Healing Rate (RQG p. 56): 1-6: 1, 7-12: 2, 13-18: 3, each +6: +1
  const healingRate = Math.max(1, Math.ceil(CON / 6));

  // Damage Bonus (RQG p. 56): STR + SIZ
  const strSiz = STR + SIZ;
  let damageBonus = 'None';
  let dbFormula = '0';
  if (strSiz <= 12) { damageBonus = '-1D4'; dbFormula = '-1d4'; }
  else if (strSiz <= 24) { damageBonus = 'None'; dbFormula = '0'; }
  else if (strSiz <= 32) { damageBonus = '+1D4'; dbFormula = '1d4'; }
  else if (strSiz <= 40) { damageBonus = '+1D6'; dbFormula = '1d6'; }
  else if (strSiz <= 56) { damageBonus = '+2D6'; dbFormula = '2d6'; }
  else {
    const extra = Math.ceil((strSiz - 56) / 16);
    damageBonus = `+${2 + extra}D6`;
    dbFormula = `${2 + extra}d6`;
  }

  const thrownDamageBonus = getThrownDamageBonus(damageBonus);

  // Spirit Combat Damage (RQG p. 57): POW + CHA
  // 2-12: 1D3, 13-24: 1D6, 25-32: 1D6+1, 33-40: 1D6+3, 41-56: 2D6+3, each +16: +1D6+1
  const powCha = POW + CHA;
  let spiritCombatDamage = '1D6';
  if (powCha <= 12) spiritCombatDamage = '1D3';
  else if (powCha <= 24) spiritCombatDamage = '1D6';
  else if (powCha <= 32) spiritCombatDamage = '1D6+1';
  else if (powCha <= 40) spiritCombatDamage = '1D6+3';
  else if (powCha <= 56) spiritCombatDamage = '2D6+3';
  else {
    const extraSteps = Math.ceil((powCha - 56) / 16);
    spiritCombatDamage = `${2 + extraSteps}D6+${3 + extraSteps}`;
  }

  // Maximum ENC (RQG p. 57): lesser of STR or (STR + CON) / 2
  const maxEnc = Math.min(STR, Math.round((STR + CON) / 2));

  // Strike Ranks (RQG p. 56)
  let dexSr = 3;
  if (DEX <= 5) dexSr = 5;
  else if (DEX <= 8) dexSr = 4;
  else if (DEX <= 12) dexSr = 3;
  else if (DEX <= 15) dexSr = 2;
  else if (DEX <= 18) dexSr = 1;
  else dexSr = 0;

  let sizSr = 2;
  if (SIZ <= 6) sizSr = 3;
  else if (SIZ <= 14) sizSr = 2;
  else if (SIZ <= 21) sizSr = 1;
  else sizSr = 0;

  const meleeSr = dexSr + sizSr;

  // Hit Locations HP Table (RQG p. 56)
  // 1-6: Legs 2, Abd 2, Chest 3, Arms 1, Head 2; each +3 Total HP adds +1 to every location
  const locTier = Math.max(0, Math.ceil((totalHp - 6) / 3));
  const legHp = 2 + locTier;
  const abdHp = 2 + locTier;
  const chestHp = 3 + locTier;
  const armHp = 1 + locTier;
  const headHp = 2 + locTier;

  const hitLocations = {
    'Right Leg': { maxHp: legHp, currentHp: legHp, armor: 0, range: '01–04' },
    'Left Leg': { maxHp: legHp, currentHp: legHp, armor: 0, range: '05–08' },
    'Abdomen': { maxHp: abdHp, currentHp: abdHp, armor: 0, range: '09–11' },
    'Chest': { maxHp: chestHp, currentHp: chestHp, armor: 0, range: '12' },
    'Right Arm': { maxHp: armHp, currentHp: armHp, armor: 0, range: '13–15' },
    'Left Arm': { maxHp: armHp, currentHp: armHp, armor: 0, range: '16–18' },
    'Head': { maxHp: headHp, currentHp: headHp, armor: 0, range: '19–20' }
  };

  return {
    totalHp,
    currentHp: totalHp,
    totalMp: POW,
    currentMp: POW,
    healingRate,
    damageBonus,
    thrownDamageBonus,
    dbFormula,
    spiritCombatDamage,
    maxEnc,
    chaLimit: CHA,
    freeInt: INT,
    dexSr,
    sizSr,
    meleeSr,
    move: 8,
    hitLocations
  };
}

// D100 Roll Resolution (RQG Core Rules pp. 142-143)
export function evaluateD100Roll(target, roll) {
  // Critical: 5% of target (.5 rounds up)
  const critMax = Math.max(1, Math.floor(target / 20 + 0.5));
  // Special: 20% of target (.5 rounds up)
  const specialMax = Math.max(1, Math.floor(target / 5 + 0.5));
  // Normal Success: 01-05 is always a success (if target > 0); 96-100 is always an automatic failure
  const successMax = target <= 0 ? 0 : Math.min(95, Math.max(5, target));
  // Fumble: 5% of failure chance ((100 - target) / 20, .5 rounds up):
  // 01-10%: 96-00, 11-30%: 97-00, 31-50%: 98-00, 51-70%: 99-00, 71%+: 00 (100)
  const fumbleCount = Math.max(1, Math.min(5, Math.floor((100 - target) / 20 + 0.5)));
  const fumbleMin = 101 - fumbleCount;

  const thresholds = { critMax, specialMax, successMax, fumbleMin };

  if (target > 0 && roll <= critMax) {
    return { ...thresholds, type: 'critical', label: 'Critical Success!', color: '#22c55e', description: 'Maximizes effect, ignores armor, bypasses parries!' };
  }
  if (target > 0 && roll <= specialMax) {
    return { ...thresholds, type: 'special', label: 'Special Success!', color: '#38bdf8', description: 'Impaling, slashing, or crushing bonus damage!' };
  }
  if (target > 0 && roll <= successMax) {
    return { ...thresholds, type: 'success', label: 'Success', color: '#a3e635', description: 'Task accomplished cleanly.' };
  }
  if (roll >= fumbleMin) {
    return { ...thresholds, type: 'fumble', label: 'Fumble Disaster!', color: '#ef4444', description: 'Catastrophic error! Weapon dropped, shattered, or struck self!' };
  }
  return { ...thresholds, type: 'failure', label: 'Failure', color: '#f97316', description: 'Action did not achieve the required result.' };
}

// D20 Hit Location Resolution (RQG Core Rules p. 56 & p. 199)
export function evaluateHitLocationRoll(roll) {
  let location = 'Chest';
  let range = '12';
  if (roll <= 4) { location = 'Right Leg'; range = '01–04'; }
  else if (roll <= 8) { location = 'Left Leg'; range = '05–08'; }
  else if (roll <= 11) { location = 'Abdomen'; range = '09–11'; }
  else if (roll === 12) { location = 'Chest'; range = '12'; }
  else if (roll <= 15) { location = 'Right Arm'; range = '13–15'; }
  else if (roll <= 18) { location = 'Left Arm'; range = '16–18'; }
  else { location = 'Head'; range = '19–20'; }

  return {
    roll,
    location,
    range,
    type: 'hitLocation',
    label: `${location} (${range})`,
    description: `Incoming blow strikes the ${location} (D20 roll: ${roll}, range ${range})!`,
    color: '#f59e0b'
  };
}

// Random Dice Roller Utility
export function rollDice(num, sides, mod = 0) {
  let total = 0;
  const rolls = [];
  for (let i = 0; i < num; i++) {
    const r = Math.floor(Math.random() * sides) + 1;
    rolls.push(r);
    total += r;
  }
  return { total: total + mod, rolls, formula: `${num}d${sides}${mod !== 0 ? (mod > 0 ? `+${mod}` : `${mod}`) : ''}` };
}

// Determine RQG Skill Category for any skill name (including custom/weapon skills)
export function getSkillCategoryForName(skillName = '') {
  const s = skillName.trim();
  if (!s) return 'Manipulation';
  if (rulesData.skillsBase[s]) return rulesData.skillsBase[s].cat;
  const lower = s.toLowerCase();
  if (lower.includes('dodge') || lower.includes('ride') || lower.includes('climb') || lower.includes('jump') || lower.includes('swim') || lower.includes('boat') || lower.includes('drive') || lower.includes('fly')) {
    return 'Agility';
  }
  if (lower.includes('hide') || lower.includes('move quietly') || lower.includes('stealth')) {
    return 'Stealth';
  }
  if (lower.includes('scan') || lower.includes('listen') || lower.includes('search') || lower.includes('track') || lower.includes('insight')) {
    return 'Perception';
  }
  if (lower.includes('spirit') || lower.includes('worship') || lower.includes('meditate') || lower.includes('sense')) {
    return 'Magic';
  }
  if (lower.includes('customs') || lower.includes('lore') || lower.includes('battle') || lower.includes('first aid') || lower.includes('survival') || lower.includes('farm') || lower.includes('herd') || lower.includes('evaluate') || lower.includes('treat') || lower.includes('read/write') || lower.includes('peaceful cut') || lower.includes('manage') || lower.includes('alchemy') || lower.includes('bureaucracy') || lower.includes('library') || lower.includes('shiphandling') || lower.includes('game')) {
    return 'Knowledge';
  }
  if (lower.includes('speak') || lower.includes('orate') || lower.includes('sing') || lower.includes('dance') || lower.includes('charm') || lower.includes('fast talk') || lower.includes('intimidate') || lower.includes('bargain') || lower.includes('intrigue') || lower.includes('disguise') || lower.includes('act') || lower.includes('art')) {
    return 'Communication';
  }
  return 'Manipulation';
}

// RQG Skill Experience / Level-Up Roll (Core Rules p. 415)
// Roll 1D100 + Skill Category Modifier.
// If (1D100 + CategoryMod) > Current Skill % (or natural roll is 100), skill increases by +1D6% (or flat +3%).
export function rollSkillExperience(currentSkill, categoryMod = 0, gainMode = '1d6') {
  const expRoll = Math.floor(Math.random() * 100) + 1;
  const modifiedRoll = expRoll + categoryMod;
  const success = expRoll === 100 || modifiedRoll > currentSkill;

  let gain = 0;
  if (success) {
    gain = gainMode === 'flat3' ? 3 : (Math.floor(Math.random() * 6) + 1);
  }

  const newSkill = currentSkill + gain;
  const modText = categoryMod >= 0 ? `+ ${categoryMod}%` : `- ${Math.abs(categoryMod)}%`;

  return {
    success,
    roll: expRoll,
    categoryMod,
    modifiedRoll,
    oldSkill: currentSkill,
    gain,
    newSkill,
    summary: success
      ? `✓ Experience Success! Rolled ${expRoll} (${modText} cat. mod = ${modifiedRoll}, needed > ${currentSkill}%). Increased by +${gain}% (${currentSkill}% → ${newSkill}%)!`
      : `✗ Experience Failed. Rolled ${expRoll} (${modText} cat. mod = ${modifiedRoll}, needed > ${currentSkill}%). Remains at ${currentSkill}%.`
  };
}

// Build complete character skills according to RQG Core Rules (Chapter 2)
// Note: Profession/Occupation skill bonuses are NOT forced from presets; instead customProfessionSkills are applied freely per house rules!
export function buildCharacterSkills({
  stats,
  customCategoryMods = null,
  homelandKey,
  cultKey,
  customProfessionSkills = {},
  personalPlus25 = [],
  personalPlus10 = []
}) {
  const catMods = calculateCategoryModifiers(stats, customCategoryMods);
  const homeland = rulesData.homelands[homelandKey] || {};
  const cult = rulesData.cults[cultKey] || {};

  const charSkills = {};

  // 1. Standard Base Skills + Category Modifiers
  Object.entries(rulesData.skillsBase).forEach(([sk, info]) => {
    let baseVal = info.base;
    if (baseVal === 'DEX*2') baseVal = stats.DEX * 2;
    else if (baseVal === 'DEX*3') baseVal = stats.DEX * 3;
    const catBonus = catMods[info.cat] || 0;
    charSkills[sk] = Math.max(0, baseVal + catBonus);
  });

  // 2. Base Weapon & Shield Skills + Manipulation Modifier
  (rulesData.weapons || []).forEach(wp => {
    charSkills[wp.name] = Math.max(0, (wp.base || 10) + (catMods.Manipulation || 0));
  });

  // Helper to add bonus to a skill (initializing with appropriate category mod if custom/specialized)
  const addSkillBonus = (skillName, bonus) => {
    if (charSkills[skillName] === undefined) {
      let base = 5;
      let cat = getSkillCategoryForName(skillName);
      if (skillName.startsWith('Speak (')) base = 0;
      else if (skillName.startsWith('Read/Write (')) base = 0;
      else if (skillName.startsWith('Customs (')) base = 0;
      else if (skillName.startsWith('Ride (')) base = 5;
      else if (skillName.startsWith('Craft (')) base = 10;
      else if (skillName.startsWith('Cult Lore (')) base = 5;
      else if (skillName.startsWith('Worship (')) base = 5;
      else if (skillName.startsWith('Lore (')) base = 5;
      else if (skillName === 'Fly') base = 5;
      else if (skillName === 'Brawl' || skillName === 'Fist' || skillName === 'Grapple') base = 25;
      charSkills[skillName] = Math.max(0, base + (catMods[cat] || 0));
    }
    charSkills[skillName] = Math.max(0, charSkills[skillName] + bonus);
  };

  // 3. Homeland Skills
  if (homeland.skills) {
    Object.entries(homeland.skills).forEach(([sk, bonus]) => {
      addSkillBonus(sk, bonus);
    });
  }

  // 4. Homeland Cultural Weapons
  const culturalWeaponNames = [];
  if (homeland.culturalWeapons) {
    homeland.culturalWeapons.forEach(cw => {
      if (cw.name && cw.bonus) {
        const mappedName = cw.name === '1H Axe (Battle Axe)' ? 'Battle Axe (1H)' : cw.name;
        addSkillBonus(mappedName, cw.bonus);
        culturalWeaponNames.push(mappedName);
      } else if (cw.options && cw.options.length > 0) {
        const chosen = cw.options[0];
        const mappedName = chosen.name === '1H Axe (Battle Axe)' ? 'Battle Axe (1H)' : chosen.name;
        addSkillBonus(mappedName, chosen.bonus);
        culturalWeaponNames.push(mappedName);
      }
    });
  }

  const primaryMelee = culturalWeaponNames.find(w => !w.includes('Bow') && !w.includes('Sling') && !w.includes('Javelin') && !w.includes('Shield')) || 'Broadsword';
  const secondaryWeapon = culturalWeaponNames.find(w => w !== primaryMelee) || 'Medium Shield';

  // 5. Custom / House Rule Profession Skill Bonuses (user-chosen)
  if (customProfessionSkills) {
    Object.entries(customProfessionSkills).forEach(([sk, bonus]) => {
      const numBonus = parseInt(bonus, 10) || 0;
      if (numBonus !== 0) {
        addSkillBonus(sk, numBonus);
      }
    });
  }

  // 6. Cult Skills (RQG p. 69: Cult Lore +15%, Worship +20%, Meditate +5%, plus cult skill bonuses)
  if (cult.name) {
    addSkillBonus(`Cult Lore (${cult.name})`, 15);
    addSkillBonus(`Worship (${cult.name})`, 20);
    addSkillBonus('Meditate', 5);
  }
  if (cult.skills) {
    Object.entries(cult.skills).forEach(([sk, bonus]) => {
      if (sk === '1H Axe') addSkillBonus('Battle Axe (1H)', bonus);
      else if (sk === '2H Axe') addSkillBonus('Battle Axe (2H)', bonus);
      else if (sk === '1H Axe or 2H Axe') addSkillBonus('Battle Axe (1H)', bonus);
      else if (sk === 'Self Bow or Composite Bow') addSkillBonus('Composite Bow', bonus);
      else if (sk === 'Other Weapon') addSkillBonus(secondaryWeapon, bonus);
      else addSkillBonus(sk, bonus);
    });
  }

  // 7. Personal Skill Bonuses (+25% to 4 skills, +10% to 5 skills)
  personalPlus25.forEach(sk => addSkillBonus(sk, 25));
  personalPlus10.forEach(sk => addSkillBonus(sk, 10));

  return charSkills;
}

// Instant Character Generator
export function generateRandomCharacter() {
  const homelandsKeys = Object.keys(rulesData.homelands);
  const chosenHomelandKey = homelandsKeys[Math.floor(Math.random() * homelandsKeys.length)];
  const homeland = rulesData.homelands[chosenHomelandKey];

  // Roll characteristics (3D6 for STR, CON, DEX, POW, CHA; 2D6+6 for SIZ, INT)
  let stats = {
    STR: rollDice(3, 6).total,
    CON: rollDice(3, 6).total,
    SIZ: rollDice(2, 6, 6).total,
    DEX: rollDice(3, 6).total,
    INT: rollDice(2, 6, 6).total,
    POW: rollDice(3, 6).total,
    CHA: rollDice(3, 6).total
  };

  // Check 92 threshold (RQG Core Rules p. 52)
  let sum = Object.values(stats).reduce((a, b) => a + b, 0);
  if (sum <= 92) {
    stats.STR = Math.min(18, stats.STR + 1);
    stats.CON = Math.min(18, stats.CON + 1);
    stats.POW = Math.min(18, stats.POW + 1);
  }

  // Pick Runes
  const elements = ['Air', 'Earth', 'Fire/Sky', 'Darkness', 'Water', 'Moon'];
  const shuffledElem = [...elements].sort(() => 0.5 - Math.random());
  const primaryElem = shuffledElem[0];
  const secondaryElem = shuffledElem[1];
  const tertiaryElem = shuffledElem[2];

  const runes = {
    Darkness: 0, Water: 0, Earth: 0, Air: 0, 'Fire/Sky': 0, Moon: 0,
    Harmony: 50, Disorder: 50,
    Stasis: 50, Movement: 50,
    Truth: 50, Illusion: 50,
    Fertility: 50, Death: 50,
    Man: 50, Beast: 50
  };

  runes[primaryElem] = 60;
  runes[secondaryElem] = 40;
  runes[tertiaryElem] = 20;

  // Add homeland elemental rune bonus (+10%)
  if (homeland.elementalRuneBonus) {
    Object.entries(homeland.elementalRuneBonus).forEach(([r, bonus]) => {
      runes[r] = (runes[r] || 0) + bonus;
    });
  }

  // Rune modifiers to characteristics (+2 for highest elemental rune, +1 for second-highest, RQG p. 52)
  const elemStatMap = {
    Darkness: 'SIZ',
    Water: 'DEX',
    Earth: 'CON',
    Air: 'STR',
    'Fire/Sky': 'INT',
    Moon: 'POW'
  };
  stats[elemStatMap[primaryElem]] += 2;
  stats[elemStatMap[secondaryElem]] += 1;

  // Homeland stat modifiers (e.g. Bison, High Llama, Impala Riders)
  if (homeland.statModifiers) {
    Object.entries(homeland.statModifiers).forEach(([s, mod]) => {
      stats[s] = (stats[s] || 10) + mod;
    });
  }

  // Power runes: pick 2 at 75/25
  const powerPairs = [
    ['Movement', 'Stasis'],
    ['Death', 'Fertility'],
    ['Truth', 'Illusion'],
    ['Harmony', 'Disorder'],
    ['Man', 'Beast']
  ];
  const chosenPair1 = powerPairs[Math.floor(Math.random() * powerPairs.length)];
  const remainingPairs = powerPairs.filter(p => p !== chosenPair1);
  const chosenPair2 = remainingPairs[Math.floor(Math.random() * remainingPairs.length)];

  runes[chosenPair1[0]] = 75;
  runes[chosenPair1[1]] = 25;
  runes[chosenPair2[0]] = 75;
  runes[chosenPair2[1]] = 25;

  // Pick suitable Cult based on highest rune
  const cultKeys = Object.keys(rulesData.cults);
  const matchingCults = cultKeys.filter(k => {
    const cult = rulesData.cults[k];
    return cult.runes.some(r => runes[r] >= 50);
  });
  const chosenCultKey = matchingCults.length > 0
    ? matchingCults[Math.floor(Math.random() * matchingCults.length)]
    : 'Orlanth';
  const chosenCult = rulesData.cults[chosenCultKey];

  // Derived Attributes
  const derived = calculateDerivedAttributes(stats);

  // Build Complete Skills (Homeland + Cult + Personal bonuses; no forced Profession bonuses)
  const charSkills = buildCharacterSkills({
    stats,
    homelandKey: chosenHomelandKey,
    cultKey: chosenCultKey,
    customProfessionSkills: {},
    personalPlus25: ['Broadsword', 'Dodge', 'Scan', 'Battle'],
    personalPlus10: ['First Aid', 'Listen', 'Spirit Combat', 'Orate', 'Medium Shield']
  });

  // Passions
  const passions = [...(homeland.passions || [])];
  if (chosenCult.passions) {
    chosenCult.passions.forEach(p => {
      if (!passions.some(existing => existing.name === p)) {
        passions.push({ name: p, value: 60 });
      }
    });
  }

  // Names pool
  const names = ['Kallyr', 'Argrath', 'Kangharl', 'Dunorl', 'Garrath', 'Ingund', 'Jaldon', 'Maranath', 'Sarala', 'Vareena', 'Farnan', 'Sorala', 'Orlgor', 'Brandgor', 'Heort'];
  const name = names[Math.floor(Math.random() * names.length)] + ' ' + (Math.random() > 0.5 ? 'son of ' : 'daughter of ') + names[Math.floor(Math.random() * names.length)];

  // Heirloom
  const heirloom = rulesData.heirlooms[Math.floor(Math.random() * rulesData.heirlooms.length)];

  return {
    id: 'char-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    name,
    gender: Math.random() > 0.5 ? 'Female' : 'Male',
    age: 21,
    homeland: chosenHomelandKey,
    occupation: '',
    cult: chosenCultKey,
    runePoints: 3,
    currentRp: 3,
    reputation: rollDice(1, 10, 5).total,
    stats,
    runes,
    passions,
    skills: charSkills,
    checkedSkills: {},
    spiritMagic: chosenCult.spiritMagic
      ? chosenCult.spiritMagic.slice(0, 3).map(sp => ({
          name: sp.name,
          points: typeof sp.points === 'number' ? sp.points : (parseInt(sp.points, 10) || 2)
        }))
      : [],
    runeMagic: chosenCult.specialRuneMagic ? chosenCult.specialRuneMagic.slice(0, 3) : [],
    heirloom,
    notes: `${name} is an adventurous soul from ${chosenHomelandKey}, initiated into the secrets of ${chosenCultKey}.`,
    ...derived
  };
}
