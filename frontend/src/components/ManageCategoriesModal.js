import React, { useState } from 'react';

const ManageCategoriesModal = ({ onClose, categories, onUpdate }) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#0d6efd');
  const [loading, setLoading] = useState(false);

  const handleAddCategory = async () => {
    if (!newCategoryName) return;
    setLoading(true);
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName, color: newCategoryColor }),
        credentials: 'include'
      });
      if (response.ok) {
        setNewCategoryName('');
        onUpdate();
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDeleteCategory = async (name) => {
    if (!window.confirm(`Delete "${name}"? Transactions will be uncategorized.`)) return;
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
    try {
      await fetch(`${API_BASE_URL}/api/categories/${name}`, { method: 'DELETE', credentials: 'include' });
      onUpdate();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="modal-content" style={{
        background: 'var(--card-bg)', padding: '25px', borderRadius: '12px',
        width: '450px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', color: 'var(--text-color)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Manage Categories</h3>

        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="+ Add New Category" 
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'inherit' }}
          />
          <input 
            type="color" 
            value={newCategoryColor}
            onChange={(e) => setNewCategoryColor(e.target.value)}
            style={{ width: '40px', border: 'none', background: 'none', cursor: 'pointer' }}
          />
          <button 
            onClick={handleAddCategory} 
            disabled={loading}
            style={{ background: '#28a745', color: 'white', border: 'none', padding: '0 15px', borderRadius: '6px', cursor: 'pointer' }}
          >
            Add
          </button>
        </div>

        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.category} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: cat.color || '#ccc' }}></div>
                      {cat.category}
                    </div>
                  </td>
                  <td align="right">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }}>
                        <img src="/edit.png" alt="Edit" style={{ width: '14px' }} />
                      </button>
                      <button title="Merge" style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }}>
                        <img src="/process.png" alt="Merge" style={{ width: '14px' }} />
                      </button>
                      <button onClick={() => handleDeleteCategory(cat.category)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }}>
                        <img src="/delete.png" alt="Delete" style={{ width: '14px' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border-color)', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', color: 'inherit' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageCategoriesModal;