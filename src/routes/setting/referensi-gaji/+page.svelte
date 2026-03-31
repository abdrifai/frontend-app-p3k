<script>
  import { onMount } from "svelte";
  import { addToast } from "$lib/toastStore";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { goto } from "$app/navigation";

  let records = [];
  let isLoading = true;
  let isSubmitting = false;

  let currentPage = 1;
  let totalPages = 1;
  let limit = 10;
  let searchQuery = "";
  let searchTimeout;

  const handleSearchInput = () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage = 1;
      fetchGaji();
    }, 500);
  };

  // Add Form State
  let showAddForm = false;
  let form = {
    golongan: "",
    mkTahun: "",
    gaji: "",
    aturanGaji: ""
  };

  onMount(() => {
    if (!$authStore.isAuthenticated || $authStore.user?.role !== "admin") {
      addToast("Akses ditolak", "error");
      goto("/");
      return;
    }
    fetchGaji();
  });

  const fetchGaji = async () => {
    isLoading = true;
    try {
      const result = await apiRequest(`/api/v1/gaji?page=${currentPage}&limit=${limit}&search=${encodeURIComponent(searchQuery)}`, "GET");
      if (result.success) {
        records = result.data;
        totalPages = result.meta?.totalPages || 1;
      } else {
        addToast(result.message || "Gagal mengambil data", "error");
      }
    } catch (e) {
      console.error(e);
      addToast("Terjadi kesalahan sistem", "error");
    } finally {
      isLoading = false;
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    isSubmitting = true;

    try {
      const result = await apiRequest("/api/v1/gaji", "POST", {
        golongan: form.golongan,
        mkTahun: parseInt(form.mkTahun),
        gaji: parseInt(form.gaji),
        aturanGaji: form.aturanGaji
      });
      
      if (result.success) {
        addToast(result.message, "success");
        fetchGaji();
        form = { golongan: "", mkTahun: "", gaji: "", aturanGaji: "" };
        showAddForm = false;
      } else {
        addToast(result.message, "error");
      }
    } catch (e) {
      addToast("Terjadi kesalahan sistem", "error");
    } finally {
      isSubmitting = false;
    }
  };

  const handleDelete = async (id, namaGol) => {
    if (!confirm(`Hapus data gaji untuk golongan ${namaGol}?`)) return;

    try {
      const result = await apiRequest(`/api/v1/gaji/${id}`, "DELETE");
      
      if (result.success) {
        addToast("Data berhasil dihapus", "success");
        fetchGaji();
      } else {
        addToast(result.message, "error");
      }
    } catch (e) {
      addToast("Terjadi kesalahan sistem", "error");
    }
  };

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };
</script>

<svelte:head>
  <title>Referensi Tabel Gaji P3K — App P3K</title>
</svelte:head>

<div class="max-w-4xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div class="flex-1">
      <h1 class="text-2xl font-bold text-slate-800">Tabel Referensi Gaji</h1>
      <p class="mt-1 text-sm text-slate-500">Standar gaji P3K berdasarkan golongan dan masa kerja.</p>
    </div>
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <input 
          type="text" 
          bind:value={searchQuery}
          oninput={handleSearchInput}
          placeholder="Cari golongan..." 
          class="input-field pl-9 w-full sm:w-64 bg-white" 
        />
      </div>
      <button 
        onclick={() => (showAddForm = !showAddForm)} 
        class="btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        {showAddForm ? "Batal Tambah" : "Tambah Data Gaji"}
      </button>
    </div>
  </div>

  {#if showAddForm}
    <div class="card p-5 sm:p-6 bg-emerald-50/50 border-emerald-100">
      <h2 class="text-lg font-bold text-slate-800 mb-4">Input Master Gaji Baru</h2>
      <form onsubmit={handleAddSubmit} class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-b border-emerald-200 pb-5 mb-5 items-end">
        <div>
          <label for="golongan" class="block text-sm font-medium text-slate-700 mb-1">Golongan (cth: IX, X)</label>
          <input id="golongan" type="text" bind:value={form.golongan} required class="input-field w-full bg-white" placeholder="Contoh: IX" />
        </div>
        <div>
          <label for="mkTahun" class="block text-sm font-medium text-slate-700 mb-1">Masa Kerja (Tahun)</label>
          <input id="mkTahun" type="number" min="0" bind:value={form.mkTahun} required class="input-field w-full bg-white" placeholder="0" />
        </div>
        <div>
          <label for="gaji" class="block text-sm font-medium text-slate-700 mb-1">Gaji Pokok (Angka)</label>
          <input id="gaji" type="number" min="0" bind:value={form.gaji} required class="input-field w-full bg-white" placeholder="2500000" />
        </div>
        <div>
          <label for="aturanGaji" class="block text-sm font-medium text-slate-700 mb-1">Aturan Gaji (Opsional)</label>
          <input id="aturanGaji" type="text" bind:value={form.aturanGaji} class="input-field w-full bg-white" placeholder="Perpres No 11 2024" />
        </div>
        <div class="sm:col-span-2 lg:col-span-4">
          <button type="submit" disabled={isSubmitting} class="btn-primary w-full sm:w-auto mt-2">
            {isSubmitting ? "Menyimpan..." : "Simpan Referensi"}
          </button>
        </div>
      </form>
    </div>
  {/if}

  <div class="card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200">
        <thead>
          <tr class="bg-slate-50/80">
            <th class="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Golongan</th>
            <th class="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Masa Kerja</th>
            <th class="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Gaji Pokok</th>
            <th class="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Dasar Aturan</th>
            <th class="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase w-20">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {#if isLoading}
            <tr><td colspan="4" class="px-6 py-10 text-center text-sm text-slate-400">Memuat data...</td></tr>
          {:else if records.length === 0}
            <tr><td colspan="4" class="px-6 py-10 text-center text-sm text-slate-400">Belum ada data gaji di master tabel. Silakan tambahkan.</td></tr>
          {:else}
            {#each records as rec}
              <tr class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <span class="inline-flex items-center px-2.5 py-1 rounded text-sm font-bold bg-slate-100 text-slate-700 font-mono">
                    {rec.golongan}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-slate-600 font-medium">
                  {rec.mkTahun} Tahun
                </td>
                <td class="px-6 py-4 text-sm font-bold text-emerald-600">
                  {formatRupiah(rec.gaji)}
                </td>
                <td class="px-6 py-4 text-sm text-slate-500 italic">
                  {rec.aturanGaji || '-'}
                </td>
                <td class="px-6 py-4 text-right">
                  <button onclick={() => handleDelete(rec.id, rec.golongan)} class="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Hapus">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>

  {#if totalPages > 1}
    <div class="flex items-center justify-between bg-white px-4 py-3 sm:px-6 rounded-xl border border-slate-200">
      <div class="flex flex-1 justify-between sm:hidden">
        <button
          disabled={currentPage === 1}
          onclick={() => { currentPage--; fetchGaji(); }}
          class="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
        >
          Previous
        </button>
        <button
          disabled={currentPage === totalPages}
          onclick={() => { currentPage++; fetchGaji(); }}
          class="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
        >
          Next
        </button>
      </div>
      <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p class="text-sm text-slate-700">
            Halaman <span class="font-medium">{currentPage}</span> dari <span class="font-medium">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              disabled={currentPage === 1}
              onclick={() => { currentPage--; fetchGaji(); }}
              class="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <span class="sr-only">Previous</span>
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
              </svg>
            </button>
            <button
              disabled={currentPage === totalPages}
              onclick={() => { currentPage++; fetchGaji(); }}
              class="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <span class="sr-only">Next</span>
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  {/if}
</div>
