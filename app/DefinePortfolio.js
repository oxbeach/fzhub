'use client';
import { useState } from 'react';

export default function DefinePortfolio({ onAccept, onCancel, initialData }) {
  // Start with existing assets + one blank row
  const [rows, setRows] = useState(() => {
    const existing = initialData && initialData.assets 
      ? initialData.assets.map(a => ({ ...a })) 
      : [];
    return [...existing, { ticker: '', weight: '' }];
  });
  
  const totalWeight = rows.reduce((sum, row) => sum + (parseFloat(row.weight) || 0), 0);
  const isWeightValid = Math.abs(totalWeight - 100) < 0.01;

  const updateRow = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;

    // Auto-add row if typing in the last ticker box
    if (field === 'ticker' && value !== '' && index === rows.length - 1) {
      newRows.push({ ticker: '', weight: '' });
    }
    setRows(newRows);
  };

  const removeRow = (index) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };


  const handleClearWeights = () => {
    const resetRows = rows.map(row => ({
      ...row,
      weight: '' 
    }));
    setRows(resetRows);
  };

  return (
    <div style={{ backgroundColor: '#fff', padding: '20px', border: '2px solid #607d8b', marginTop: '10px', borderRadius: '4px', color: 'black' }}>
      <h3 style={{ marginTop: 0 }}>{initialData ? 'Edit Portfolio' : 'Define Portfolio'}</h3>
      
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>
            <th style={{ padding: '8px' }}>Ticker Symbol</th>
            <th style={{ padding: '8px' }}>Weight (%)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              <td style={{ padding: '5px' }}>
                <input 
                  type="text" 
                  value={row.ticker} 
                  placeholder="NEW TICKER"
                  onChange={(e) => updateRow(idx, 'ticker', e.target.value.toUpperCase())}
                  style={{ width: '90%', padding: '8px', border: '1px solid #ccc' }}
                />
              </td>
              <td style={{ padding: '5px' }}>
                <input 
                  type="number" 
                  value={row.weight} 
                  placeholder="0"
                  onChange={(e) => updateRow(idx, 'weight', e.target.value)}
                  style={{ width: '90%', padding: '8px', border: '1px solid #ccc' }}
                />
              </td>
              <td>
                {idx < rows.length - 1 && (
                   <button onClick={() => removeRow(idx)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

     {/* FOOTER AREA */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* LEFT SIDE: TOTALS */}
        <div>
          <strong>Total Weight: </strong>
          <span style={{ color: isWeightValid ? 'green' : 'red', fontWeight: 'bold', fontSize: '1.2em' }}>
            {totalWeight.toFixed(2)}%
          </span>
        </div>
        
        {/* RIGHT SIDE: BUTTON GROUP */}
        <div style={{ display: 'flex', gap: '10px' }}>
          
          <button 
            type="button"
            onClick={handleClearWeights} 
            style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: '#f1f1f1', border: '1px solid #ccc' }}
          >
            Clear Weights
          </button>

          <button type="button" onClick={onCancel} style={{ padding: '8px 15px', cursor: 'pointer' }}>
            Cancel
          </button>

          <button 
            type="button"
            onClick={() => onAccept(rows.filter(r => r.ticker.trim() !== '' && r.weight !== ''))} 
            disabled={!isWeightValid}
            style={{ 
              padding: '8px 15px', 
              backgroundColor: isWeightValid ? '#4CAF50' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isWeightValid ? 'pointer' : 'not-allowed'
            }}
          >
            Calculate
          </button>

        </div>
      </div>
    </div>
  );
}