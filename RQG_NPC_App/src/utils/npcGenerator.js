import rulesData from '../data/rqgRulesData.json';
import {
  calculateDerivedAttributes,
  calculateCategoryModifiers,
  rollDice
} from './rqgRulesEngine';

export const NPC_ARCHETYPES = [
  { id: 'bandit', name: 'Bandit / Outlaw', occupation: 'Bandit', defaultCult: 'Eurmal', icon: 'Sword' },
  { id: 'city_guard', name: 'City Guard / Watchman', occupation: 'Warrior (Heavy Infantry)', defaultCult: 'Yelmalio', icon: 'Shield' },
  { id: 'tribal_warrior', name: 'Tribal Hearth-Warrior', occupation: 'Warrior (Heavy Infantry)', defaultCult: 'Orlanth', icon: 'Flame' },
  { id: 'nomad_raider', name: 'Praxian Nomad Raider', occupation: 'Warrior (Light Cavalry)', defaultCult: 'Waha', icon: 'Compass' },
  { id: 'veteran_mercenary', name: 'Mercenary Veteran', occupation: 'Warrior (Heavy Cavalry)', defaultCult: 'Humakt', icon: 'Award' },
  { id: 'cult_priest', name: 'Cult Priest / Priestess', occupation: 'Priest', defaultCult: 'Ernalda', icon: 'Sparkles' },
  { id: 'shaman_assistant', name: 'Assistant Shaman', occupation: 'Assistant Shaman', defaultCult: 'Daka Fal', icon: 'Moon' },
  { id: 'thief_assassin', name: 'Cutpurse / Spy', occupation: 'Thief', defaultCult: 'Seven Mothers', icon: 'Zap' },
  { id: 'noble_chieftain', name: 'Clan Chieftain / Thaneling', occupation: 'Noble', defaultCult: 'Orlanth', icon: 'Users' },
  { id: 'beast_hunter', name: 'Wilderness Hunter', occupation: 'Hunter', defaultCult: 'Odayla', icon: 'Crosshair' },
  { id: 'peasant_militia', name: 'Peasant / Militia', occupation: 'Farmer', defaultCult: 'Ernalda', icon: 'Heart' }
];

export const POWER_LEVELS = [
  { id: 'novice', name: 'Novice / Green', statMod: -1, skillMod: -15, rpDefault: 2 },
  { id: 'veteran', name: 'Veteran / Standard', statMod: 0, skillMod: 0, rpDefault: 3 },
  { id: 'elite', name: 'Elite / Champion', statMod: 2, skillMod: 20, rpDefault: 5 },
  { id: 'master', name: 'Master / Rune Lord', statMod: 4, skillMod: 40, rpDefault: 8 }
];

const GLORANTHAN_NAMES = {
  male: [
    'Argrath', 'Brandgor', 'Dunorl', 'Ernald', 'Farnan', 'Garrath', 'Harmast', 'Ingund',
    'Jaldon', 'Kallyr', 'Lismelder', 'Minaryth', 'Nathem', 'Orlgor', 'Proser', 'Radulf',
    'Sartar', 'Torvald', 'Unstey', 'Vostor', 'Wilms', 'Yelmgor', 'Zorag'
  ],
  female: [
    'Aela', 'Beneva', 'Darla', 'Elina', 'Freydis', 'Gunda', 'Halsna', 'Inga',
    'Jenest', 'Kallyr', 'Leika', 'Maranath', 'Nesta', 'Oranda', 'Penella', 'Ralla',
    'Sarala', 'Tora', 'Vareena', 'Vasana', 'Yanioth', 'Zevele'
  ],
  epithets: [
    'the Bold', 'Iron-Hand', 'Storm-Eyed', 'Red-Spear', 'the Unbroken', 'Shadow-Walker',
    'the Grim', 'Swift-Foot', 'Earth-Blessed', 'Sun-Kissed', 'the Fierce', 'Blood-Sworn',
    'Far-Seer', 'Bull-Hearted', 'the Silent', 'Wyrm-Bane', 'Hawk-Bite'
  ]
};

