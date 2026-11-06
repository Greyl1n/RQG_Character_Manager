import React from 'react';
import { BookOpen, Shield, Sparkles, Compass, Flame, Scale, Lock, Award } from 'lucide-react';

export default function AboutView() {
  return (
    <div className="about-container card">
      <div className="about-header text-center">
        <h1 className="gold-text">RuneQuest: Roleplaying in Glorantha</h1>
        <h3 className="text-muted">NPC Character Companion & Generator</h3>
      </div>

      <div className="about-grid mt-4">
        <div className="about-card card card-subtle">
          <div className="about-icon-header">
            <Sparkles size={24} className="gold-text" />
            <h4>Interactive NPC Sheet & Generator</h4>
          </div>
          <p>
            Always starts as a clean, blank NPC Character Sheet with dropdown selection for saved NPCs, manual & automatic archetype generation,
            dual cult Rune Point trackers (0–12), 0–24 HP & MP bubble grids, localized armor & hit locations, and equipment notes.
          </p>
        </div>

        <div className="about-card card card-subtle">
          <div className="about-icon-header">
            <Compass size={24} className="gold-text" />
            <h4>Core Rules & House-Rule Flexibility</h4>
          </div>
          <p>
            Automatically calculates Damage Bonus, Strike Ranks, Total HP, Magic Points, Hit Location HPs, and Skill Category Bonuses from Characteristics—while
            keeping every field, skill %, and <strong>Skill Category Bonus</strong> directly editable for your table's house rules.
          </p>
        </div>

        <div className="about-card card card-subtle">
          <div className="about-icon-header">
            <Award size={24} className="gold-text" />
            <h4>Skill Experience & Level-Up</h4>
          </div>
          <p>
            Supports experience checkmarks and Sacred Time / seasonal skill advancement rolls (<code>1D100 + Category Bonus &gt; Current Skill %</code> or natural <code>100</code>)
            for <strong>+1D6%</strong> skill gains, plus instant manual editing of any skill or category modifier.
          </p>
        </div>

        <div className="about-card card card-subtle">
          <div className="about-icon-header">
            <Lock size={24} className="gold-text" />
            <h4>100% Local-First & Private</h4>
          </div>
          <p>
            Operates completely offline in your browser with zero tracking, zero analytics, and zero external data transmission.
            All NPCs are saved locally in your browser and can be exported/imported as local JSON files at any time.
          </p>
        </div>
      </div>

      <div className="card card-subtle mt-4">
        <h4 className="gold-text" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={18} className="gold-text" /> Included Reference Material & Rule Sources
        </h4>
        <ul className="about-sources-list">
          <li><strong>RuneQuest: Roleplaying in Glorantha (Core Rules)</strong> — Chaosium Inc.</li>
          <li><strong>The Glorantha Sourcebook</strong> — Greg Stafford, Jeff Richard, Sandy Petersen</li>
          <li><strong>Cults of RuneQuest</strong> — The Lightbringers, The Earth Goddesses, Gods of Fire & Sky, The Lunar Way</li>
          <li><strong>RuneQuest Weapons & Equipment</strong> — Chaosium Inc.</li>
        </ul>
      </div>

      {/* Legal, Copyright & Trademark Notice */}
      <div className="card card-subtle mt-4" style={{ border: '1px solid rgba(212, 175, 55, 0.35)' }}>
        <h4 className="gold-text" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
          <Scale size={18} className="gold-text" /> Legal Notice, Copyrights & Trademarks
        </h4>
        <div className="small-text" style={{ lineHeight: '1.65', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <p style={{ margin: 0 }}>
            <strong>Trademarks & Intellectual Property:</strong> <em>RuneQuest</em>, <em>Glorantha</em>, <em>HeroQuest</em>, and their associated logos,
            runes, deity names, and setting elements are registered trademarks and/or copyrights of <strong>Moon Design Publications LLC</strong> and{' '}
            <strong>Chaosium Inc.</strong> All rights reserved.
          </p>
          <p style={{ margin: 0 }}>
            <strong>Unofficial Fan Utility Disclaimer:</strong> This application is an independent, unofficial, non-commercial fan-made companion utility
            designed to assist tabletop roleplaying players and gamemasters during play. It is used without formal permission under{' '}
            <strong>Chaosium Inc.’s Fan Material Policy</strong>. This tool is <strong>not</strong> affiliated with, endorsed, sponsored, or specifically
            approved by Chaosium Inc. or Moon Design Publications LLC.
          </p>
          <p style={{ margin: 0 }}>
            <strong>No Replacement for Official Rulebooks:</strong> Summary statistics, skill base percentages, derived attribute formulas, and spell/cult
            references are provided solely as a character sheet calculation aid. Players and Gamemasters should purchase and consult the official{' '}
            <em>RuneQuest: Roleplaying in Glorantha</em> rulebooks and supplements available from{' '}
            <a href="https://www.chaosium.com" target="_blank" rel="noopener noreferrer" className="gold-text">Chaosium Inc. (www.chaosium.com)</a>.
          </p>
          <p style={{ margin: 0 }}>
            <strong>Software & Privacy Notice:</strong> All application source code is provided &ldquo;as is&rdquo; without warranty of any kind.
            No user data, character sheets, or telemetry are ever collected or transmitted externally; all data remains strictly on your local device.
          </p>
        </div>
      </div>

      <div className="about-footer text-center mt-4 text-muted small-text">
        <p>
          RuneQuest® and Glorantha® are registered trademarks of Moon Design Publications LLC / Chaosium Inc. • Unofficial Fan Companion Tool
        </p>
      </div>
    </div>
  );
}
