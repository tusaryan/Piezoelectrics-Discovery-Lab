import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Predict from './components/Predict';
import Train from './components/Train';
import Dataset from './components/Dataset';

function App() {
  const [activeTab, setActiveTab] = useState('predict');

  return (
    <div className="App">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="container">
        {activeTab === 'predict' && <Predict />}
        {activeTab === 'train' && <Train />}
        {activeTab === 'dataset' && <Dataset />}
      </div>
    </div>
  );
}

export default App;