const APPEARANCES = [
  'Broad-shouldered with a weathered bronze complexion and twin lightning tattoos across both cheeks.',
  'Wiry, nervous gaze, wearing worn leather cuirass over homespun saffron tunic with eagle feathers in their hair.',
  'Imposing warrior with a deep battle scar across the jaw, proudly bearing an iron-bossed medium shield.',
  'Lean, keen-eyed nomad draped in spotted feline pelts and cowrie shell necklaces, smelling of woodsmoke.',
  'Austere figure with graying hair tied in high topknot, austere obsidian ring, and spotless white linen cape.',
  'Muscular and sun-browned, sporting heavy scale armor with green earth-spiral talismans braided into their belt.',
  'Restless eyes, cloaked in charcoal wool with hidden sheath at the hip and silver lunar crescent brooch.',
  'Stalwart figure with ornate bronze vambraces, carrying a well-oiled composite bow and horn quiver.',
  'Fierce demeanor, short-cropped red hair, wearing studded leather and wielding a notched bronze battle axe.'
];

// Map an NPC skill name to its RQG Skill Category for automatic modifier updates
export function getSkillCategory(skillName = '') {
  const s = skillName.trim();
  if (!s) return 'Manipulation';
  if (rulesData.skillsBase[s]) return rulesData.skillsBase[s].cat;
  const lower = s.toLowerCase();
  if (lower.includes('dodge') || lower.includes('ride') || lower.includes('climb') || lower.includes('jump') || lower.includes('swim') || lower.includes('boat') || lower.includes('drive')) {
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
  if (lower.includes('customs') || lower.includes('lore') || lower.includes('battle') || lower.includes('first aid') || lower.includes('survival') || lower.includes('farm') || lower.includes('herd') || lower.includes('evaluate') || lower.includes('treat') || lower.includes('read/write') || lower.includes('peaceful cut') || lower.includes('manage')) {
    return 'Knowledge';
  }
  if (lower.includes('speak') || lower.includes('orate') || lower.includes('sing') || lower.includes('dance') || lower.includes('charm') || lower.includes('fast talk') || lower.includes('intimidate') || lower.includes('bargain') || lower.includes('intrigue') || lower.includes('disguise') || lower.includes('act') || lower.includes('art')) {
    return 'Communication';
  }
  // Weapons, shields, craft, sleight, devise, conceal default to Manipulation
  return 'Manipulation';
}

// Helper to update a weapon's damage string when Damage Bonus changes
export function formatWeaponDamageWithDb(currentDamage = '', dbStr = 'None', isMissile = false, weaponName = '') {
  const baseDmg = String(currentDamage).replace(/\s+[+-]\d+D\d+(\+\d+D\d+)?$/i, '').trim() || '1D6';
  if (isMissile) {
    const lower = weaponName.toLowerCase();
    // Projectile weapons (Bows, Crossbows, Slings) do not add Damage Bonus in RQG (p. 56)
    const isProjectile = lower.includes('bow') || lower.includes('sling') || lower.includes('crossbow') || lower.includes('lasso');
    if (isProjectile) return baseDmg;
  }
  if (!dbStr || dbStr === 'None') return baseDmg;
  return `${baseDmg} ${dbStr}`.trim();
}

export function createBlankNpc() {
  const defaultStats = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 10, CHA: 10 };
  const derived = calculateDerivedAttributes(defaultStats);

  return {
    id: 'npc-blank-' + Date.now(),
    isSaved: false,
    name: '',
    age: '',
    gender: '',
    homeland: '',
    tribe: '',
    clan: '',
    occupation: '',
    reputation: '',
    appearance: '',
    archetypeId: 'custom',
    powerLevelId: 'veteran',

    // Cults
    cult1: {
      name: '',
      rank: '',
      maxRp: 3,
      currentRp: 0
    },
    cult2: {
      name: '',
      rank: '',
      maxRp: 0,
      currentRp: 0
    },

    // Characteristics
    stats: defaultStats,
    damageBonus: derived.damageBonus,
    sizSr: derived.sizSr,
    dexSr: derived.dexSr,
    meleeSr: derived.meleeSr,

    // Trackers
    totalHp: derived.totalHp,
    currentHp: derived.totalHp,
    totalMp: defaultStats.POW,
    currentMp: defaultStats.POW,

    // Hit Locations (for 10 HP: Legs 4, Abdomen 4, Chest 5, Arms 3, Head 4)
    hitLocations: {
      'Right Leg': { range: '01–04', armor: 0, currentHp: 4, maxHp: 4 },
      'Left Leg': { range: '05–08', armor: 0, currentHp: 4, maxHp: 4 },
      'Abdomen': { range: '09–11', armor: 0, currentHp: 4, maxHp: 4 },
      'Chest': { range: '12', armor: 0, currentHp: 5, maxHp: 5 },
      'Right Arm': { range: '13–15', armor: 0, currentHp: 3, maxHp: 3 },
      'Left Arm': { range: '16–18', armor: 0, currentHp: 3, maxHp: 3 },
      'Head': { range: '19–20', armor: 0, currentHp: 4, maxHp: 4 }
    },

    // Skills
    skills: [
      { name: '1H Weapon', value: 25, checked: false },
      { name: 'Shield', value: 25, checked: false },
      { name: 'Dodge', value: 20, checked: false },
      { name: 'Missile Weapon', value: 20, checked: false },
      { name: 'Scan', value: 25, checked: false },
      { name: 'Listen', value: 25, checked: false },
      { name: 'Spirit Combat', value: 20, checked: false },
      { name: 'Customs', value: 25, checked: false }
    ],
    spiritMagic: [],
    runeMagic: [],
    meleeWeapons: [
      { name: 'Broadsword', skill: 25, damage: '1D8+1', enc: 1, hp: 12, sr: 7, checked: false }
    ],
    missileWeapons: [
      { name: 'Javelin', skill: 20, damage: '1D10', enc: 1, hp: 8, range: '20m', rate: '1/MR', checked: false }
    ],
    equipment: ''
  };
}

