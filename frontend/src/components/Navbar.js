import React from 'react';

const Navbar = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="navbar">
      <div style={{ fontSize: '1.5rem', marginRight: '20px' }}>🧪 PiezoAI Lab</div>
      <button className={`nav-btn ${activeTab === 'predict' ? 'active' : ''}`} onClick={() => setActiveTab('predict')}>Predict</button>
      <button className={`nav-btn ${activeTab === 'train' ? 'active' : ''}`} onClick={() => setActiveTab('train')}>Train & Insights</button>
      <button className={`nav-btn ${activeTab === 'dataset' ? 'active' : ''}`} onClick={() => setActiveTab('dataset')}>Raw Dataset</button>
    </nav>
  );
};

export default Navbar;