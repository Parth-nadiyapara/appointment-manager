const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }

  return data;
}

export const api = {
  register: (payload) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  verifyPasswordResetIdentity: (payload) =>
    request('/auth/verify-password-reset', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  recoverPassword: (payload) =>
    request('/auth/recover-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getMe: () => request('/me'),
  getServices: () => request('/services'),
  getAvailableSlots: ({ serviceId, date }) =>
    request(`/availability?serviceId=${serviceId}&date=${date}`),
  createBooking: (payload) =>
    request('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getUserDashboard: () => request('/user/dashboard'),
  markAlertRead: (alertId) =>
    request(`/user/alerts/${alertId}/read`, {
      method: 'PATCH'
    }),
  getDashboard: () => request('/admin/dashboard'),
  updateLeadStatus: (leadId, status) =>
    request(`/admin/leads/${leadId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
};
