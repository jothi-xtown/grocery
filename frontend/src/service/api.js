// src/shared/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://192.168.1.7:5001",
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // or sessionStorage
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
