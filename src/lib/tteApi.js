import { apiRequest } from './api';

/**
 * API Wrapper untuk Tanda Tangan Elektronik (TTE) BSrE
 */
export const tteApi = {
  // Pejabat TTE (Kepala BKPSDM, Sekda, Bupati)
  async getAntrian(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return await apiRequest(`/api/v1/tte/antrian${qs}`, 'GET');
  },

  async getDetail(id) {
    return await apiRequest(`/api/v1/tte/dokumen/${id}`, 'GET');
  },

  async signDokumen(id, passphrase) {
    return await apiRequest(`/api/v1/tte/${id}/sign`, 'POST', { passphrase });
  },

  async tolakDokumen(id, catatan) {
    return await apiRequest(`/api/v1/tte/${id}/tolak`, 'POST', { catatan });
  },

  // Konfigurasi Pejabat Penandatangan (Admin)
  async listPejabat() {
    return await apiRequest('/api/v1/pejabat-penandatangan', 'GET');
  },

  async createPejabat(data) {
    return await apiRequest('/api/v1/pejabat-penandatangan', 'POST', data);
  },

  async updatePejabat(id, data) {
    return await apiRequest(`/api/v1/pejabat-penandatangan/${id}`, 'PUT', data);
  },

  async deletePejabat(id) {
    return await apiRequest(`/api/v1/pejabat-penandatangan/${id}`, 'DELETE');
  }
};
