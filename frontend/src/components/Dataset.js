import React, { useEffect, useState } from 'react';
import { getDataset } from '../api';

const Dataset = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    getDataset().then(res => setData(res.data));
  }, []);

  return (
    <div className="card">
      <h2>Raw Dataset Preview</h2>
      {data.length === 0 ? <p>No dataset found. Please upload one in the Train tab.</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                {Object.keys(data[0]).map(key => <th key={key}>{key}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((val, j) => <td key={j}>{val}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Dataset;