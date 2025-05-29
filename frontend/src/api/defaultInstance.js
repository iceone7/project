import axios from 'axios';

const defaultInstance = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
});

defaultInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default defaultInstance;
