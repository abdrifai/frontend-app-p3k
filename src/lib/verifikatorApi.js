import { apiRequest } from './api';

/**
 * API Wrapper untuk Modul Verifikator Perbaikan Data
 */
export const verifikatorApi = {
  async getStatistik() {
    return await apiRequest('/api/v1/verifikasi-perbaikan/statistik', 'GET');
  },

  async getInbox(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.kategori) query.append('kategori', params.kategori);
    if (params.jenisPegawai) query.append('jenisPegawai', params.jenisPegawai);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return await apiRequest(`/api/v1/verifikasi-perbaikan${qs}`, 'GET');
  },

  async getDetail(id) {
    return await apiRequest(`/api/v1/verifikasi-perbaikan/${id}`, 'GET');
  },

  async proses(id, catatan = '') {
    return await apiRequest(`/api/v1/verifikasi-perbaikan/${id}/proses`, 'PATCH', { catatan });
  },

  async mintaPerbaikan(id, catatan) {
    return await apiRequest(`/api/v1/verifikasi-perbaikan/${id}/perlu-perbaikan`, 'PATCH', { catatan });
  },

  async tolak(id, catatan) {
    return await apiRequest(`/api/v1/verifikasi-perbaikan/${id}/tolak`, 'PATCH', { catatan });
  },

  async setujui(id, catatan = '') {
    return await apiRequest(`/api/v1/verifikasi-perbaikan/${id}/setujui`, 'POST', { catatan });
  }
};
