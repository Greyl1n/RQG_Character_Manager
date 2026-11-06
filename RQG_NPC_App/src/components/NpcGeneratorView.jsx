import React, { useState, useEffect } from 'react';
import {
  Skull, Sparkles, Sliders, RefreshCw, Plus, Trash2, Copy,
  Printer, ArrowUpRight, Shield, Heart, Zap, Crosshair, Sword,
  CheckSquare, Square, Dice5, Save, Check, FilePlus
} from 'lucide-react';
import rulesData from '../data/rqgRulesData.json';
import {
  NPC_ARCHETYPES,
  POWER_LEVELS,
  generateRandomNpc,
  createBlankNpc,
  getSkillCategory,
  formatWeaponDamageWithDb
} from '../utils/npcGenerator';
import {
  calculateDerivedAttributes,
  calculateCategoryModifiers,
  getThrownDamageBonus,
  rollSkillExperience
} from '../utils/rqgRulesEngine';

const NPC_STORAGE_KEY = 'rqg_saved_npcs_v1';

// Authentic Gloranthan Carved Stone Face Icon
const StoneMaskIcon = () => (
  <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="34" height="34" rx="3" fill="#d8cebc" stroke="#854d0e" strokeWidth="1.8" />
    <path d="M10 11C10 8 14 6 18 6C22 6 26 8 26 11V24C26 28 22 30.5 18 30.5C14 30.5 10 28 10 24V11Z" fill="#c7b9a4" stroke="#5c3810" strokeWidth="1.4" />
    <circle cx="14" cy="14.5" r="1.8" fill="#4a2e0d" />
    <circle cx="22" cy="14.5" r="1.8" fill="#4a2e0d" />
    <path d="M18 14V21H20" stroke="#4a2e0d" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 24.5C15.5 26 20.5 26 22 24.5" stroke="#4a2e0d" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M12 11.5C14 10.5 16 11 17 11.5" stroke="#5c3810" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M24 11.5C22 10.5 20 11 19 11.5" stroke="#5c3810" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export default function NpcGeneratorView({ onOpenDiceRoller, onPromoteToPc }) {
  // Saved NPCs list from localStorage (defaults to empty array if none saved)
  const [savedNpcs, setSavedNpcs] = useState(() => {
    try {
      const stored = localStorage.getItem(NPC_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Current active NPC: ALWAYS starts as a clean blank NPC!
  const [activeNpc, setActiveNpc] = useState(() => createBlankNpc());

  // Dropdown selection state: 'blank' or the ID of a saved NPC
  const [selectedDropdownId, setSelectedDropdownId] = useState('blank');

  // Generator Mode: 'auto' or 'manual'
  const [mode, setMode] = useState('manual');

  // Notification / Feedback banner
  const [saveNotice, setSaveNotice] = useState('');
  const [draftCatMods, setDraftCatMods] = useState({});

  const rulebookCatMods = calculateCategoryModifiers(activeNpc.stats || {});
  const npcCatMods = calculateCategoryModifiers(activeNpc.stats || {}, activeNpc.customCategoryMods);
  const hasCustomNpcCatMods = Object.keys(activeNpc.customCategoryMods || {}).length > 0;

  // Edit an NPC Skill Category Bonus directly (updates skills in that category + weapon skills if Manipulation)
  const handleNpcCategoryModChange = (cat, rawVal) => {
    setDraftCatMods(prev => ({ ...prev, [cat]: rawVal }));
    if (rawVal === '' || rawVal === '-') return;
    const parsed = parseInt(rawVal, 10);
    if (Number.isNaN(parsed)) return;

    const oldMod = npcCatMods[cat] || 0;
    const delta = parsed - oldMod;

    const updatedSkills = (activeNpc.skills || []).map(sk => {
      if (getSkillCategory(sk.name) === cat && delta !== 0) {
        return { ...sk, value: Math.max(0, (sk.value || 0) + delta) };
      }
      return sk;
    });

    const manipDelta = cat === 'Manipulation' ? delta : 0;
    const updatedMeleeWeapons = manipDelta !== 0
      ? (activeNpc.meleeWeapons || []).map(wp => ({ ...wp, skill: Math.max(0, (wp.skill || 0) + manipDelta) }))
      : activeNpc.meleeWeapons;
    const updatedMissileWeapons = manipDelta !== 0
      ? (activeNpc.missileWeapons || []).map(wp => ({ ...wp, skill: Math.max(0, (wp.skill || 0) + manipDelta) }))
      : activeNpc.missileWeapons;

    updateActiveNpc({
      customCategoryMods: {
        ...(activeNpc.customCategoryMods || {}),
        [cat]: parsed
      },
      skills: updatedSkills,
      meleeWeapons: updatedMeleeWeapons,
      missileWeapons: updatedMissileWeapons
    });
  };

  const handleNpcCategoryModBlur = (cat) => {
    setDraftCatMods(prev => {
      const next = { ...prev };
      delete next[cat];
      return next;
    });
  };

  const handleResetNpcCategoryMods = (targetCat = null) => {
    const nextCustom = { ...(activeNpc.customCategoryMods || {}) };
    let updatedSkills = [...(activeNpc.skills || [])];
    let manipDelta = 0;

    const catsToReset = targetCat ? [targetCat] : Object.keys(rulebookCatMods);
    catsToReset.forEach(cat => {
      if (nextCustom[cat] !== undefined) {
        const oldMod = npcCatMods[cat] || 0;
        const ruleMod = rulebookCatMods[cat] || 0;
        const delta = ruleMod - oldMod;
        delete nextCustom[cat];
        if (delta !== 0) {
          updatedSkills = updatedSkills.map(sk =>
            getSkillCategory(sk.name) === cat ? { ...sk, value: Math.max(0, (sk.value || 0) + delta) } : sk
          );
          if (cat === 'Manipulation') manipDelta += delta;
        }
      }
    });

    setDraftCatMods({});
    updateActiveNpc({
      customCategoryMods: nextCustom,
      skills: updatedSkills,
      meleeWeapons: manipDelta !== 0
        ? (activeNpc.meleeWeapons || []).map(wp => ({ ...wp, skill: Math.max(0, (wp.skill || 0) + manipDelta) }))
        : activeNpc.meleeWeapons,
      missileWeapons: manipDelta !== 0
        ? (activeNpc.missileWeapons || []).map(wp => ({ ...wp, skill: Math.max(0, (wp.skill || 0) + manipDelta) }))
        : activeNpc.missileWeapons
    });
  };

  // Auto Generator Options
  const [genArchetype, setGenArchetype] = useState('city_guard');
  const [genPowerLevel, setGenPowerLevel] = useState('veteran');
  const [genHomeland, setGenHomeland] = useState('');
  const [genCult, setGenCult] = useState('');
  const [genGender, setGenGender] = useState('');

  // Persist saved NPCs whenever list changes
  useEffect(() => {
    try {
      localStorage.setItem(NPC_STORAGE_KEY, JSON.stringify(savedNpcs));
    } catch (e) {}
  }, [savedNpcs]);

  // Flash save notice
  const flashNotice = (msg) => {
    setSaveNotice(msg);
    setTimeout(() => setSaveNotice(''), 3000);
  };

  // Update current active NPC state
  const updateActiveNpc = (fields) => {
    setActiveNpc(prev => ({ ...prev, ...fields }));
  };

  // When a characteristic stat (STR, CON, SIZ, DEX, INT, POW, CHA) changes,
  // automatically recalculate the generated derived values:
  // Damage Bonus, SIZ SR, DEX SR, Melee SR, Total HP, Total MP, Hit Location max HPs,
  // Skill Category Modifier deltas, and Weapon SR / Damage Bonus!
  const handleStatChange = (stat, val) => {
    const num = Math.max(1, parseInt(val) || 0);
    const oldStats = activeNpc.stats || { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 10, CHA: 10 };
    const newStats = { ...oldStats, [stat]: num };

    const oldDerived = calculateDerivedAttributes(oldStats);
    const derived = calculateDerivedAttributes(newStats);
    const oldCatMods = calculateCategoryModifiers(oldStats, activeNpc.customCategoryMods);
    const newCatMods = calculateCategoryModifiers(newStats, activeNpc.customCategoryMods);

    // Update hit location max HPs from derived (preserving full HP if uninjured)
    const updatedLocs = {};
    Object.entries(activeNpc.hitLocations || {}).forEach(([locName, locData]) => {
      const derivedLoc = derived.hitLocations[locName];
      const maxHp = derivedLoc ? derivedLoc.maxHp : locData.maxHp;
      const wasFull = locData.currentHp >= locData.maxHp;
      updatedLocs[locName] = {
        ...locData,
        maxHp,
        currentHp: wasFull ? maxHp : Math.min(locData.currentHp, maxHp)
      };
    });

    // Update skills by category modifier delta (+ DEX*2 for Dodge, DEX*3 for Jump)
    const dexDelta = (newStats.DEX || 10) - (oldStats.DEX || 10);
    const updatedSkills = (activeNpc.skills || []).map(sk => {
      const cat = getSkillCategory(sk.name);
      const catDelta = (newCatMods[cat] || 0) - (oldCatMods[cat] || 0);
      const lower = (sk.name || '').toLowerCase();
      let baseDelta = 0;
      if (lower.includes('dodge')) baseDelta = dexDelta * 2;
      else if (lower.includes('jump')) baseDelta = dexDelta * 3;
      const newVal = Math.max(0, (sk.value || 0) + catDelta + baseDelta);
      return { ...sk, value: newVal };
    });

    // Update melee weapons SR (by meleeSr delta), skill (by Manipulation delta), and Damage Bonus
    const oldMeleeSr = activeNpc.meleeSr ?? oldDerived.meleeSr;
    const meleeSrDelta = derived.meleeSr - oldMeleeSr;
    const manipDelta = (newCatMods.Manipulation || 0) - (oldCatMods.Manipulation || 0);

    const updatedMeleeWeapons = (activeNpc.meleeWeapons || []).map(wp => ({
      ...wp,
      skill: Math.max(0, (wp.skill || 0) + manipDelta),
      sr: Math.max(0, (wp.sr ?? (oldMeleeSr + 2)) + meleeSrDelta),
      damage: formatWeaponDamageWithDb(wp.damage, derived.damageBonus, false, wp.name)
    }));

    // Update missile weapons skill (by Manipulation delta) and Thrown Damage Bonus (half DB)
    const updatedMissileWeapons = (activeNpc.missileWeapons || []).map(wp => ({
      ...wp,
      skill: Math.max(0, (wp.skill || 0) + manipDelta),
      damage: formatWeaponDamageWithDb(wp.damage, derived.thrownDamageBonus, true, wp.name)
    }));

    const wasFullHp = activeNpc.currentHp >= activeNpc.totalHp;
    const wasFullMp = activeNpc.currentMp >= activeNpc.totalMp;

    updateActiveNpc({
      stats: newStats,
      damageBonus: derived.damageBonus,
      sizSr: derived.sizSr,
      dexSr: derived.dexSr,
      meleeSr: derived.meleeSr,
      totalHp: derived.totalHp,
      currentHp: wasFullHp ? derived.totalHp : Math.min(activeNpc.currentHp, derived.totalHp),
      totalMp: newStats.POW,
      currentMp: wasFullMp ? newStats.POW : Math.min(activeNpc.currentMp, newStats.POW),
      hitLocations: updatedLocs,
      skills: updatedSkills,
      meleeWeapons: updatedMeleeWeapons,
      missileWeapons: updatedMissileWeapons
    });
  };

  // Select an item from the dropdown menu
  const handleSelectDropdown = (e) => {
    const val = e.target.value;
    setSelectedDropdownId(val);

    if (val === 'blank') {
      setActiveNpc(createBlankNpc());
      flashNotice('New blank sheet loaded.');
    } else {
      const found = savedNpcs.find(n => n.id === val);
      if (found) {
        setActiveNpc(JSON.parse(JSON.stringify(found)));
        flashNotice(`Loaded saved NPC: ${found.name || 'Unnamed'}`);
      }
    }
  };

  // Save current active NPC into savedNpcs list
  const handleSaveNpc = () => {
    const nameToSave = activeNpc.name?.trim() || 'Unnamed Adventurer';
    const isAlreadySaved = savedNpcs.some(n => n.id === activeNpc.id);

    let savedId = activeNpc.id;
    let updatedList;

    if (isAlreadySaved) {
      // Update existing
      updatedList = savedNpcs.map(n => n.id === activeNpc.id ? { ...activeNpc, name: nameToSave, isSaved: true } : n);
      flashNotice(`✓ Updated "${nameToSave}" in saved NPCs!`);
    } else {
      // Create new saved record
      savedId = 'npc-saved-' + Date.now();
      const newSavedNpc = { ...activeNpc, id: savedId, name: nameToSave, isSaved: true };
      updatedList = [newSavedNpc, ...savedNpcs];
      setActiveNpc(newSavedNpc);
      flashNotice(`✓ Saved "${nameToSave}" to dropdown list!`);
    }

    setSavedNpcs(updatedList);
    setSelectedDropdownId(savedId);
  };

  // Reset to a clean blank NPC
  const handleResetBlank = () => {
    const blank = createBlankNpc();
    setActiveNpc(blank);
    setSelectedDropdownId('blank');
    flashNotice('Sheet reset to blank.');
  };

  // Delete saved NPC
  const handleDeleteNpc = (id) => {
    if (confirm('Delete this saved NPC from list?')) {
      const updated = savedNpcs.filter(n => n.id !== id);
      setSavedNpcs(updated);
      handleResetBlank();
      flashNotice('NPC deleted from saved list.');
    }
  };

  // Duplicate current NPC
  const handleDuplicateNpc = () => {
    const cloned = {
      ...JSON.parse(JSON.stringify(activeNpc)),
      id: 'npc-saved-' + Date.now(),
      name: `${activeNpc.name || 'NPC'} (Copy)`,
      isSaved: true
    };
    setSavedNpcs(prev => [cloned, ...prev]);
    setActiveNpc(cloned);
    setSelectedDropdownId(cloned.id);
    flashNotice(`✓ Duplicated as "${cloned.name}"`);
  };

  // Roll random NPC via Automatic Generator
  const handleGenerateRandom = () => {
    const newNpc = generateRandomNpc({
      archetypeId: genArchetype,
      powerLevelId: genPowerLevel,
      homeland: genHomeland || null,
      cult: genCult || null,
      gender: genGender || null
    });
    setActiveNpc(newNpc);
    setSelectedDropdownId('custom');
    flashNotice(`🎲 Rolled random ${newNpc.name} (${newNpc.occupation})! Click "Save NPC" to keep.`);
  };

  // Quick Armor Preset
  const handleApplyArmorPreset = (presetAp) => {
    const updatedLocs = {};
    Object.entries(activeNpc.hitLocations || {}).forEach(([locName, data]) => {
      let ap = presetAp;
      if (locName === 'Head' && presetAp >= 4) ap = Math.min(6, presetAp + 1);
      if ((locName.includes('Arm') || locName.includes('Leg')) && presetAp <= 2) ap = Math.max(0, presetAp - 1);
      updatedLocs[locName] = { ...data, armor: ap };
    });
    updateActiveNpc({ hitLocations: updatedLocs });
  };

  // Roll D20 Hit Location
  const handleRollHitLocation = () => {
    onOpenDiceRoller({
      label: 'Hit Location Check (D20)',
      type: 'hitLocation'
    });
  };

  // Skills handlers
  const updateSkill = (index, field, val) => {
    const updated = [...(activeNpc.skills || [])];
    updated[index] = { ...updated[index], [field]: field === 'value' ? parseInt(val) || 0 : val };
    updateActiveNpc({ skills: updated });
  };

  const addSkillRow = () => {
    const updated = [...(activeNpc.skills || []), { name: '', value: 25, checked: false }];
    updateActiveNpc({ skills: updated });
  };

  const removeSkillRow = (index) => {
    const updated = (activeNpc.skills || []).filter((_, i) => i !== index);
    updateActiveNpc({ skills: updated });
  };

  // Roll RQG Experience Level-Up for a single NPC skill (1D100 + CatMod > Skill % -> +1D6%)
  const levelUpNpcSkill = (index) => {
    const updated = [...(activeNpc.skills || [])];
    const sk = updated[index];
    if (!sk) return;
    const catMods = calculateCategoryModifiers(activeNpc.stats || {}, activeNpc.customCategoryMods);
    const cat = getSkillCategory(sk.name);
    const catMod = catMods[cat] || 0;
    const res = rollSkillExperience(sk.value || 0, catMod, '1d6');
    updated[index] = { ...sk, value: res.newSkill, checked: false };
    updateActiveNpc({ skills: updated });
    flashNotice(`[${sk.name || 'Skill'}] ${res.summary}`);
  };

  // Roll RQG Experience Level-Up for all checked NPC skills
  const levelUpCheckedNpcSkills = () => {
    const catMods = calculateCategoryModifiers(activeNpc.stats || {}, activeNpc.customCategoryMods);
    const results = [];
    const updated = (activeNpc.skills || []).map(sk => {
      if (!sk.checked) return sk;
      const cat = getSkillCategory(sk.name);
      const catMod = catMods[cat] || 0;
      const res = rollSkillExperience(sk.value || 0, catMod, '1d6');
      results.push(`${sk.name}: ${res.success ? `+${res.gain}% (${res.newSkill}%)` : 'No gain'}`);
      return { ...sk, value: res.newSkill, checked: false };
    });
    if (results.length > 0) {
      updateActiveNpc({ skills: updated });
      flashNotice(`⬆ Experience Rolls: ${results.join(' | ')}`);
    }
  };

  // Magic handlers
  const updateSpiritSpell = (index, field, val) => {
    const updated = [...(activeNpc.spiritMagic || [])];
    updated[index] = { ...updated[index], [field]: field === 'points' ? parseInt(val) || 1 : val };
    updateActiveNpc({ spiritMagic: updated });
  };

  const addSpiritSpell = () => {
    const updated = [...(activeNpc.spiritMagic || []), { name: 'Heal', points: 2 }];
    updateActiveNpc({ spiritMagic: updated });
  };

  const removeSpiritSpell = (index) => {
    const updated = (activeNpc.spiritMagic || []).filter((_, i) => i !== index);
    updateActiveNpc({ spiritMagic: updated });
  };

  const updateRuneSpell = (index, val) => {
    const updated = [...(activeNpc.runeMagic || [])];
    updated[index] = val;
    updateActiveNpc({ runeMagic: updated });
  };

  const addRuneSpell = () => {
    const updated = [...(activeNpc.runeMagic || []), 'Shield (1 pt)'];
    updateActiveNpc({ runeMagic: updated });
  };

  const removeRuneSpell = (index) => {
    const updated = (activeNpc.runeMagic || []).filter((_, i) => i !== index);
    updateActiveNpc({ runeMagic: updated });
  };

  // Weapons handlers
  const updateMeleeWeapon = (index, field, val) => {
    const updated = [...(activeNpc.meleeWeapons || [])];
    const parsedVal = (field === 'skill' || field === 'hp' || field === 'sr') ? (parseInt(val) || 0) : (field === 'enc' ? (parseFloat(val) || 0) : val);
    updated[index] = { ...updated[index], [field]: parsedVal };
    updateActiveNpc({ meleeWeapons: updated });
  };

  const addMeleeWeapon = () => {
    const updated = [...(activeNpc.meleeWeapons || []), {
      name: 'Broadsword',
      skill: 50,
      damage: `1D8+1 ${activeNpc.damageBonus !== 'None' ? activeNpc.damageBonus : ''}`.trim(),
      enc: 1,
      hp: 12,
      sr: (activeNpc.meleeSr || 5) + 2,
      checked: false
    }];
    updateActiveNpc({ meleeWeapons: updated });
  };

  const removeMeleeWeapon = (index) => {
    const updated = (activeNpc.meleeWeapons || []).filter((_, i) => i !== index);
    updateActiveNpc({ meleeWeapons: updated });
  };

  const updateMissileWeapon = (index, field, val) => {
    const updated = [...(activeNpc.missileWeapons || [])];
    const parsedVal = (field === 'skill' || field === 'hp') ? (parseInt(val) || 0) : (field === 'enc' ? (parseFloat(val) || 0) : val);
    updated[index] = { ...updated[index], [field]: parsedVal };
    updateActiveNpc({ missileWeapons: updated });
  };

  const addMissileWeapon = () => {
    const thrownDb = getThrownDamageBonus(activeNpc.damageBonus);
    const updated = [...(activeNpc.missileWeapons || []), {
      name: 'Javelin',
      skill: 40,
      damage: `1D10 ${thrownDb !== 'None' ? thrownDb : ''}`.trim(),
      enc: 1,
      hp: 8,
      range: '20m',
      rate: '1/MR',
      checked: false
    }];
    updateActiveNpc({ missileWeapons: updated });
  };

  const removeMissileWeapon = (index) => {
    const updated = (activeNpc.missileWeapons || []).filter((_, i) => i !== index);
    updateActiveNpc({ missileWeapons: updated });
  };

  const isCurrentNpcSaved = savedNpcs.some(n => n.id === activeNpc.id);

  return (
    <div className="npc-view-container">
      {/* Top Generator & Management Control Bar */}
      <div className="card npc-control-bar no-print mb-4">
        <div className="npc-bar-top">
          {/* Dropdown: Blank / New NPC OR Saved NPCs */}
          <div className="npc-select-wrap">
            <label className="text-muted small-text font-bold">Select NPC:</label>
            <select
              value={selectedDropdownId}
              onChange={handleSelectDropdown}
              className="npc-dropdown"
            >
              <option value="blank">+ [ Blank / New NPC ]</option>
              {selectedDropdownId === 'custom' && !isCurrentNpcSaved && (
                <option value="custom">★ Current Unsaved ({activeNpc.name || 'Unsaved NPC'})</option>
              )}
              {savedNpcs.length > 0 && (
                <optgroup label={`Saved NPCs (${savedNpcs.length})`}>
                  {savedNpcs.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.name || 'Unnamed NPC'} ({n.occupation || 'No Occ.'} • {n.cult1?.name || 'Cultless'})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Mode Switch: Automatic Random vs Manual Creator */}
          <div className="mode-toggle-group">
            <button
              className={`btn ${mode === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMode('manual')}
            >
              <Sliders size={16} /> Manual Creator / Editor
            </button>
            <button
              className={`btn ${mode === 'auto' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMode('auto')}
            >
              <Sparkles size={16} /> Automatic Random Generator
            </button>
          </div>

          {/* Top Actions: Save, Reset Blank, Clone, Export, Print */}
          <div className="npc-action-btns">
            <button className="btn btn-primary btn-sm" onClick={handleSaveNpc} title="Save this NPC to the dropdown list">
              <Save size={15} /> {isCurrentNpcSaved ? 'Save Changes' : 'Save NPC'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleResetBlank} title="Reset sheet to a blank NPC">
              <FilePlus size={15} /> Blank Sheet
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleDuplicateNpc} title="Duplicate NPC for encounters">
              <Copy size={15} /> Duplicate
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onPromoteToPc(activeNpc)} title="Export NPC into Player Character Roster">
              <ArrowUpRight size={15} /> To PC Roster
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => window.print()} title="Print NPC Sheet">
              <Printer size={15} /> Print
            </button>
            {isCurrentNpcSaved && (
              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteNpc(activeNpc.id)} title="Delete from Saved">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Temporary Feedback Notification */}
        {saveNotice && (
          <div className="npc-save-alert-banner mt-2">
            <Check size={16} /> {saveNotice}
          </div>
        )}

        {/* Automatic Generator Controls Bar */}
        {mode === 'auto' && (
          <div className="auto-gen-controls-panel mt-3 pt-3 border-top">
            <div className="auto-gen-fields">
              <div className="form-group-sm">
                <label>Archetype:</label>
                <select value={genArchetype} onChange={e => setGenArchetype(e.target.value)}>
                  {NPC_ARCHETYPES.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group-sm">
                <label>Power Tier:</label>
                <select value={genPowerLevel} onChange={e => setGenPowerLevel(e.target.value)}>
                  {POWER_LEVELS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group-sm">
                <label>Homeland:</label>
                <select value={genHomeland} onChange={e => setGenHomeland(e.target.value)}>
                  <option value="">Any Homeland</option>
                  {Object.keys(rulesData.homelands).map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="form-group-sm">
                <label>Cult:</label>
                <select value={genCult} onChange={e => setGenCult(e.target.value)}>
                  <option value="">Any / Default Cult</option>
                  {Object.keys(rulesData.cults).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group-sm">
                <label>Gender:</label>
                <select value={genGender} onChange={e => setGenGender(e.target.value)}>
                  <option value="">Random</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <button className="btn btn-accent btn-sm self-end" onClick={handleGenerateRandom}>
                <Dice5 size={16} /> Roll Random NPC
              </button>
            </div>
          </div>
        )}

        {/* Manual Quick Actions Bar */}
        {mode === 'manual' && (
          <div className="manual-builder-panel mt-3 pt-3 border-top">
            <div className="manual-quick-actions">
              <div className="armor-preset-picker">
                <span className="small-text font-bold text-muted mr-1">Quick Armor Preset:</span>
                <button className="btn-tiny" onClick={() => handleApplyArmorPreset(0)}>None (0 AP)</button>
                <button className="btn-tiny" onClick={() => handleApplyArmorPreset(2)}>Leather (2 AP)</button>
                <button className="btn-tiny" onClick={() => handleApplyArmorPreset(3)}>Cuirboilli (3 AP)</button>
                <button className="btn-tiny" onClick={() => handleApplyArmorPreset(4)}>Scale/Linothorax (4 AP)</button>
                <button className="btn-tiny" onClick={() => handleApplyArmorPreset(6)}>Bronze Plate (6 AP)</button>
              </div>
              <span className="small-text text-muted italic">
                * Every field below is directly editable. Stats automatically calculate Damage Bonus, Strike Ranks, and Max HPs.
              </span>
            </div>

            {/* Editable Skill Category Modifiers (Rulebook + House Rule Overrides) */}
            <div style={{ borderTop: '1px solid rgba(212,175,55,0.2)', marginTop: '10px', paddingTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span className="small-text font-bold gold-text">
                  Skill Category Bonuses (Calculated from Stats — Editable for House Rules):
                </span>
                {hasCustomNpcCatMods && (
                  <button
                    type="button"
                    className="btn-tiny"
                    onClick={() => handleResetNpcCategoryMods()}
                  >
                    ↺ Reset Category Bonuses to Rulebook
                  </button>
                )}
              </div>
              <div className="category-mods-row">
                {Object.entries(npcCatMods).map(([cat, mod]) => {
                  const isCustom = activeNpc.customCategoryMods?.[cat] !== undefined && mod !== rulebookCatMods[cat];
                  const displayVal = draftCatMods[cat] !== undefined ? draftCatMods[cat] : mod;
                  return (
                    <div key={cat} className={`cat-mod-pill ${isCustom ? 'is-custom' : ''}`}>
                      <span className="cat-name">{cat}</span>
                      <div className="cat-mod-input-wrap">
                        <input
                          type="number"
                          className={`cat-mod-input ${mod >= 0 ? 'pos' : 'neg'}`}
                          value={displayVal}
                          onChange={e => handleNpcCategoryModChange(cat, e.target.value)}
                          onBlur={() => handleNpcCategoryModBlur(cat)}
                          title={`Edit ${cat} Category Bonus % (Rulebook: ${rulebookCatMods[cat] >= 0 ? `+${rulebookCatMods[cat]}%` : `${rulebookCatMods[cat]}%`})`}
                        />
                        <span className={`cat-val ${mod >= 0 ? 'pos' : 'neg'}`}>%</span>
                      </div>
                      {isCustom && (
                        <button
                          type="button"
                          className="btn-tiny"
                          style={{ padding: '1px 4px', fontSize: '0.7rem' }}
                          onClick={() => handleResetNpcCategoryMods(cat)}
                          title={`Reset ${cat} to rulebook (${rulebookCatMods[cat] >= 0 ? `+${rulebookCatMods[cat]}%` : `${rulebookCatMods[cat]}%`})`}
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
        )}
      </div>

      {/* =========================================================================
          THE NPC CHARACTER SHEET (EXACT LAYOUT OF THE USER-PROVIDED TEMPLATE IMAGE)
          EVERY FIELD IS MODIFIABLE DIRECTLY ON THE SHEET!
          ========================================================================= */}
      <div className="npc-sheet-card-wrap">
        <div className="npc-sheet-paper">
          {/* Ornate Header with Mask Icons and Title */}
          <div className="npc-sheet-frame-header">
            <div className="glorantha-mask-box left-mask">
              <StoneMaskIcon />
            </div>
            <div className="npc-sheet-main-title">
              <h1 className="npc-title-text">NPC CHARACTER SHEET</h1>
            </div>
            <div className="glorantha-mask-box right-mask">
              <StoneMaskIcon />
            </div>
          </div>

          {/* Section 1: Top Identity & Cults Row */}
          <div className="npc-grid-top">
            {/* Left: Identity Details (All fields directly editable!) */}
            <div className="npc-identity-block">
              <div className="npc-line-item">
                <span className="lbl">Name</span>
                <input
                  type="text"
                  className="sheet-line-input val-name"
                  value={activeNpc.name || ''}
                  onChange={e => updateActiveNpc({ name: e.target.value })}
                  placeholder="Adventurer Name"
                />
                <span className="lbl ml-2">Age</span>
                <input
                  type="number"
                  className="sheet-line-input val-sm"
                  value={activeNpc.age || ''}
                  onChange={e => updateActiveNpc({ age: e.target.value })}
                  placeholder="20"
                />
                <span className="lbl ml-2">Gender</span>
                <input
                  type="text"
                  className="sheet-line-input val-sm"
                  value={activeNpc.gender || ''}
                  onChange={e => updateActiveNpc({ gender: e.target.value })}
                  placeholder="M / F"
                />
              </div>

              <div className="npc-line-item">
                <span className="lbl">Homeland</span>
                <input
                  type="text"
                  className="sheet-line-input"
                  value={activeNpc.homeland || ''}
                  onChange={e => updateActiveNpc({ homeland: e.target.value })}
                  placeholder="Sartar, Esrolia, Prax..."
                />
                <span className="lbl ml-2">Tribe</span>
                <input
                  type="text"
                  className="sheet-line-input"
                  value={activeNpc.tribe || ''}
                  onChange={e => updateActiveNpc({ tribe: e.target.value })}
                  placeholder="Tribe"
                />
              </div>

              <div className="npc-line-item">
                <span className="lbl">Clan</span>
                <input
                  type="text"
                  className="sheet-line-input"
                  value={activeNpc.clan || ''}
                  onChange={e => updateActiveNpc({ clan: e.target.value })}
                  placeholder="Clan"
                />
                <span className="lbl ml-2">Occupation</span>
                <input
                  type="text"
                  className="sheet-line-input"
                  value={activeNpc.occupation || ''}
                  onChange={e => updateActiveNpc({ occupation: e.target.value })}
                  placeholder="Warrior, Guard, Hunter..."
                />
                <span className="lbl ml-2">Reputation</span>
                <input
                  type="number"
                  className="sheet-line-input val-sm"
                  value={activeNpc.reputation ?? ''}
                  onChange={e => updateActiveNpc({ reputation: e.target.value })}
                  placeholder="10"
                />
                <span className="unit-pct">%</span>
              </div>

              <div className="npc-line-item">
                <span className="lbl">Appearance</span>
                <input
                  type="text"
                  className="sheet-line-input val-desc"
                  value={activeNpc.appearance || ''}
                  onChange={e => updateActiveNpc({ appearance: e.target.value })}
                  placeholder="Visual features, distinctive armor, scars, tattoos..."
                />
              </div>
            </div>

            {/* Right: Cults & Rune Points Bubbles (0 - 12) */}
            <div className="npc-cults-block">
              <div className="npc-cult-header">CULTS</div>

              {/* Cult 1 */}
              <div className="npc-cult-entry">
                <div className="cult-name-rank-line">
                  <span className="lbl">Cult</span>
                  <input
                    type="text"
                    className="sheet-line-input val-cult"
                    value={activeNpc.cult1?.name || ''}
                    onChange={e => updateActiveNpc({ cult1: { ...activeNpc.cult1, name: e.target.value } })}
                    placeholder="Primary Cult..."
                  />
                  <span className="lbl ml-2">Rank</span>
                  <input
                    type="text"
                    className="sheet-line-input val-rank"
                    value={activeNpc.cult1?.rank || ''}
                    onChange={e => updateActiveNpc({ cult1: { ...activeNpc.cult1, rank: e.target.value } })}
                    placeholder="Initiate / Lord..."
                  />
                </div>
                <div className="rune-points-bubble-line">
                  <span className="rp-lbl">RUNE POINTS</span>
                  <div className="bubble-row">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => {
                      const isCurrent = (activeNpc.cult1?.currentRp ?? 0) === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          className={`rp-bubble ${isCurrent ? 'active' : ''}`}
                          onClick={() => {
                            updateActiveNpc({
                              cult1: {
                                ...activeNpc.cult1,
                                currentRp: n,
                                maxRp: Math.max(activeNpc.cult1?.maxRp || 0, n)
                              }
                            });
                          }}
                          title={`Cult 1: Set ${n} Rune Points`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Cult 2 */}
              <div className="npc-cult-entry mt-2">
                <div className="cult-name-rank-line">
                  <span className="lbl">Cult</span>
                  <input
                    type="text"
                    className="sheet-line-input val-cult"
                    value={activeNpc.cult2?.name || ''}
                    onChange={e => updateActiveNpc({ cult2: { ...activeNpc.cult2, name: e.target.value } })}
                    placeholder="Secondary Cult..."
                  />
                  <span className="lbl ml-2">Rank</span>
                  <input
                    type="text"
                    className="sheet-line-input val-rank"
                    value={activeNpc.cult2?.rank || ''}
                    onChange={e => updateActiveNpc({ cult2: { ...activeNpc.cult2, rank: e.target.value } })}
                    placeholder="Lay Member..."
                  />
                </div>
                <div className="rune-points-bubble-line">
                  <span className="rp-lbl">RUNE POINTS</span>
                  <div className="bubble-row">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => {
                      const isCurrent = (activeNpc.cult2?.currentRp ?? 0) === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          className={`rp-bubble ${isCurrent ? 'active' : ''}`}
                          onClick={() => {
                            updateActiveNpc({
                              cult2: {
                                ...activeNpc.cult2,
                                currentRp: n,
                                maxRp: Math.max(activeNpc.cult2?.maxRp || 0, n)
                              }
                            });
                          }}
                          title={`Cult 2: Set ${n} Rune Points`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="ornate-divider">
            <span className="diamond">◇</span>
            <div className="divider-line"></div>
            <span className="diamond">◇</span>
          </div>

          {/* Section 2: Characteristics, Armor & Hit Locations, HP & MP Trackers */}
          <div className="npc-grid-middle">
            {/* Column A: Characteristics (MODIFIABLE! With auto-derived DB, SR, HP, MP) */}
            <div className="npc-col-stats">
              <h3 className="section-title">CHARACTERISTICS</h3>
              <div className="characteristics-2col">
                {['STR', 'INT', 'CON', 'POW', 'SIZ', 'CHA', 'DEX'].map(st => (
                  <div key={st} className="char-cell">
                    <span className="c-lbl">{st}</span>
                    <div className="char-input-group">
                      <input
                        type="number"
                        min="1"
                        max="40"
                        className="char-input-num"
                        value={activeNpc.stats[st] ?? 10}
                        onChange={e => handleStatChange(st, e.target.value)}
                        title={`Edit ${st}`}
                      />
                      <button
                        type="button"
                        className="char-roll-dice-btn no-print"
                        onClick={() => onOpenDiceRoller({ label: `${activeNpc.name || 'NPC'} ${st} ×5 Check`, target: (activeNpc.stats[st] || 10) * 5, type: 'd100' })}
                        title={`Roll ${st} ×5 Check (${(activeNpc.stats[st] || 10) * 5}%)`}
                      >
                        🎲
                      </button>
                    </div>
                  </div>
                ))}
                <div className="char-cell empty-cell"></div>
              </div>

              {/* Generated Derived Stats (Automatically computed from characteristics) */}
              <div className="derived-combat-stats-block">
                <div className="derived-line">
                  <span className="lbl">Damage Bonus</span>
                  <span className="val">{activeNpc.damageBonus || 'None'}</span>
                </div>
                <div className="derived-line">
                  <span className="lbl">SIZ SR</span>
                  <span className="val">{activeNpc.sizSr}</span>
                  <span className="lbl ml-2">DEX SR</span>
                  <span className="val">{activeNpc.dexSr}</span>
                </div>
              </div>
            </div>

            {/* Column B: Armor & Hit Locations */}
            <div className="npc-col-locations">
              <div className="flex justify-between items-center mb-1">
                <h3 className="section-title">ARMOR & HIT LOCATIONS</h3>
                <button className="btn-tiny no-print" onClick={handleRollHitLocation} title="Roll D20 for hit location">
                  <Dice5 size={12} className="inline mr-1" /> Roll D20
                </button>
              </div>

              <table className="npc-hit-locations-table">
                <thead>
                  <tr>
                    <th className="th-loc">LOCATION</th>
                    <th className="th-roll">D20</th>
                    <th className="th-armor">ARMOR</th>
                    <th className="th-hp">HP</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'Right Leg', roll: '01–04' },
                    { key: 'Left Leg', roll: '05–08' },
                    { key: 'Abdomen', roll: '09–11' },
                    { key: 'Chest', roll: '12' },
                    { key: 'Right Arm', roll: '13–15' },
                    { key: 'Left Arm', roll: '16–18' },
                    { key: 'Head', roll: '19–20' }
                  ].map(({ key, roll }) => {
                    const loc = activeNpc.hitLocations?.[key] || { armor: 0, currentHp: 4, maxHp: 4 };
                    const isWounded = loc.currentHp < loc.maxHp;
                    const isMaimed = loc.currentHp <= 0;
                    return (
                      <tr key={key} className={isMaimed ? 'row-maimed' : isWounded ? 'row-wounded' : ''}>
                        <td className="td-name">{key}</td>
                        <td className="td-roll">{roll}</td>
                        <td className="td-armor">
                          <input
                            type="number"
                            min="0"
                            max="30"
                            className="clean-num-input"
                            value={loc.armor}
                            onChange={e => {
                              const val = parseInt(e.target.value) || 0;
                              updateActiveNpc({
                                hitLocations: {
                                  ...activeNpc.hitLocations,
                                  [key]: { ...loc, armor: val }
                                }
                              });
                            }}
                            title={`Edit ${key} Armor (AP)`}
                          />
                        </td>
                        <td className="td-hp">
                          {/* Interactive stepper on screen */}
                          <div className="loc-hp-inline no-print">
                            <button
                              type="button"
                              className="btn-tiny-ctrl no-print"
                              onClick={() => {
                                updateActiveNpc({
                                  hitLocations: {
                                    ...activeNpc.hitLocations,
                                    [key]: { ...loc, currentHp: Math.max(0, loc.currentHp - 1) }
                                  }
                                });
                              }}
                            >-</button>
                            <span className="loc-hp-num">{loc.currentHp}/{loc.maxHp}</span>
                            <button
                              type="button"
                              className="btn-tiny-ctrl no-print"
                              onClick={() => {
                                updateActiveNpc({
                                  hitLocations: {
                                    ...activeNpc.hitLocations,
                                    [key]: { ...loc, currentHp: Math.min(loc.maxHp, loc.currentHp + 1) }
                                  }
                                });
                              }}
                            >+</button>
                          </div>
                          {/* Printed sheet: place for pen writing with max number only */}
                          <div className="loc-hp-print print-only">
                            <span className="hp-pen-line"></span>
                            <span className="hp-max-val">/ {loc.maxHp}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Column C: Hit Points Bubble Grid (DEAD/0 + 1 to 24) */}
            <div className="npc-col-bubbles">
              <div className="bubble-header-flex">
                <h3 className="section-title">HIT POINTS</h3>
                <span className={`bubble-status-badge no-print ${activeNpc.currentHp <= 0 ? 'status-dead' : 'status-hp'}`}>
                  {activeNpc.currentHp <= 0 ? 'DEAD' : `${activeNpc.currentHp}/${activeNpc.totalHp}`}
                </span>
                <span className="bubble-print-badge print-only">
                  <span className="print-pen-line"></span> / {activeNpc.totalHp}
                </span>
              </div>
              <div className="bubble-tracker-grid">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map((num) => {
                  const isZero = num === 0;
                  const isAvailable = isZero ? true : num <= activeNpc.totalHp;
                  const isCurrent = num === activeNpc.currentHp;
                  const isTaken = !isZero && num > activeNpc.currentHp && isAvailable;
                  return (
                    <button
                      key={num}
                      type="button"
                      className={`bubble-item ${isZero ? 'dead-bubble' : ''} ${isCurrent ? 'bubble-filled' : ''} ${isTaken ? 'bubble-spent' : ''} ${!isAvailable ? 'bubble-unavailable' : ''}`}
                      onClick={() => isAvailable && updateActiveNpc({ currentHp: num })}
                      title={isZero ? '0 HP (DEAD)' : `HP: ${num}`}
                    >
                      {isZero ? '0' : num}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column D: Magic Points Bubble Grid (UNC/0 + 1 to 24) */}
            <div className="npc-col-bubbles">
              <div className="bubble-header-flex">
                <h3 className="section-title">MAGIC POINTS</h3>
                <span className={`bubble-status-badge no-print ${activeNpc.currentMp <= 0 ? 'status-unc' : 'status-mp'}`}>
                  {activeNpc.currentMp <= 0 ? 'UNC' : `${activeNpc.currentMp}/${activeNpc.totalMp}`}
                </span>
                <span className="bubble-print-badge print-only">
                  <span className="print-pen-line"></span> / {activeNpc.totalMp}
                </span>
              </div>
              <div className="bubble-tracker-grid">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map((num) => {
                  const isZero = num === 0;
                  const isAvailable = isZero ? true : num <= activeNpc.totalMp;
                  const isCurrent = num === activeNpc.currentMp;
                  const isSpent = !isZero && num > activeNpc.currentMp && isAvailable;
                  return (
                    <button
                      key={num}
                      type="button"
                      className={`bubble-item ${isZero ? 'unc-bubble' : ''} ${isCurrent ? 'bubble-filled-blue' : ''} ${isSpent ? 'bubble-spent' : ''} ${!isAvailable ? 'bubble-unavailable' : ''}`}
                      onClick={() => isAvailable && updateActiveNpc({ currentMp: num })}
                      title={isZero ? '0 MP (Unconscious)' : `MP: ${num}`}
                    >
                      {isZero ? '0' : num}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="ornate-divider">
            <span className="diamond">◇</span>
            <div className="divider-line"></div>
            <span className="diamond">◇</span>
          </div>

          {/* Section 3: Skills, Magic & Weapons (ALL ROWS EDITABLE WITH ADD / REMOVE!) */}
          <div className="npc-grid-bottom">
            {/* Skills Block */}
            <div className="npc-bottom-col npc-skills-section">
              <div className="flex justify-between items-center mb-1">
                <h3 className="section-title">SKILLS</h3>
                <div style={{ display: 'flex', gap: '4px' }} className="no-print">
                  {(activeNpc.skills || []).some(s => s.checked) && (
                    <button
                      type="button"
                      className="btn-tiny"
                      onClick={levelUpCheckedNpcSkills}
                      title="Roll RQG Experience Level-Up (1D100 + CatMod > Skill % → +1D6%) for all checked skills"
                    >
                      ⬆ Level Up Checked
                    </button>
                  )}
                  <button type="button" className="btn-tiny" onClick={addSkillRow} title="Add skill row">
                    <Plus size={12} /> Add
                  </button>
                </div>
              </div>

              <div className="npc-skills-list-block">
                {(activeNpc.skills || []).map((sk, idx) => (
                  <div key={idx} className="npc-skill-line">
                    <input
                      type="text"
                      className="sheet-inline-txt"
                      value={sk.name}
                      onChange={e => updateSkill(idx, 'name', e.target.value)}
                      placeholder="Skill..."
                    />
                    <div className="skill-num-roll-wrap">
                      <input
                        type="number"
                        className="sheet-inline-pct"
                        value={sk.value}
                        onChange={e => updateSkill(idx, 'value', e.target.value)}
                      />
                      <span className="unit-pct">%</span>
                      <button
                        type="button"
                        className="skill-dice-roll-btn no-print"
                        onClick={() => onOpenDiceRoller({ label: `${activeNpc.name || 'NPC'} ${sk.name} Check`, target: sk.value, type: 'd100' })}
                        title="Roll D100"
                      >
                        🎲
                      </button>
                      <button
                        type="button"
                        className="skill-dice-roll-btn no-print"
                        onClick={() => levelUpNpcSkill(idx)}
                        title={`Level Up ${sk.name || 'Skill'} (Roll 1D100 + Category Mod > ${sk.value}% for +1D6%)`}
                        style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#15803d' }}
                      >
                        ⬆
                      </button>
                    </div>
                    <button
                      type="button"
                      className="chk-box-btn"
                      onClick={() => {
                        const updatedSkills = [...activeNpc.skills];
                        updatedSkills[idx].checked = !updatedSkills[idx].checked;
                        updateActiveNpc({ skills: updatedSkills });
                      }}
                      title="Toggle experience check"
                    >
                      {sk.checked ? <CheckSquare size={14} className="gold-text" /> : <Square size={14} className="text-muted" />}
                    </button>
                    <button
                      type="button"
                      className="row-del-btn no-print"
                      onClick={() => removeSkillRow(idx)}
                      title="Remove skill"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Magic Block */}
            <div className="npc-bottom-col npc-magic-section">
              <h3 className="section-title">MAGIC</h3>

              {/* Spirit Magic */}
              <div className="magic-sub-block">
                <div className="flex justify-between items-center magic-header-line">
                  <span>Spirit Magic</span>
                  <button type="button" className="btn-tiny no-print" onClick={addSpiritSpell} title="Add spirit magic spell">
                    <Plus size={11} /> Add
                  </button>
                </div>
                <div className="magic-entries-list">
                  {(activeNpc.spiritMagic || []).map((sp, idx) => (
                    <div key={idx} className="spell-row">
                      <input
                        type="text"
                        className="sheet-inline-txt"
                        value={sp.name}
                        onChange={e => updateSpiritSpell(idx, 'name', e.target.value)}
                        placeholder="Spell name..."
                      />
                      <div className="spell-pts-wrap">
                        <input
                          type="number"
                          className="sheet-inline-pts"
                          value={sp.points}
                          onChange={e => updateSpiritSpell(idx, 'points', e.target.value)}
                        />
                        <span className="unit-pt">pt</span>
                      </div>
                      <button
                        type="button"
                        className="btn-tiny no-print ml-1"
                        onClick={() => {
                          const cost = typeof sp.points === 'number' ? sp.points : 1;
                          updateActiveNpc({ currentMp: Math.max(0, activeNpc.currentMp - cost) });
                          onOpenDiceRoller({
                            label: `Cast ${sp.name}`,
                            target: (activeNpc.stats.POW || 10) * 5,
                            type: 'd100'
                          });
                        }}
                      >
                        Cast
                      </button>
                      <button
                        type="button"
                        className="row-del-btn no-print"
                        onClick={() => removeSpiritSpell(idx)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {(!activeNpc.spiritMagic || activeNpc.spiritMagic.length === 0) && (
                    <span className="text-muted small-text italic py-1">No spirit magic</span>
                  )}
                </div>
              </div>

              {/* Rune Magic */}
              <div className="magic-sub-block mt-3">
                <div className="flex justify-between items-center magic-header-line">
                  <span>Rune Magic</span>
                  <button type="button" className="btn-tiny no-print" onClick={addRuneSpell} title="Add rune magic spell">
                    <Plus size={11} /> Add
                  </button>
                </div>
                <div className="magic-entries-list">
                  {(activeNpc.runeMagic || []).map((sp, idx) => (
                    <div key={idx} className="spell-row">
                      <input
                        type="text"
                        className="sheet-inline-txt"
                        value={sp}
                        onChange={e => updateRuneSpell(idx, e.target.value)}
                        placeholder="Rune spell..."
                      />
                      <button
                        type="button"
                        className="btn-tiny no-print ml-1"
                        onClick={() => {
                          const match = String(sp).match(/\((\d+)/);
                          const cost = match ? parseInt(match[1], 10) : 1;
                          updateActiveNpc({
                            cult1: { ...activeNpc.cult1, currentRp: Math.max(0, (activeNpc.cult1?.currentRp || 1) - cost) }
                          });
                          onOpenDiceRoller({ label: `Cast ${sp}`, target: 80, type: 'd100' });
                        }}
                      >
                        Cast
                      </button>
                      <button
                        type="button"
                        className="row-del-btn no-print"
                        onClick={() => removeRuneSpell(idx)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {(!activeNpc.runeMagic || activeNpc.runeMagic.length === 0) && (
                    <span className="text-muted small-text italic py-1">No rune magic</span>
                  )}
                </div>
              </div>
            </div>

            {/* Weapons Block (Melee & Missile) */}
            <div className="npc-bottom-col npc-weapons-section">
              <h3 className="section-title">WEAPONS</h3>

              {/* Melee Table */}
              <div className="weapons-sub-table">
                <div className="flex justify-between items-center mb-1">
                  <span className="sub-table-title font-bold text-xs uppercase text-amber-800">Melee Weapons</span>
                  <button type="button" className="btn-tiny no-print" onClick={addMeleeWeapon} title="Add melee weapon row">
                    <Plus size={11} /> Add
                  </button>
                </div>

                <table className="npc-weapon-tbl">
                  <thead>
                    <tr>
                      <th className="w-col-name">Melee</th>
                      <th className="w-col-pct">%</th>
                      <th className="w-col-dmg">DMG</th>
                      <th className="w-col-enc">ENC</th>
                      <th className="w-col-hp">HP</th>
                      <th className="w-col-sr">SR</th>
                      <th className="w-col-chk"></th>
                      <th className="w-col-del no-print"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeNpc.meleeWeapons || []).map((w, idx) => (
                      <tr key={idx}>
                        <td className="w-col-name">
                          <input
                            type="text"
                            className="sheet-w-input"
                            value={w.name}
                            onChange={e => updateMeleeWeapon(idx, 'name', e.target.value)}
                            placeholder="Weapon..."
                          />
                        </td>
                        <td className="w-col-pct">
                          <div className="weapon-pct-roll-wrap">
                            <input
                              type="number"
                              className="sheet-w-num"
                              value={w.skill}
                              onChange={e => updateMeleeWeapon(idx, 'skill', e.target.value)}
                            />
                            <button
                              type="button"
                              className="weapon-dice-btn no-print"
                              onClick={() => onOpenDiceRoller({ label: `${activeNpc.name || 'NPC'} ${w.name} Attack`, target: w.skill, type: 'd100' })}
                              title="Roll Attack"
                            >
                              🎲
                            </button>
                          </div>
                        </td>
                        <td className="w-col-dmg">
                          <input
                            type="text"
                            className="sheet-w-dmg"
                            value={w.damage}
                            onChange={e => updateMeleeWeapon(idx, 'damage', e.target.value)}
                            placeholder="1D8+1"
                          />
                        </td>
                        <td className="w-col-enc">
                          <input
                            type="number"
                            step="0.1"
                            className="sheet-w-sm"
                            value={w.enc}
                            onChange={e => updateMeleeWeapon(idx, 'enc', e.target.value)}
                          />
                        </td>
                        <td className="w-col-hp">
                          <input
                            type="number"
                            className="sheet-w-sm"
                            value={w.hp}
                            onChange={e => updateMeleeWeapon(idx, 'hp', e.target.value)}
                          />
                        </td>
                        <td className="w-col-sr">
                          <input
                            type="number"
                            className="sheet-w-sm"
                            value={w.sr}
                            onChange={e => updateMeleeWeapon(idx, 'sr', e.target.value)}
                          />
                        </td>
                        <td className="w-col-chk">
                          <button
                            type="button"
                            className="chk-box-btn"
                            onClick={() => {
                              const updated = [...activeNpc.meleeWeapons];
                              updated[idx].checked = !updated[idx].checked;
                              updateActiveNpc({ meleeWeapons: updated });
                            }}
                          >
                            {w.checked ? <CheckSquare size={13} className="gold-text" /> : <Square size={13} className="text-muted" />}
                          </button>
                        </td>
                        <td className="w-col-del no-print">
                          <button
                            type="button"
                            className="row-del-btn"
                            onClick={() => removeMeleeWeapon(idx)}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Missile Table */}
              <div className="weapons-sub-table mt-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="sub-table-title font-bold text-xs uppercase text-amber-800">Missile Weapons</span>
                  <button type="button" className="btn-tiny no-print" onClick={addMissileWeapon} title="Add missile weapon row">
                    <Plus size={11} /> Add
                  </button>
                </div>

                <table className="npc-weapon-tbl">
                  <thead>
                    <tr>
                      <th className="w-col-name">Missile</th>
                      <th className="w-col-pct">%</th>
                      <th className="w-col-dmg">DMG</th>
                      <th className="w-col-enc">ENC</th>
                      <th className="w-col-hp">HP</th>
                      <th className="w-col-sr">Range</th>
                      <th className="w-col-sr">Rate</th>
                      <th className="w-col-chk"></th>
                      <th className="w-col-del no-print"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeNpc.missileWeapons || []).map((w, idx) => (
                      <tr key={idx}>
                        <td className="w-col-name">
                          <input
                            type="text"
                            className="sheet-w-input"
                            value={w.name}
                            onChange={e => updateMissileWeapon(idx, 'name', e.target.value)}
                            placeholder="Missile..."
                          />
                        </td>
                        <td className="w-col-pct">
                          <div className="weapon-pct-roll-wrap">
                            <input
                              type="number"
                              className="sheet-w-num"
                              value={w.skill}
                              onChange={e => updateMissileWeapon(idx, 'skill', e.target.value)}
                            />
                            <button
                              type="button"
                              className="weapon-dice-btn no-print"
                              onClick={() => onOpenDiceRoller({ label: `${activeNpc.name || 'NPC'} ${w.name} Missile Attack`, target: w.skill, type: 'd100' })}
                              title="Roll Missile Attack"
                            >
                              🎲
                            </button>
                          </div>
                        </td>
                        <td className="w-col-dmg">
                          <input
                            type="text"
                            className="sheet-w-dmg"
                            value={w.damage}
                            onChange={e => updateMissileWeapon(idx, 'damage', e.target.value)}
                            placeholder="1D6"
                          />
                        </td>
                        <td className="w-col-enc">
                          <input
                            type="number"
                            step="0.1"
                            className="sheet-w-sm"
                            value={w.enc}
                            onChange={e => updateMissileWeapon(idx, 'enc', e.target.value)}
                          />
                        </td>
                        <td className="w-col-hp">
                          <input
                            type="number"
                            className="sheet-w-sm"
                            value={w.hp}
                            onChange={e => updateMissileWeapon(idx, 'hp', e.target.value)}
                          />
                        </td>
                        <td className="w-col-sr">
                          <input
                            type="text"
                            className="sheet-w-md"
                            value={w.range}
                            onChange={e => updateMissileWeapon(idx, 'range', e.target.value)}
                            placeholder="80m"
                          />
                        </td>
                        <td className="w-col-sr">
                          <input
                            type="text"
                            className="sheet-w-sm"
                            value={w.rate}
                            onChange={e => updateMissileWeapon(idx, 'rate', e.target.value)}
                            placeholder="1/MR"
                          />
                        </td>
                        <td className="w-col-chk">
                          <button
                            type="button"
                            className="chk-box-btn"
                            onClick={() => {
                              const updated = [...activeNpc.missileWeapons];
                              updated[idx].checked = !updated[idx].checked;
                              updateActiveNpc({ missileWeapons: updated });
                            }}
                          >
                            {w.checked ? <CheckSquare size={13} className="gold-text" /> : <Square size={13} className="text-muted" />}
                          </button>
                        </td>
                        <td className="w-col-del no-print">
                          <button
                            type="button"
                            className="row-del-btn"
                            onClick={() => removeMissileWeapon(idx)}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="ornate-divider">
            <span className="diamond">◇</span>
            <div className="divider-line"></div>
            <span className="diamond">◇</span>
          </div>

          {/* Section 4: Equipment & Notes */}
          <div className="npc-equipment-section">
            <h3 className="section-title">EQUIPMENT & NOTES</h3>
            <textarea
              className="sheet-notes-textarea"
              rows={3}
              value={activeNpc.equipment ?? activeNpc.notes ?? ''}
              onChange={e => updateActiveNpc({ equipment: e.target.value, notes: e.target.value })}
              placeholder="Weapons & armor notes, travel gear, provisions, treasure & coins, mount, tactical notes..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
