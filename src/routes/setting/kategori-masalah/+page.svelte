<script>
  import { onMount } from 'svelte';
  import { apiRequest } from '$lib/api';
  import { addToast } from '$lib/toastStore';
  import { authStore, isUserAdmin } from '$lib/store';
  import { goto } from '$app/navigation';

  // State Management
  let categories = $state([]);
  let isLoading = $state(true);
  let isSubmitting = $state(false);
  let isDeleting = $state(null);
  let searchQuery = $state('');

  // Modal & Form State
  let showModal = $state(false);
  let isEditMode = $state(false);
  let formId = $state('');
  let formKode = $state('');
  let formNama = $state('');
  let formDeskripsi = $state('');
  let formWarnaBadge = $state('#ef4444');
  let formIsActive = $state(true);

  // Delete Confirmation Modal
  let showDeleteModal = $state(false);
  let deleteTarget = $state(null);

  // Predefined Color Palette for Badges
  const colorPresets = [
    { label: 'Merah (Disiplin)', color: '#ef4444' },
    { label: 'Rose / Pink', color: '#f43f5e' },
    { label: 'Amber / Oranye (Kinerja)', color: '#f59e0b' },
    { label: 'Kuning', color: '#eab308' },
    { label: 'Emerald / Hijau', color: '#10b981' },
    { label: 'Teal / Toska', color: '#14b8a6' },
    { label: 'Biru (Administrasi)', color: '#3b82f6' },
    { label: 'Indigo', color: '#6366f1' },
    { label: 'Ungu (Kontrak)', color: '#8b5cf6' },
    { label: 'Pink / Fuchia (Etika)', color: '#ec4899' },
    { label: 'Slate / Abu-abu (Lainnya)', color: '#64748b' }
  ];

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      goto('/login');
      return;
    }
    fetchCategories();
  });

  async function fetchCategories() {
    isLoading = true;
    try {
      const res = await apiRequest('/api/v1/kategori-masalah');
      categories = res.data || [];
    } catch (e) {
      addToast(e.message || 'Gagal memuat daftar kategori masalah', 'error');
    } finally {
      isLoading = false;
    }
  }

  // Filtered categories computed
  let filteredCategories = $derived(
    categories.filter((cat) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (cat.nama && cat.nama.toLowerCase().includes(q)) ||
        (cat.kode && cat.kode.toLowerCase().includes(q)) ||
        (cat.deskripsi && cat.deskripsi.toLowerCase().includes(q))
      );
    })
  );

  function generateKode(name) {
    if (!name) return '';
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40);
  }

  function handleNamaInput(e) {
    formNama = e.target.value;
    if (!isEditMode) {
      formKode = generateKode(formNama);
    }
  }

  function openCreateModal() {
    isEditMode = false;
    formId = '';
    formKode = '';
    formNama = '';
    formDeskripsi = '';
    formWarnaBadge = '#ef4444';
    formIsActive = true;
    showModal = true;
  }

  function openEditModal(cat) {
    isEditMode = true;
    formId = cat.id;
    formKode = cat.kode;
    formNama = cat.nama;
    formDeskripsi = cat.deskripsi || '';
    formWarnaBadge = cat.warnaBadge || '#ef4444';
    formIsActive = cat.isActive !== undefined ? cat.isActive : true;
    showModal = true;
  }

  function confirmDelete(cat) {
    deleteTarget = cat;
    showDeleteModal = true;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!formNama.trim()) {
      addToast('Nama kategori wajib diisi', 'warning');
      return;
    }

    const finalKode = formKode.trim() ? formKode.trim().toUpperCase() : generateKode(formNama);

    isSubmitting = true;
    try {
      const payload = {
        kode: finalKode,
        nama: formNama.trim(),
        deskripsi: formDeskripsi.trim() || null,
        warnaBadge: formWarnaBadge,
        isActive: formIsActive
      };

      if (isEditMode) {
        await apiRequest(`/api/v1/kategori-masalah/${formId}`, 'PUT', payload);
        addToast('Kategori masalah berhasil diperbarui', 'success');
      } else {
        await apiRequest('/api/v1/kategori-masalah', 'POST', payload);
        addToast('Kategori masalah baru berhasil ditambahkan', 'success');
      }

      showModal = false;
      fetchCategories();
    } catch (e) {
      addToast(e.message || 'Gagal menyimpan kategori masalah', 'error');
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    isDeleting = deleteTarget.id;
    try {
      await apiRequest(`/api/v1/kategori-masalah/${deleteTarget.id}`, 'DELETE');
      addToast(`Kategori "${deleteTarget.nama}" berhasil dihapus`, 'success');
      showDeleteModal = false;
      fetchCategories();
    } catch (e) {
      addToast(e.message || 'Gagal menghapus kategori', 'error');
    } finally {
      isDeleting = null;
    }
  }

  async function toggleStatus(cat) {
    try {
      await apiRequest(`/api/v1/kategori-masalah/${cat.id}`, 'PUT', {
        isActive: !cat.isActive
      });
      addToast(`Status kategori "${cat.nama}" berhasil diubah`, 'success');
      fetchCategories();
    } catch (e) {
      addToast(e.message || 'Gagal mengubah status kategori', 'error');
    }
  }
