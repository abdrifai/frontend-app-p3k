import { apiRequest } from './api';

/**
 * API Wrapper untuk Portal Pegawai PPPK
 */
export const portalApi = {
  // 1. Alur Aktivasi Mandiri
  async cekAktivasi(payload) {
    return await apiRequest('/api/v1/portal/auth/cek', 'POST', payload);
  },

  async kirimOtp(payload) {
    return await apiRequest('/api/v1/portal/auth/kirim-otp', 'POST', payload);
  },

  async verifikasiOtp(payload) {
    return await apiRequest('/api/v1/portal/auth/verifikasi', 'POST', payload);
  },

  // 2. Data Milik Sendiri (Self-Service)
  async getMe() {
    return await apiRequest('/api/v1/portal/me', 'GET');
  },

  async getRiwayatKeluarga() {
    return await apiRequest('/api/v1/portal/me/keluarga', 'GET');
  },

  async getRiwayatKontrak() {
    return await apiRequest('/api/v1/portal/me/riwayat-kontrak', 'GET');
  },

  async getSkPengangkatan() {
    return await apiRequest('/api/v1/portal/me/sk-pengangkatan', 'GET');
  },

  async getPerpanjangan() {
    return await apiRequest('/api/v1/portal/me/perpanjangan', 'GET');
  },

  // 3. Usulan Perbaikan Data
  async getAturanPerbaikan() {
    return await apiRequest('/api/v1/portal/perbaikan/aturan', 'GET');
  },

  async getDaftarUsulan(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.kategori) query.append('kategori', params.kategori);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return await apiRequest(`/api/v1/portal/perbaikan${qs}`, 'GET');
  },

  async getDetailUsulan(id) {
    return await apiRequest(`/api/v1/portal/perbaikan/${id}`, 'GET');
  },

  async buatUsulan(formData) {
    return await apiRequest('/api/v1/portal/perbaikan', 'POST', formData, true);
  },

  async revisiUsulan(id, formData) {
    return await apiRequest(`/api/v1/portal/perbaikan/${id}`, 'PUT', formData, true);
  },

  async batalkanUsulan(id) {
    return await apiRequest(`/api/v1/portal/perbaikan/${id}`, 'DELETE');
  },

  // 4. TTE Dokumen Kontrak (Pegawai)
  async getAntrianTte() {
    return await apiRequest('/api/v1/portal/tte', 'GET');
  },

  async signDokumenTte(id, passphrase) {
    return await apiRequest(`/api/v1/portal/tte/${id}/sign`, 'POST', { passphrase });
  }
};
