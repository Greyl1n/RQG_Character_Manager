import React from 'react';
import { Shield, Heart, Zap, Flame, Printer, ArrowLeft } from 'lucide-react';
import rulesData from '../data/rqgRulesData.json';
import { calculateCategoryModifiers, calculateDerivedAttributes } from '../utils/rqgRulesEngine';

export default function PrintSheet({ character, onBack }) {
  const catMods = calculateCategoryModifiers(character.stats, character.customCategoryMods);
  const derived = calculateDerivedAttributes(character.stats);

  return (
    <div className="print-view-container">
      <div className="no-print print-toolbar">
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Back to App
        </button>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={16} /> Print Character Sheet
        </button>
      </div>

      <div className="print-sheet-paper">
        {/* Header */}
        <div className="print-header">
          <div className="print-title-block">
            <h1>RUNEQUEST</h1>
            <h2>ROLEPLAYING IN GLORANTHA — ADVENTURER SHEET</h2>
          </div>
          <div className="print-id-grid">
            <div><strong>Adventurer:</strong> {character.name}</div>
            <div><strong>Homeland:</strong> {character.homeland}</div>
            <div><strong>Occupation:</strong> {character.occupation}</div>
            <div><strong>Cult:</strong> {character.cult}</div>
            <div><strong>Tribe/Clan:</strong> {character.tribe || '—'} / {character.clan || '—'}</div>
            <div><strong>Gender & Age:</strong> {character.gender}, {character.age}</div>
            <div><strong>Rune Points:</strong> {character.runePoints || 3}</div>
            <div><strong>Reputation:</strong> {character.reputation || 15}%</div>
          </div>
        </div>

        {/* Characteristics & Derived stats */}
        <div className="print-row mt-2">
          <div className="print-box flex-2">
            <h3>Characteristics</h3>
            <div className="print-stats-table">
              {['STR', 'CON', 'SIZ', 'DEX', 'INT', 'POW', 'CHA'].map(st => (
                <div key={st} className="print-stat-cell">
                  <span className="p-stat-name">{st}</span>
                  <span className="p-stat-val">{character.stats[st]}</span>
                  <span className="p-stat-x5">×5 = {character.stats[st] * 5}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="print-box flex-2">
            <h3>Attributes & Combat</h3>
            <div className="print-attributes-grid">
              <div><strong>Hit Points:</strong> {character.currentHp} / {character.totalHp}</div>
              <div><strong>Magic Points:</strong> {character.currentMp} / {character.totalMp}</div>
              <div><strong>Damage Bonus:</strong> {character.damageBonus || derived.damageBonus || 'None'}</div>
              <div><strong>Healing Rate:</strong> {character.healingRate ?? derived.healingRate}/wk</div>
              <div><strong>DEX Strike Rank:</strong> {character.dexSr ?? derived.dexSr}</div>
              <div><strong>SIZ Strike Rank:</strong> {character.sizSr ?? derived.sizSr}</div>
              <div><strong>Melee Strike Rank:</strong> {character.meleeSr ?? derived.meleeSr}</div>
              <div><strong>Max ENC:</strong> {character.maxEnc ?? derived.maxEnc}</div>
            </div>
          </div>
        </div>

        {/* Runes & Hit Locations */}
        <div className="print-row mt-2">
          <div className="print-box flex-2">
            <h3>Rune Affinities</h3>
            <div className="print-runes-grid">
              <div><strong>Air:</strong> {character.runes?.Air || 0}%</div>
              <div><strong>Earth:</strong> {character.runes?.Earth || 0}%</div>
              <div><strong>Fire/Sky:</strong> {character.runes?.['Fire/Sky'] || 0}%</div>
              <div><strong>Darkness:</strong> {character.runes?.Darkness || 0}%</div>
              <div><strong>Water:</strong> {character.runes?.Water || 0}%</div>
              <div><strong>Moon:</strong> {character.runes?.Moon || 0}%</div>
              <div><strong>Movement:</strong> {character.runes?.Movement || 50}%</div>
              <div><strong>Stasis:</strong> {character.runes?.Stasis || 50}%</div>
              <div><strong>Death:</strong> {character.runes?.Death || 50}%</div>
              <div><strong>Fertility:</strong> {character.runes?.Fertility || 50}%</div>
              <div><strong>Truth:</strong> {character.runes?.Truth || 50}%</div>
              <div><strong>Illusion:</strong> {character.runes?.Illusion || 50}%</div>
              <div><strong>Harmony:</strong> {character.runes?.Harmony || 50}%</div>
              <div><strong>Disorder:</strong> {character.runes?.Disorder || 50}%</div>
              <div><strong>Man:</strong> {character.runes?.Man || 50}%</div>
              <div><strong>Beast:</strong> {character.runes?.Beast || 50}%</div>
            </div>
          </div>

          <div className="print-box flex-2">
            <h3>Hit Locations (D20)</h3>
            <table className="print-table">
              <thead>
                <tr>
                  <th>D20</th>
                  <th>Location</th>
                  <th>Armor</th>
                  <th>HP</th>
                </tr>
              </thead>
              <tbody>
                {character.hitLocations && Object.entries(character.hitLocations).map(([loc, d]) => (
                  <tr key={loc}>
                    <td>{d.range}</td>
                    <td>{loc}</td>
                    <td>{d.armor} AP</td>
                    <td>{d.currentHp} / {d.maxHp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Passions & Magic */}
        <div className="print-row mt-2">
          <div className="print-box flex-2">
            <h3>Passions & Heirlooms</h3>
            <ul className="print-list">
              {character.passions?.map((p, i) => (
                <li key={i}><strong>{p.name}:</strong> {p.value}%</li>
              ))}
            </ul>
            {character.heirloom && (
              <p className="mt-2"><strong>Heirloom:</strong> {character.heirloom}</p>
            )}
          </div>

          <div className="print-box flex-2">
            <h3>Magic (Rune & Spirit Spells)</h3>
            <div>
              <strong>Rune Spells:</strong> {character.runeMagic?.join(', ') || 'Common Rune Magic'}
            </div>
            <div className="mt-2">
              <strong>Spirit Magic:</strong> {character.spiritMagic?.map(s => `${s.name} (${s.points} pt)`).join(', ') || 'None'}
            </div>
          </div>
        </div>

        {/* Skills Full Grid */}
        <div className="print-box mt-2">
          <h3>Skills</h3>
          <div className="print-skills-columns">
            {Object.entries(character.skills || {}).sort(([a], [b]) => a.localeCompare(b)).map(([sk, val]) => (
              <div key={sk} className="print-skill-line">
                <span>{sk}</span>
                <strong>{val}%</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {character.notes && (
          <div className="print-box mt-2">
            <h3>Adventurer Background & Saga</h3>
            <p>{character.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
