import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.FRONTEND_URL || 'http://localhost:4000',
  withCredentials: true,
});

export default api;
