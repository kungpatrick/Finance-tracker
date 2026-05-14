import React, { useState, useEffect } from 'react';

const EditGoalModal = ({ goal, onClose, onSave }) => {
  const [goalName, setGoalName] = useState(goal.name);
  const [targetAmount, setTargetAmount] = useState(goal.target_amount);
  const [targetDeadline, setTargetDeadline] = useState(goal.deadline || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setGoalName(goal.name);
    setTargetAmount(goal.target_amount);
    setTargetDeadline(goal.deadline || '');
  }, [goal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave({ ...goal, name: goalName, target_amount: parseFloat(targetAmount), deadline: targetDeadline || null });
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
        width: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', color: 'var(--text-color)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', textAlign: 'center' }}>Edit Savings Goal</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="text"
            placeholder="Goal Name"
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'inherit' }}
            required
          />
          <input
            type="number"
            placeholder="Target Amount"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'inherit' }}
            required
          />
          <label style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '-10px' }}>Target Deadline (Optional):</label>
          <input
            type="date"
            value={targetDeadline}
            onChange={(e) => setTargetDeadline(e.target.value)}
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'inherit' }}
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
              disabled={loading}
              style={{ background: loading ? '#ccc' : '#0d6efd', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
            >
              {loading ? 'Saving...' : 'Update Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditGoalModal;