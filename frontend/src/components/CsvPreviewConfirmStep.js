import React, { useState } from 'react';

const CsvPreviewConfirmStep = ({ mappedData, onBack, onFinalConfirm, appFields }) => {
  const [importing, setImporting] = useState(false);

  const handleConfirm = async () => {
    setImporting(true);
    await onFinalConfirm(mappedData);
    setImporting(false);
  };

  return (
    <>
      <h3 style={{ marginTop: 0, marginBottom: '20px', textAlign: 'center' }}>Import Transactions from CSV (Step 3 of 3: Preview & Confirm)</h3>
      
      <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '10px' }}>Please review the transactions below before confirming the import:</p>

      <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', background: 'var(--header-bg)' }}>
              {appFields.map(field => (
                <th key={field.key} style={{ padding: '10px', whiteSpace: 'nowrap' }}>{field.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mappedData.map((row, rowIndex) => (
              <tr key={rowIndex} style={{ borderBottom: '1px dotted var(--border-color)' }}>
                {appFields.map(field => (
                  <td key={field.key} style={{ padding: '10px', whiteSpace: 'nowrap' }}>{row[field.key] || 'N/A'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
        <button 
          type="button" 
          onClick={onBack} 
          style={{ background: 'none', border: '1px solid var(--border-color)', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', color: 'inherit' }}
        >
          Back
        </button>
        <button 
          type="button" 
          onClick={handleConfirm} 
          disabled={importing} 
          style={{ background: importing ? '#ccc' : '#28a745', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: importing ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
        >
          {importing ? 'Importing...' : `Confirm Import (${mappedData.length} transactions)`}
        </button>
      </div>
    </>
  );
};

export default CsvPreviewConfirmStep;