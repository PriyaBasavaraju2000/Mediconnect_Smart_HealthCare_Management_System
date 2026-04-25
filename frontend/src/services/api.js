import axios from 'axios';
import toast from 'react-hot-toast';

// Use relative URL so setupProxy.js routes it to localhost:8080
const API_BASE_URL = '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor: attach token ───────────────────────────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response interceptor: handle 401 / token refresh ────────────────────────
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refreshToken');
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken: refresh }
        );
        localStorage.setItem('accessToken',  data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    const msg = err.response?.data?.message || 'Something went wrong';
    if (err.response?.status !== 401) toast.error(msg);
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data)  => api.post('/auth/register', data),
  login:    (data)  => api.post('/auth/login', data),
  logout:   ()      => api.post('/auth/logout'),
  refresh:  (token) => api.post('/auth/refresh', { refreshToken: token }),
};

// ─── Doctors ──────────────────────────────────────────────────────────────────
export const doctorApi = {
  getAll:             ()      => api.get('/doctors'),
  getById:            (id)    => api.get(`/doctors/${id}`),
  search:             (spec)  => api.get(`/doctors/search?specialization=${spec}`),
  toggleAvailability: (av)    => api.patch(`/doctors/availability?available=${av}`),
};

// ─── Appointments ─────────────────────────────────────────────────────────────
export const appointmentApi = {
  book:         (data)    => api.post('/appointments', data),
  getById:      (id)      => api.get(`/appointments/${id}`),
  update:       (id, d)   => api.patch(`/appointments/${id}`, d),
  getMyPatient: (p, s)    => api.get(`/appointments/my?page=${p}&size=${s}`),
  getMyDoctor:  (p, s)    => api.get(`/appointments/doctor/my?page=${p}&size=${s}`),
};

// ─── Prescriptions ────────────────────────────────────────────────────────────
export const prescriptionApi = {
  create:                 (data)  => api.post('/prescriptions', data),
  getById:                (id)    => api.get(`/prescriptions/${id}`),
  getMine:                (p, s)  => api.get(`/prescriptions/my?page=${p}&size=${s}`),
  getDoctorPrescriptions: (p, s)  => api.get(`/prescriptions/doctor/my?page=${p}&size=${s}`),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationApi = {
  getAll:      (p, s) => api.get(`/notifications?page=${p}&size=${s}`),
  getUnread:   ()     => api.get('/notifications/unread-count'),
  markRead:    (id)   => api.patch(`/notifications/${id}/read`),
  markAllRead: ()     => api.patch('/notifications/read-all'),
};

export default api;