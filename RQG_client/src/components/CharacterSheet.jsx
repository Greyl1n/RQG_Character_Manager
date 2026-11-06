import React, { useState } from 'react';
import {
  Heart, Zap, Shield, Sparkles, Sword, Crosshair, Award,
  Dice5, RotateCcw, AlertTriangle, CheckCircle, Flame, Droplets,
  Wind, Moon, Compass, Plus, Trash2, Edit3, Save, Printer,
  ArrowUpCircle, CheckSquare, Square
} from 'lucide-react';
import rulesData from '../data/rqgRulesData.json';
import {
  calculateCategoryModifiers,
  calculateDerivedAttributes,
  evaluateD100Roll,
  getSkillCategoryForName,
  rollSkillExperience
} from '../utils/rqgRulesEngine';

export default function CharacterSheet({
  character,
  onUpdateCharacter,
  onOpenDiceRoller,
  onPrint
}) {
  const [activeTab, setActiveTab] = useState('characteristics');
  const [filterSkillCat, setFilterSkillCat] = useState('All');
  const [searchSkill, setSearchSkill] = useState('');
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillVal, setNewSkillVal] = useState(25);
  const [newPassionName, setNewPassionName] = useState('');
  const [newPassionVal, setNewPassionVal] = useState(60);
  const [expGainMode, setExpGainMode] = useState('1d6');
  const [expLogMessages, setExpLogMessages] = useState([]);
  const [draftCatMods, setDraftCatMods] = useState({});
  const [selectedNewRuneSpell, setSelectedNewRuneSpell] = useState('');
  const [customRuneSpellName, setCustomRuneSpellName] = useState('');
  const [selectedNewSpiritSpell, setSelectedNewSpiritSpell] = useState('');
  const [newSpiritSpellPoints, setNewSpiritSpellPoints] = useState(2);
  const [customSpiritSpellName, setCustomSpiritSpellName] = useState('');

  // Derived stats live recalculation (Rulebook + House Rule Editable Category Modifiers)
  const rulebookCatMods = calculateCategoryModifiers(character.stats);
  const catMods = calculateCategoryModifiers(character.stats, character.customCategoryMods);
  const derivedLive = calculateDerivedAttributes(character.stats);
  const hasCustomCatMods = Object.keys(character.customCategoryMods || {}).length > 0;

  // Edit a Skill Category Bonus directly (updates customCategoryMods and adjusts all skills in that category by the delta)
  const handleCategoryModChange = (cat, rawVal) => {
    setDraftCatMods(prev => ({ ...prev, [cat]: rawVal }));
    if (rawVal === '' || rawVal === '-') return;
    const parsed = parseInt(rawVal, 10);
    if (Number.isNaN(parsed)) return;

    const oldMod = catMods[cat] || 0;
    const delta = parsed - oldMod;
    const updatedSkills = { ...(character.skills || {}) };

    if (delta !== 0) {
      Object.keys(updatedSkills).forEach(skName => {
        if (getSkillCategoryForName(skName) === cat) {
          updatedSkills[skName] = Math.max(0, (updatedSkills[skName] || 0) + delta);
        }
      });
    }

    onUpdateCharacter({
      ...character,
      customCategoryMods: {
        ...(character.customCategoryMods || {}),
        [cat]: parsed
      },
      skills: updatedSkills
    });
  };

  const handleCategoryModBlur = (cat) => {
    setDraftCatMods(prev => {
      const next = { ...prev };
      delete next[cat];
      return next;
    });
  };

  // Reset a single category bonus (or all category bonuses) back to rulebook calculation
  const handleResetCategoryMods = (targetCat = null) => {
    const nextCustom = { ...(character.customCategoryMods || {}) };
    const updatedSkills = { ...(character.skills || {}) };

    const catsToReset = targetCat ? [targetCat] : Object.keys(rulebookCatMods);
    catsToReset.forEach(cat => {
      if (nextCustom[cat] !== undefined) {
        const oldMod = catMods[cat] || 0;
        const ruleMod = rulebookCatMods[cat] || 0;
        const delta = ruleMod - oldMod;
        delete nextCustom[cat];
        if (delta !== 0) {
          Object.keys(updatedSkills).forEach(skName => {
            if (getSkillCategoryForName(skName) === cat) {
              updatedSkills[skName] = Math.max(0, (updatedSkills[skName] || 0) + delta);
            }
          });
        }
      }
    });

    setDraftCatMods({});
    onUpdateCharacter({
      ...character,
      customCategoryMods: nextCustom,
      skills: updatedSkills
    });
  };

  const handleStatChange = (stat, delta) => {
    const oldStats = character.stats || { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 10, CHA: 10 };
    const newStats = {
      ...oldStats,
      [stat]: Math.max(1, (oldStats[stat] || 10) + delta)
    };
    const derived = calculateDerivedAttributes(newStats);
    const oldEffectiveMods = calculateCategoryModifiers(oldStats, character.customCategoryMods);
    const newEffectiveMods = calculateCategoryModifiers(newStats, character.customCategoryMods);

    // Update skills by non-overridden category modifier deltas (+ DEX*2 for Dodge, DEX*3 for Jump)
    const dexDelta = (newStats.DEX || 10) - (oldStats.DEX || 10);
    const updatedSkills = { ...(character.skills || {}) };
    Object.keys(updatedSkills).forEach(skName => {
      const cat = getSkillCategoryForName(skName);
      const catDelta = (newEffectiveMods[cat] || 0) - (oldEffectiveMods[cat] || 0);
      let baseDelta = 0;
      if (skName === 'Dodge') baseDelta = dexDelta * 2;
      else if (skName === 'Jump') baseDelta = dexDelta * 3;
      if (catDelta !== 0 || baseDelta !== 0) {
        updatedSkills[skName] = Math.max(0, (updatedSkills[skName] || 0) + catDelta + baseDelta);
      }
    });

    // Update Hit Location max HPs while preserving armor and clamping current HP
    const updatedHitLocations = {};
    Object.entries(character.hitLocations || derived.hitLocations).forEach(([locName, locData]) => {
      const newMax = derived.hitLocations[locName]?.maxHp ?? locData.maxHp;
      updatedHitLocations[locName] = {
        ...locData,
        maxHp: newMax,
        currentHp: Math.min(locData.currentHp ?? newMax, newMax)
      };
    });

    onUpdateCharacter({
      ...character,
      stats: newStats,
      skills: updatedSkills,
      totalHp: derived.totalHp,
      currentHp: Math.min(character.currentHp, derived.totalHp),
      totalMp: newStats.POW,
      currentMp: Math.min(character.currentMp, newStats.POW),
      damageBonus: derived.damageBonus,
      spiritCombatDamage: derived.spiritCombatDamage,
      healingRate: derived.healingRate,
      maxEnc: derived.maxEnc,
      meleeSr: derived.meleeSr,
      dexSr: derived.dexSr,
      sizSr: derived.sizSr,
      hitLocations: updatedHitLocations
    });
  };

  const handleHpChange = (delta) => {
    onUpdateCharacter({
      ...character,
      currentHp: Math.max(0, Math.min(character.totalHp, (character.currentHp || 0) + delta))
    });
  };

  const handleMpChange = (delta) => {
    onUpdateCharacter({
      ...character,
      currentMp: Math.max(0, Math.min(character.totalMp, (character.currentMp || 0) + delta))
    });
  };

  const handleRpChange = (delta) => {
    onUpdateCharacter({
      ...character,
      currentRp: Math.max(0, Math.min(character.runePoints || 3, (character.currentRp || 0) + delta))
    });
  };

  const handleHitLocationDamage = (locationKey, delta) => {
    const loc = character.hitLocations[locationKey];
    if (!loc) return;
    const updated = {
      ...character.hitLocations,
      [locationKey]: {
        ...loc,
        currentHp: Math.max(0, Math.min(loc.maxHp, loc.currentHp + delta))
      }
    };
    onUpdateCharacter({
      ...character,
      hitLocations: updated
    });
  };

  const handleSkillRoll = (skillName, value) => {
    onOpenDiceRoller({
      label: `${skillName} Check`,
      target: value,
      type: 'd100'
    });
  };

  const handleRuneRoll = (runeName, value) => {
    onOpenDiceRoller({
      label: `${runeName} Rune Check / Augment`,
      target: value,
      type: 'd100'
    });
  };

  const handlePassionRoll = (passionName, value) => {
    onOpenDiceRoller({
      label: `${passionName} Passion Inspiration`,
      target: value,
      type: 'd100'
    });
  };

  // Add custom skill
  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    onUpdateCharacter({
      ...character,
      skills: {
        ...character.skills,
        [newSkillName.trim()]: parseInt(newSkillVal) || 20
      }
    });
    setNewSkillName('');
  };

  // Directly edit any skill %
  const handleUpdateSkillValue = (skillName, newVal) => {
    const parsed = Math.max(0, parseInt(newVal, 10) || 0);
    onUpdateCharacter({
      ...character,
      skills: {
        ...character.skills,
        [skillName]: parsed
      }
    });
  };

  // Delete a skill
  const handleDeleteSkill = (skillName) => {
    const nextSkills = { ...(character.skills || {}) };
    delete nextSkills[skillName];
    const nextChecked = { ...(character.checkedSkills || {}) };
    delete nextChecked[skillName];
    onUpdateCharacter({
      ...character,
      skills: nextSkills,
      checkedSkills: nextChecked
    });
  };

  // Toggle skill experience checkmark
  const handleToggleSkillCheck = (skillName) => {
    const currentChecked = character.checkedSkills || {};
    onUpdateCharacter({
      ...character,
      checkedSkills: {
        ...currentChecked,
        [skillName]: !currentChecked[skillName]
      }
    });
  };

  // Roll RQG Experience Level-Up for a single skill (Core Rules p. 415)
  const handleLevelUpSingleSkill = (skillName) => {
    const currentVal = character.skills?.[skillName] ?? 0;
    const cat = getSkillCategoryForName(skillName);
    const catMod = catMods[cat] || 0;
    const res = rollSkillExperience(currentVal, catMod, expGainMode);

    const nextChecked = { ...(character.checkedSkills || {}) };
    delete nextChecked[skillName];

    onUpdateCharacter({
      ...character,
      skills: {
        ...character.skills,
        [skillName]: res.newSkill
      },
      checkedSkills: nextChecked
    });

    setExpLogMessages(prev => [`[${skillName}] ${res.summary}`, ...prev.slice(0, 9)]);
  };

  // Roll RQG Experience Level-Up for ALL checked skills at once
  const handleLevelUpCheckedSkills = () => {
    const checkedEntries = Object.entries(character.checkedSkills || {}).filter(([, isChecked]) => isChecked);
    if (checkedEntries.length === 0) return;

    const updatedSkills = { ...(character.skills || {}) };
    const newLogs = [];

    checkedEntries.forEach(([skName]) => {
      if (updatedSkills[skName] !== undefined) {
        const currentVal = updatedSkills[skName];
        const cat = getSkillCategoryForName(skName);
        const catMod = catMods[cat] || 0;
        const res = rollSkillExperience(currentVal, catMod, expGainMode);
        updatedSkills[skName] = res.newSkill;
        newLogs.push(`[${skName}] ${res.summary}`);
      }
    });

    onUpdateCharacter({
      ...character,
      skills: updatedSkills,
      checkedSkills: {}
    });

    setExpLogMessages(prev => [...newLogs, ...prev].slice(0, 15));
  };

  // Add custom passion
  const handleAddPassion = () => {
    if (!newPassionName.trim()) return;
    const updated = [...(character.passions || []), { name: newPassionName.trim(), value: parseInt(newPassionVal) || 60 }];
    onUpdateCharacter({
      ...character,
      passions: updated
    });
    setNewPassionName('');
  };

  // Resolve matching Rune Affinity % for casting a Rune Spell (RQG Core Rules p. 313)
  const getRuneSpellTargetPct = (spellRune) => {
    const runes = character.runes || {};
    const cultObj = rulesData.cults?.[character.cult] || {};
    const cultRunes = cultObj.runes || [];

    if (spellRune && spellRune !== 'Any') {
      if (runes[spellRune] !== undefined && runes[spellRune] > 0) {
        return runes[spellRune];
      }
      if (spellRune.includes('/')) {
        const parts = spellRune.split('/').map(p => p.trim());
        const candidates = parts.map(p => (p === 'Sky' || p === 'Fire' ? (runes['Fire/Sky'] || 0) : (runes[p] || 0)));
        const bestPart = Math.max(...candidates);
        if (bestPart > 0) return bestPart;
      }
    }

    // Fallback to highest Cult Rune Affinity %, then highest overall Rune Affinity %
    let bestCult = 0;
    cultRunes.forEach(r => {
      if ((runes[r] || 0) > bestCult) bestCult = runes[r];
    });
    if (bestCult > 0) return bestCult;

    const allVals = Object.values(runes).filter(v => typeof v === 'number');
    return allVals.length > 0 ? Math.max(...allVals) : 60;
  };

  // Add Special Rune Spell
  const handleAddRuneSpell = (spellName) => {
    const trimmed = (spellName || '').trim();
    if (!trimmed) return;
    const current = character.runeMagic || [];
    if (current.includes(trimmed)) return;
    onUpdateCharacter({
      ...character,
      runeMagic: [...current, trimmed]
    });
    setSelectedNewRuneSpell('');
    setCustomRuneSpellName('');
  };

  // Remove Special Rune Spell
  const handleRemoveRuneSpell = (spellName) => {
    onUpdateCharacter({
      ...character,
      runeMagic: (character.runeMagic || []).filter(s => s !== spellName)
    });
  };

  // Add Spirit Magic Spell
  const handleAddSpiritSpell = (spellName, pts) => {
    const trimmed = (spellName || '').trim();
    if (!trimmed) return;
    const catEntry = rulesData.spiritMagicCatalog?.[trimmed];
    let finalPts = parseInt(pts, 10);
    if (Number.isNaN(finalPts) || finalPts < 1) {
      finalPts = catEntry && typeof catEntry.points === 'number' ? catEntry.points : 2;
    }
    const current = [...(character.spiritMagic || [])];
    const existingIdx = current.findIndex(s => s.name.toLowerCase() === trimmed.toLowerCase());
    if (existingIdx >= 0) {
      current[existingIdx] = { ...current[existingIdx], points: finalPts };
    } else {
      current.push({ name: trimmed, points: finalPts });
    }
    onUpdateCharacter({
      ...character,
      spiritMagic: current
    });
    setSelectedNewSpiritSpell('');
    setCustomSpiritSpellName('');
  };

  // Update Spirit Magic Spell Points
  const handleUpdateSpiritSpellPoints = (spellName, newPts) => {
    const parsed = Math.max(1, parseInt(newPts, 10) || 1);
    onUpdateCharacter({
      ...character,
      spiritMagic: (character.spiritMagic || []).map(sp =>
        sp.name === spellName ? { ...sp, points: parsed } : sp
      )
    });
  };

  // Remove Spirit Magic Spell
  const handleRemoveSpiritSpell = (spellName) => {
    onUpdateCharacter({
      ...character,
      spiritMagic: (character.spiritMagic || []).filter(sp => sp.name !== spellName)
    });
  };

  // Filter skills
  const skillsList = Object.entries(character.skills || {})
    .filter(([sk]) => {
      if (searchSkill && !sk.toLowerCase().includes(searchSkill.toLowerCase())) return false;
      if (filterSkillCat !== 'All') {
        return getSkillCategoryForName(sk) === filterSkillCat;
      }
      return true;
    })
    .sort(([a], [b]) => a.localeCompare(b));

  const checkedCount = Object.values(character.checkedSkills || {}).filter(Boolean).length;

  return (
    <div className="sheet-container">
      {/* Top Hero Banner */}
      <div className="sheet-hero card">
        <div className="hero-info-grid">
          <div className="hero-main">
            <h1 className="hero-name gold-text">{character.name}</h1>
            <div className="hero-tags">
              <span className="badge badge-accent">{character.homeland}</span>
              {character.occupation && <span className="badge badge-info">{character.occupation}</span>}
              <span className="badge badge-primary">Cult of {character.cult}</span>
              <span className="badge badge-outline">{character.gender}, Age {character.age}</span>
            </div>
            {character.heirloom && (
              <p className="hero-heirloom small-text">
                <Sparkles size={14} className="gold-text inline-icon" /> <strong>Heirloom:</strong> {character.heirloom}
              </p>
            )}
          </div>

          <div className="hero-trackers">
            {/* HP Tracker */}
            <div className="vital-tracker tracker-hp">
              <div className="vital-label">
                <Heart size={16} /> HP: {character.currentHp} / {character.totalHp}
              </div>
              <div className="vital-bar">
                <div
                  className="vital-bar-fill fill-hp"
                  style={{ width: `${Math.round((character.currentHp / character.totalHp) * 100)}%` }}
                />
              </div>
              <div className="tracker-btns">
                <button className="btn-tiny" onClick={() => handleHpChange(-1)}>-1</button>
                <button className="btn-tiny" onClick={() => handleHpChange(1)}>+1</button>
                <button className="btn-tiny" onClick={() => onUpdateCharacter({ ...character, currentHp: character.totalHp })}>Full</button>
              </div>
            </div>

            {/* MP Tracker */}
            <div className="vital-tracker tracker-mp">
              <div className="vital-label">
                <Zap size={16} /> MP: {character.currentMp} / {character.totalMp}
              </div>
              <div className="vital-bar">
                <div
                  className="vital-bar-fill fill-mp"
                  style={{ width: `${Math.round((character.currentMp / character.totalMp) * 100)}%` }}
                />
              </div>
              <div className="tracker-btns">
                <button className="btn-tiny" onClick={() => handleMpChange(-1)}>-1</button>
                <button className="btn-tiny" onClick={() => handleMpChange(1)}>+1</button>
                <button className="btn-tiny" onClick={() => onUpdateCharacter({ ...character, currentMp: character.totalMp })}>Full</button>
              </div>
            </div>

            {/* Rune Points Tracker */}
            <div className="vital-tracker tracker-rp">
              <div className="vital-label">
                <Flame size={16} /> RP: {character.currentRp || character.runePoints || 3} / {character.runePoints || 3}
              </div>
              <div className="vital-bar">
                <div
                  className="vital-bar-fill fill-rp"
                  style={{ width: `${Math.round(((character.currentRp || 3) / (character.runePoints || 3)) * 100)}%` }}
                />
              </div>
              <div className="tracker-btns">
                <button className="btn-tiny" onClick={() => handleRpChange(-1)}>-1</button>
                <button className="btn-tiny" onClick={() => handleRpChange(1)}>+1</button>
                <button className="btn-tiny" onClick={() => onUpdateCharacter({ ...character, currentRp: character.runePoints || 3 })}>Full</button>
              </div>
            </div>
          </div>
        </div>

        {/* Combat Quick Bar */}
        <div className="quick-combat-bar">
          <div className="quick-combat-item">
            <span className="q-label">Damage Bonus</span>
            <span className="q-val gold-text">{character.damageBonus || derivedLive.damageBonus || 'None'}</span>
          </div>
          <div className="quick-combat-item">
            <span className="q-label">Melee Strike Rank</span>
            <span className="q-val gold-text">{character.meleeSr ?? derivedLive.meleeSr} (DEX {character.dexSr ?? derivedLive.dexSr} / SIZ {character.sizSr ?? derivedLive.sizSr})</span>
          </div>
          <div className="quick-combat-item">
            <span className="q-label">Healing Rate</span>
            <span className="q-val">{character.healingRate ?? derivedLive.healingRate} HP / wk</span>
          </div>
          <div className="quick-combat-item">
            <span className="q-label">Spirit Dmg</span>
            <span className="q-val">{character.spiritCombatDamage || derivedLive.spiritCombatDamage}</span>
          </div>
          <div className="quick-combat-item">
            <span className="q-label">Max ENC</span>
            <span className="q-val">{character.maxEnc ?? derivedLive.maxEnc}</span>
          </div>
          <div className="quick-combat-item">
            <span className="q-label">Reputation</span>
            <span className="q-val">{character.reputation || 15}%</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onPrint}>
            <Printer size={16} /> Print Sheet
          </button>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="sheet-nav-tabs">
        <button
          className={`sheet-tab ${activeTab === 'characteristics' ? 'active' : ''}`}
          onClick={() => setActiveTab('characteristics')}
        >
          Characteristics & Runes
        </button>
        <button
          className={`sheet-tab ${activeTab === 'combat' ? 'active' : ''}`}
          onClick={() => setActiveTab('combat')}
        >
          Combat & Hit Locations
        </button>
        <button
          className={`sheet-tab ${activeTab === 'skills' ? 'active' : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          Skills ({Object.keys(character.skills || {}).length})
        </button>
        <button
          className={`sheet-tab ${activeTab === 'magic' ? 'active' : ''}`}
          onClick={() => setActiveTab('magic')}
        >
          Spells & Grimoire
        </button>
        <button
          className={`sheet-tab ${activeTab === 'passions' ? 'active' : ''}`}
          onClick={() => setActiveTab('passions')}
        >
          Passions & Lore
        </button>
      </div>

      {/* Tab: Characteristics & Runes */}
      {activeTab === 'characteristics' && (
        <div className="tab-pane characteristics-pane">
          <div className="grid-2-col">
            {/* Characteristics Grid */}
            <div className="card">
              <h3 className="card-title gold-text">Characteristics (Stats)</h3>
              <div className="stats-interactive-grid">
                {['STR', 'CON', 'SIZ', 'DEX', 'INT', 'POW', 'CHA'].map(st => (
                  <div key={st} className="stat-interactive-card">
                    <div className="stat-name">{st}</div>
                    <div className="stat-number gold-text">{character.stats[st] || 10}</div>
                    <div className="stat-controls">
                      <button className="btn-tiny" onClick={() => handleStatChange(st, -1)}>-</button>
                      <button className="btn-tiny" onClick={() => handleStatChange(st, 1)}>+</button>
                    </div>
                    <button
                      className="btn-tiny btn-roll"
                      onClick={() => handleSkillRoll(`${st} Characteristic x5 Check`, (character.stats[st] || 10) * 5)}
                    >
                      Roll ×5 ({(character.stats[st] || 10) * 5}%)
                    </button>
                  </div>
                ))}
              </div>

              {/* Skill Category Modifiers (Editable for House Rules) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <h4 className="gold-text" style={{ margin: 0 }}>Skill Category Modifiers (Editable)</h4>
                {hasCustomCatMods && (
                  <button
                    type="button"
                    className="btn-tiny"
                    onClick={() => handleResetCategoryMods()}
                    title="Reset all category bonuses to RQG rulebook calculation"
                  >
                    <RotateCcw size={12} className="inline-icon" /> Reset to Rulebook
                  </button>
                )}
              </div>
              <p className="small-text text-muted" style={{ margin: '2px 0 6px 0' }}>
                Calculated from Characteristics per RQG rulebook. Edit any bonus for house rules — skills in that category adjust automatically.
              </p>
              <div className="category-mods-row">
                {Object.entries(catMods).map(([cat, mod]) => {
                  const isCustom = character.customCategoryMods?.[cat] !== undefined && mod !== rulebookCatMods[cat];
                  const displayVal = draftCatMods[cat] !== undefined ? draftCatMods[cat] : mod;
                  return (
                    <div key={cat} className={`cat-mod-pill ${isCustom ? 'is-custom' : ''}`}>
                      <span className="cat-name">{cat}</span>
                      <div className="cat-mod-input-wrap">
                        <input
                          type="number"
                          className={`cat-mod-input ${mod >= 0 ? 'pos' : 'neg'}`}
                          value={displayVal}
                          onChange={e => handleCategoryModChange(cat, e.target.value)}
                          onBlur={() => handleCategoryModBlur(cat)}
                          title={`Edit ${cat} Category Bonus % (Rulebook: ${rulebookCatMods[cat] >= 0 ? `+${rulebookCatMods[cat]}%` : `${rulebookCatMods[cat]}%`})`}
                        />
                        <span className={`cat-val ${mod >= 0 ? 'pos' : 'neg'}`}>%</span>
                      </div>
                      {isCustom && (
                        <button
                          type="button"
                          className="btn-tiny"
                          style={{ padding: '1px 4px', fontSize: '0.7rem' }}
                          onClick={() => handleResetCategoryMods(cat)}
                          title={`Reset ${cat} to rulebook value (${rulebookCatMods[cat] >= 0 ? `+${rulebookCatMods[cat]}%` : `${rulebookCatMods[cat]}%`})`}
                        >
                          ↺
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Runes Affinities */}
            <div className="card">
              <h3 className="card-title gold-text">Rune Affinities</h3>
              <p className="small-text text-muted">Click any rune to roll an augment or divine manifestation test.</p>

              {/* Elemental Runes */}
              <h4 className="gold-text mt-2">Elemental Runes</h4>
              <div className="runes-click-grid">
                {['Air', 'Earth', 'Fire/Sky', 'Darkness', 'Water', 'Moon'].map(elem => {
                  const val = character.runes?.[elem] || 0;
                  return (
                    <div
                      key={elem}
                      className={`rune-click-card ${val >= 50 ? 'high-affinity' : ''}`}
                      onClick={() => handleRuneRoll(elem, val)}
                    >
                      <div className="rune-name">{elem}</div>
                      <div className="rune-percentage">{val}%</div>
                      <div className="small-text text-muted">Click to Roll</div>
                    </div>
                  );
                })}
              </div>

              {/* Power / Form Runes */}
              <h4 className="gold-text mt-4">Power & Form Runes</h4>
              <div className="power-runes-table">
                {[
                  ['Movement', 'Stasis'],
                  ['Death', 'Fertility'],
                  ['Truth', 'Illusion'],
                  ['Harmony', 'Disorder'],
                  ['Man', 'Beast']
                ].map(([r1, r2]) => (
                  <div key={r1} className="power-pair-interactive">
                    <button
                      className="power-btn"
                      onClick={() => handleRuneRoll(r1, character.runes?.[r1] || 50)}
                    >
                      {r1} {character.runes?.[r1] || 50}%
                    </button>
                    <div className="power-bar-wrap">
                      <div
                        className="power-bar-fill"
                        style={{ width: `${character.runes?.[r1] || 50}%` }}
                      />
                    </div>
                    <button
                      className="power-btn"
                      onClick={() => handleRuneRoll(r2, character.runes?.[r2] || 50)}
                    >
                      {character.runes?.[r2] || 50}% {r2}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Combat & Hit Locations */}
      {activeTab === 'combat' && (
        <div className="tab-pane combat-pane">
          <div className="grid-2-col">
            {/* Hit Locations Model */}
            <div className="card">
              <h3 className="card-title gold-text">Body Hit Locations (D20 Table)</h3>
              <p className="small-text text-muted">Track specific wounds and armor points by body location.</p>

              <div className="hit-locations-list">
                {character.hitLocations && Object.entries(character.hitLocations).map(([locName, data]) => {
                  const isWounded = data.currentHp < data.maxHp;
                  const isSevered = data.currentHp <= 0;
                  return (
                    <div key={locName} className={`hit-loc-row ${isSevered ? 'severed' : isWounded ? 'wounded' : ''}`}>
                      <div className="hit-loc-info">
                        <span className="hit-loc-range badge badge-outline">{data.range}</span>
                        <strong className="hit-loc-name">{locName}</strong>
                      </div>
                      <div className="hit-loc-ap">
                        <Shield size={14} className="gold-text inline-icon" /> Armor: <strong>{data.armor} AP</strong>
                      </div>
                      <div className="hit-loc-hp-ctrl">
                        <button className="btn-tiny" onClick={() => handleHitLocationDamage(locName, -1)}>-1</button>
                        <span className="hit-hp-val">
                          {data.currentHp} / {data.maxHp} HP
                        </span>
                        <button className="btn-tiny" onClick={() => handleHitLocationDamage(locName, 1)}>+1</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="combat-actions-bar mt-4">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    onOpenDiceRoller({
                      label: 'Hit Location Check (D20)',
                      type: 'hitLocation'
                    });
                  }}
                >
                  <Crosshair size={16} /> Roll Random Hit Location (D20)
                </button>
              </div>
            </div>

            {/* Equipped Weapons & Shields */}
            <div className="card">
              <h3 className="card-title gold-text">Weapons & Shield Arsenal</h3>
              <p className="small-text text-muted">Click any weapon attack or parry to roll instantly against target skill.</p>

              <div className="weapons-table">
                {rulesData.weapons.slice(0, 8).map(wp => {
                  const skillKey = Object.keys(character.skills || {}).find(k => k.includes(wp.name.split(' ')[0])) || wp.name;
                  const skillRating = character.skills?.[skillKey] || (wp.base + (catMods.Manipulation || 0));
                  return (
                    <div key={wp.name} className="weapon-card">
                      <div className="weapon-header">
                        <strong>{wp.name}</strong>
                        <span className="badge badge-accent small">{wp.category}</span>
                      </div>
                      <div className="weapon-stats-row">
                        <span>Dmg: <strong>{wp.damage} {character.damageBonus !== 'None' ? character.damageBonus : ''}</strong></span>
                        <span>SR: <strong>{(character.meleeSr || 4) + (typeof wp.sr === 'number' ? wp.sr : 0)}</strong></span>
                        <span>HP: <strong>{wp.hp}</strong></span>
                        <span>ENC: <strong>{wp.enc}</strong></span>
                      </div>
                      <div className="weapon-actions">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleSkillRoll(`${wp.name} Attack`, skillRating)}
                        >
                          <Sword size={14} /> Attack ({skillRating}%)
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleSkillRoll(`${wp.name} Parry`, skillRating)}
                        >
                          <Shield size={14} /> Parry ({skillRating}%)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Skills */}
      {activeTab === 'skills' && (
        <div className="tab-pane skills-pane">
          <div className="card">
            {/* Experience Level-Up Bar (RQG Core Rules p. 415) */}
            <div className="card card-subtle mb-4" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div>
                  <h4 className="gold-text" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ArrowUpCircle size={18} /> Skill Experience & Level-Up (RQG Rules)
                  </h4>
                  <p className="small-text text-muted" style={{ margin: '2px 0 0 0' }}>
                    Experience Roll: <strong>1D100 + Category Modifier &gt; Current Skill %</strong> (or roll 100) increases skill by <strong>+1D6%</strong> or flat <strong>+3%</strong>. You can also edit any skill % directly!
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <label className="small-text font-bold text-muted">Gain Rule:</label>
                  <select
                    value={expGainMode}
                    onChange={e => setExpGainMode(e.target.value)}
                    style={{ width: 'auto', padding: '5px 10px' }}
                  >
                    <option value="1d6">Roll +1D6% (Standard RQG)</option>
                    <option value="flat3">Flat +3% (Optional RQG)</option>
                  </select>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={checkedCount === 0}
                    onClick={handleLevelUpCheckedSkills}
                    title="Roll Experience Level-Up for all checked skills"
                  >
                    <ArrowUpCircle size={15} /> Level Up Checked ({checkedCount})
                  </button>

                  {checkedCount > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onUpdateCharacter({ ...character, checkedSkills: {} })}
                    >
                      Clear Checks
                    </button>
                  )}
                </div>
              </div>

              {expLogMessages.length > 0 && (
                <div className="mt-3" style={{ borderTop: '1px solid rgba(212,175,55,0.2)', paddingTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong className="small-text gold-text">Recent Experience Level-Up Rolls:</strong>
                    <button className="btn-tiny" onClick={() => setExpLogMessages([])}>Clear Log</button>
                  </div>
                  <div style={{ maxHeight: '110px', overflowY: 'auto', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {expLogMessages.map((msg, i) => (
                      <div key={i} style={{ color: msg.includes('✓') ? '#4ade80' : '#cbd5e1' }}>
                        {msg}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Editable Skill Category Modifiers Bar in Skills Tab */}
              <div style={{ borderTop: '1px solid rgba(212,175,55,0.2)', marginTop: '10px', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span className="small-text font-bold gold-text">
                    Skill Category Bonuses (Calculated from Stats — Editable for House Rules):
                  </span>
                  {hasCustomCatMods && (
                    <button
                      type="button"
                      className="btn-tiny"
                      onClick={() => handleResetCategoryMods()}
                      title="Reset all category bonuses to RQG rulebook calculation"
                    >
                      <RotateCcw size={12} className="inline-icon" /> Reset Category Bonuses to Rulebook
                    </button>
                  )}
                </div>
                <div className="category-mods-row">
                  {Object.entries(catMods).map(([cat, mod]) => {
                    const isCustom = character.customCategoryMods?.[cat] !== undefined && mod !== rulebookCatMods[cat];
                    const displayVal = draftCatMods[cat] !== undefined ? draftCatMods[cat] : mod;
                    return (
                      <div key={cat} className={`cat-mod-pill ${isCustom ? 'is-custom' : ''}`}>
                        <span className="cat-name">{cat}</span>
                        <div className="cat-mod-input-wrap">
                          <input
                            type="number"
                            className={`cat-mod-input ${mod >= 0 ? 'pos' : 'neg'}`}
                            value={displayVal}
                            onChange={e => handleCategoryModChange(cat, e.target.value)}
                            onBlur={() => handleCategoryModBlur(cat)}
                            title={`Edit ${cat} Category Bonus % (Rulebook: ${rulebookCatMods[cat] >= 0 ? `+${rulebookCatMods[cat]}%` : `${rulebookCatMods[cat]}%`})`}
                          />
                          <span className={`cat-val ${mod >= 0 ? 'pos' : 'neg'}`}>%</span>
                        </div>
                        {isCustom && (
                          <button
                            type="button"
                            className="btn-tiny"
                            style={{ padding: '1px 4px', fontSize: '0.7rem' }}
                            onClick={() => handleResetCategoryMods(cat)}
                            title={`Reset ${cat} to rulebook value (${rulebookCatMods[cat] >= 0 ? `+${rulebookCatMods[cat]}%` : `${rulebookCatMods[cat]}%`})`}
                          >
                            ↺
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="skills-toolbar">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search skills..."
                  value={searchSkill}
                  onChange={e => setSearchSkill(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="category-filter-buttons">
                {['All', 'Agility', 'Communication', 'Knowledge', 'Magic', 'Manipulation', 'Perception', 'Stealth'].map(cat => (
                  <button
                    key={cat}
                    className={`btn-filter ${filterSkillCat === cat ? 'active' : ''}`}
                    onClick={() => setFilterSkillCat(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="skills-grid">
              {skillsList.map(([skName, val]) => {
                const isChecked = !!(character.checkedSkills && character.checkedSkills[skName]);
                const cat = getSkillCategoryForName(skName);
                const catMod = catMods[cat] || 0;
                return (
                  <div key={skName} className="skill-item-card">
                    {/* Top Row: Experience Check + Full Skill Name + Category Badge */}
                    <div className="skill-card-top">
                      <div className="skill-card-title-group">
                        <button
                          type="button"
                          onClick={() => handleToggleSkillCheck(skName)}
                          style={{ background: 'none', border: 'none', color: isChecked ? '#d4af37' : '#64748b', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                          title="Mark experience check for Sacred Time Level-Up"
                        >
                          {isChecked ? <CheckSquare size={17} /> : <Square size={17} />}
                        </button>
                        <span className="skill-name" title={skName}>
                          {skName}
                        </span>
                      </div>
                      <span className="skill-cat-tag">
                        {cat} ({catMod >= 0 ? `+${catMod}%` : `${catMod}%`})
                      </span>
                    </div>

                    {/* Bottom Row: Editable Skill % + Roll D100 + Level Up + Delete */}
                    <div className="skill-card-controls">
                      <div className="skill-pct-input-wrap">
                        <input
                          type="number"
                          min="0"
                          max="300"
                          className="skill-pct-input"
                          value={val}
                          onChange={e => handleUpdateSkillValue(skName, e.target.value)}
                          title={`Directly edit ${skName} %`}
                        />
                        <span className="small-text gold-text font-bold">%</span>
                      </div>

                      <div className="skill-card-btns">
                        <button
                          type="button"
                          className="btn-skill-roll"
                          onClick={() => handleSkillRoll(skName, val)}
                          title={`Roll D100 for ${skName} (${val}%)`}
                        >
                          🎲 Roll
                        </button>

                        <button
                          type="button"
                          className="btn-skill-exp"
                          onClick={() => handleLevelUpSingleSkill(skName)}
                          title={`Level Up ${skName}: Roll 1D100 + ${catMod}% > ${val}% for ${expGainMode === 'flat3' ? '+3%' : '+1D6%'}`}
                        >
                          ⬆ Exp
                        </button>

                        <button
                          type="button"
                          className="btn-tiny"
                          onClick={() => handleDeleteSkill(skName)}
                          title={`Remove ${skName}`}
                          style={{ opacity: 0.6, padding: '2px 6px' }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Skill Addition */}
            <div className="add-skill-box card card-subtle mt-4">
              <h4 className="gold-text">Add Custom Skill</h4>
              <div className="form-inline">
                <input
                  type="text"
                  placeholder="Skill name (e.g. Lore (Red Goddess))"
                  value={newSkillName}
                  onChange={e => setNewSkillName(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Base %"
                  value={newSkillVal}
                  onChange={e => setNewSkillVal(e.target.value)}
                  style={{ width: '100px' }}
                />
                <button className="btn btn-primary" onClick={handleAddSkill}>
                  <Plus size={16} /> Add Skill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Magic */}
      {activeTab === 'magic' && (
        <div className="tab-pane magic-pane">
          <div className="grid-2-col">
            {/* Rune Magic */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <h3 className="card-title gold-text" style={{ marginBottom: 0 }}>
                  <Flame size={18} className="gold-text inline-icon" /> Rune Magic (RP: {character.currentRp ?? 3} / {character.runePoints || 3})
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="small-text text-muted">Max RP:</span>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={character.runePoints || 3}
                    onChange={e => {
                      const val = Math.max(1, parseInt(e.target.value, 10) || 3);
                      onUpdateCharacter({
                        ...character,
                        runePoints: val,
                        currentRp: Math.min(character.currentRp ?? val, val)
                      });
                    }}
                    style={{ width: '56px', padding: '2px 6px' }}
                    title="Maximum Rune Points"
                  />
                </div>
              </div>
              <p className="small-text text-muted mt-1">
                Requires Rune Points to cast and rolls against your matching <strong>Rune Affinity %</strong> (RQG p. 313). Common Rune Magic is known to all initiates; special spells are gifted by <strong>{character.cult}</strong>.
              </p>

              <h4 className="gold-text mt-3">Special Cult Spells ({character.runeMagic?.length || 0})</h4>
              <div className="spells-list">
                {character.runeMagic?.map(sp => {
                  const meta = rulesData.specialRuneMagicCatalog?.[sp] || {};
                  const costLabel = meta.cost || '1';
                  const numericCost = parseInt(String(costLabel), 10) || 1;
                  const spellRune = meta.rune || (rulesData.cults?.[character.cult]?.runes?.[0] || 'Any');
                  const targetPct = getRuneSpellTargetPct(spellRune);
                  return (
                    <div key={sp} className="spell-item-card">
                      <div style={{ flex: 1, paddingRight: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                          <strong>{sp}</strong>
                          <span className="badge badge-accent small">{costLabel} RP</span>
                          {meta.rune && <span className="badge badge-outline small">{meta.rune} ({targetPct}%)</span>}
                        </div>
                        {meta.description && (
                          <p className="small-text text-muted" style={{ marginTop: '4px', marginBottom: 0 }}>
                            {meta.description}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            handleRpChange(-numericCost);
                            handleRuneRoll(`Cast ${sp} (${spellRune})`, targetPct);
                          }}
                          title={`Spend ${numericCost} RP and roll D100 vs ${spellRune} Rune (${targetPct}%)`}
                        >
                          Cast (-{numericCost} RP)
                        </button>
                        <button
                          className="btn-skill-del"
                          onClick={() => handleRemoveRuneSpell(sp)}
                          title={`Remove ${sp}`}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
                {(!character.runeMagic || character.runeMagic.length === 0) && (
                  <p className="small-text text-muted italic">No special Rune spells learned yet.</p>
                )}
              </div>

              {/* Add Special Rune Spell Controls */}
              <div className="add-skill-bar card card-subtle mt-3" style={{ padding: '10px 12px' }}>
                <h5 className="gold-text" style={{ marginBottom: '6px' }}>Learn / Add Special Rune Spell</h5>
                <div className="form-inline" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <select
                    value={selectedNewRuneSpell}
                    onChange={e => {
                      const val = e.target.value;
                      setSelectedNewRuneSpell(val);
                      if (val) handleAddRuneSpell(val);
                    }}
                    style={{ flex: 1, minWidth: '210px' }}
                  >
                    <option value="">+ Select {character.cult} or Catalog Rune Spell...</option>
                    {rulesData.cults?.[character.cult]?.specialRuneMagic && (
                      <optgroup label={`${character.cult} Cult Special Spells`}>
                        {rulesData.cults[character.cult].specialRuneMagic.map(sp => {
                          const meta = rulesData.specialRuneMagicCatalog?.[sp];
                          return (
                            <option key={`cult-${sp}`} value={sp}>
                              {sp} ({meta ? `${meta.cost} RP, ${meta.rune}` : '1 RP'})
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                    {rulesData.specialRuneMagicCatalog && (
                      <optgroup label="All RQG Special Rune Spells (Associate / Other Cults)">
                        {Object.entries(rulesData.specialRuneMagicCatalog)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([sp, meta]) => (
                            <option key={`all-${sp}`} value={sp}>
                              {sp} ({meta.cost} RP — {meta.rune})
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                  <input
                    type="text"
                    placeholder="Or custom Rune spell..."
                    value={customRuneSpellName}
                    onChange={e => setCustomRuneSpellName(e.target.value)}
                    style={{ width: '170px' }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleAddRuneSpell(customRuneSpellName)}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>

              <h4 className="gold-text mt-4">Common Rune Magic (All 12 Core Spells)</h4>
              <div className="spells-list">
                {rulesData.commonRuneSpells.map(sp => {
                  const numericCost = parseInt(String(sp.cost), 10) || 1;
                  const targetPct = getRuneSpellTargetPct('Any');
                  return (
                    <div key={sp.name} className="spell-item-card">
                      <div style={{ flex: 1, paddingRight: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong>{sp.name}</strong>
                          <span className="badge badge-outline small">{sp.cost} RP</span>
                        </div>
                        <p className="small-text text-muted" style={{ marginTop: '4px', marginBottom: 0 }}>
                          {sp.description}
                        </p>
                      </div>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          handleRpChange(-numericCost);
                          handleRuneRoll(`Cast ${sp.name}`, targetPct);
                        }}
                        title={`Spend ${numericCost} RP and roll D100 vs Cult Rune (${targetPct}%)`}
                      >
                        Cast (-{numericCost} RP)
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Spirit Magic */}
            <div className="card">
              <h3 className="card-title gold-text">
                <Zap size={18} className="gold-text inline-icon" /> Spirit Magic (MP: {character.currentMp} / {character.totalMp})
              </h3>
              <p className="small-text text-muted">
                Casting costs Magic Points, rolls against <strong>POW×5 ({character.stats.POW * 5}%)</strong>, and takes 1 Strike Rank per MP spent above 1. Free INT Limit: <strong>{character.freeInt ?? character.stats.INT} pts</strong>.
              </p>

              <div className="spells-list">
                {character.spiritMagic?.map(sp => {
                  const catInfo = rulesData.spiritMagicCatalog?.[sp.name];
                  const pt = typeof sp.points === 'number' ? sp.points : (parseInt(sp.points, 10) || 2);
                  return (
                    <div key={sp.name} className="spell-item-card">
                      <div style={{ flex: 1, paddingRight: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                          <strong>{sp.name}</strong>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={pt}
                              onChange={e => handleUpdateSpiritSpellPoints(sp.name, e.target.value)}
                              style={{ width: '48px', padding: '1px 4px', textAlign: 'center', fontSize: '0.8rem' }}
                              title="Edit Spirit Magic point rank"
                            />
                            <span className="badge badge-info small">pt</span>
                          </div>
                          {catInfo && (
                            <span className="small-text text-muted">
                              ({catInfo.range}, {catInfo.duration}, {catInfo.type})
                            </span>
                          )}
                        </div>
                        {catInfo?.description && (
                          <p className="small-text text-muted" style={{ marginTop: '4px', marginBottom: 0 }}>
                            {catInfo.description}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            handleMpChange(-pt);
                            handleSkillRoll(`Cast ${sp.name} (${pt} pt)`, character.stats.POW * 5);
                          }}
                          title={`Spend ${pt} MP and roll D100 vs POW×5 (${character.stats.POW * 5}%)`}
                        >
                          Cast (-{pt} MP)
                        </button>
                        <button
                          className="btn-skill-del"
                          onClick={() => handleRemoveSpiritSpell(sp.name)}
                          title={`Remove ${sp.name}`}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
                {(!character.spiritMagic || character.spiritMagic.length === 0) && (
                  <p className="small-text text-muted italic">No Spirit Magic spells learned yet.</p>
                )}
              </div>

              {/* Add Spirit Magic Spell Controls */}
              <div className="add-skill-bar card card-subtle mt-3" style={{ padding: '10px 12px' }}>
                <h5 className="gold-text" style={{ marginBottom: '6px' }}>Learn / Add Spirit Magic Spell</h5>
                <div className="form-inline" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={selectedNewSpiritSpell}
                    onChange={e => {
                      const val = e.target.value;
                      setSelectedNewSpiritSpell(val);
                      if (val) {
                        const catEntry = rulesData.spiritMagicCatalog?.[val];
                        const defaultPts = catEntry && typeof catEntry.points === 'number' ? catEntry.points : 2;
                        setNewSpiritSpellPoints(defaultPts);
                      }
                    }}
                    style={{ flex: 1, minWidth: '200px' }}
                  >
                    <option value="">+ Select Cult or Catalog Spirit Spell...</option>
                    {rulesData.cults?.[character.cult]?.spiritMagic && (
                      <optgroup label={`${character.cult} Cult Spirit Magic`}>
                        {rulesData.cults[character.cult].spiritMagic.map(sp => (
                          <option key={`cult-sp-${sp.name}`} value={sp.name}>
                            {sp.name} ({sp.points === 'var' ? 'Variable pts' : `${sp.points} pt`})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {rulesData.spiritMagicCatalog && (
                      <optgroup label="All RQG Spirit Magic Spells (41 Core Spells)">
                        {Object.entries(rulesData.spiritMagicCatalog)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([spName, info]) => (
                            <option key={`all-sp-${spName}`} value={spName}>
                              {spName} ({info.points === 'var' ? 'Variable pts' : `${info.points} pt`} — {info.range})
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newSpiritSpellPoints}
                      onChange={e => setNewSpiritSpellPoints(parseInt(e.target.value, 10) || 1)}
                      style={{ width: '58px' }}
                      title="Spell Point Rank (MP cost)"
                    />
                    <span className="small-text text-muted">pt</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      if (selectedNewSpiritSpell) {
                        handleAddSpiritSpell(selectedNewSpiritSpell, newSpiritSpellPoints);
                      } else if (customSpiritSpellName.trim()) {
                        handleAddSpiritSpell(customSpiritSpellName, newSpiritSpellPoints);
                      }
                    }}
                  >
                    <Plus size={14} /> Add Spell
                  </button>
                </div>
                <div className="form-inline mt-2" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Or enter custom Spirit spell name..."
                    value={customSpiritSpellName}
                    onChange={e => setCustomSpiritSpellName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Passions & Lore */}
      {activeTab === 'passions' && (
        <div className="tab-pane passions-pane">
          <div className="grid-2-col">
            <div className="card">
              <h3 className="card-title gold-text">Passions & Honor</h3>
              <p className="small-text text-muted">
                Roll to inspire an action. A success grants +20% to associated skills (+50% on critical, -20% on fumble).
              </p>

              <div className="passions-list">
                {character.passions?.map((p, idx) => (
                  <div key={idx} className="passion-item-card">
                    <div>
                      <strong>{p.name}</strong>
                      <span className="badge badge-info ml-2">{p.value}%</span>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handlePassionRoll(p.name, p.value)}
                    >
                      Inspiration Test ({p.value}%)
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Custom Passion */}
              <div className="form-inline mt-4">
                <input
                  type="text"
                  placeholder="e.g. Loyalty (Argrath)"
                  value={newPassionName}
                  onChange={e => setNewPassionName(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Rating %"
                  value={newPassionVal}
                  onChange={e => setNewPassionVal(e.target.value)}
                  style={{ width: '90px' }}
                />
                <button className="btn btn-primary" onClick={handleAddPassion}>
                  <Plus size={16} /> Add Passion
                </button>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title gold-text">Notes, Lineage & Saga</h3>
              <textarea
                className="full-notes-textarea"
                rows="10"
                value={character.notes || ''}
                onChange={e => onUpdateCharacter({ ...character, notes: e.target.value })}
                placeholder="Record deeds, heroic quests, battle wounds, and debts of honor..."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
