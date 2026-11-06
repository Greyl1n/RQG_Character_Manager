import React, { useState, useRef } from 'react';
import {
  Dice5, Download, Upload, Check, HelpCircle, Skull
} from 'lucide-react';
import NpcGeneratorView from './components/NpcGeneratorView';
import DiceRollerModal from './components/DiceRollerModal';
import AboutView from './components/AboutView';

const NPC_STORAGE_KEY = 'rqg_saved_npcs_v1';

export default function App() {
  const [currentView, setCurrentView] = useState('npc'); // 'npc' | 'about'
  const [activeRoll, setActiveRoll] = useState(null);
  const [globalNotice, setGlobalNotice] = useState('');
  const fileInputRef = useRef(null);

  const flashGlobalNotice = (msg) => {
    setGlobalNotice(msg);
    setTimeout(() => setGlobalNotice(''), 3500);
  };

  // Open Dice Roller Modal
  const handleOpenDice = (rollData = { label: 'Generic D100 Roll', target: 50, type: 'd100' }) => {
    setActiveRoll(rollData);
  };

  // Export current NPC as single JSON file
  const handleExportSingleNpc = (npc) => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(npc, null, 2));
      const downloadAnchor = document.createElement('a');
      const filename = `${(npc.name || 'NPC').replace(/[^a-z0-9]/gi, '_')}_RQG.json`;
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      flashGlobalNotice(`Exported "${npc.name || 'NPC'}" to ${filename}`);
    } catch (e) {
      flashGlobalNotice('Error exporting NPC file.');
    }
  };

  // Export entire NPC roster to JSON
  const handleExportAllNpcs = () => {
    try {
      const stored = localStorage.getItem(NPC_STORAGE_KEY);
      const npcs = stored ? JSON.parse(stored) : [];
      if (!npcs.length) {
        flashGlobalNotice('No saved NPCs to export yet. Save an NPC first!');
        return;
      }
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(npcs, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `RQG_NPC_Roster_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      flashGlobalNotice(`Exported roster with ${npcs.length} NPCs.`);
    } catch (e) {
      flashGlobalNotice('Error exporting roster.');
    }
  };

  // Import NPCs from JSON file
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const toAdd = Array.isArray(parsed) ? parsed : [parsed];
        if (!toAdd.length || !toAdd[0].stats) {
          flashGlobalNotice('Invalid NPC file format.');
          return;
        }

        const stored = localStorage.getItem(NPC_STORAGE_KEY);
        const existing = stored ? JSON.parse(stored) : [];
        const existingIds = new Set(existing.map(n => n.id));

        const merged = [...existing];
        let addedCount = 0;
        toAdd.forEach(npc => {
          if (!npc.id) npc.id = `npc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          if (!existingIds.has(npc.id)) {
            merged.push(npc);
            existingIds.add(npc.id);
            addedCount++;
          }
        });

        localStorage.setItem(NPC_STORAGE_KEY, JSON.stringify(merged));
        flashGlobalNotice(`Imported ${addedCount} NPC(s) successfully! Reloading...`);
        setTimeout(() => window.location.reload(), 800);
      } catch (err) {
        flashGlobalNotice('Failed to parse NPC file: Invalid JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="app-container">
      {/* Top Standalone Header */}
      <header className="app-navbar no-print">
        <div className="nav-brand">
          <div className="brand-logo-icon">🗿</div>
          <span className="brand-title">RuneQuest Glorantha</span>
          <span className="brand-badge">NPC Companion</span>
        </div>

        <div className="nav-actions flex items-center gap-2">
          {globalNotice && (
            <div className="top-banner-notice font-bold text-xs text-amber-300 mr-2 flex items-center gap-1">
              <Check size={14} /> {globalNotice}
            </div>
          )}

          <button
            className={`btn ${currentView === 'npc' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setCurrentView('npc')}
            title="Open NPC Character Sheet & Generator"
          >
            <Skull size={15} /> NPC Sheet
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleOpenDice()}
            title="Open Interactive Dice Roller"
          >
            <Dice5 size={16} /> Dice Roller
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportAllNpcs}
            title="Export all saved NPCs to a JSON file"
          >
            <Download size={15} /> Export Roster
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fileInputRef.current?.click()}
            title="Import NPCs from a JSON file"
          >
            <Upload size={15} /> Import Roster
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            style={{ display: 'none' }}
          />

          <button
            className={`btn ${currentView === 'about' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setCurrentView(currentView === 'about' ? 'npc' : 'about')}
            title="Rules, Legal & Copyright Information"
          >
            <HelpCircle size={15} /> About & Legal
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-content">
        {currentView === 'npc' ? (
          <NpcGeneratorView
            onOpenDiceRoller={setActiveRoll}
            onPromoteToPc={handleExportSingleNpc}
          />
        ) : (
          <AboutView />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer no-print text-center py-3 text-muted small-text border-top mt-4">
        <span>
          RuneQuest® &amp; Glorantha® are registered trademarks of Moon Design Publications LLC / Chaosium Inc. • Unofficial Fan Utility • Local-First &amp; Zero Telemetry
        </span>
      </footer>

      {/* Built-in Dice Roller Modal */}
      {activeRoll && (
        <DiceRollerModal
          rollData={activeRoll}
          onClose={() => setActiveRoll(null)}
        />
      )}
    </div>
  );
}
