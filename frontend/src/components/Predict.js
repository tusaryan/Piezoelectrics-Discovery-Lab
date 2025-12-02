import React, { useState, useEffect } from 'react';
import { getElements, predictMaterial } from '../api';

const Predict = () => {
  const [mode, setMode] = useState('builder'); // 'builder' or 'manual'
  const [elements, setElements] = useState([]);

  // Builder State
  const [selectedEl, setSelectedEl] = useState('');
  const [amount, setAmount] = useState('');
  const [formulaParts, setFormulaParts] = useState([]);

  // Manual State
  const [manualFormula, setManualFormula] = useState('');

  // Results
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getElements().then(res => setElements(res.data)).catch(err => console.error("Failed to load elements", err));
  }, []);

  // --- ACTIONS ---

  const addToFormula = () => {
    if (selectedEl && amount) {
      setFormulaParts([...formulaParts, { el: selectedEl, amt: amount }]);
      setAmount(''); // Clear amount input for next entry
      // Keep selected element or clear it? Let's keep it for faster entry of similar types, or clear:
      // setSelectedEl('');
    }
  };

  // NEW: Remove a specific item by index
  const removePart = (indexToRemove) => {
    setFormulaParts(formulaParts.filter((_, index) => index !== indexToRemove));
  };

  // NEW: Clear everything
  const handleReset = () => {
    setFormulaParts([]);
    setManualFormula('');
    setResult(null);
    setError('');
    setAmount('');
    setSelectedEl('');
  };

  const constructFormula = () => {
    // Concatenate parts: K0.5 + Na0.5 -> K0.5Na0.5
    return formulaParts.map(p => `${p.el}${p.amt}`).join('');
  };

  const handlePredict = async () => {
    setError('');
    setResult(null);

    const finalFormula = mode === 'builder' ? constructFormula() : manualFormula;

    if (!finalFormula) {
      setError("Please enter a valid formula.");
      return;
    }

    try {
      const res = await predictMaterial(finalFormula);
      if (res.data.error) {
        setError(res.data.error);
      } else {
        setResult(res.data);
      }
    } catch (err) {
      console.error(err);
      setError("Server Error. Ensure backend is running.");
    }
  };

  return (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
          <h2 style={{ border: 'none', padding: 0, margin: 0 }}>Property Prediction</h2>
          <button
              onClick={handleReset}
              style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Reset / Clear
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <button className="btn" style={{ marginRight: '10px', background: mode === 'builder' ? '#2980b9' : '#ccc' }} onClick={() => setMode('builder')}>Builder Mode</button>
          <button className="btn" style={{ background: mode === 'manual' ? '#2980b9' : '#ccc' }} onClick={() => setMode('manual')}>Manual Entry</button>
        </div>

        {mode === 'builder' ? (
            <div>
              <div className="builder-row">
                <select
                    value={selectedEl}
                    onChange={e => setSelectedEl(e.target.value)}
                    style={{ minWidth: '150px' }}
                >
                  <option value="">Select Element</option>
                  {elements.map(el => <option key={el} value={el}>{el}</option>)}
                </select>
                <input
                    type="number"
                    placeholder="Amount (e.g. 0.5)"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                />
                <button className="btn" onClick={addToFormula}>Add</button>
              </div>

              {/* Formula Display Area */}
              <div style={{ padding: '15px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', minHeight: '50px' }}>
                <strong style={{ display: 'block', marginBottom: '10px', color: '#555' }}>Current Formula Composition:</strong>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {formulaParts.length === 0 ? (
                      <span style={{ color: '#999', fontStyle: 'italic' }}>No elements added yet...</span>
                  ) : (
                      formulaParts.map((p, i) => (
                          <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'white',
                            border: '1px solid #ccc',
                            borderRadius: '20px',
                            padding: '5px 10px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                          }}>
                            <span style={{ fontWeight: 'bold', color: '#2c3e50', marginRight: '2px' }}>{p.el}</span>
                            <span style={{ fontSize: '0.9em', color: '#555', marginRight: '8px' }}>{p.amt}</span>

                            {/* Remove Button (X) */}
                            <button
                                onClick={() => removePart(i)}
                                style={{
                                  background: '#ffdddd',
                                  color: '#c0392b',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '20px',
                                  height: '20px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 'bold'
                                }}
                                title="Remove element"
                            >
                              ✕
                            </button>
                          </div>
                      ))
                  )}
                </div>

                {/* Live Preview of String sent to Backend */}
                {formulaParts.length > 0 && (
                    <div style={{ marginTop: '15px', fontSize: '0.85rem', color: '#7f8c8d' }}>
                      Raw String: <code>{constructFormula()}</code>
                    </div>
                )}
              </div>
            </div>
        ) : (
            <input
                type="text"
                style={{ width: '100%', fontSize: '1.2rem', padding: '10px' }}
                placeholder="Enter formula e.g., 0.96(K0.5Na0.5)NbO3-0.04Bi0.5Na0.5TiO3"
                value={manualFormula}
                onChange={e => setManualFormula(e.target.value)}
            />
        )}

        <button className="btn btn-success" style={{ marginTop: '20px', width: '100%', fontSize: '1.2rem', padding: '15px' }} onClick={handlePredict}>
          Run Prediction
        </button>

        {error && <div style={{ padding: '10px', background: '#fadbd8', color: '#c0392b', borderRadius: '4px', marginTop: '15px', border: '1px solid #ebccd1' }}>{error}</div>}

        {result && (
            <div className="result-box">
              <h3>Prediction Results</h3>
              <div style={{ display: 'flex', justifyContent: 'space-around', margin: '20px 0' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '1px' }}>d33 (Piezo Coeff)</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#2c3e50' }}>{result.d33} <span style={{ fontSize: '1rem' }}>pC/N</span></div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '1px' }}>Tc (Curie Temp)</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#e74c3c' }}>{result.Tc} <span style={{ fontSize: '1rem' }}>°C</span></div>
                </div>
              </div>
              <div style={{ background: 'white', padding: '10px', borderRadius: '4px', fontSize: '0.9rem' }}>
                <strong>Parsed Composition: </strong>
                {JSON.stringify(result.composition).replace(/"/g, '').replace(/{/g, '').replace(/}/g, '').replace(/,/g, ', ')}
              </div>
            </div>
        )}
      </div>
  );
};

export default Predict;