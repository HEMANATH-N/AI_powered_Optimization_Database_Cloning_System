import API from './api';

export const authService = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  getMe: () => API.get('/auth/me'),
};

export const fileService = {
  upload: (formData, onProgress) =>
    API.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }),
  getAll: () => API.get('/files'),
  getById: (id) => API.get(`/files/${id}`),
  delete: (id) => API.delete(`/files/${id}`),
};

export const cloneService = {
  start: (fileId) => API.post('/clone/start', { fileId }),
  resume: (jobId) => API.post('/clone/resume', { jobId }),
  pause: (jobId) => API.post('/clone/pause', { jobId }),
  getStatus: (id) => API.get(`/clone/status/${id}`),
  getAll: () => API.get('/clone'),
  deleteJob: (id) => API.delete(`/clone/${id}`),
  bulkDelete: (ids) => API.delete('/clone/bulk', { data: { ids } }),
};

export const recycleBinService = {
  getAll: () => API.get('/recycle-bin'),
  restore: (id) => API.post(`/recycle-bin/restore/${id}`),
  permanentDelete: (id) => API.delete(`/recycle-bin/permanent-delete/${id}`),
};

export const analyticsService = {
  getAnalytics: () => API.get('/analytics'),
};

export const deviceService = {
  getAll: () => API.get('/devices'),
  remove: (id) => API.delete(`/devices/${id}`),
};

