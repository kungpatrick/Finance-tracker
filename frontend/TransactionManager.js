import React, { useState, useEffect } from 'react';

const TransactionManager = () => {
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ amount: '', category: 'Groceries', description: '', type: 'expense' });
  const [loading, setLoading] = useState(false);

  // Phase 2: Read - Fetch transactions from PostgreSQL
  useEffect(() => {
    const fetchTransactions = async () => {
      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
      try {
        const response = await fetch(`${API_BASE_URL}/api/transactions`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setTransactions(data);
        }
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
      }
    };
    fetchTransactions();
  }, []);

  // Phase 2: Create - Save to PostgreSQL
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
      const response = await fetch(`${API_BASE_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      });

      if (response.ok) {
        const saved = await response.json();
        setTransactions([saved, ...transactions]);
        setForm({ amount: '', category: 'Groceries', description: '', type: 'expense' });
      }
    } catch (error) {
      console.error("Error saving transaction:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transaction-manager" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
      <h2>Log Transaction</h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '10px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="number" 
            placeholder="Amount" 
            value={form.amount} 
            onChange={(e) => setForm({...form, amount: e.target.value})}
            required 
          />
          <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}>
            <option>Rent</option>
            <option>Groceries</option>
            <option>Entertainment</option>
            <option>Utilities</option>
            <option>Salary</option>
          </select>
          <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <input 
          type="text" 
          placeholder="Description" 
          value={form.description} 
          onChange={(e) => setForm({...form, description: e.target.value})} 
        />
        <button type="submit" disabled={loading} style={{ backgroundColor: loading ? '#ccc' : '#0d6efd', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Saving...' : 'Save Transaction'}
        </button>
      </form>

      <h3>Recent History</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
            <th align="left">Date</th>
            <th align="left">Category</th>
            <th align="left">Description</th>
            <th align="right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(t => (
            <tr key={t.id} style={{ borderBottom: '1px dotted var(--border-color)' }}>
              <td>{t.date}</td>
              <td>{t.category}</td>
              <td>{t.description}</td>
              <td align="right" style={{ color: t.type === 'expense' ? '#dc3545' : '#28a745' }}>
                {t.type === 'expense' ? '-' : '+'}${parseFloat(t.amount).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionManager;