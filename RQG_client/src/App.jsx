import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Sparkles, BookOpen, Shield, HelpCircle,
  FileText, ArrowLeft, Download, Plus, Skull
} from 'lucide-react';

import CharacterRoster from './components/CharacterRoster';
import CharacterSheet from './components/CharacterSheet';
import CharacterWizard from './components/CharacterWizard';
import DiceRollerModal from './components/DiceRollerModal';
import PrintSheet from './components/PrintSheet';
import AboutView from './components/AboutView';
import NpcGeneratorView from './components/NpcGeneratorView';

import rulesData from './data/rqgRulesData.json';
import { generateRandomCharacter } from './utils/rqgRulesEngine';

const STORAGE_KEY = 'rqg_characters_roster_v1';
const ACTIVE_CHAR_KEY = 'rqg_active_character_id_v1';

export default function App() {
  const [characters, setCharacters] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    // Default fallback: pregenerated Vasana & Yanioth
    return rulesData.pregens || [];
  });

  const [activeCharacterId, setActiveCharacterId] = useState(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_CHAR_KEY);
      if (saved) return saved;
    } catch (e) {}
    return (rulesData.pregens && rulesData.pregens[0]?.id) || null;
  });

  const [currentView, setCurrentView] = useState('sheet'); // 'sheet', 'roster', 'wizard', 'npc', 'print', 'about'
  const [diceModalData, setDiceModalData] = useState(null);

  // Save on state change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
    } catch (e) {}
  }, [characters]);

  useEffect(() => {
    if (activeCharacterId) {
      try {
        localStorage.setItem(ACTIVE_CHAR_KEY, activeCharacterId);
      } catch (e) {}
    }
  }, [activeCharacterId]);

  const activeCharacter = characters.find(c => c.id === activeCharacterId) || characters[0];

  const handleUpdateCharacter = (updated) => {
    setCharacters(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const handleSelectCharacter = (id) => {
    setActiveCharacterId(id);
    setCurrentView('sheet');
  };

  const handleCreateNew = () => {
    setCurrentView('wizard');
  };

  const handleSaveWizardCharacter = (newChar) => {
    setCharacters(prev => [newChar, ...prev]);
    setActiveCharacterId(newChar.id);
    setCurrentView('sheet');
  };

  const handleQuickGenerate = () => {
    const quickChar = generateRandomCharacter();
    setCharacters(prev => [quickChar, ...prev]);
    setActiveCharacterId(quickChar.id);
    setCurrentView('sheet');
  };

  const handleDeleteCharacter = (id) => {
    const remaining = characters.filter(c => c.id !== id);
    setCharacters(remaining);
    if (activeCharacterId === id) {
      setActiveCharacterId(remaining[0]?.id || null);
    }
  };

  const handleImportCharacter = (imported) => {
    const newId = 'imported-' + Date.now();
    const ready = { ...imported, id: newId };
    setCharacters(prev => [ready, ...prev]);
    setActiveCharacterId(newId);
    setCurrentView('sheet');
  };

  const handleExportCharacter = (char) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(char, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `${char.name.replace(/\s+/g, '_')}_RQG.json`);
    dlAnchor.click();
  };

  const handlePromoteNpcToPc = (npc) => {
    const skillsObj = {};
    if (npc.skills) {
      npc.skills.forEach(s => {
        skillsObj[s.name] = s.value;
      });
    }
    const pc = {
      id: 'promoted-' + Date.now(),
      name: npc.name,
      gender: npc.gender,
      age: npc.age,
      homeland: npc.homeland,
      tribe: npc.tribe,
      clan: npc.clan,
      occupation: npc.occupation,
      cult: npc.cult1?.name || 'Orlanth',
      runePoints: npc.cult1?.maxRp || 3,
      currentRp: npc.cult1?.currentRp || 3,
      reputation: npc.reputation || 15,
      stats: { ...npc.stats },
      damageBonus: npc.damageBonus,
      sizSr: npc.sizSr,
      dexSr: npc.dexSr,
      meleeSr: npc.meleeSr,
      totalHp: npc.totalHp,
      currentHp: npc.currentHp,
      totalMp: npc.totalMp,
      currentMp: npc.currentMp,
      hitLocations: JSON.parse(JSON.stringify(npc.hitLocations)),
      skills: skillsObj,
      passions: [
        { name: 'Love (Family)', value: 60 },
        { name: `Loyalty (${npc.clan || 'Clan'})`, value: 60 },
        { name: `Devotion (${npc.cult1?.name || 'Deity'})`, value: 60 }
      ],
      runes: {
        Air: 60, Earth: 40, 'Fire/Sky': 20, Darkness: 0, Water: 0, Moon: 0,
        Movement: 75, Stasis: 25, Death: 75, Fertility: 25, Truth: 50, Illusion: 50,
        Harmony: 50, Disorder: 50, Man: 50, Beast: 50
      },
      spiritMagic: [...(npc.spiritMagic || [])],
      runeMagic: [...(npc.runeMagic || [])],
      notes: `Promoted from NPC: ${npc.appearance || ''}`
    };
    setCharacters(prev => [pc, ...prev]);
    setActiveCharacterId(pc.id);
    setCurrentView('sheet');
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="app-navbar no-print">
        <div className="nav-brand">
          <Shield size={24} className="gold-text" />
          <span className="brand-title">RuneQuest Glorantha</span>
          <span className="brand-badge">Character Companion</span>
        </div>

        <nav className="nav-links">
          <button
            className={`nav-btn ${currentView === 'sheet' ? 'active' : ''}`}
            onClick={() => setCurrentView('sheet')}
            disabled={!activeCharacter}
          >
            <FileText size={16} /> Sheet
          </button>
          <button
            className={`nav-btn ${currentView === 'roster' ? 'active' : ''}`}
            onClick={() => setCurrentView('roster')}
          >
            <Users size={16} /> Roster ({characters.length})
          </button>
          <button
            className={`nav-btn ${currentView === 'wizard' ? 'active' : ''}`}
            onClick={() => setCurrentView('wizard')}
          >
            <UserPlus size={16} /> New Hero
          </button>
          <button
            className={`nav-btn ${currentView === 'npc' ? 'active' : ''}`}
            onClick={() => setCurrentView('npc')}
          >
            <Skull size={16} /> NPC Generator
          </button>
          <button
            className="nav-btn"
            onClick={handleQuickGenerate}
            title="Create an instant complete adventurer"
          >
            <Sparkles size={16} /> Quick Roll
          </button>
          <button
            className={`nav-btn ${currentView === 'about' ? 'active' : ''}`}
            onClick={() => setCurrentView('about')}
          >
            <HelpCircle size={16} /> Rules & About
          </button>
        </nav>
      </header>

      {/* Main View Area */}
      <main className="main-content">
        {currentView === 'sheet' && activeCharacter && (
          <CharacterSheet
            character={activeCharacter}
            onUpdateCharacter={handleUpdateCharacter}
            onOpenDiceRoller={(data) => setDiceModalData(data)}
            onPrint={() => setCurrentView('print')}
          />
        )}

        {currentView === 'roster' && (
          <CharacterRoster
            characters={characters}
            activeCharacterId={activeCharacterId}
            onSelectCharacter={handleSelectCharacter}
            onCreateNew={handleCreateNew}
            onQuickGenerate={handleQuickGenerate}
            onDeleteCharacter={handleDeleteCharacter}
            onImportCharacter={handleImportCharacter}
            onExportCharacter={handleExportCharacter}
          />
        )}

        {currentView === 'wizard' && (
          <CharacterWizard
            onSave={handleSaveWizardCharacter}
            onCancel={() => setCurrentView(activeCharacter ? 'sheet' : 'roster')}
          />
        )}

        {currentView === 'npc' && (
          <NpcGeneratorView
            onOpenDiceRoller={(data) => setDiceModalData(data)}
            onPromoteToPc={handlePromoteNpcToPc}
          />
        )}

        {currentView === 'print' && activeCharacter && (
          <PrintSheet
            character={activeCharacter}
            onBack={() => setCurrentView('sheet')}
          />
        )}

        {currentView === 'about' && (
          <AboutView />
        )}
      </main>

      {/* Dice Roller Modal */}
      {diceModalData && (
        <DiceRollerModal
          rollData={diceModalData}
          onClose={() => setDiceModalData(null)}
        />
      )}
    </div>
  );
}
