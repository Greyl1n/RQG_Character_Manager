import React, { useState } from 'react';
import {
  Compass, Flame, Shield, Award, Sparkles, BookOpen,
  ArrowRight, ArrowLeft, Check, Dice5, RefreshCw, UserCheck, Plus, Trash2
} from 'lucide-react';
import rulesData from '../data/rqgRulesData.json';
import {
  calculateDerivedAttributes,
  calculateCategoryModifiers,
  buildCharacterSkills,
  getSkillCategoryForName,
  rollDice
} from '../utils/rqgRulesEngine';

const STEPS = [
  { id: 'homeland', title: '1. Homeland', icon: Compass, desc: 'Origins, cultural ties, and initial runes' },
  { id: 'runes', title: '2. Runes', icon: Flame, desc: 'Elemental affinities and Power dualities' },
  { id: 'stats', title: '3. Characteristics', icon: Shield, desc: 'Roll or assign your 7 core attributes' },
  { id: 'occupation', title: '4. Profession Skills', icon: Award, desc: 'House rule: assign profession skill % freely' },
  { id: 'cult', title: '5. Cult & Magic', icon: Sparkles, desc: 'Deity initiation, Rune & Spirit Magic' },
  { id: 'personal', title: '6. Personal Skills & Details', icon: BookOpen, desc: 'Personal interests, heirloom, and identity' }
];

