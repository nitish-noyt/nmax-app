// api/APIFunction.js
import axios from 'axios';

// https://nmax.noytindia.com/api/v1/nmax/open-alerts/all
const BASE_URL = 'https://nmax.noytindia.com/api/v1/nmax';

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

export const getAllAlerts = async (date) => {
  console.log('Date from api file ====>', date);

  try {
    const response = await API.get('/alerts/all', {
      params: { date },
    });
    console.log('Response from GET API ====>', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(
        'Error response:',
        error.response.status,
        error.response.data,
      );
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Request setup error:', error.message);
    }
    throw error;
  }
};

export const getDefaultOpenAlert = async (vrn) => {
  try {
    const params = {};
    if (vrn?.trim()) {
      params.vrn = vrn.trim();
    }
    const response = await API.get('/open-alerts/all', { params });
    console.log('Default Open-alert response =====>', response);
    return response.data;
  } catch (error) {
    console.log('error from default open alert===>', error);
    throw error;
  }
};

export const getSelectedOpenAlert = async (date, vrn) => {
  console.log('/open-alerts/all', { date, vrn });
  try {
    const params = { date };
    if (vrn?.trim()) {
      params.vrn = vrn.trim();
    }
    const response = await API.get('/open-alerts/all', { params });
    console.log('Selected open alert ===>', response);
    return response.data;
  } catch (error) {
    console.log('Error from selected open response', error);
    throw error;
  }
};