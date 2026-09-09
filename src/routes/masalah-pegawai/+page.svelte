<script>
  import { onMount } from 'svelte';
  import { apiRequest, API_BASE_URL } from '$lib/api';
  import { addToast } from '$lib/toastStore';
  import RichArticleEditor from '$lib/components/RichArticleEditor.svelte';

  // State Management
  let isLoading = $state(true);
  let isSaving = $state(false);
  let isSearchingPegawai = $state(false);

  // Data List & Stats
  let masalahList = $state([]);
  let kategoriList = $state([]);
  let refUnorList = $state([]);
  let pagination = $state({ page: 1, limit: 10, total: 0, totalPages: 1 });
  let rekapStats = $state({
    total: 0,
    statusCounts: { OPEN: 0, INVESTIGASI: 0, TINDAK_LANJUT: 0, SELESAI: 0, DIBATALKAN: 0 },
    keparahanCounts: { RINGAN: 0, SEDANG: 0, BERAT: 0, KRITIS: 0 },
    kategoriStats: []
  });

  // Filters
  let searchQuery = $state('');
  let filterKategoriId = $state('');
  let filterStatus = $state('');
  let filterKeparahan = $state('');
  let filterUnorIndukId = $state('');
  let filterStartDate = $state('');
  let filterEndDate = $state('');

  // Modals
  let showFormModal = $state(false);
  let showDetailModal = $state(false);
  let showTindakLanjutModal = $state(false);
  let showDeleteModal = $state(false);
  let isEditMode = $state(false);
  let selectedMasalah = $state(null);
  let deleteTargetId = $state(null);

  // Pegawai Autocomplete
  let pegawaiSearchResults = $state([]);
  let pegawaiSearchInput = $state('');
  let selectedPegawai = $state(null);
  let showPegawaiDropdown = $state(false);
  let searchDebounceTimer = null;

  // Form State
  let formId = $state('');
  let formNomorKasus = $state('');
  let isFetchingNomorKasus = $state(false);
  let formPegawaiId = $state('');
  let formKategoriId = $state('');
  let formJudul = $state('');
  let formTanggalKejadian = $state('');
  let formTingkatKeparahan = $state('SEDANG');
  let formStatus = $state('OPEN');
  let formDeskripsi = $state('');
  let formRingkasanMasalah = $state('');
  let formTindakLanjut = $state('');
  let formCatatanPenyelesaian = $state('');
  let formTanggalSelesai = $state('');
  let formFiles = $state([]);
  let formExistingLampiran = $state([]);

  // Tindak Lanjut Form
  let tlStatusBaru = $state('TINDAK_LANJUT');
  let tlTindakan = $state('');
  let tlKeterangan = $state('');
  let tlTanggalSelesai = $state('');

  // Badge Color & Helper Formatters
  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return { label: 'Open / Baru', class: 'bg-red-50 text-red-700 border-red-200' };
      case 'INVESTIGASI':
        return { label: 'Investigasi', class: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'TINDAK_LANJUT':
        return { label: 'Tindak Lanjut', class: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'SELESAI':
        return { label: 'Selesai', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'DIBATALKAN':
        return { label: 'Dibatalkan', class: 'bg-slate-100 text-slate-600 border-slate-200' };
      default:
        return { label: status, class: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'RINGAN':
        return { label: 'Ringan', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'SEDANG':
        return { label: 'Sedang', class: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'BERAT':
        return { label: 'Berat', class: 'bg-orange-50 text-orange-700 border-orange-200' };
      case 'KRITIS':
        return { label: 'Kritis', class: 'bg-rose-100 text-rose-800 border-rose-300 font-bold' };
      default:
        return { label: sev, class: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // API Callers
  async function loadKategori() {
    try {
      const res = await apiRequest('/api/v1/kategori-masalah?onlyActive=true');
      kategoriList = res.data || [];
    } catch (e) {
      console.error('Failed to load kategori:', e);
    }
  }

  async function loadRefUnor() {
    try {
      const res = await apiRequest('/api/v1/ref-unor');
      refUnorList = res.data || [];
    } catch (e) {
      console.error('Failed to load ref-unor:', e);
    }
  }

  async function loadRekapStats() {
    try {
      const res = await apiRequest('/api/v1/masalah-pegawai/rekap');
      rekapStats = res.data || rekapStats;
    } catch (e) {
      console.error('Failed to load rekap stats:', e);
    }
  }

  async function loadMasalahList(page = 1) {
    isLoading = true;
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', '10');
      if (searchQuery) queryParams.append('search', searchQuery);
      if (filterKategoriId) queryParams.append('kategoriId', filterKategoriId);
      if (filterStatus) queryParams.append('status', filterStatus);
      if (filterKeparahan) queryParams.append('tingkatKeparahan', filterKeparahan);
      if (filterUnorIndukId) queryParams.append('unorIndukId', filterUnorIndukId);
      if (filterStartDate) queryParams.append('startDate', filterStartDate);
      if (filterEndDate) queryParams.append('endDate', filterEndDate);

      const res = await apiRequest(`/api/v1/masalah-pegawai?${queryParams.toString()}`);
      masalahList = res.data || [];
      pagination = res.pagination || pagination;
    } catch (e) {
      addToast(e.message || 'Gagal memuat daftar masalah pegawai', 'error');
    } finally {
      isLoading = false;
    }
  }

  // Pegawai Autocomplete Search
  async function searchPegawai(query) {
    if (!query || query.trim().length < 2) {
      pegawaiSearchResults = [];
      showPegawaiDropdown = false;
      return;
    }

    isSearchingPegawai = true;
    try {
      const res = await apiRequest(`/api/v1/data-p3k?search=${encodeURIComponent(query)}&limit=8`);
      pegawaiSearchResults = res.data?.data || res.data || [];
      showPegawaiDropdown = pegawaiSearchResults.length > 0;
    } catch (e) {
      console.error('Failed searching pegawai:', e);
    } finally {
      isSearchingPegawai = false;
    }
  }

  function handlePegawaiSearchInput(e) {
    pegawaiSearchInput = e.target.value;
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      searchPegawai(pegawaiSearchInput);
    }, 300);
  }

  function selectPegawai(p) {
    selectedPegawai = p;
    formPegawaiId = p.id;
    pegawaiSearchInput = `${p.nama} (${p.nipBaru})`;
    showPegawaiDropdown = false;
  }

  async function fetchNextNomorKasus() {
    isFetchingNomorKasus = true;
    try {
      const res = await apiRequest('/api/v1/masalah-pegawai/generate-nomor');
      if (res && res.data && res.data.nomorKasus) {
        formNomorKasus = res.data.nomorKasus;
      }
    } catch (e) {
      console.error('Failed generating next case number:', e);
      const now = new Date();
      const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      if (!formNomorKasus) {
        formNomorKasus = `KASUS/${ym}/0001`;
      }
    } finally {
      isFetchingNomorKasus = false;
    }
  }

  // Modal Actions
  function openCreateModal() {
    isEditMode = false;
    formId = '';
    formNomorKasus = '';
    formPegawaiId = '';
    selectedPegawai = null;
    pegawaiSearchInput = '';
    formKategoriId = kategoriList[0]?.id || '';
    formJudul = '';
    formTanggalKejadian = new Date().toISOString().slice(0, 10);
    formTingkatKeparahan = 'SEDANG';
    formStatus = 'OPEN';
    formDeskripsi = '';
    formRingkasanMasalah = '';
    formTindakLanjut = '';
    formCatatanPenyelesaian = '';
    formTanggalSelesai = '';
    formFiles = [];
    formExistingLampiran = [];
    showFormModal = true;
    fetchNextNomorKasus();
  }

  async function openEditModal(item) {
    isEditMode = true;
    formId = item.id;
    formNomorKasus = item.nomorKasus || '';
    formPegawaiId = item.dataP3k?.id || '';
    selectedPegawai = item.dataP3k;
    pegawaiSearchInput = item.dataP3k ? `${item.dataP3k.nama} (${item.dataP3k.nipBaru})` : '';
    formKategoriId = item.kategori?.id || '';
    formJudul = item.judul || '';
    formTanggalKejadian = item.tanggalKejadian ? item.tanggalKejadian.slice(0, 10) : '';
    formTingkatKeparahan = item.tingkatKeparahan || 'SEDANG';
    formStatus = item.status || 'OPEN';
    formDeskripsi = item.deskripsi || '';
    formRingkasanMasalah = item.ringkasanMasalah || '';
    formTindakLanjut = item.tindakLanjut || '';
    formCatatanPenyelesaian = item.catatanPenyelesaian || '';
    formTanggalSelesai = item.tanggalSelesai ? item.tanggalSelesai.slice(0, 10) : '';
    formFiles = [];
    formExistingLampiran = item.lampiran || [];
    showFormModal = true;

    // Fetch full detail from API to guarantee full description and attachments
    try {
      const res = await apiRequest(`/api/v1/masalah-pegawai/${item.id}`);
      if (res && res.data) {
        formNomorKasus = res.data.nomorKasus || formNomorKasus;
        formDeskripsi = res.data.deskripsi || '';
        formExistingLampiran = res.data.lampiran || [];
        if (res.data.dataP3k) {
          selectedPegawai = res.data.dataP3k;
          formPegawaiId = res.data.dataP3k.id;
          pegawaiSearchInput = `${res.data.dataP3k.nama} (${res.data.dataP3k.nipBaru})`;
        }
      }
    } catch (e) {
      console.error('Failed fetching full record for edit:', e);
    }
  }

  async function openDetailModal(item) {
    try {
      const res = await apiRequest(`/api/v1/masalah-pegawai/${item.id}`);
      selectedMasalah = res.data;
      showDetailModal = true;
    } catch (e) {
      addToast('Gagal memuat detail masalah', 'error');
    }
  }

  function openTindakLanjutModal(item) {
    selectedMasalah = item;
    tlStatusBaru = item.status === 'SELESAI' ? 'SELESAI' : 'TINDAK_LANJUT';
    tlTindakan = '';
    tlKeterangan = '';
    tlTanggalSelesai = new Date().toISOString().slice(0, 10);
    showTindakLanjutModal = true;
  }

  function confirmDelete(id) {
    deleteTargetId = id;
    showDeleteModal = true;
  }

  // Handle Form Submit
  async function handleSaveMasalah(e) {
    e.preventDefault();

    if (!formPegawaiId) {
      addToast('Silakan pilih pegawai terlebih dahulu', 'error');
      return;
    }
    if (!formKategoriId) {
      addToast('Silakan pilih kategori masalah', 'error');
      return;
    }
    if (!formJudul.trim()) {
      addToast('Judul masalah wajib diisi', 'error');
      return;
    }
    if (!formDeskripsi.trim() || formDeskripsi === '<br>') {
      addToast('Deskripsi artikel masalah wajib diisi', 'error');
      return;
    }

    isSaving = true;
    try {
      const formData = new FormData();
      if (formNomorKasus.trim()) formData.append('nomorKasus', formNomorKasus.trim());
      formData.append('dataP3kId', formPegawaiId);
      formData.append('kategoriId', formKategoriId);
      formData.append('judul', formJudul.trim());
      if (formTanggalKejadian) formData.append('tanggalKejadian', formTanggalKejadian);
      formData.append('tingkatKeparahan', formTingkatKeparahan);
      formData.append('status', formStatus);
      formData.append('deskripsi', formDeskripsi);
      if (formRingkasanMasalah) formData.append('ringkasanMasalah', formRingkasanMasalah);
      if (formTindakLanjut) formData.append('tindakLanjut', formTindakLanjut);
      if (formCatatanPenyelesaian) formData.append('catatanPenyelesaian', formCatatanPenyelesaian);
      if (formTanggalSelesai) formData.append('tanggalSelesai', formTanggalSelesai);

      // Append uploaded files
      for (const file of formFiles) {
        formData.append('lampiran', file);
      }

      if (isEditMode) {
        await apiRequest(`/api/v1/masalah-pegawai/${formId}`, 'PUT', formData, true);
        addToast('Catatan masalah berhasil diperbarui', 'success');
      } else {
        await apiRequest('/api/v1/masalah-pegawai', 'POST', formData, true);
        addToast('Catatan masalah berhasil didokumentasikan', 'success');
      }

      showFormModal = false;
      loadMasalahList(pagination.page);
      loadRekapStats();
    } catch (e) {
      addToast(e.message || 'Gagal menyimpan catatan masalah', 'error');
    } finally {
      isSaving = false;
    }
  }

  // Handle Save Tindak Lanjut
  async function handleSaveTindakLanjut(e) {
    e.preventDefault();
    if (!tlTindakan.trim()) {
      addToast('Tindakan / Progres wajib diisi', 'error');
      return;
    }

    isSaving = true;
    try {
      await apiRequest(`/api/v1/masalah-pegawai/${selectedMasalah.id}/tindak-lanjut`, 'POST', {
        statusBaru: tlStatusBaru,
        tindakan: tlTindakan.trim(),
        keterangan: tlKeterangan.trim(),
        tanggalSelesai: tlStatusBaru === 'SELESAI' ? tlTanggalSelesai : null
      });

      addToast('Riwayat progres & status berhasil diperbarui', 'success');
      showTindakLanjutModal = false;

      // Refresh detail if open
      if (showDetailModal && selectedMasalah) {
        openDetailModal(selectedMasalah);
      }
      loadMasalahList(pagination.page);
      loadRekapStats();
    } catch (e) {
      addToast(e.message || 'Gagal menyimpan tindak lanjut', 'error');
    } finally {
      isSaving = false;
    }
  }

  // Handle Delete
  async function handleDelete() {
    if (!deleteTargetId) return;
    try {
      await apiRequest(`/api/v1/masalah-pegawai/${deleteTargetId}`, 'DELETE');
      addToast('Catatan masalah berhasil dihapus', 'success');
      showDeleteModal = false;
      loadMasalahList(pagination.page);
      loadRekapStats();
    } catch (e) {
      addToast(e.message || 'Gagal menghapus catatan masalah', 'error');
    }
  }

  // Handle File Input in Form
  function handleFileChange(e) {
    const selected = Array.from(e.target.files);
    formFiles = [...formFiles, ...selected];
  }

  function removeNewFile(index) {
    formFiles = formFiles.filter((_, i) => i !== index);
  }

  async function removeExistingLampiran(lampiranId) {
    if (!confirm('Hapus lampiran ini?')) return;
    try {
      await apiRequest(`/api/v1/masalah-pegawai/lampiran/${lampiranId}`, 'DELETE');
      formExistingLampiran = formExistingLampiran.filter(l => l.id !== lampiranId);
      addToast('Lampiran berhasil dihapus', 'success');
    } catch (e) {
      addToast('Gagal menghapus lampiran', 'error');
    }
  }

  // Export to Excel
  function handleExportExcel() {
    const queryParams = new URLSearchParams();
    if (searchQuery) queryParams.append('search', searchQuery);
    if (filterKategoriId) queryParams.append('kategoriId', filterKategoriId);
    if (filterStatus) queryParams.append('status', filterStatus);
    if (filterKeparahan) queryParams.append('tingkatKeparahan', filterKeparahan);
    if (filterUnorIndukId) queryParams.append('unorIndukId', filterUnorIndukId);
    if (filterStartDate) queryParams.append('startDate', filterStartDate);
    if (filterEndDate) queryParams.append('endDate', filterEndDate);

    const exportUrl = `${API_BASE_URL}/api/v1/masalah-pegawai/export-excel?${queryParams.toString()}`;
    window.open(exportUrl, '_blank');
  }

  onMount(() => {
    loadKategori();
    loadRefUnor();
    loadRekapStats();
    loadMasalahList();
  });
</script>

<svelte:head>
  <title>Catatan & Rekap Masalah Pegawai — SIPPPK</title>
</svelte:head>

<div class="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
    <div>
      <div class="flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold shadow-2xs">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Catatan & Rekap Masalah Pegawai</h1>
          <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
            Dokumentasi rekam jejak permasalahan, kedisiplinan, dan evaluasi kasus pegawai berbasis artikel & kategori.
          </p>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex items-center gap-2.5 shrink-0">
      <button
        type="button"
        class="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 text-sm font-medium transition-all shadow-2xs"
        onclick={handleExportExcel}
      >
        <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>Export Excel</span>
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all shadow-xs hover:shadow-md"
        onclick={openCreateModal}
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        <span>Catat Masalah Baru</span>
      </button>
    </div>
  </div>

  <!-- KPI Summary Cards -->
  <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
    <!-- 1. Total Masalah -->
    <button
      type="button"
      class="text-left bg-white hover:bg-slate-50/90 border rounded-2xl p-4 sm:p-4.5 shadow-xs hover:shadow-md transition-all duration-200 relative overflow-hidden group flex flex-col justify-between {filterStatus === '' && filterKeparahan === '' ? 'border-slate-300 ring-2 ring-slate-400/20' : 'border-slate-200/80'}"
      onclick={() => { filterStatus = ''; filterKeparahan = ''; loadMasalahList(1); }}
    >
      <div class="flex items-center justify-between w-full">
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600">
          <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          Semua Data
        </span>
        <div class="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-slate-200/70 text-slate-600 flex items-center justify-center shrink-0 transition-colors">
          <svg class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      </div>
      <div class="mt-3">
        <p class="text-xs font-medium text-slate-500">Total Masalah</p>
        <div class="flex items-baseline gap-2 mt-0.5">
          <span class="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">{rekapStats.total || 0}</span>
          <span class="text-[11px] text-slate-400 font-medium">kasus</span>
        </div>
      </div>
    </button>

    <!-- 2. Status: Open / Baru -->
    <button
      type="button"
      class="text-left bg-white hover:bg-red-50/40 border rounded-2xl p-4 sm:p-4.5 shadow-xs hover:shadow-md transition-all duration-200 relative overflow-hidden group flex flex-col justify-between {filterStatus === 'OPEN' ? 'border-red-400 ring-2 ring-red-500/30 bg-red-50/20' : 'border-red-100'}"
      onclick={() => { filterStatus = filterStatus === 'OPEN' ? '' : 'OPEN'; loadMasalahList(1); }}
    >
      <div class="flex items-center justify-between w-full">
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200/60">
          <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
          Baru Masuk
        </span>
        <div class="w-9 h-9 rounded-xl bg-red-50 group-hover:bg-red-100 text-red-600 flex items-center justify-center shrink-0 transition-colors">
          <svg class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      <div class="mt-3">
        <p class="text-xs font-medium text-red-600/90">Status: Open</p>
        <div class="flex items-baseline gap-2 mt-0.5">
          <span class="text-2xl sm:text-3xl font-black text-red-700 tracking-tight">{rekapStats.statusCounts?.OPEN || 0}</span>
          <span class="text-[11px] text-red-500 font-medium">kasus</span>
        </div>
      </div>
    </button>

    <!-- 3. Status: Investigasi / Tindak Lanjut -->
    <button
      type="button"
      class="text-left bg-white hover:bg-amber-50/40 border rounded-2xl p-4 sm:p-4.5 shadow-xs hover:shadow-md transition-all duration-200 relative overflow-hidden group flex flex-col justify-between {filterStatus === 'TINDAK_LANJUT' || filterStatus === 'INVESTIGASI' ? 'border-amber-400 ring-2 ring-amber-500/30 bg-amber-50/20' : 'border-amber-100'}"
      onclick={() => { filterStatus = filterStatus === 'TINDAK_LANJUT' ? '' : 'TINDAK_LANJUT'; loadMasalahList(1); }}
    >
      <div class="flex items-center justify-between w-full">
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Proses
        </span>
        <div class="w-9 h-9 rounded-xl bg-amber-50 group-hover:bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 transition-colors">
          <svg class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>
      <div class="mt-3">
        <p class="text-xs font-medium text-amber-600/90">Investigasi / Tindak Lanjut</p>
        <div class="flex items-baseline gap-2 mt-0.5">
          <span class="text-2xl sm:text-3xl font-black text-amber-700 tracking-tight">
            {(rekapStats.statusCounts?.INVESTIGASI || 0) + (rekapStats.statusCounts?.TINDAK_LANJUT || 0)}
          </span>
          <span class="text-[11px] text-amber-500 font-medium">kasus</span>
        </div>
      </div>
    </button>

    <!-- 4. Status: Selesai -->
    <button
      type="button"
      class="text-left bg-white hover:bg-emerald-50/40 border rounded-2xl p-4 sm:p-4.5 shadow-xs hover:shadow-md transition-all duration-200 relative overflow-hidden group flex flex-col justify-between {filterStatus === 'SELESAI' ? 'border-emerald-400 ring-2 ring-emerald-500/30 bg-emerald-50/20' : 'border-emerald-100'}"
      onclick={() => { filterStatus = filterStatus === 'SELESAI' ? '' : 'SELESAI'; loadMasalahList(1); }}
    >
      <div class="flex items-center justify-between w-full">
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Ditutup
        </span>
        <div class="w-9 h-9 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 transition-colors">
          <svg class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      <div class="mt-3">
        <p class="text-xs font-medium text-emerald-600/90">Kasus Selesai</p>
        <div class="flex items-baseline gap-2 mt-0.5">
          <span class="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">{rekapStats.statusCounts?.SELESAI || 0}</span>
          <span class="text-[11px] text-emerald-500 font-medium">kasus</span>
        </div>
      </div>
    </button>

    <!-- 5. Tingkat Berat & Kritis -->
    <button
      type="button"
      class="text-left bg-white hover:bg-purple-50/40 border rounded-2xl p-4 sm:p-4.5 shadow-xs hover:shadow-md transition-all duration-200 relative overflow-hidden group flex flex-col justify-between col-span-2 sm:col-span-2 lg:col-span-1 {filterKeparahan === 'BERAT' || filterKeparahan === 'KRITIS' ? 'border-purple-400 ring-2 ring-purple-500/30 bg-purple-50/20' : 'border-purple-100'}"
      onclick={() => { filterKeparahan = filterKeparahan === 'BERAT' ? '' : 'BERAT'; loadMasalahList(1); }}
    >
      <div class="flex items-center justify-between w-full">
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
          <span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
          Prioritas
        </span>
        <div class="w-9 h-9 rounded-xl bg-purple-50 group-hover:bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 transition-colors">
          <svg class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      </div>
      <div class="mt-3">
        <p class="text-xs font-medium text-purple-700/90">Tingkat Berat / Kritis</p>
        <div class="flex items-baseline gap-2 mt-0.5">
          <span class="text-2xl sm:text-3xl font-black text-purple-800 tracking-tight">
            {(rekapStats.keparahanCounts?.BERAT || 0) + (rekapStats.keparahanCounts?.KRITIS || 0)}
          </span>
          <span class="text-[11px] text-purple-500 font-medium">kasus</span>
        </div>
      </div>
    </button>
  </div>

  <!-- Category Breakdown Badges (Quick Filter) -->
  {#if rekapStats.kategoriStats && rekapStats.kategoriStats.length > 0}
    <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
      <div class="flex items-center justify-between mb-2.5">
        <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Rekapitulasi Per Kategori Masalah</p>
        {#if filterKategoriId}
          <button
            type="button"
            class="text-xs text-blue-600 hover:underline font-medium"
            onclick={() => { filterKategoriId = ''; loadMasalahList(1); }}
          >
            Reset Filter Kategori
          </button>
        {/if}
      </div>
      <div class="flex flex-wrap gap-2">
        {#each rekapStats.kategoriStats as cat}
          <button
            type="button"
            class="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all {filterKategoriId === cat.id ? 'ring-2 ring-offset-1 ring-blue-500 shadow-xs' : 'hover:border-slate-300'}"
            style="background-color: {cat.warnaBadge}15; border-color: {cat.warnaBadge}40; color: {cat.warnaBadge};"
            onclick={() => { filterKategoriId = filterKategoriId === cat.id ? '' : cat.id; loadMasalahList(1); }}
          >
            <span class="w-2 h-2 rounded-full" style="background-color: {cat.warnaBadge};"></span>
            <span>{cat.nama}</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white/80 shadow-2xs">{cat.totalKasus || 0}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Filter & Search Bar -->
  <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <!-- Search input -->
      <div class="lg:col-span-2 relative">
        <input
          type="text"
          placeholder="Cari NIP, Nama Pegawai, No Kasus, Judul..."
          class="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50 focus:bg-white"
          bind:value={searchQuery}
          onkeydown={(e) => { if (e.key === 'Enter') loadMasalahList(1); }}
        />
        <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <!-- Kategori Filter -->
      <div>
        <select
          class="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50"
          bind:value={filterKategoriId}
          onchange={() => loadMasalahList(1)}
        >
          <option value="">Semua Kategori</option>
          {#each kategoriList as cat}
            <option value={cat.id}>{cat.nama}</option>
          {/each}
        </select>
      </div>

      <!-- Status Filter -->
      <div>
        <select
          class="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50"
          bind:value={filterStatus}
          onchange={() => loadMasalahList(1)}
        >
          <option value="">Semua Status</option>
          <option value="OPEN">Open / Baru</option>
          <option value="INVESTIGASI">Dalam Investigasi</option>
          <option value="TINDAK_LANJUT">Tindak Lanjut</option>
          <option value="SELESAI">Selesai</option>
          <option value="DIBATALKAN">Dibatalkan</option>
        </select>
      </div>

      <!-- Tingkat Keparahan Filter -->
      <div>
        <select
          class="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50"
          bind:value={filterKeparahan}
          onchange={() => loadMasalahList(1)}
        >
          <option value="">Semua Tingkat</option>
          <option value="RINGAN">Ringan</option>
          <option value="SEDANG">Sedang</option>
          <option value="BERAT">Berat</option>
          <option value="KRITIS">Kritis</option>
        </select>
      </div>
    </div>

    <!-- Second Filter Row (Unit Kerja & Dates) -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
      <div>
        <select
          class="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
          bind:value={filterUnorIndukId}
          onchange={() => loadMasalahList(1)}
        >
          <option value="">Semua Unit Kerja Induk</option>
          {#each refUnorList as unor}
            <option value={unor.id}>{unor.nama}</option>
          {/each}
        </select>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-xs text-slate-500 shrink-0">Tgl:</span>
        <input
          type="date"
          class="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-hidden"
          bind:value={filterStartDate}
          onchange={() => loadMasalahList(1)}
        />
        <span class="text-xs text-slate-400">s/d</span>
        <input
          type="date"
          class="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-hidden"
          bind:value={filterEndDate}
          onchange={() => loadMasalahList(1)}
        />
      </div>

      <div class="flex items-center justify-end gap-2">
        <button
          type="button"
          class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          onclick={() => {
            searchQuery = '';
            filterKategoriId = '';
            filterStatus = '';
            filterKeparahan = '';
            filterUnorIndukId = '';
            filterStartDate = '';
            filterEndDate = '';
            loadMasalahList(1);
          }}
        >
          Reset Filter
        </button>
        <button
          type="button"
          class="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-2xs"
          onclick={() => loadMasalahList(1)}
        >
          Terapkan
        </button>
      </div>
    </div>
  </div>

  <!-- Data Table -->
  <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm text-slate-700">
        <thead class="bg-slate-50/80 text-xs text-slate-500 uppercase font-semibold border-b border-slate-200/80">
          <tr>
            <th class="px-4 py-3.5 w-12 text-center">No</th>
            <th class="px-4 py-3.5">Nomor & Kasus</th>
            <th class="px-4 py-3.5">Pegawai Terkait</th>
            <th class="px-4 py-3.5">Kategori</th>
            <th class="px-4 py-3.5 text-center">Tingkat</th>
            <th class="px-4 py-3.5 text-center">Status</th>
            <th class="px-4 py-3.5 text-center w-36">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {#if isLoading}
            {#each Array(5) as _}
              <tr class="animate-pulse">
                <td class="px-4 py-4 text-center"><div class="h-4 bg-slate-200 rounded w-4 mx-auto"></div></td>
                <td class="px-4 py-4"><div class="h-4 bg-slate-200 rounded w-3/4 mb-1.5"></div><div class="h-3 bg-slate-100 rounded w-1/2"></div></td>
                <td class="px-4 py-4"><div class="h-4 bg-slate-200 rounded w-2/3 mb-1.5"></div><div class="h-3 bg-slate-100 rounded w-1/3"></div></td>
                <td class="px-4 py-4"><div class="h-6 bg-slate-100 rounded-full w-24"></div></td>
                <td class="px-4 py-4 text-center"><div class="h-5 bg-slate-100 rounded-full w-16 mx-auto"></div></td>
                <td class="px-4 py-4 text-center"><div class="h-5 bg-slate-100 rounded-full w-20 mx-auto"></div></td>
                <td class="px-4 py-4 text-center"><div class="h-8 bg-slate-100 rounded-xl w-24 mx-auto"></div></td>
              </tr>
            {/each}
          {:else if masalahList.length === 0}
            <tr>
              <td colspan="7" class="px-4 py-12 text-center text-slate-400">
                <div class="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400 mb-2">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p class="font-medium text-slate-600">Tidak ada catatan masalah ditemukan</p>
                <p class="text-xs text-slate-400 mt-0.5">Coba sesuaikan filter atau tambahkan catatan masalah baru.</p>
              </td>
            </tr>
          {:else}
            {#each masalahList as item, index}
              {@const statBadge = getStatusBadge(item.status)}
              {@const sevBadge = getSeverityBadge(item.tingkatKeparahan)}
              <tr class="hover:bg-slate-50/60 transition-colors">
                <td class="px-4 py-3.5 text-center text-xs font-medium text-slate-400">
                  {(pagination.page - 1) * pagination.limit + index + 1}
                </td>
                <td class="px-4 py-3.5">
                  <div class="font-semibold text-slate-800 line-clamp-1 hover:text-blue-600 cursor-pointer" onclick={() => openDetailModal(item)}>
                    {item.judul}
                  </div>
                  <div class="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span class="font-mono font-medium text-slate-500">{item.nomorKasus}</span>
                    <span>&bull;</span>
                    <span>{formatDate(item.tanggalKejadian)}</span>
                  </div>
                </td>
                <td class="px-4 py-3.5">
                  <div class="font-medium text-slate-800 leading-tight">
                    {item.dataP3k?.nama || '-'}
                  </div>
                  <div class="text-xs text-slate-400 font-mono mt-0.5">
                    {item.dataP3k?.nipBaru || '-'}
                  </div>
                  <div class="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {item.dataP3k?.unorNama || '-'}
                  </div>
                </td>
                <td class="px-4 py-3.5">
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                    style="background-color: {item.kategori?.warnaBadge || '#64748b'}15; border-color: {item.kategori?.warnaBadge || '#64748b'}40; color: {item.kategori?.warnaBadge || '#64748b'};"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" style="background-color: {item.kategori?.warnaBadge || '#64748b'};"></span>
                    <span>{item.kategori?.nama || '-'}</span>
                  </span>
                </td>
                <td class="px-4 py-3.5 text-center">
                  <span class="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full border {sevBadge.class}">
                    {sevBadge.label}
                  </span>
                </td>
                <td class="px-4 py-3.5 text-center">
                  <span class="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full border {statBadge.class}">
                    {statBadge.label}
                  </span>
                </td>
                <td class="px-4 py-3.5 text-center">
                  <div class="flex items-center justify-center gap-1">
                    <!-- Detail -->
                    <button
                      type="button"
                      class="w-7 h-7 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors"
                      title="Lihat Detail Artikel & Timeline"
                      onclick={() => openDetailModal(item)}
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>

                    <!-- Tindak Lanjut -->
                    <button
                      type="button"
                      class="w-7 h-7 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-colors"
                      title="Update Progres / Tindak Lanjut"
                      onclick={() => openTindakLanjutModal(item)}
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>

                    <!-- Edit -->
                    <button
                      type="button"
                      class="w-7 h-7 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors"
                      title="Edit Catatan"
                      onclick={() => openEditModal(item)}
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    <!-- Delete -->
                    <button
                      type="button"
                      class="w-7 h-7 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                      title="Hapus Catatan"
                      onclick={() => confirmDelete(item.id)}
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>

    <!-- Pagination Footer -->
    {#if pagination.totalPages > 1}
      <div class="px-4 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div>
          Menampilkan baris {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} data
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={pagination.page <= 1}
            onclick={() => loadMasalahList(pagination.page - 1)}
          >
            Sebelumnya
          </button>
          {#each Array(Math.min(pagination.totalPages, 5)) as _, i}
            {@const pNum = i + 1}
            <button
              type="button"
              class="w-7 h-7 rounded-lg border text-xs font-semibold {pagination.page === pNum ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}"
              onclick={() => loadMasalahList(pNum)}
            >
              {pNum}
            </button>
          {/each}
          <button
            type="button"
            class="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={pagination.page >= pagination.totalPages}
            onclick={() => loadMasalahList(pagination.page + 1)}
          >
            Selanjutnya
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- ========================================== -->
<!-- MODAL: FORM CATATAN MASALAH (CREATE/EDIT)  -->
<!-- ========================================== -->
{#if showFormModal}
  <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
    <div class="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-bold text-slate-800">
              {isEditMode ? 'Edit Catatan Masalah Pegawai' : 'Catat Masalah / Kasus Pegawai Baru'}
            </h2>
            <p class="text-xs text-slate-400">Tuliskan narasi lengkap permasalahan dalam format artikel terstruktur.</p>
          </div>
        </div>
        <button
          type="button"
          class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          onclick={() => (showFormModal = false)}
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <!-- Modal Body (Scrollable Form) -->
      <form onsubmit={handleSaveMasalah} class="flex-1 overflow-y-auto p-6 space-y-5">
        <!-- 1. Pegawai Selector (Autocomplete & Detail Terpilih) -->
        <div class="relative">
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Pegawai Bersangkutan <span class="text-red-500">*</span>
          </label>

          {#if selectedPegawai}
            <!-- Card Detail Pegawai Terpilih -->
            <div class="p-3.5 bg-blue-50/50 border border-blue-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                  {selectedPegawai.nama ? selectedPegawai.nama.charAt(0).toUpperCase() : 'P'}
                </div>
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="font-bold text-sm text-slate-900">{selectedPegawai.nama}</p>
                    <span class="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-100 text-blue-800 font-mono">
                      NIP: {selectedPegawai.nipBaru}
                    </span>
                  </div>
                  <p class="text-xs text-slate-700 mt-1">
                    <span class="font-semibold text-slate-500">Jabatan:</span> {selectedPegawai.jabatanNama || '-'}
                  </p>
                  <p class="text-xs text-slate-600 mt-0.5">
                    <span class="font-semibold text-slate-500">Unit Kerja:</span> {selectedPegawai.unorNama || '-'}
                  </p>
                </div>
              </div>

              {#if !isEditMode}
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-100 border border-blue-200 rounded-lg transition-all self-start sm:self-center shrink-0 shadow-2xs"
                  onclick={() => {
                    selectedPegawai = null;
                    formPegawaiId = '';
                    pegawaiSearchInput = '';
                  }}
                >
                  Ganti Pegawai
                </button>
              {:else}
                <span class="text-xs text-slate-400 italic shrink-0 self-start sm:self-center">Pegawai terkunci saat edit</span>
              {/if}
            </div>
          {:else}
            <!-- Input Pencarian Pegawai -->
            <div class="relative">
              <input
                type="text"
                placeholder="Ketik NIP atau Nama Pegawai untuk mencari..."
                class="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 focus:bg-white transition-all"
                value={pegawaiSearchInput}
                oninput={handlePegawaiSearchInput}
                onfocus={() => { if (pegawaiSearchResults.length > 0) showPegawaiDropdown = true; }}
              />
              <svg class="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {#if isSearchingPegawai}
                <div class="absolute right-3 top-3 text-slate-400 text-xs animate-spin">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </div>
              {/if}
            </div>

            <!-- Autocomplete Dropdown -->
            {#if showPegawaiDropdown && pegawaiSearchResults.length > 0}
              <div class="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto z-50 divide-y divide-slate-100">
                {#each pegawaiSearchResults as p}
                  <button
                    type="button"
                    class="w-full text-left p-3 hover:bg-blue-50/80 transition-colors flex items-center justify-between group"
                    onclick={() => selectPegawai(p)}
                  >
                    <div>
                      <p class="text-sm font-bold text-slate-800 group-hover:text-blue-600">{p.nama}</p>
                      <p class="text-xs text-slate-500 font-mono mt-0.5">NIP: {p.nipBaru}</p>
                      <p class="text-xs text-slate-600 mt-1">
                        {p.jabatanNama || '-'} &bull; <span class="text-slate-500">{p.unorNama || '-'}</span>
                      </p>
                    </div>
                    <span class="text-xs text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                      Pilih &rarr;
                    </span>
                  </button>
                {/each}
              </div>
            {/if}
          {/if}
        </div>

        <!-- 2. Nomor Registrasi / Kasus (Di Bawah Pencarian Pegawai) -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Nomor Registrasi / Kasus <span class="text-xs font-normal text-slate-400 lowercase">(otomatis / dapat diedit)</span>
            </label>
            {#if !isEditMode}
              <button
                type="button"
                class="text-[11px] text-blue-600 hover:text-blue-700 font-medium hover:underline flex items-center gap-1"
                onclick={fetchNextNomorKasus}
                disabled={isFetchingNomorKasus}
                title="Generate nomor urut baru otomatis dari sistem"
              >
                <svg class="w-3.5 h-3.5 {isFetchingNomorKasus ? 'animate-spin' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{isFetchingNomorKasus ? 'Mengambil...' : 'Generate Ulang Nomor'}</span>
              </button>
            {/if}
          </div>
          <div class="relative">
            <input
              type="text"
              placeholder="Contoh: KASUS/202609/0001"
              class="w-full pl-9 pr-3.5 py-2.5 text-sm font-mono font-semibold border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 focus:bg-white transition-all text-slate-800"
              bind:value={formNomorKasus}
            />
            <svg class="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">
            Terisi otomatis dari sistem, namun dapat diubah sesuai nomor surat/agenda instansi.
          </p>
        </div>

        <!-- 2. Kategori, Keparahan, Status, & Tanggal Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Kategori Masalah <span class="text-red-500">*</span>
            </label>
            <select
              class="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              bind:value={formKategoriId}
            >
              {#each kategoriList as cat}
                <option value={cat.id}>{cat.nama}</option>
              {/each}
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tingkat Keparahan
            </label>
            <select
              class="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              bind:value={formTingkatKeparahan}
            >
              <option value="RINGAN" class="text-emerald-600">Ringan</option>
              <option value="SEDANG" class="text-amber-600">Sedang</option>
              <option value="BERAT" class="text-orange-600">Berat</option>
              <option value="KRITIS" class="text-rose-700 font-bold">Kritis</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Status Kasus
            </label>
            <select
              class="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              bind:value={formStatus}
            >
              <option value="OPEN">Open / Baru</option>
              <option value="INVESTIGASI">Dalam Investigasi</option>
              <option value="TINDAK_LANJUT">Tindak Lanjut</option>
              <option value="SELESAI">Selesai</option>
              <option value="DIBATALKAN">Dibatalkan</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tanggal Kejadian
            </label>
            <input
              type="date"
              class="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              bind:value={formTanggalKejadian}
            />
          </div>
        </div>

        <!-- 3. Judul Kasus -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Judul Kasus / Ringkasan Masalah <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Contoh: Pelanggaran Disiplin Ketidakhadiran Tanpa Keterangan 10 Hari Berturut-turut"
            class="w-full px-3.5 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            bind:value={formJudul}
          />
        </div>

        <!-- 4. Area Editor Artikel Masalah -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Narasi Artikel & Kronologi Masalah <span class="text-red-500">*</span>
          </label>
          <RichArticleEditor
            bind:value={formDeskripsi}
            placeholder="Tuliskan uraian kronologi, fakta-fakta kejadian, saksi, dan keterangan terkait masalah pegawai ini..."
            minHeight="280px"
          />
        </div>

        <!-- 5. Lampiran Bukti Dokumen -->
        <div class="space-y-2">
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Lampiran Bukti Dokumen / Foto (Opsional)
          </label>
          <div class="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors">
            <input
              type="file"
              id="lampiran-file-input"
              class="hidden"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onchange={handleFileChange}
            />
            <label for="lampiran-file-input" class="cursor-pointer">
              <svg class="w-8 h-8 text-slate-400 mx-auto mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p class="text-xs font-semibold text-blue-600 hover:underline">Klik untuk mengunggah berkas bukti</p>
              <p class="text-[11px] text-slate-400 mt-0.5">Format: PDF, Word (DOCX), Excel, Gambar (JPG, PNG). Maks 15MB per file.</p>
            </label>
          </div>

          <!-- Existing Lampiran List (in Edit Mode) -->
          {#if formExistingLampiran.length > 0}
            <div class="space-y-1.5 pt-1">
              <p class="text-[11px] font-bold text-slate-500">Berkas yang sudah tersimpan:</p>
              {#each formExistingLampiran as lamp}
                <div class="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <a href="{API_BASE_URL}{lamp.fileUrl}" target="_blank" class="text-blue-600 hover:underline flex items-center gap-1.5 truncate">
                    <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span class="truncate">{lamp.namaFile}</span>
                  </a>
                  <button
                    type="button"
                    class="text-red-500 hover:text-red-700 text-xs font-semibold p-1"
                    onclick={() => removeExistingLampiran(lamp.id)}
                  >
                    Hapus
                  </button>
                </div>
              {/each}
            </div>
          {/if}

          <!-- New Selected Files List -->
          {#if formFiles.length > 0}
            <div class="space-y-1.5 pt-1">
              <p class="text-[11px] font-bold text-blue-600">Berkas baru yang akan diunggah:</p>
              {#each formFiles as file, i}
                <div class="flex items-center justify-between p-2 bg-blue-50/60 rounded-lg border border-blue-200 text-xs">
                  <span class="truncate text-slate-700">{file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
                  <button
                    type="button"
                    class="text-red-500 hover:text-red-700 text-xs font-semibold p-1"
                    onclick={() => removeNewFile(i)}
                  >
                    Batal
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Modal Footer -->
        <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            onclick={() => (showFormModal = false)}
            disabled={isSaving}
          >
            Batal
          </button>
          <button
            type="submit"
            class="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-xs flex items-center gap-2"
            disabled={isSaving}
          >
            {#if isSaving}
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              <span>Menyimpan...</span>
            {:else}
              <span>{isEditMode ? 'Simpan Perubahan' : 'Dokumentasikan Masalah'}</span>
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- ========================================== -->
<!-- MODAL: DETAIL ARTIKEL KASUS & TIMELINE     -->
<!-- ========================================== -->
{#if showDetailModal && selectedMasalah}
  {@const statBadge = getStatusBadge(selectedMasalah.status)}
  {@const sevBadge = getSeverityBadge(selectedMasalah.tingkatKeparahan)}
  <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
    <div class="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
        <div class="flex items-center gap-2.5">
          <span class="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700">
            {selectedMasalah.nomorKasus}
          </span>
          <span class="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full border {statBadge.class}">
            {statBadge.label}
          </span>
          <span class="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full border {sevBadge.class}">
            Tingkat {sevBadge.label}
          </span>
        </div>
        <button
          type="button"
          class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          onclick={() => (showDetailModal = false)}
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <!-- Content (Article Reader Mode) -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <!-- Title & Metadata -->
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
            {selectedMasalah.judul}
          </h1>
          <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
            <span class="inline-flex items-center gap-1 font-semibold" style="color: {selectedMasalah.kategori?.warnaBadge || '#64748b'};">
              <span class="w-2 h-2 rounded-full" style="background-color: {selectedMasalah.kategori?.warnaBadge || '#64748b'};"></span>
              {selectedMasalah.kategori?.nama}
            </span>
            <span>&bull;</span>
            <span>Tanggal Kejadian: <strong>{formatDate(selectedMasalah.tanggalKejadian)}</strong></span>
            <span>&bull;</span>
            <span>Dicatat oleh: <strong>{selectedMasalah.createdBy?.namaLengkap || selectedMasalah.createdBy?.username}</strong></span>
          </div>
        </div>

        <!-- Employee Info Card -->
        <div class="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p class="text-xs text-slate-400 uppercase font-bold tracking-wider">Pegawai Terkait</p>
            <p class="text-sm font-bold text-slate-800 mt-0.5">{selectedMasalah.dataP3k?.nama}</p>
            <p class="text-xs text-slate-500 font-mono">NIP: {selectedMasalah.dataP3k?.nipBaru} &bull; Golongan: {selectedMasalah.dataP3k?.golAkhirNama || '-'}</p>
            <p class="text-xs text-slate-600 mt-0.5">{selectedMasalah.dataP3k?.jabatanNama} — {selectedMasalah.dataP3k?.unorNama}</p>
          </div>
          <a
            href="/profil-pegawai"
            class="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline shrink-0"
          >
            Lihat Profil Lengkap &rarr;
          </a>
        </div>

        <!-- Article Body -->
        <div class="prose prose-slate max-w-none border-t border-slate-100 pt-4">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Uraian / Kronologi Kasus:</h3>
          <div class="article-rendered-body text-slate-800 leading-relaxed space-y-3">
            {@html selectedMasalah.deskripsi}
          </div>
        </div>

        <!-- Lampiran Bukti Dokumen -->
        {#if selectedMasalah.lampiran && selectedMasalah.lampiran.length > 0}
          <div class="border-t border-slate-100 pt-4">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">Lampiran Bukti Dokumen:</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {#each selectedMasalah.lampiran as lamp}
                <a
                  href="{API_BASE_URL}{lamp.fileUrl}"
                  target="_blank"
                  class="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-xs text-slate-700 group"
                >
                  <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div class="truncate">
                    <p class="font-semibold text-slate-800 truncate group-hover:text-blue-600">{lamp.namaFile}</p>
                    <p class="text-[10px] text-slate-400">{formatDate(lamp.createdAt)}</p>
                  </div>
                </a>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Timeline / Riwayat Penanganan -->
        <div class="border-t border-slate-100 pt-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest">Riwayat & Timeline Penanganan:</h3>
            <button
              type="button"
              class="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              onclick={() => { showDetailModal = false; openTindakLanjutModal(selectedMasalah); }}
            >
              + Tambah Tindak Lanjut
            </button>
          </div>

          {#if selectedMasalah.riwayatPenanganan && selectedMasalah.riwayatPenanganan.length > 0}
            <div class="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200 pl-8">
              {#each selectedMasalah.riwayatPenanganan as riwayat}
                <div class="relative">
                  <div class="absolute -left-8 top-1.5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white"></div>
                  <div class="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <div class="flex items-center justify-between text-xs mb-1">
                      <span class="font-bold text-slate-800">{riwayat.tindakan}</span>
                      <span class="text-slate-400 text-[11px]">{formatDateTime(riwayat.createdAt)}</span>
                    </div>
                    {#if riwayat.keterangan}
                      <p class="text-xs text-slate-600">{riwayat.keterangan}</p>
                    {/if}
                    <div class="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                      <span>Petugas: {riwayat.user?.namaLengkap || riwayat.user?.username || '-'}</span>
                      {#if riwayat.statusBaru}
                        <span>&bull;</span>
                        <span class="font-medium text-slate-600">Status: {riwayat.statusBaru}</span>
                      {/if}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-xs text-slate-400 italic">Belum ada catatan tindak lanjut tambahan.</p>
          {/if}
        </div>
      </div>

      <!-- Detail Footer -->
      <div class="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/80">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-2xs"
            onclick={() => { showDetailModal = false; openEditModal(selectedMasalah); }}
          >
            Edit Data
          </button>
          <button
            type="button"
            class="px-3.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl transition-all shadow-2xs"
            onclick={() => { showDetailModal = false; openTindakLanjutModal(selectedMasalah); }}
          >
            Update Status
          </button>
        </div>
        <button
          type="button"
          class="px-4 py-1.5 text-xs font-medium text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors"
          onclick={() => (showDetailModal = false)}
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ========================================== -->
<!-- MODAL: UPDATE PROGRES / TINDAK LANJUT      -->
<!-- ========================================== -->
{#if showTindakLanjutModal && selectedMasalah}
  <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
    <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
        <div>
          <h2 class="text-base font-bold text-slate-800">Tambah Progres / Tindak Lanjut</h2>
          <p class="text-xs text-slate-400">Kasus: {selectedMasalah.nomorKasus}</p>
        </div>
        <button
          type="button"
          class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          onclick={() => (showTindakLanjutModal = false)}
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <form onsubmit={handleSaveTindakLanjut} class="p-6 space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Status Baru Kasus <span class="text-red-500">*</span>
          </label>
          <select
            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            bind:value={tlStatusBaru}
          >
            <option value="OPEN">Open / Baru</option>
            <option value="INVESTIGASI">Dalam Investigasi</option>
            <option value="TINDAK_LANJUT">Tindak Lanjut</option>
            <option value="SELESAI">Selesai (Kasus Ditutup)</option>
            <option value="DIBATALKAN">Dibatalkan</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Tindakan / Progres <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Contoh: Pemanggilan pegawai untuk mediasi & klarifikasi"
            class="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            bind:value={tlTindakan}
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Keterangan / Hasil Catatan
          </label>
          <textarea
            rows="3"
            placeholder="Uraikan hasil pertemuan, sanksi yang diberikan, atau kesepakatan tindak lanjut..."
            class="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            bind:value={tlKeterangan}
          ></textarea>
        </div>

        {#if tlStatusBaru === 'SELESAI'}
          <div>
            <label class="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1.5">
              Tanggal Penyelesaian / Selesai
            </label>
            <input
              type="date"
              class="w-full px-3 py-2 text-sm border border-emerald-300 rounded-xl bg-emerald-50/40 focus:outline-hidden"
              bind:value={tlTanggalSelesai}
            />
          </div>
        {/if}

        <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
            onclick={() => (showTindakLanjutModal = false)}
            disabled={isSaving}
          >
            Batal
          </button>
          <button
            type="submit"
            class="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs"
            disabled={isSaving}
          >
            {isSaving ? 'Menyimpan...' : 'Simpan Tindak Lanjut'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- ========================================== -->
<!-- MODAL: CONFIRM DELETE                      -->
<!-- ========================================== -->
{#if showDeleteModal}
  <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl animate-in fade-in zoom-in duration-150">
      <div class="w-12 h-12 rounded-full bg-red-50 text-red-600 mx-auto flex items-center justify-center mb-3">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </div>
      <h3 class="text-base font-bold text-slate-800 mb-1">Hapus Catatan Masalah?</h3>
      <p class="text-xs text-slate-500 mb-5">
        Catatan masalah ini akan dihapus (soft-delete) dari rekapitulasi dan profil pegawai.
      </p>
      <div class="flex items-center justify-center gap-2">
        <button
          type="button"
          class="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
          onclick={() => (showDeleteModal = false)}
        >
          Batal
        </button>
        <button
          type="button"
          class="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-xs"
          onclick={handleDelete}
        >
          Ya, Hapus
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .article-rendered-body :global(h2) {
    font-size: 1.15rem;
    font-weight: 700;
    color: #0f172a;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 0.25rem;
    margin-top: 1.25rem;
    margin-bottom: 0.5rem;
  }

  .article-rendered-body :global(h3) {
    font-size: 1.05rem;
    font-weight: 600;
    color: #1e293b;
    margin-top: 1rem;
    margin-bottom: 0.35rem;
  }

  .article-rendered-body :global(p) {
    margin-bottom: 0.75rem;
    line-height: 1.65;
    color: #334155;
  }

  .article-rendered-body :global(ul) {
    list-style-type: disc;
    margin-left: 1.5rem;
    margin-bottom: 0.75rem;
    color: #334155;
  }

  .article-rendered-body :global(ol) {
    list-style-type: decimal;
    margin-left: 1.5rem;
    margin-bottom: 0.75rem;
    color: #334155;
  }

  .article-rendered-body :global(blockquote) {
    border-left: 4px solid #3b82f6;
    background: #f8fafc;
    padding: 0.6rem 0.9rem;
    border-radius: 0.375rem;
    color: #475569;
    font-style: italic;
    margin-bottom: 0.85rem;
  }
</style>
