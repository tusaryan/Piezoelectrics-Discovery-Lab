import axios from 'axios';

// Docker uses the service name 'backend', but browser needs localhost
const API_URL = 'http://localhost:8000';

export const getElements = () => axios.get(`${API_URL}/elements`);
export const getDataset = () => axios.get(`${API_URL}/dataset`);
export const predictMaterial = (formula) => axios.post(`${API_URL}/predict`, { formula });
export const confirmModel = () => axios.post(`${API_URL}/confirm-model`);

export const trainModel = (formData) => {
    return axios.post(`${API_URL}/train`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};