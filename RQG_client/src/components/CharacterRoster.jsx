import React, { useState } from 'react';
import {
  Users, UserPlus, Sparkles, Download, Upload, Trash2,
  ChevronRight, Award, Compass, Shield, Flame
} from 'lucide-react';

export default function CharacterRoster({
  characters,
  activeCharacterId,
  onSelectCharacter,
  onCreateNew,
  onQuickGenerate,
  onDeleteCharacter,
  onImportCharacter,
  onExportCharacter
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = characters.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.homeland.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cult.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.name && parsed.stats) {
          onImportCharacter(parsed);
        } else {
          alert('Invalid character JSON format.');
        }
      } catch (err) {
        alert('Could not parse character file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="roster-container">
      {/* Roster Controls Bar */}
      <div className="roster-header card">
        <div className="roster-header-left">
          <h2 className="roster-title gold-text">
            <Users size={22} className="gold-text inline-icon" /> Heroic Roster ({characters.length})
          </h2>
          <input
            type="text"
            placeholder="Search adventurers..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="roster-header-actions">
          <button className="btn btn-primary" onClick={onCreateNew}>
            <UserPlus size={16} /> New Adventurer
          </button>
          <button className="btn btn-accent" onClick={onQuickGenerate}>
            <Sparkles size={16} /> 1-Click Quick Hero
          </button>
          <label className="btn btn-secondary btn-file-label">
            <Upload size={16} /> Import JSON
            <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* Characters List */}
      <div className="roster-grid">
        {filtered.map(char => {
          const isActive = char.id === activeCharacterId;
          return (
            <div
              key={char.id}
              className={`roster-card card ${isActive ? 'active-hero-card' : ''}`}
              onClick={() => onSelectCharacter(char.id)}
            >
              <div className="roster-card-header">
                <h3 className="roster-card-name gold-text">{char.name}</h3>
                <div className="roster-actions">
                  <button
                    className="btn-tiny"
                    title="Export JSON"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExportCharacter(char);
                    }}
                  >
                    <Download size={14} />
                  </button>
                  <button
                    className="btn-tiny btn-danger"
                    title="Delete Adventurer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete ${char.name}?`)) onDeleteCharacter(char.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="roster-badges">
                <span className="badge badge-accent small">{char.homeland}</span>
                <span className="badge badge-info small">{char.occupation}</span>
                <span className="badge badge-primary small">Cult of {char.cult}</span>
              </div>

              <div className="roster-stats-preview">
                <div className="stat-mini">
                  <span className="mini-lbl">HP</span>
                  <span className="mini-val">{char.currentHp} / {char.totalHp}</span>
                </div>
                <div className="stat-mini">
                  <span className="mini-lbl">MP</span>
                  <span className="mini-val">{char.currentMp} / {char.totalMp}</span>
                </div>
                <div className="stat-mini">
                  <span className="mini-lbl">RP</span>
                  <span className="mini-val">{char.currentRp || char.runePoints || 3}</span>
                </div>
                <div className="stat-mini">
                  <span className="mini-lbl">STR</span>
                  <span className="mini-val">{char.stats.STR}</span>
                </div>
                <div className="stat-mini">
                  <span className="mini-lbl">POW</span>
                  <span className="mini-val">{char.stats.POW}</span>
                </div>
                <div className="stat-mini">
                  <span className="mini-lbl">DEX</span>
                  <span className="mini-val">{char.stats.DEX}</span>
                </div>
              </div>

              <div className="roster-card-footer">
                <span className="small-text text-muted">{char.notes?.slice(0, 75)}...</span>
                <span className="select-prompt">
                  Select <ChevronRight size={14} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