export function generateRandomNpc(options = {}) {
  const {
    archetypeId = 'bandit',
    powerLevelId = 'veteran',
    homeland: forcedHomeland = null,
    cult: forcedCult = null,
    gender: forcedGender = null
  } = options;

  const archetype = NPC_ARCHETYPES.find(a => a.id === archetypeId) || NPC_ARCHETYPES[0];
  const powerLevel = POWER_LEVELS.find(p => p.id === powerLevelId) || POWER_LEVELS[1];

  const gender = forcedGender || (Math.random() > 0.5 ? 'Male' : 'Female');
  const namePool = gender === 'Male' ? GLORANTHAN_NAMES.male : GLORANTHAN_NAMES.female;
  const firstName = namePool[Math.floor(Math.random() * namePool.length)];
  const epithet = GLORANTHAN_NAMES.epithets[Math.floor(Math.random() * GLORANTHAN_NAMES.epithets.length)];
  const name = `${firstName} ${epithet}`;

  // Homeland
  const homelandsList = Object.keys(rulesData.homelands);
  let homeland = forcedHomeland;
  if (!homeland || !rulesData.homelands[homeland]) {
    if (archetype.id === 'nomad_raider') {
      homeland = 'Prax (Bison Rider)';
    } else {
      homeland = homelandsList[Math.floor(Math.random() * homelandsList.length)];
    }
  }

  // Cult & Rank
  const cult1Name = forcedCult || archetype.defaultCult || 'Orlanth';
  let cult1Rank = 'Initiate';
  if (powerLevel.id === 'novice') cult1Rank = 'Lay Member';
  else if (powerLevel.id === 'elite') cult1Rank = archetype.id === 'cult_priest' ? 'Rune Priest' : 'Rune Lord';
  else if (powerLevel.id === 'master') cult1Rank = archetype.id === 'cult_priest' ? 'High Priest' : 'Rune Lord';

  const cult2Options = ['Humakt', 'Chalana Arroy', 'Babeester Gor', 'Issaries', 'Daka Fal', ''];
  const cult2Name = (powerLevel.id === 'elite' || powerLevel.id === 'master') && Math.random() > 0.4
    ? cult2Options[Math.floor(Math.random() * (cult2Options.length - 1))]
    : '';
  const cult2Rank = cult2Name ? 'Initiate' : '';

  // Characteristics Base: 3D6 (or 2D6+6 for SIZ, INT)
  const statMod = powerLevel.statMod;
  const stats = {
    STR: Math.max(3, rollDice(3, 6).total + statMod),
    CON: Math.max(3, rollDice(3, 6).total + statMod),
    SIZ: Math.max(8, rollDice(2, 6, 6).total + Math.floor(statMod / 2)),
    DEX: Math.max(3, rollDice(3, 6).total + statMod),
    INT: Math.max(8, rollDice(2, 6, 6).total + Math.floor(statMod / 2)),
    POW: Math.max(3, rollDice(3, 6).total + statMod),
    CHA: Math.max(3, rollDice(3, 6).total + statMod)
  };

  // Apply Homeland characteristic modifiers (RQG p. 52: Bison, High Llama, Impala Riders)
  const homelandObj = rulesData.homelands[homeland];
  if (homelandObj?.statModifiers) {
    Object.entries(homelandObj.statModifiers).forEach(([statKey, mod]) => {
      stats[statKey] = Math.max(3, (stats[statKey] || 10) + mod);
    });
  }

  // Adjust archetype primary stats
  if (archetype.id === 'city_guard' || archetype.id === 'veteran_mercenary' || archetype.id === 'tribal_warrior') {
    stats.STR = Math.max(stats.STR, 13 + statMod);
    stats.CON = Math.max(stats.CON, 12 + statMod);
  } else if (archetype.id === 'cult_priest' || archetype.id === 'shaman_assistant') {
    stats.POW = Math.max(stats.POW, 14 + statMod);
    stats.INT = Math.max(stats.INT, 13 + statMod);
  } else if (archetype.id === 'thief_assassin' || archetype.id === 'beast_hunter') {
    stats.DEX = Math.max(stats.DEX, 14 + statMod);
  }

  const derived = calculateDerivedAttributes(stats);
  const catMods = calculateCategoryModifiers(stats);

  // Armor by Archetype and Power Level
  let armorPreset = 1; // 1 to 6 AP
  if (archetype.id === 'peasant_militia') armorPreset = 1;
  else if (archetype.id === 'thief_assassin') armorPreset = 2;
  else if (archetype.id === 'bandit' || archetype.id === 'nomad_raider' || archetype.id === 'beast_hunter') armorPreset = 3;
  else if (archetype.id === 'city_guard' || archetype.id === 'tribal_warrior') armorPreset = 4;
  else if (archetype.id === 'veteran_mercenary' || archetype.id === 'noble_chieftain') armorPreset = powerLevel.id === 'novice' ? 4 : 6;
  else armorPreset = 2;

  // Armor points per location
  const hitLocations = {};
  Object.entries(derived.hitLocations).forEach(([locName, locData]) => {
    let locAp = armorPreset;
    if (locName === 'Head' && armorPreset >= 4) locAp = Math.min(6, armorPreset + 1);
    if ((locName.includes('Arm') || locName.includes('Leg')) && armorPreset <= 2) locAp = Math.max(0, armorPreset - 1);
    hitLocations[locName] = {
      ...locData,
      armor: locAp,
      currentHp: locData.maxHp
    };
  });

  // Base Skills for NPC sheet (with accurate RQG Category Modifiers)
  const skillBonus = powerLevel.skillMod;
  const primaryCombatSkill = Math.min(125, Math.max(30, 50 + skillBonus + (catMods.Manipulation || 0)));
  const secondaryCombatSkill = Math.min(115, Math.max(25, 40 + skillBonus + (catMods.Manipulation || 0)));
  const dodgeSkill = Math.min(100, Math.max(20, (stats.DEX * 2) + Math.floor(skillBonus / 2) + (catMods.Agility || 0)));
  const scanSkill = Math.min(95, Math.max(25, 35 + Math.floor(skillBonus / 2) + (catMods.Perception || 0)));
  const listenSkill = Math.min(95, Math.max(25, 35 + Math.floor(skillBonus / 2) + (catMods.Perception || 0)));
  const spiritCombatSkill = Math.min(105, Math.max(20, 35 + skillBonus + (catMods.Magic || 0)));
  const customLoreSkill = Math.min(90, Math.max(25, 30 + Math.floor(skillBonus / 2) + (catMods.Knowledge || 0)));

  const skills = [
    { name: '1H Weapon Attack', value: primaryCombatSkill, checked: false },
    { name: '1H Weapon Parry', value: primaryCombatSkill - 5, checked: false },
    { name: 'Shield Parry', value: secondaryCombatSkill, checked: false },
    { name: 'Missile Attack', value: secondaryCombatSkill, checked: false },
    { name: 'Dodge', value: dodgeSkill, checked: false },
    { name: 'Scan', value: scanSkill, checked: false },
    { name: 'Listen', value: listenSkill, checked: false },
    { name: 'Spirit Combat', value: spiritCombatSkill, checked: false },
    { name: `Customs (${homeland.split(' ')[0]})`, value: customLoreSkill, checked: false }
  ];

  if (archetype.id === 'thief_assassin' || archetype.id === 'bandit') {
    skills.push({ name: 'Hide', value: Math.min(100, 45 + skillBonus + (catMods.Stealth || 0)), checked: false });
    skills.push({ name: 'Move Quietly', value: Math.min(100, 45 + skillBonus + (catMods.Stealth || 0)), checked: false });
  } else if (archetype.id === 'cult_priest') {
    skills.push({ name: `Worship (${cult1Name})`, value: Math.min(105, 55 + skillBonus + (catMods.Magic || 0)), checked: false });
    skills.push({ name: 'Meditate', value: Math.min(100, 40 + skillBonus + (catMods.Magic || 0)), checked: false });
  } else if (archetype.id === 'nomad_raider') {
    skills.push({ name: 'Ride', value: Math.min(105, 50 + skillBonus + (catMods.Agility || 0)), checked: false });
  }

  // Weapons (Melee uses full Damage Bonus; Thrown Missile uses half Damage Bonus; Bows/Slings use none, RQG p. 56)
  const meleeWeapons = [];
  const missileWeapons = [];
  const dbStr = derived.damageBonus !== 'None' ? derived.damageBonus : '';
  const thrownDbStr = derived.thrownDamageBonus && derived.thrownDamageBonus !== 'None' ? derived.thrownDamageBonus : '';

  if (archetype.id === 'bandit') {
    meleeWeapons.push({ name: 'Broadsword', skill: primaryCombatSkill, damage: `1D8+1 ${dbStr}`.trim(), enc: 1, hp: 12, sr: derived.meleeSr + 2, checked: false });
    meleeWeapons.push({ name: 'Dagger', skill: secondaryCombatSkill, damage: `1D4+2 ${dbStr}`.trim(), enc: 0.25, hp: 6, sr: derived.meleeSr + 4, checked: false });
    missileWeapons.push({ name: 'Sling', skill: secondaryCombatSkill, damage: '1D8', enc: 0.1, hp: 4, range: '80m', rate: '1/MR', checked: false });
  } else if (archetype.id === 'city_guard') {
    meleeWeapons.push({ name: 'Pike (2H)', skill: primaryCombatSkill, damage: `1D10+2 ${dbStr}`.trim(), enc: 3, hp: 12, sr: derived.meleeSr, checked: false });
    meleeWeapons.push({ name: 'Shortsword', skill: secondaryCombatSkill, damage: `1D6+1 ${dbStr}`.trim(), enc: 1, hp: 10, sr: derived.meleeSr + 3, checked: false });
    meleeWeapons.push({ name: 'Large Shield', skill: secondaryCombatSkill, damage: `1D6 ${dbStr}`.trim(), enc: 3, hp: 16, sr: derived.meleeSr + 2, checked: false });
    missileWeapons.push({ name: 'Javelin', skill: secondaryCombatSkill, damage: `1D10 ${thrownDbStr}`.trim(), enc: 1, hp: 8, range: '20m', rate: '1/MR', checked: false });
  } else if (archetype.id === 'tribal_warrior') {
    meleeWeapons.push({ name: 'Battle Axe', skill: primaryCombatSkill, damage: `1D8+2 ${dbStr}`.trim(), enc: 2, hp: 8, sr: derived.meleeSr + 3, checked: false });
    meleeWeapons.push({ name: 'Medium Shield', skill: secondaryCombatSkill, damage: `1D4 ${dbStr}`.trim(), enc: 2, hp: 12, sr: derived.meleeSr + 3, checked: false });
    meleeWeapons.push({ name: '1H Spear', skill: secondaryCombatSkill, damage: `1D6+1 ${dbStr}`.trim(), enc: 2, hp: 10, sr: derived.meleeSr + 2, checked: false });
    missileWeapons.push({ name: 'Javelin', skill: secondaryCombatSkill, damage: `1D10 ${thrownDbStr}`.trim(), enc: 1, hp: 8, range: '20m', rate: '1/MR', checked: false });
  } else if (archetype.id === 'nomad_raider') {
    meleeWeapons.push({ name: 'Lance', skill: primaryCombatSkill, damage: `1D10+1 ${dbStr}`.trim(), enc: 2, hp: 10, sr: derived.meleeSr, checked: false });
    meleeWeapons.push({ name: 'Broadsword', skill: secondaryCombatSkill, damage: `1D8+1 ${dbStr}`.trim(), enc: 1, hp: 12, sr: derived.meleeSr + 2, checked: false });
    meleeWeapons.push({ name: 'Small Shield', skill: secondaryCombatSkill, damage: `1D3 ${dbStr}`.trim(), enc: 1, hp: 8, sr: derived.meleeSr + 4, checked: false });
    missileWeapons.push({ name: 'Composite Bow', skill: primaryCombatSkill, damage: '1D8+1', enc: 1, hp: 7, range: '100m', rate: '1/MR', checked: false });
  } else if (archetype.id === 'beast_hunter') {
    meleeWeapons.push({ name: '1H Spear', skill: secondaryCombatSkill, damage: `1D6+1 ${dbStr}`.trim(), enc: 2, hp: 10, sr: derived.meleeSr + 2, checked: false });
    meleeWeapons.push({ name: 'Dagger', skill: secondaryCombatSkill, damage: `1D4+2 ${dbStr}`.trim(), enc: 0.25, hp: 6, sr: derived.meleeSr + 4, checked: false });
    missileWeapons.push({ name: 'Composite Bow', skill: primaryCombatSkill, damage: '1D8+1', enc: 1, hp: 7, range: '100m', rate: '1/MR', checked: false });
  } else {
    // Default
    meleeWeapons.push({ name: 'Broadsword', skill: primaryCombatSkill, damage: `1D8+1 ${dbStr}`.trim(), enc: 1, hp: 12, sr: derived.meleeSr + 2, checked: false });
    meleeWeapons.push({ name: 'Medium Shield', skill: secondaryCombatSkill, damage: `1D4 ${dbStr}`.trim(), enc: 2, hp: 12, sr: derived.meleeSr + 3, checked: false });
    missileWeapons.push({ name: 'Javelin', skill: secondaryCombatSkill, damage: `1D10 ${thrownDbStr}`.trim(), enc: 1, hp: 8, range: '20m', rate: '1/MR', checked: false });
  }

  // Spells based on Cult, power level, and archetype (RQG Core Rules Chapters 4, 11, 12, 13)
  const spiritMagic = [];
  const runeMagic = [];
  const cult1Obj = rulesData.cults?.[cult1Name] || {};
  const cultSpiritPool = cult1Obj.spiritMagic || [];
  const cultRunePool = cult1Obj.specialRuneMagic || [];

  const spiritCount = powerLevel.id === 'novice' ? 2 : (powerLevel.id === 'veteran' ? 3 : 4);
  const varRank = powerLevel.id === 'novice' ? 1 : (powerLevel.id === 'master' ? 4 : (powerLevel.id === 'elite' ? 3 : 2));

  cultSpiritPool.slice(0, spiritCount).forEach(sp => {
    const pts = typeof sp.points === 'number' ? sp.points : varRank;
    spiritMagic.push({ name: sp.name, points: pts });
  });

  if (spiritMagic.length === 0) {
    spiritMagic.push({ name: 'Heal', points: 2 }, { name: 'Protection', points: 2 });
  }

  if (powerLevel.id !== 'novice') {
    const runeCount = powerLevel.id === 'veteran' ? 2 : (powerLevel.id === 'elite' ? 3 : 4);
    cultRunePool.slice(0, runeCount).forEach(spName => {
      const meta = rulesData.specialRuneMagicCatalog?.[spName];
      const costStr = meta ? `${meta.cost} pt${String(meta.cost) === '1' ? '' : 's'}` : '1 pt';
      runeMagic.push(`${spName} (${costStr})`);
    });
  }

  const appearance = APPEARANCES[Math.floor(Math.random() * APPEARANCES.length)];
  const maxHp = derived.totalHp;
  const maxMp = stats.POW;
  const initialRp = Math.min(12, powerLevel.rpDefault);

  return {
    id: 'npc-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    isSaved: false,
    name,
    age: 20 + Math.floor(Math.random() * 25),
    gender,
    homeland,
    tribe: homeland.includes('(') ? homeland.split('(')[1].replace(')', '') : 'Colymar',
    clan: 'Ernaldori',
    occupation: archetype.occupation,
    reputation: Math.max(5, Math.floor(Math.random() * 20) + (powerLevel.statMod * 5)),
    appearance,
    archetypeId: archetype.id,
    powerLevelId: powerLevel.id,

    // Cults
    cult1: {
      name: cult1Name,
      rank: cult1Rank,
      maxRp: initialRp,
      currentRp: initialRp
    },
    cult2: {
      name: cult2Name,
      rank: cult2Rank,
      maxRp: cult2Name ? Math.max(1, initialRp - 2) : 0,
      currentRp: cult2Name ? Math.max(1, initialRp - 2) : 0
    },

    // Characteristics
    stats,
    damageBonus: derived.damageBonus,
    sizSr: derived.sizSr,
    dexSr: derived.dexSr,
    meleeSr: derived.meleeSr,

    // Trackers
    totalHp: maxHp,
    currentHp: maxHp,
    totalMp: maxMp,
    currentMp: maxMp,

    // Hit Locations
    hitLocations,

    // Skills, Magic, Weapons
    skills,
    spiritMagic,
    runeMagic,
    meleeWeapons,
    missileWeapons,
    equipment: 'Bronze dagger, waterskin, 1 week trail rations, flint & firestriker, bedroll, 15 Lunars, 20 Clacks.'
  };
}
