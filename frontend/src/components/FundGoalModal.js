import React, { useState, useEffect } from 'react';

const FundGoalModal = ({ goal, onClose, onSave }) => {
  const [fundAmount, setFundAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Reset amount when goal changes or modal opens
    setFundAmount('');
  }, [goal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave(goal.id, parseFloat(fundAmount));
    setLoading(false);
  };

  if (!goal) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="modal-content" style={{
        background: 'var(--card-bg)', padding: '25px', borderRadius: '12px',
        width: '350px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', color: 'var(--text-color)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', textAlign: 'center' }}>Fund Goal: {goal.name}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            Current: <strong>${goal.current_amount.toLocaleString()}</strong> / Target: <strong>${goal.target_amount.toLocaleString()}</strong>
          </p>
          <input
            type="number"
            placeholder="Amount to Contribute"
            value={fundAmount}
            onChange={(e) => setFundAmount(e.target.value)}
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'inherit' }}
            required
            min="0.01"
            step="0.01"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: '1px solid var(--border-color)', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', color: 'inherit' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !fundAmount || parseFloat(fundAmount) <= 0}
              style={{ background: (loading || !fundAmount || parseFloat(fundAmount) <= 0) ? '#ccc' : '#0d6efd', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: (loading || !fundAmount || parseFloat(fundAmount) <= 0) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
            >
              {loading ? 'Funding...' : 'Confirm Contribution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FundGoalModal;