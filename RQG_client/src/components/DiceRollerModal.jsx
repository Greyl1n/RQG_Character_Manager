import React, { useState } from 'react';
import { X, Dice5, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { evaluateD100Roll, evaluateHitLocationRoll, rollDice } from '../utils/rqgRulesEngine';

export default function DiceRollerModal({ rollData, onClose }) {
  const [currentRoll, setCurrentRoll] = useState(null);
  const [rollResult, setRollResult] = useState(null);
  const [modifier, setModifier] = useState(0);
  const [rollHistory, setRollHistory] = useState([]);

  const isHitLocation = rollData.type === 'hitLocation' || (rollData.type === 'custom' && String(rollData.label || '').toLowerCase().includes('hit location'));

  // Trigger celebration on critical success
  const fireConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  const handleRoll = () => {
    if (rollData.type === 'd100') {
      const rollVal = Math.floor(Math.random() * 100) + 1;
      const targetWithMod = Math.max(1, (rollData.target || 50) + parseInt(modifier || 0));
      const evalResult = evaluateD100Roll(targetWithMod, rollVal);

      if (evalResult.type === 'critical') {
        fireConfetti();
      }

      const res = {
        roll: rollVal,
        target: targetWithMod,
        ...evalResult,
        timestamp: new Date().toLocaleTimeString()
      };
      setCurrentRoll(rollVal);
      setRollResult(res);
      setRollHistory(prev => [res, ...prev.slice(0, 9)]);
    } else if (isHitLocation) {
      // D20 Hit Location roll: location is always computed directly from the D20 roll!
      const r = rollDice(1, 20);
      const evalLoc = evaluateHitLocationRoll(r.total);
      const res = {
        ...evalLoc,
        timestamp: new Date().toLocaleTimeString()
      };
      setCurrentRoll(r.total);
      setRollResult(res);
      setRollHistory(prev => [res, ...prev.slice(0, 9)]);
    } else {
      // Generic custom roll
      const r = rollDice(1, 20);
      const res = {
        roll: r.total,
        label: rollData.label,
        type: 'custom',
        description: rollData.customResult || `Rolled ${r.total}`,
        color: '#f59e0b',
        timestamp: new Date().toLocaleTimeString()
      };
      setCurrentRoll(r.total);
      setRollResult(res);
      setRollHistory(prev => [res, ...prev.slice(0, 9)]);
    }
  };

  // Auto-roll on open
  React.useEffect(() => {
    handleRoll();
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Dice5 size={22} className="gold-text inline-icon" />
            <h3 className="modal-title gold-text">
              {isHitLocation && rollResult ? `Hit Location Check: ${rollResult.label}` : rollData.label}
            </h3>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Target and modifier controls */}
          {rollData.type === 'd100' && (
            <div className="roll-target-bar">
              <div className="target-pill">
                Target: <strong>{rollData.target}%</strong>
              </div>
              <div className="modifier-ctrl">
                <label>Situational Modifier:</label>
                <select value={modifier} onChange={e => setModifier(parseInt(e.target.value))}>
                  <option value="-40">-40% (Extreme Difficulty)</option>
                  <option value="-20">-20% (Difficult)</option>
                  <option value="0">+0% (Normal)</option>
                  <option value="20">+20% (Favorable / Augmented)</option>
                  <option value="40">+40% (Very Easy)</option>
                </select>
              </div>
            </div>
          )}

          {/* Roll Visual Result */}
          {rollResult && (
            <div className="roll-display-card" style={{ borderColor: rollResult.color }}>
              <div className="roll-number" style={{ color: rollResult.color }}>
                {rollResult.roll}
              </div>
              <div className="roll-badge" style={{ backgroundColor: rollResult.color }}>
                {rollResult.label}
              </div>
              <p className="roll-description">{rollResult.description}</p>

              {rollData.type === 'd100' && (
                <div className="thresholds-breakdown">
                  <span>Critical: ≤{rollResult.critMax ?? Math.max(1, Math.floor(rollResult.target / 20 + 0.5))}</span>
                  <span>Special: ≤{rollResult.specialMax ?? Math.max(1, Math.floor(rollResult.target / 5 + 0.5))}</span>
                  <span>Success: ≤{rollResult.successMax ?? Math.min(95, Math.max(5, rollResult.target))}</span>
                  <span>Fumble: ≥{rollResult.fumbleMin ?? (101 - Math.max(1, Math.min(5, Math.floor((100 - rollResult.target) / 20 + 0.5))))}</span>
                </div>
              )}

              {isHitLocation && (
                <div className="thresholds-breakdown">
                  <span>01–04: R. Leg</span>
                  <span>05–08: L. Leg</span>
                  <span>09–11: Abdomen</span>
                  <span>12: Chest</span>
                  <span>13–15: R. Arm</span>
                  <span>16–18: L. Arm</span>
                  <span>19–20: Head</span>
                </div>
              )}
            </div>
          )}

          <div className="roll-actions mt-4">
            <button className="btn btn-primary w-full" onClick={handleRoll}>
              <RotateCcw size={16} /> {isHitLocation ? 'Re-Roll Hit Location (D20)' : 'Re-Roll D100'}
            </button>
          </div>

          {/* Roll History */}
          {rollHistory.length > 1 && (
            <div className="roll-history-section mt-4">
              <h5 className="gold-text">Recent Rolls</h5>
              <div className="roll-history-list">
                {rollHistory.slice(1).map((h, i) => (
                  <div key={i} className="history-item">
                    <span className="hist-time">{h.timestamp}</span>
                    <strong style={{ color: h.color }}>{h.roll}</strong>
                    <span className="hist-label">{h.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