</script>

<svelte:head>
  <title>Referensi Kategori Masalah Pegawai — SIPPPK</title>
</svelte:head>

<div class="max-w-5xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
    <div class="flex items-start gap-3.5">
      <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-red-500/20 shrink-0">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      </div>
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-slate-800">Master Kategori Masalah Pegawai</h1>
        <p class="mt-0.5 text-xs sm:text-sm text-slate-500">
          Kelola master kategori klasifikasi dan badge warna untuk pencatatan dan rekapitulasi kasus pegawai.
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2.5 shrink-0">
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all shadow-xs hover:shadow-md"
        onclick={openCreateModal}
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        <span>Tambah Kategori</span>
      </button>
    </div>
  </div>

  <!-- Search & Stats Bar -->
  <div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
    <div class="relative w-full sm:w-80">
      <input
        type="text"
        placeholder="Cari kode atau nama kategori..."
        class="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-slate-50/50 focus:bg-white transition-all"
        bind:value={searchQuery}
      />
      <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>

    <div class="flex items-center gap-2 text-xs text-slate-500 w-full sm:w-auto justify-between sm:justify-end">
      <span>Total: <strong>{categories.length}</strong> kategori master</span>
      <span>&bull;</span>
      <span>Aktif: <strong class="text-emerald-600">{categories.filter(c => c.isActive).length}</strong></span>
    </div>
  </div>

  <!-- Category List Cards / Table -->
  <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm text-slate-700">
        <thead class="bg-slate-50/80 text-xs text-slate-500 uppercase font-semibold border-b border-slate-200/80">
          <tr>
            <th class="px-5 py-3.5 w-12 text-center">#</th>
            <th class="px-5 py-3.5">Kategori & Badge</th>
            <th class="px-5 py-3.5">Kode</th>
            <th class="px-5 py-3.5">Deskripsi</th>
            <th class="px-5 py-3.5 text-center">Total Kasus</th>
            <th class="px-5 py-3.5 text-center">Status</th>
            <th class="px-5 py-3.5 text-right w-28">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {#if isLoading}
            {#each Array(4) as _}
              <tr class="animate-pulse">
                <td class="px-5 py-4 text-center"><div class="h-4 bg-slate-200 rounded w-4 mx-auto"></div></td>
                <td class="px-5 py-4"><div class="h-6 bg-slate-100 rounded-full w-36 mb-1"></div></td>
                <td class="px-5 py-4"><div class="h-4 bg-slate-100 rounded w-20"></div></td>
                <td class="px-5 py-4"><div class="h-4 bg-slate-100 rounded w-48"></div></td>
                <td class="px-5 py-4 text-center"><div class="h-5 bg-slate-100 rounded w-10 mx-auto"></div></td>
                <td class="px-5 py-4 text-center"><div class="h-5 bg-slate-100 rounded-full w-14 mx-auto"></div></td>
                <td class="px-5 py-4 text-right"><div class="h-7 bg-slate-100 rounded w-16 ml-auto"></div></td>
              </tr>
            {/each}
          {:else if filteredCategories.length === 0}
            <tr>
              <td colspan="7" class="px-5 py-12 text-center text-slate-400">
                <div class="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400 mb-2">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <p class="font-medium text-slate-600">Tidak ada kategori ditemukan</p>
                <p class="text-xs text-slate-400 mt-0.5">
                  {searchQuery ? `Tidak ada hasil pencarian untuk "${searchQuery}"` : 'Klik "Tambah Kategori" untuk membuat baru.'}
                </p>
              </td>
            </tr>
          {:else}
            {#each filteredCategories as cat, index}
              <tr class="hover:bg-slate-50/60 transition-colors group">
                <td class="px-5 py-4 text-center text-xs font-mono text-slate-400">
                  {index + 1}
                </td>
                <td class="px-5 py-4">
                  <div class="flex items-center gap-2">
                    <span
                      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs"
                      style="background-color: {cat.warnaBadge || '#ef4444'}15; border-color: {cat.warnaBadge || '#ef4444'}40; color: {cat.warnaBadge || '#ef4444'};"
                    >
                      <span class="w-2 h-2 rounded-full" style="background-color: {cat.warnaBadge || '#ef4444'};"></span>
                      <span>{cat.nama}</span>
                    </span>
                  </div>
                </td>
                <td class="px-5 py-4 font-mono text-xs font-bold text-slate-600">
                  {cat.kode}
                </td>
                <td class="px-5 py-4 text-xs text-slate-500 max-w-xs truncate">
                  {cat.deskripsi || '-'}
                </td>
                <td class="px-5 py-4 text-center">
                  <span class="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
                    {cat._count?.masalahPegawai || 0}
                  </span>
                </td>
                <td class="px-5 py-4 text-center">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all {cat.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}"
                    onclick={() => toggleStatus(cat)}
                    title="Klik untuk mengubah status aktif/non-aktif"
                  >
                    <span class="w-1.5 h-1.5 rounded-full {cat.isActive ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
                    <span>{cat.isActive ? 'Aktif' : 'Non-Aktif'}</span>
                  </button>
                </td>
                <td class="px-5 py-4 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      class="w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors"
                      title="Edit Kategori"
                      onclick={() => openEditModal(cat)}
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                      title="Hapus Kategori"
                      onclick={() => confirmDelete(cat)}
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
  </div>
</div>

<!-- ========================================== -->
<!-- MODAL: TAMBAH / EDIT KATEGORI              -->
<!-- ========================================== -->
{#if showModal}
  <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <h2 class="text-base font-bold text-slate-800">
            {isEditMode ? 'Edit Master Kategori Masalah' : 'Tambah Kategori Masalah Baru'}
          </h2>
        </div>
        <button
          type="button"
          class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          onclick={() => (showModal = false)}
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <form onsubmit={handleSubmit} class="p-6 space-y-4">
        <!-- Preview Badge -->
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
          <span class="text-xs text-slate-500 font-medium">Preview Tampilan Badge:</span>
          <span
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs"
            style="background-color: {formWarnaBadge}15; border-color: {formWarnaBadge}40; color: {formWarnaBadge};"
          >
            <span class="w-2 h-2 rounded-full" style="background-color: {formWarnaBadge};"></span>
            <span>{formNama.trim() || 'Nama Kategori'}</span>
          </span>
        </div>

        <!-- 1. Nama Kategori -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Nama Kategori <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Contoh: Disiplin & Kehadiran, Kinerja Kerja, Etika Profesi..."
            class="w-full px-3.5 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            value={formNama}
            oninput={handleNamaInput}
            required
          />
        </div>

        <!-- 2. Kode Kategori (Otomatis) & Status Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Kode Kategori
              </label>
              <span class="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                Otomatis
              </span>
            </div>
            <input
              type="text"
              placeholder="e.g. DISIPLIN, KINERJA"
              class="w-full px-3 py-2 text-sm uppercase font-mono font-bold border border-slate-200 rounded-xl bg-slate-50/60 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-700"
              bind:value={formKode}
            />
            <p class="text-[10px] text-slate-400 mt-1">Dibuat otomatis dari nama kategori atau bisa disesuaikan manual.</p>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Status Kategori
            </label>
            <select
              class="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              bind:value={formIsActive}
            >
              <option value={true}>Aktif (Bisa Dipilih)</option>
              <option value={false}>Non-Aktif (Diarsipkan)</option>
            </select>
          </div>
        </div>

        <!-- Color Palette Preset Selector -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Warna Tema Badge
          </label>
          <div class="flex flex-wrap items-center gap-2 mb-2">
            {#each colorPresets as preset}
              <button
                type="button"
                class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 {formWarnaBadge === preset.color ? 'ring-2 ring-offset-2 ring-slate-800 scale-110 border-white' : 'border-transparent'}"
                style="background-color: {preset.color};"
                title={preset.label}
                onclick={() => (formWarnaBadge = preset.color)}
              ></button>
            {/each}
          </div>
          <div class="flex items-center gap-2">
            <input
              type="color"
              class="w-9 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
              bind:value={formWarnaBadge}
            />
            <input
              type="text"
              class="w-28 px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
              bind:value={formWarnaBadge}
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Deskripsi / Keterangan Kategori
          </label>
          <textarea
            rows="3"
            placeholder="Jelaskan jenis pelanggaran atau masalah yang masuk ke dalam kategori ini..."
            class="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            bind:value={formDeskripsi}
          ></textarea>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
            onclick={() => (showModal = false)}
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            type="submit"
            class="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            disabled={isSubmitting}
          >
            {#if isSubmitting}
              <div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {/if}
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Kategori'}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- ========================================== -->
<!-- MODAL: CONFIRM DELETE                      -->
<!-- ========================================== -->
{#if showDeleteModal && deleteTarget}
  <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl animate-in fade-in zoom-in duration-150">
      <div class="w-12 h-12 rounded-full bg-red-50 text-red-600 mx-auto flex items-center justify-center mb-3">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </div>
      <h3 class="text-base font-bold text-slate-800 mb-1">Hapus Kategori Masalah?</h3>
      <p class="text-xs text-slate-500 mb-5">
        Kategori <strong>"{deleteTarget.nama}"</strong> akan dihapus (soft-delete) dari master referensi.
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
