import React, { useState } from 'react';
import { trainModel, confirmModel } from '../api';

const Train = () => {
    const [file, setFile] = useState(null);
    const [estimators, setEstimators] = useState(100);
    const [learningRate, setLearningRate] = useState(0.1);
    const [depth, setDepth] = useState(5);
    const [loading, setLoading] = useState(false);
    const [metrics, setMetrics] = useState(null);

    const handleTrain = async () => {
        if (!file) return alert("Please upload a CSV file first.");

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        const query = `?n_estimators=${estimators}&learning_rate=${learningRate}&max_depth=${depth}`;

        try {
            // Send POST request to backend
            const response = await fetch(`http://localhost:8000/train${query}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error("Training failed on backend");
            }

            const data = await response.json();
            setMetrics(data);
        } catch (e) {
            console.error(e);
            alert("Training failed. Check backend logs for details.");
        }
        setLoading(false);
    };

    const handleConfirm = async () => {
        await confirmModel();
        alert("Model updated successfully!");
        setMetrics(null);
    };

    // Helper to safely render graphs
    const renderMetricsSection = (title, metricData) => {
        if (!metricData) {
            return (
                <div style={{ marginBottom: '40px', padding: '20px', background: '#fff3cd', borderRadius: '8px' }}>
                    <h4>{title}</h4>
                    <p style={{ color: '#856404' }}>⚠️ Could not train model. Check if your CSV has the correct column name.</p>
                </div>
            );
        }
        return (
            <div style={{ marginBottom: '40px' }}>
                <h4>{title}</h4>
                <div className="graph-container">
                    <img className="graph-img" src={`data:image/png;base64,${metricData.bar_plot}`} alt={`${title} Bar`} />
                    <img className="graph-img" src={`data:image/png;base64,${metricData.scatter_plot}`} alt={`${title} Scatter`} />
                </div>
                <p><strong>Best Model:</strong> {metricData.best_model} (R2: {metricData.r2.toFixed(3)})</p>
            </div>
        );
    };

    return (
        <div className="card">
            <h2>Fine-Tune & Retrain Model</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                    <h3>1. Upload Dataset</h3>
                    <input type="file" accept=".csv" onChange={e => setFile(e.target.files[0])} />
                    <p style={{ fontSize: '0.8rem', color: '#666' }}>
                        Required columns: <code>Component</code>, <code>d33 (pC/N)</code>, <code>Tc (C)</code>
                    </p>
                </div>

                <div>
                    <h3>2. Hyperparameters</h3>
                    <label>N Estimators: {estimators}</label>
                    <input type="range" min="50" max="1000" value={estimators} onChange={e => setEstimators(e.target.value)} style={{ width: '100%' }} />

                    <label>Learning Rate: {learningRate}</label>
                    <input type="range" min="0.01" max="0.5" step="0.01" value={learningRate} onChange={e => setLearningRate(e.target.value)} style={{ width: '100%' }} />

                    <label>Max Depth: {depth}</label>
                    <input type="range" min="1" max="15" value={depth} onChange={e => setDepth(e.target.value)} style={{ width: '100%' }} />
                </div>
            </div>

            <button className="btn" onClick={handleTrain} disabled={loading} style={{ marginTop: '20px' }}>
                {loading ? "Training... (This may take a minute)" : "Start Training"}
            </button>

            {metrics && (
                <div style={{ marginTop: '30px', borderTop: '2px solid #eee' }}>
                    <h3>Model Insights</h3>

                    {renderMetricsSection("d33 Performance", metrics.d33_metrics)}
                    {renderMetricsSection("Tc Performance", metrics.tc_metrics)}

                    {/* Only show save button if at least one model succeeded */}
                    {(metrics.d33_metrics || metrics.tc_metrics) && (
                        <div className="result-box" style={{ textAlign: 'center' }}>
                            <p>Are you satisfied with these results?</p>
                            <button className="btn btn-success" onClick={handleConfirm}>Yes, Save & Deploy Model</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Train;