export default function CharacterWizard({ onSave, onCancel }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [profSearch, setProfSearch] = useState('');
  const [profCatFilter, setProfCatFilter] = useState('All');
  const [customProfSkillName, setCustomProfSkillName] = useState('');
  const [customProfSkillBonus, setCustomProfSkillBonus] = useState(20);
  const [draftCatMods, setDraftCatMods] = useState({});

  // Character creation state
  const [charData, setCharData] = useState({
    name: 'New Adventurer',
    gender: 'Female',
    age: 21,
    homeland: 'Sartar',
    tribe: 'Colymar',
    clan: 'Ernaldori',
    occupation: '',
    cult: 'Orlanth',
    subcult: '',
    runePoints: 3,
    currentRp: 3,
    reputation: 15,
    heirloom: rulesData.heirlooms[0],
    stats: {
      STR: 13, CON: 12, SIZ: 12, DEX: 11, INT: 14, POW: 13, CHA: 12
    },
    customCategoryMods: {},
    runes: {
      Air: 60, Earth: 40, 'Fire/Sky': 20, Darkness: 0, Water: 0, Moon: 0,
      Movement: 75, Stasis: 25,
      Death: 75, Fertility: 25,
      Truth: 50, Illusion: 50,
      Harmony: 50, Disorder: 50,
      Man: 50, Beast: 50
    },
    primaryElem: 'Air',
    secondaryElem: 'Earth',
    tertiaryElem: 'Fire/Sky',
    customProfessionSkills: {},
    selectedCultSpells: [],
    selectedSpiritSpells: [],
    personalSkillBonuses: {
      plus25: ['Broadsword', 'Battle', 'First Aid', 'Scan'],
      plus10: ['Sing', 'Dance', 'Dodge', 'Ride', 'Bargain']
    },
    notes: 'A valiant hero ready to leave their mark on the Gloranthan saga.'
  });

  const updateChar = (fields) => {
    setCharData(prev => ({ ...prev, ...fields }));
  };

  const rulebookCatMods = calculateCategoryModifiers(charData.stats);
  const effectiveCatMods = calculateCategoryModifiers(charData.stats, charData.customCategoryMods);
  const hasCustomCatMods = Object.keys(charData.customCategoryMods || {}).length > 0;

  const handleWizardCatModChange = (cat, rawVal) => {
    setDraftCatMods(prev => ({ ...prev, [cat]: rawVal }));
    if (rawVal === '' || rawVal === '-') return;
    const parsed = parseInt(rawVal, 10);
    if (Number.isNaN(parsed)) return;
    updateChar({
      customCategoryMods: {
        ...(charData.customCategoryMods || {}),
        [cat]: parsed
      }
    });
  };

  const handleWizardCatModBlur = (cat) => {
    setDraftCatMods(prev => {
      const next = { ...prev };
      delete next[cat];
      return next;
    });
  };

  const handleResetWizardCatMods = (targetCat = null) => {
    if (!targetCat) {
      setDraftCatMods({});
      updateChar({ customCategoryMods: {} });
    } else {
      const next = { ...(charData.customCategoryMods || {}) };
      delete next[targetCat];
      setDraftCatMods(prev => {
        const d = { ...prev };
        delete d[targetCat];
        return d;
      });
      updateChar({ customCategoryMods: next });
    }
  };

  const handleRollStats = () => {
    let s = {
      STR: rollDice(3, 6).total,
      CON: rollDice(3, 6).total,
      SIZ: rollDice(2, 6, 6).total,
      DEX: rollDice(3, 6).total,
      INT: rollDice(2, 6, 6).total,
      POW: rollDice(3, 6).total,
      CHA: rollDice(3, 6).total
    };
    const sum = Object.values(s).reduce((a, b) => a + b, 0);
    if (sum <= 92) {
      s.STR = Math.min(18, s.STR + 1);
      s.CON = Math.min(18, s.CON + 1);
      s.POW = Math.min(18, s.POW + 1);
    }

    // Apply Elemental Rune characteristic modifiers (+2 for Primary, +1 for Secondary, RQG p. 52)
    const elemStatMap = {
      Darkness: 'SIZ',
      Water: 'DEX',
      Earth: 'CON',
      Air: 'STR',
      'Fire/Sky': 'INT',
      Moon: 'POW'
    };
    if (charData.primaryElem && elemStatMap[charData.primaryElem]) {
      s[elemStatMap[charData.primaryElem]] += 2;
    }
    if (charData.secondaryElem && elemStatMap[charData.secondaryElem]) {
      s[elemStatMap[charData.secondaryElem]] += 1;
    }

    // Apply Homeland characteristic modifiers (e.g. Bison, High Llama, Impala Riders)
    const hl = rulesData.homelands[charData.homeland];
    if (hl?.statModifiers) {
      Object.entries(hl.statModifiers).forEach(([statKey, mod]) => {
        s[statKey] = Math.max(3, (s[statKey] || 10) + mod);
      });
    }

    updateChar({ stats: s });
  };

  const handleFinish = () => {
    const derived = calculateDerivedAttributes(charData.stats);
    const homeland = rulesData.homelands[charData.homeland] || {};
    const cult = rulesData.cults[charData.cult] || {};

    // Apply Homeland Elemental Rune Bonus (+10%)
    const finalRunes = { ...charData.runes };
    if (homeland.elementalRuneBonus) {
      Object.entries(homeland.elementalRuneBonus).forEach(([r, bonus]) => {
        finalRunes[r] = Math.min(100, (finalRunes[r] || 0) + bonus);
      });
    }

    // Assemble final skills via RQG Rules Engine (Homeland + Cult + Custom Profession + Personal + Editable Category Mods)
    const finalSkills = buildCharacterSkills({
      stats: charData.stats,
      customCategoryMods: charData.customCategoryMods,
      homelandKey: charData.homeland,
      cultKey: charData.cult,
      customProfessionSkills: charData.customProfessionSkills,
      personalPlus25: charData.personalSkillBonuses.plus25,
      personalPlus10: charData.personalSkillBonuses.plus10
    });

    const passions = [...(homeland.passions || [])];
    if (cult.passions) {
      cult.passions.forEach(p => {
        if (!passions.some(existing => existing.name === p)) {
          passions.push({ name: p, value: 60 });
        }
      });
    }

    const runeMagic = charData.selectedCultSpells.length > 0
      ? charData.selectedCultSpells
      : (cult.specialRuneMagic ? cult.specialRuneMagic.slice(0, 3) : []);
    const rawSpiritMagic = charData.selectedSpiritSpells.length > 0
      ? charData.selectedSpiritSpells
      : (cult.spiritMagic ? cult.spiritMagic.slice(0, 3) : []);
    const spiritMagic = rawSpiritMagic.map(sp => ({
      name: sp.name,
      points: typeof sp.points === 'number' ? sp.points : (parseInt(sp.points, 10) || 2)
    }));

    const newAdventurer = {
      ...charData,
      id: 'rqg-' + Date.now(),
      runes: finalRunes,
      skills: finalSkills,
      checkedSkills: {},
      passions,
      runeMagic,
      spiritMagic,
      ...derived
    };

    onSave(newAdventurer);
  };

  const selectedHomeland = rulesData.homelands[charData.homeland] || {};
  const selectedCult = rulesData.cults[charData.cult] || {};

  // Preview skills without profession bonus so Step 4 shows exact Base + Homeland + Cult vs Custom Profession %
  const basePlusHomelandAndCultSkills = buildCharacterSkills({
    stats: charData.stats,
    customCategoryMods: charData.customCategoryMods,
    homelandKey: charData.homeland,
    cultKey: charData.cult,
    customProfessionSkills: {},
    personalPlus25: [],
    personalPlus10: []
  });

  // Include any custom skills added in Step 4
  Object.keys(charData.customProfessionSkills || {}).forEach(sk => {
    if (basePlusHomelandAndCultSkills[sk] === undefined) {
      const cat = getSkillCategoryForName(sk);
      basePlusHomelandAndCultSkills[sk] = Math.max(0, 5 + (effectiveCatMods[cat] || 0));
    }
  });

  return (
    <div className="wizard-container">
      {/* Wizard Progress Header */}
      <div className="wizard-steps-bar">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;
          return (
            <button
              key={s.id}
              className={`wizard-step-tab ${isCurrent ? 'active' : ''} ${isDone ? 'done' : ''}`}
              onClick={() => setCurrentStep(idx)}
            >
              <div className="wizard-step-icon">
                {isDone ? <Check size={18} /> : <Icon size={18} />}
              </div>
              <div className="wizard-step-info">
                <span className="step-title">{s.title}</span>
                <span className="step-desc">{s.desc}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="wizard-body card">
        {currentStep === 0 && (
          <div className="wizard-step-content">
            <h2 className="step-heading">Step 1: Choose Your Homeland</h2>
            <p className="step-subheading">
              Your homeland determines your cultural background, base passions, ancestral skills, and elemental affinity bonuses.
            </p>

            <div className="grid-2-col">
              <div className="homelands-list">
                {Object.keys(rulesData.homelands).map(hKey => {
                  const hl = rulesData.homelands[hKey];
                  const isSelected = charData.homeland === hKey;
                  return (
                    <div
                      key={hKey}
                      className={`selection-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => updateChar({ homeland: hKey })}
                    >
                      <div className="selection-card-header">
                        <h4>{hl.name}</h4>
                        {hl.elementalRuneBonus && (
                          <span className="badge badge-accent">
                            {Object.entries(hl.elementalRuneBonus).map(([r, b]) => `${r} +${b}%`).join(', ')}
                          </span>
                        )}
                      </div>
                      <p className="selection-card-desc">{hl.notes}</p>
                    </div>
                  );
                })}
              </div>

              <div className="homeland-preview card card-subtle">
                <h3 className="gold-text">{selectedHomeland.name} Cultural Profile</h3>
                <p className="small-text">{selectedHomeland.notes}</p>

                <div className="preview-section">
                  <h5>Starting Passions (60%)</h5>
                  <ul className="pill-list">
                    {selectedHomeland.passions?.map((p, i) => (
                      <li key={i} className="badge badge-info">{p.name}: {p.value}%</li>
                    ))}
                  </ul>
                </div>

                <div className="preview-section">
                  <h5>Cultural Skills</h5>
                  <div className="skills-pill-wrap">
                    {selectedHomeland.skills && Object.entries(selectedHomeland.skills).map(([sk, b]) => (
                      <span key={sk} className="badge badge-outline">{sk} +{b}%</span>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Tribe or Region</label>
                    <input
                      type="text"
                      value={charData.tribe}
                      onChange={e => updateChar({ tribe: e.target.value })}
                      placeholder="e.g. Colymar, Dundealos"
                    />
                  </div>
                  <div className="form-group">
                    <label>Clan or City</label>
                    <input
                      type="text"
                      value={charData.clan}
                      onChange={e => updateChar({ clan: e.target.value })}
                      placeholder="e.g. Ernaldori, Clearwine"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="wizard-step-content">
            <h2 className="step-heading">Step 2: Assign Rune Affinities</h2>
            <p className="step-subheading">
              Runes are the primal cosmic forces that define your adventurer’s soul, nature, and divine magic capability.
            </p>

            <div className="grid-2-col">
              <div className="runes-panel card card-subtle">
                <h3 className="gold-text">Elemental Runes</h3>
                <p className="small-text">
                  Choose your Primary (60%), Secondary (40%), and Tertiary (20%) elements. (Homeland bonus is automatically added).
                </p>

                <div className="form-group">
                  <label>Primary Element (60% + modifier)</label>
                  <select
                    value={charData.primaryElem}
                    onChange={e => {
                      const newP = e.target.value;
                      const newRunes = { ...charData.runes, [charData.primaryElem]: 0, [newP]: 60 };
                      updateChar({ primaryElem: newP, runes: newRunes });
                    }}
                  >
                    {['Air', 'Earth', 'Fire/Sky', 'Darkness', 'Water', 'Moon'].map(el => (
                      <option key={el} value={el}>{el}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Secondary Element (40% + modifier)</label>
                  <select
                    value={charData.secondaryElem}
                    onChange={e => {
                      const newS = e.target.value;
                      const newRunes = { ...charData.runes, [charData.secondaryElem]: 0, [newS]: 40 };
                      updateChar({ secondaryElem: newS, runes: newRunes });
                    }}
                  >
                    {['Air', 'Earth', 'Fire/Sky', 'Darkness', 'Water', 'Moon']
                      .filter(el => el !== charData.primaryElem)
                      .map(el => (
                        <option key={el} value={el}>{el}</option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Tertiary Element (20%)</label>
                  <select
                    value={charData.tertiaryElem}
                    onChange={e => {
                      const newT = e.target.value;
                      const newRunes = { ...charData.runes, [charData.tertiaryElem]: 0, [newT]: 20 };
                      updateChar({ tertiaryElem: newT, runes: newRunes });
                    }}
                  >
                    {['Air', 'Earth', 'Fire/Sky', 'Darkness', 'Water', 'Moon']
                      .filter(el => el !== charData.primaryElem && el !== charData.secondaryElem)
                      .map(el => (
                        <option key={el} value={el}>{el}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="runes-panel card card-subtle">
                <h3 className="gold-text">Power & Form Runes</h3>
                <p className="small-text">
                  Choose two opposed pairs to start at 75% / 25%. The rest begin balanced at 50% / 50%.
                </p>

                {[
                  ['Movement', 'Stasis'],
                  ['Death', 'Fertility'],
                  ['Truth', 'Illusion'],
                  ['Harmony', 'Disorder'],
                  ['Man', 'Beast']
                ].map(([r1, r2]) => (
                  <div key={r1} className="power-pair-row">
                    <span className={`rune-label ${charData.runes[r1] > 50 ? 'active-rune' : ''}`}>
                      {r1} ({charData.runes[r1] || 50}%)
                    </span>
                    <input
                      type="range"
                      min="25"
                      max="75"
                      step="25"
                      value={charData.runes[r1] || 50}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        updateChar({
                          runes: {
                            ...charData.runes,
                            [r1]: val,
                            [r2]: 100 - val
                          }
                        });
                      }}
                    />
                    <span className={`rune-label ${charData.runes[r2] > 50 ? 'active-rune' : ''}`}>
                      {r2} ({charData.runes[r2] || 50}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="wizard-step-content">
            <h2 className="step-heading">Step 3: Determine Characteristics</h2>
            <p className="step-subheading">
              Roll 3D6 for STR, CON, DEX, POW, CHA; 2D6+6 for SIZ & INT. Rune and Homeland modifiers are automatically applied.
            </p>

            <div className="action-banner">
              <button className="btn btn-primary" onClick={handleRollStats}>
                <Dice5 size={18} /> Roll All Attributes (3D6 / 2D6+6)
              </button>
              <span className="small-text text-muted">
                Rule note: If total is ≤ 92, free bonus points are added according to RQG core rules.
              </span>
            </div>

            <div className="stats-grid">
              {['STR', 'CON', 'SIZ', 'DEX', 'INT', 'POW', 'CHA'].map(stat => (
                <div key={stat} className="stat-card">
                  <div className="stat-card-title">{stat}</div>
                  <input
                    type="number"
                    min="3"
                    max="24"
                    value={charData.stats[stat] || 10}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 10;
                      updateChar({
                        stats: { ...charData.stats, [stat]: val }
                      });
                    }}
                    className="stat-input"
                  />
                  <span className="stat-desc">
                    {stat === 'STR' && 'Strength & Muscle'}
                    {stat === 'CON' && 'Health & Stamina'}
                    {stat === 'SIZ' && 'Mass & Height'}
                    {stat === 'DEX' && 'Agility & Coordination'}
                    {stat === 'INT' && 'Memory & Reason'}
                    {stat === 'POW' && 'Soul & Willpower'}
                    {stat === 'CHA' && 'Presence & Magnetism'}
                  </span>
                </div>
              ))}
            </div>

            {/* Derived preview */}
            <div className="derived-preview-bar">
              {(() => {
                const derived = calculateDerivedAttributes(charData.stats);
                return (
                  <>
                    <div className="stat-pill"><strong>HP:</strong> {derived.totalHp}</div>
                    <div className="stat-pill"><strong>MP:</strong> {derived.totalMp}</div>
                    <div className="stat-pill"><strong>Damage Bonus:</strong> {derived.damageBonus}</div>
                    <div className="stat-pill"><strong>Healing Rate:</strong> {derived.healingRate}/wk</div>
                    <div className="stat-pill"><strong>Melee SR:</strong> {derived.meleeSr} (DEX {derived.dexSr} / SIZ {derived.sizSr})</div>
                    <div className="stat-pill"><strong>Max ENC:</strong> {derived.maxEnc}</div>
                  </>
                );
              })()}
            </div>

            {/* Editable Skill Category Modifiers in Step 3 */}
            <div className="card card-subtle mt-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 className="gold-text" style={{ margin: 0 }}>Skill Category Bonuses (Calculated from Stats — Editable for House Rules)</h4>
                  <p className="small-text text-muted" style={{ margin: '2px 0 0 0' }}>
                    Automatically calculated per RQG rulebook. You can freely edit any category bonus below.
                  </p>
                </div>
                {hasCustomCatMods && (
                  <button
                    type="button"
                    className="btn-tiny"
                    onClick={() => handleResetWizardCatMods()}
                  >
                    ↺ Reset All to Rulebook
                  </button>
                )}
              </div>

              <div className="category-mods-row mt-2">
                {Object.entries(effectiveCatMods).map(([cat, mod]) => {
                  const isCustom = charData.customCategoryMods?.[cat] !== undefined && mod !== rulebookCatMods[cat];
                  const displayVal = draftCatMods[cat] !== undefined ? draftCatMods[cat] : mod;
                  return (
                    <div key={cat} className={`cat-mod-pill ${isCustom ? 'is-custom' : ''}`}>
                      <span className="cat-name">{cat}</span>
                      <div className="cat-mod-input-wrap">
                        <input
                          type="number"
                          className={`cat-mod-input ${mod >= 0 ? 'pos' : 'neg'}`}
                          value={displayVal}
                          onChange={e => handleWizardCatModChange(cat, e.target.value)}
                          onBlur={() => handleWizardCatModBlur(cat)}
                          title={`Edit ${cat} Category Bonus % (Rulebook: ${rulebookCatMods[cat] >= 0 ? `+${rulebookCatMods[cat]}%` : `${rulebookCatMods[cat]}%`})`}
                        />
                        <span className={`cat-val ${mod >= 0 ? 'pos' : 'neg'}`}>%</span>
                      </div>
                      {isCustom && (
                        <button
                          type="button"
                          className="btn-tiny"
                          style={{ padding: '1px 4px', fontSize: '0.7rem' }}
                          onClick={() => handleResetWizardCatMods(cat)}
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

        {currentStep === 3 && (
          <div className="wizard-step-content">
            <h2 className="step-heading">Step 4: Profession Skill % Allocation (House Rules)</h2>
            <p className="step-subheading">
              No preset profession is forced. Set your own profession skill % bonuses freely below according to your house rules.
              Homeland, Cultural Weapon, and Cult skill bonuses are calculated automatically per the core rules.
            </p>

            <div className="card card-subtle mb-4">
              <div className="form-row items-center">
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Optional Custom Profession / Calling Label (leave blank for none)</label>
                  <input
                    type="text"
                    value={charData.occupation || ''}
                    onChange={e => updateChar({ occupation: e.target.value })}
                    placeholder="None (House Rule Custom Skills)"
                  />
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Add Custom Skill to Profession Bonus</label>
                  <div className="form-inline" style={{ marginTop: 0 }}>
                    <input
                      type="text"
                      placeholder="Custom skill name..."
                      value={customProfSkillName}
                      onChange={e => setCustomProfSkillName(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="+%"
                      value={customProfSkillBonus}
                      onChange={e => setCustomProfSkillBonus(e.target.value)}
                      style={{ width: '80px' }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        const trimmed = customProfSkillName.trim();
                        if (!trimmed) return;
                        updateChar({
                          customProfessionSkills: {
                            ...charData.customProfessionSkills,
                            [trimmed]: parseInt(customProfSkillBonus, 10) || 0
                          }
                        });
                        setCustomProfSkillName('');
                      }}
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Editable Skill Category Modifiers in Step 4 */}
              <div style={{ borderTop: '1px solid rgba(212,175,55,0.2)', marginTop: '12px', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span className="small-text font-bold gold-text">
                    Skill Category Bonuses (Editable — skills recalculate automatically):
                  </span>
                  {hasCustomCatMods && (
                    <button
                      type="button"
                      className="btn-tiny"
                      onClick={() => handleResetWizardCatMods()}
                    >
                      ↺ Reset Category Bonuses to Rulebook
                    </button>
                  )}
                </div>
                <div className="category-mods-row">
                  {Object.entries(effectiveCatMods).map(([cat, mod]) => {
                    const isCustom = charData.customCategoryMods?.[cat] !== undefined && mod !== rulebookCatMods[cat];
                    const displayVal = draftCatMods[cat] !== undefined ? draftCatMods[cat] : mod;
                    return (
                      <div key={cat} className={`cat-mod-pill ${isCustom ? 'is-custom' : ''}`}>
                        <span className="cat-name">{cat}</span>
                        <div className="cat-mod-input-wrap">
                          <input
                            type="number"
                            className={`cat-mod-input ${mod >= 0 ? 'pos' : 'neg'}`}
                            value={displayVal}
                            onChange={e => handleWizardCatModChange(cat, e.target.value)}
                            onBlur={() => handleWizardCatModBlur(cat)}
                            title={`Edit ${cat} Category Bonus % (Rulebook: ${rulebookCatMods[cat] >= 0 ? `+${rulebookCatMods[cat]}%` : `${rulebookCatMods[cat]}%`})`}
                          />
                          <span className={`cat-val ${mod >= 0 ? 'pos' : 'neg'}`}>%</span>
                        </div>
                        {isCustom && (
                          <button
                            type="button"
                            className="btn-tiny"
                            style={{ padding: '1px 4px', fontSize: '0.7rem' }}
                            onClick={() => handleResetWizardCatMods(cat)}
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

              {/* Active Profession Skill Bonuses Summary */}
              {Object.entries(charData.customProfessionSkills || {}).filter(([, b]) => (parseInt(b, 10) || 0) !== 0).length > 0 && (
                <div className="preview-section mt-3">
                  <h5>Assigned Profession Skill Bonuses:</h5>
                  <div className="skills-pill-wrap">
                    {Object.entries(charData.customProfessionSkills)
                      .filter(([, b]) => (parseInt(b, 10) || 0) !== 0)
                      .map(([sk, b]) => (
                        <span key={sk} className="badge badge-accent">
                          {sk}: {b > 0 ? `+${b}%` : `${b}%`}
                          <button
                            type="button"
                            onClick={() => {
                              const next = { ...charData.customProfessionSkills };
                              delete next[sk];
                              updateChar({ customProfessionSkills: next });
                            }}
                            style={{ marginLeft: '6px', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}
                            title="Remove bonus"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Filter & Search Bar for All Skills */}
            <div className="skills-toolbar mb-3">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search any skill or weapon..."
                  value={profSearch}
                  onChange={e => setProfSearch(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="category-filter-buttons">
                {['All', 'Agility', 'Communication', 'Knowledge', 'Magic', 'Manipulation', 'Perception', 'Stealth'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`btn-filter ${profCatFilter === cat ? 'active' : ''}`}
                    onClick={() => setProfCatFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Profession Skill % Grid */}
            <div className="skills-grid">
              {Object.entries(basePlusHomelandAndCultSkills)
                .filter(([sk]) => {
                  if (profSearch && !sk.toLowerCase().includes(profSearch.toLowerCase())) return false;
                  if (profCatFilter !== 'All') {
                    return getSkillCategoryForName(sk) === profCatFilter;
                  }
                  return true;
                })
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([skName, baseVal]) => {
                  const profBonus = parseInt(charData.customProfessionSkills?.[skName], 10) || 0;
                  const totalVal = Math.max(0, baseVal + profBonus);
                  return (
                    <div key={skName} className="skill-item-card">
                      <div className="skill-card-top">
                        <span className="skill-name">{skName}</span>
                        <span className="skill-cat-tag">Base/Cult: {baseVal}%</span>
                      </div>
                      <div className="skill-card-controls">
                        <span className="small-text text-muted">
                          Total: <strong className="gold-text">{totalVal}%</strong>
                        </span>
                        <div className="skill-pct-input-wrap">
                          <span className="small-text text-muted">+</span>
                          <input
                            type="number"
                            className="skill-pct-input"
                            value={charData.customProfessionSkills?.[skName] ?? ''}
                            placeholder="0"
                            onChange={e => {
                              const val = e.target.value;
                              const next = { ...charData.customProfessionSkills };
                              if (val === '' || parseInt(val, 10) === 0) {
                                delete next[skName];
                              } else {
                                next[skName] = parseInt(val, 10) || 0;
                              }
                              updateChar({ customProfessionSkills: next });
                            }}
                            title={`Set Profession Skill % bonus for ${skName}`}
                          />
                          <span className="small-text gold-text font-bold">%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="wizard-step-content">
            <h2 className="step-heading">Step 5: Cult Initiation & Magic</h2>
            <p className="step-subheading">
              Initiates gain 3 Rune Points, access to all 12 Common Rune Magic spells, 3 Special Cult Rune Spells, and 5 points of Cult Spirit Magic (RQG Core Rules p. 68).
            </p>

            <div className="grid-2-col">
              <div className="cults-list scroll-area">
                {Object.keys(rulesData.cults).map(cKey => {
                  const cult = rulesData.cults[cKey];
                  const isSelected = charData.cult === cKey;
                  return (
                    <div
                      key={cKey}
                      className={`selection-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => updateChar({ cult: cKey, selectedCultSpells: [], selectedSpiritSpells: [] })}
                    >
                      <div className="selection-card-header">
                        <h4>{cult.name}</h4>
                        <div className="runes-tag-group">
                          {cult.runes.map(r => (
                            <span key={r} className="badge badge-accent small">{r}</span>
                          ))}
                        </div>
                      </div>
                      <p className="selection-card-desc">{cult.title} — {cult.description}</p>
                    </div>
                  );
                })}
              </div>

              <div className="card card-subtle">
                <h3 className="gold-text">{selectedCult.name} Mysteries</h3>
                <p className="small-text"><em>{selectedCult.title}</em> — {selectedCult.description}</p>

                <div className="preview-section">
                  <h5>
                    Special Rune Spells (Choose 3 — {charData.selectedCultSpells.length} selected; defaults to first 3 if none picked)
                  </h5>
                  <div className="spell-checkbox-grid">
                    {selectedCult.specialRuneMagic?.map(sp => {
                      const meta = rulesData.specialRuneMagicCatalog?.[sp];
                      return (
                        <label
                          key={sp}
                          className="checkbox-item"
                          title={meta ? `${sp} (${meta.cost} RP, ${meta.rune} Rune): ${meta.description}` : sp}
                        >
                          <input
                            type="checkbox"
                            checked={charData.selectedCultSpells.includes(sp)}
                            onChange={e => {
                              if (e.target.checked) {
                                updateChar({ selectedCultSpells: [...charData.selectedCultSpells, sp] });
                              } else {
                                updateChar({ selectedCultSpells: charData.selectedCultSpells.filter(s => s !== sp) });
                              }
                            }}
                          />
                          <span>
                            {sp}{' '}
                            {meta && (
                              <span className="small-text text-muted">
                                ({meta.cost} RP, {meta.rune})
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="preview-section">
                  <h5>
                    Cult Spirit Magic Spells (Starting Allowance: 5 pts —{' '}
                    {charData.selectedSpiritSpells.reduce((sum, s) => sum + (parseInt(s.points, 10) || 1), 0)} pts selected)
                  </h5>
                  <div className="spell-checkbox-grid">
                    {selectedCult.spiritMagic?.map(sp => {
                      const catInfo = rulesData.spiritMagicCatalog?.[sp.name];
                      const selectedEntry = charData.selectedSpiritSpells.find(s => s.name === sp.name);
                      const isChecked = Boolean(selectedEntry);
                      const isVar = sp.points === 'var' || catInfo?.points === 'var';
                      const defaultPts = typeof sp.points === 'number' ? sp.points : 2;
                      return (
                        <div
                          key={sp.name}
                          className="checkbox-item"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}
                          title={catInfo ? `${sp.name} (${catInfo.range}, ${catInfo.duration}, ${catInfo.type}): ${catInfo.description}` : sp.name}
                        >
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flex: 1 }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) {
                                  updateChar({
                                    selectedSpiritSpells: [
                                      ...charData.selectedSpiritSpells,
                                      { name: sp.name, points: defaultPts }
                                    ]
                                  });
                                } else {
                                  updateChar({
                                    selectedSpiritSpells: charData.selectedSpiritSpells.filter(s => s.name !== sp.name)
                                  });
                                }
                              }}
                            />
                            <span>
                              {sp.name}{' '}
                              <span className="small-text text-muted">
                                ({isVar ? 'Var' : `${sp.points} pt`})
                              </span>
                            </span>
                          </label>
                          {isChecked && isVar && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <input
                                type="number"
                                min="1"
                                max="6"
                                value={selectedEntry.points}
                                onChange={e => {
                                  const nextPts = Math.max(1, parseInt(e.target.value, 10) || 1);
                                  updateChar({
                                    selectedSpiritSpells: charData.selectedSpiritSpells.map(s =>
                                      s.name === sp.name ? { ...s, points: nextPts } : s
                                    )
                                  });
                                }}
                                style={{ width: '44px', padding: '1px 4px', fontSize: '0.78rem', textAlign: 'center' }}
                                title="Set variable Spirit Magic points"
                              />
                              <span className="small-text text-muted">pt</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="wizard-step-content">
            <h2 className="step-heading">Step 6: Personal Skills & Identity</h2>
            <p className="step-subheading">
              Fine-tune your personal skills (+25% to four skills, +10% to five skills), ancestral heirloom, and personal identity.
            </p>

            <div className="grid-2-col">
              <div className="card card-subtle">
                <h3 className="gold-text">Personal Details</h3>
                <div className="form-group">
                  <label>Adventurer Name</label>
                  <input
                    type="text"
                    value={charData.name}
                    onChange={e => updateChar({ name: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Gender</label>
                    <select
                      value={charData.gender}
                      onChange={e => updateChar({ gender: e.target.value })}
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Non-binary">Non-binary</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Age</label>
                    <input
                      type="number"
                      value={charData.age}
                      onChange={e => updateChar({ age: parseInt(e.target.value) || 21 })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Family Heirloom</label>
                  <select
                    value={charData.heirloom}
                    onChange={e => updateChar({ heirloom: e.target.value })}
                  >
                    {rulesData.heirlooms.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Adventurer Saga & Notes</label>
                  <textarea
                    rows="3"
                    value={charData.notes}
                    onChange={e => updateChar({ notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="card card-subtle">
                <h3 className="gold-text">Personal Skill Focus</h3>
                <p className="small-text">
                  Four skills receive a <strong>+25%</strong> personal mastery bonus, and five skills receive a <strong>+10%</strong> bonus. (All skills remain freely editable on the Character Sheet as well!)
                </p>

                <div className="preview-section">
                  <h5>+25% Personal Skills ({charData.personalSkillBonuses.plus25.length} selected)</h5>
                  <div className="skills-pill-wrap mb-2">
                    {charData.personalSkillBonuses.plus25.map(sk => (
                      <span key={sk} className="badge badge-accent">
                        {sk} +25%
                        <button
                          type="button"
                          onClick={() => updateChar({
                            personalSkillBonuses: {
                              ...charData.personalSkillBonuses,
                              plus25: charData.personalSkillBonuses.plus25.filter(s => s !== sk)
                            }
                          })}
                          style={{ marginLeft: '6px', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <select
                    value=""
                    onChange={e => {
                      const val = e.target.value;
                      if (val && !charData.personalSkillBonuses.plus25.includes(val)) {
                        updateChar({
                          personalSkillBonuses: {
                            ...charData.personalSkillBonuses,
                            plus25: [...charData.personalSkillBonuses.plus25, val]
                          }
                        });
                      }
                    }}
                  >
                    <option value="">+ Add +25% Personal Skill...</option>
                    {Object.keys(basePlusHomelandAndCultSkills).sort().map(sk => (
                      <option key={sk} value={sk}>{sk}</option>
                    ))}
                  </select>
                </div>

                <div className="preview-section">
                  <h5>+10% Personal Skills ({charData.personalSkillBonuses.plus10.length} selected)</h5>
                  <div className="skills-pill-wrap mb-2">
                    {charData.personalSkillBonuses.plus10.map(sk => (
                      <span key={sk} className="badge badge-outline">
                        {sk} +10%
                        <button
                          type="button"
                          onClick={() => updateChar({
                            personalSkillBonuses: {
                              ...charData.personalSkillBonuses,
                              plus10: charData.personalSkillBonuses.plus10.filter(s => s !== sk)
                            }
                          })}
                          style={{ marginLeft: '6px', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <select
                    value=""
                    onChange={e => {
                      const val = e.target.value;
                      if (val && !charData.personalSkillBonuses.plus10.includes(val)) {
                        updateChar({
                          personalSkillBonuses: {
                            ...charData.personalSkillBonuses,
                            plus10: [...charData.personalSkillBonuses.plus10, val]
                          }
                        });
                      }
                    }}
                  >
                    <option value="">+ Add +10% Personal Skill...</option>
                    {Object.keys(basePlusHomelandAndCultSkills).sort().map(sk => (
                      <option key={sk} value={sk}>{sk}</option>
                    ))}
                  </select>
                </div>

                <div className="preview-section ready-banner">
                  <UserCheck size={28} className="gold-text" />
                  <div>
                    <strong>Ready to forge your adventurer!</strong>
                    <p className="small-text">Click "Complete Adventurer" to finalize calculation and launch your interactive sheet.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="wizard-footer">
        <button
          className="btn btn-secondary"
          onClick={currentStep === 0 ? onCancel : () => setCurrentStep(prev => prev - 1)}
        >
          <ArrowLeft size={16} /> {currentStep === 0 ? 'Cancel' : 'Previous Step'}
        </button>

        {currentStep < STEPS.length - 1 ? (
          <button
            className="btn btn-primary"
            onClick={() => setCurrentStep(prev => prev + 1)}
          >
            Next Step <ArrowRight size={16} />
          </button>
        ) : (
          <button
            className="btn btn-success"
            onClick={handleFinish}
          >
            <Check size={16} /> Complete Adventurer & Open Sheet
          </button>
        )}
      </div>
    </div>
  );
}
