import axios from 'axios';

// Cliente único del backend para compartir URL y autenticación entre páginas.
const api = axios.create({
  baseURL: 'http://localhost:5000',
});

// Adjunta el JWT de la sesión a cada llamada a las rutas protegidas del backend.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;