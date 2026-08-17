<script>
  import { addToast } from "$lib/toastStore";
  import { authStore, isUserAdmin } from "$lib/store";
  import { apiRequest, API_BASE_URL } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let records = [];
  let isLoading = true;
  let searchTerm = "";
  let filterStatus = "SELESAI";
  let meta = { page: 1, limit: 10, total: 0, totalPages: 1 };
  const limitOptions = [10, 25, 50, 100, 250];
  
  $: isAdmin = isUserAdmin($authStore.user);

  // Detail modal
  let selectedRecord = null;
  let showDetailModal = false;

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login", "error");
      goto("/login");
      return;
    }
    fetchData();
  });

  const fetchData = async (page = 1) => {
    isLoading = true;
    try {
      const params = new URLSearchParams({ 
        page, 
        limit: meta.limit,
        isLaporan: "true"
      });
      if (filterStatus) params.append("status", filterStatus);
      if (searchTerm) params.append("search", searchTerm);
      
      const result = await apiRequest(`/api/v1/perpanjangan/usulan?${params}`, "GET");
      if (result.success) {
        records = result.data;
        meta = result.meta;
      }
    } catch (e) {
      console.error(e);
      addToast("Gagal memuat data laporan", "error");
    } finally {
      isLoading = false;
    }
  };

  const handleFilterChange = () => {
    meta.page = 1;
    fetchData(1);
  };

  const openDetail = (rec) => {
    selectedRecord = rec;
    showDetailModal = true;
  };

  const closeDetail = () => {
    showDetailModal = false;
    selectedRecord = null;
  };

  const getStatusBadge = (s) => {
    if (s === "SELESAI") return { text: "Selesai", class: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (s === "APPROVED") return { text: "Approved", class: "bg-blue-50 text-blue-700 border-blue-200" };
    if (s === "SRIKANDI") return { text: "Srikandi", class: "bg-purple-50 text-purple-700 border-purple-200" };
    if (s === "PENDING") return { text: "Pending", class: "bg-amber-50 text-amber-700 border-amber-200" };
    if (s === "REJECTED") return { text: "Ditolak", class: "bg-red-50 text-red-700 border-red-200" };
    return { text: s, class: "bg-slate-50 text-slate-700 border-slate-200" };
  };
</script>

<svelte:head>
  <title>Laporan Perpanjangan PK — SIPPPK</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-800">Laporan Perpanjangan PK</h1>
      <p class="mt-1 text-sm text-slate-500">Daftar seluruh usulan perpanjangan kontrak yang diproses.</p>
    </div>
  </div>

  <!-- Filters -->
  <div class="card p-4">
    <form on:submit|preventDefault={() => { meta.page = 1; fetchData(1); }} class="flex flex-wrap items-center gap-3">
      <div class="relative flex-1 min-w-[240px]">
        <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
          <i class="ri-search-line"></i>
        </span>
        <input 
          type="text" 
          bind:value={searchTerm} 
          placeholder="Cari Nama, NIP, Unit Kerja, atau No Kontrak..." 
          class="input-field pl-10 w-full" 
        />
      </div>

      <!-- Status Filter -->
      <div class="min-w-[160px]">
        <select 
          bind:value={filterStatus} 
          on:change={handleFilterChange}
          class="input-field w-full cursor-pointer bg-white"
        >
          <option value="">Semua Status</option>
          <option value="SELESAI">Status: Selesai</option>
          <option value="APPROVED">Status: Approved</option>
          <option value="SRIKANDI">Status: Srikandi</option>
          <option value="PENDING">Status: Pending</option>
          <option value="REJECTED">Status: Ditolak</option>
        </select>
      </div>

      <!-- Limit Filter -->
      <div class="w-24">
        <select 
          bind:value={meta.limit} 
          on:change={handleFilterChange}
          class="input-field w-full cursor-pointer bg-white"
        >
          {#each limitOptions as opt}
            <option value={opt}>{opt} baris</option>
          {/each}
        </select>
      </div>

      <button type="submit" class="btn-primary flex items-center gap-2" title="Filter Data">
        <i class="ri-filter-3-line"></i>
        <span>Filter</span>
      </button>
    </form>
  </div>

  <!-- Table -->
  <div class="card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200">
        <thead>
          <tr class="bg-slate-50/80">
            <th class="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">No</th>
            <th class="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Pegawai</th>
            <th class="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Periode Kontrak</th>
            <th class="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Masa Kerja</th>
            <th class="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
            <th class="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Dikerjakan Oleh</th>
            <th class="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Dokumen</th>
            <th class="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">
          {#if isLoading}
            <tr>
              <td colspan="8" class="px-6 py-12 text-center">
                <div class="flex flex-col items-center gap-2">
                  <div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span class="text-sm text-slate-400 font-medium">Memuat data...</span>
                </div>
              </td>
            </tr>
          {:else if records.length === 0}
            <tr>
              <td colspan="8" class="px-6 py-12 text-center">
                <div class="flex flex-col items-center gap-2 opacity-40">
                  <i class="ri-file-search-line text-4xl text-slate-300"></i>
                  <p class="text-sm text-slate-500">Tidak ada data laporan ditemukan.</p>
                </div>
              </td>
            </tr>
          {:else}
            {#each records as rec, i}
              {@const badge = getStatusBadge(rec.status)}
              <tr class="hover:bg-slate-50/50 transition-colors">
                <td class="px-5 py-4 text-sm text-slate-400 font-mono">{(meta.page - 1) * meta.limit + i + 1}</td>
                <td class="px-5 py-4">
                  <p class="text-sm font-bold text-slate-800">{rec.dataP3k?.nama || "-"}</p>
                  <p class="text-xs text-slate-500 font-mono">{rec.dataP3k?.nipBaru || "-"}</p>
                  {#if rec.dataP3k?.unorNama}
                    <p class="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">{rec.dataP3k.unorNama}</p>
                  {/if}
                </td>
                <td class="px-5 py-4">
                  <div class="flex flex-col">
                    <span class="text-sm text-slate-700 font-medium">{rec.tanggalMulai}</span>
                    <span class="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Sampai Dengan</span>
                    <span class="text-sm text-slate-700 font-medium">{rec.tanggalSelesai}</span>
                  </div>
                </td>
                <td class="px-5 py-4">
                  <span class="px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase whitespace-nowrap">
                    {rec.dataP3k?.mkTahun ?? 0} Thn {rec.dataP3k?.mkBulan ?? 0} Bln
                  </span>
                </td>
                <td class="px-5 py-4 text-center">
                  <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border {badge.class}">
                    {badge.text}
                  </span>
                </td>
                <td class="px-5 py-4">
                  {#if rec.editedBy}
                    <p class="text-xs font-semibold text-slate-700">{rec.editedBy.namaLengkap || rec.editedBy.username}</p>
                    <p class="text-[10px] text-slate-400">@{rec.editedBy.username}</p>
                  {:else}
                    <span class="text-xs text-slate-400 italic">-</span>
                  {/if}
                </td>
                <td class="px-5 py-4 text-center">
                  {#if rec.finalFileUrl}
                    <a 
                      href={`${API_BASE_URL}${rec.finalFileUrl}`} 
                      target="_blank" 
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-all text-xs font-bold"
                    >
                      <i class="ri-file-pdf-fill text-sm"></i>
                      <span>PDF</span>
                    </a>
                  {:else}
                    <span class="text-xs text-slate-300 italic">No File</span>
                  {/if}
                </td>
                <td class="px-5 py-4 text-right">
                  <button 
                    on:click={() => openDetail(rec)} 
                    class="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    title="Detail Laporan"
                  >
                    <i class="ri-eye-line text-lg"></i>
                  </button>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if meta.totalPages > 1}
      <div class="border-t border-slate-100 px-6 py-4 flex items-center justify-between">
        <p class="text-sm text-slate-500">
          Showing <span class="font-bold text-slate-800">{records.length}</span> of <span class="font-bold text-slate-800">{meta.total}</span> data
        </p>
        <div class="flex gap-2">
          <button 
            disabled={meta.page === 1} 
            on:click={() => { meta.page--; fetchData(meta.page); }} 
            class="btn-secondary !py-1.5 !px-3 disabled:opacity-40"
            title="Halaman Sebelumnya"
          >
            <i class="ri-arrow-left-s-line"></i>
          </button>
          <div class="flex items-center px-4 text-sm font-bold text-slate-600 bg-slate-50 rounded-lg border border-slate-100">
            {meta.page} / {meta.totalPages}
          </div>
          <button 
            disabled={meta.page === meta.totalPages} 
            on:click={() => { meta.page++; fetchData(meta.page); }} 
            class="btn-secondary !py-1.5 !px-3 disabled:opacity-40"
            title="Halaman Selanjutnya"
          >
            <i class="ri-arrow-right-s-line"></i>
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Detail Modal -->
{#if showDetailModal && selectedRecord}
  <div class="fixed z-50 inset-0 overflow-y-auto" role="dialog" aria-modal="true">
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <button 
        type="button" 
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm w-full h-full border-none cursor-default transition-opacity" 
        on:click={closeDetail}
        title="Tutup Modal"
      ></button>
      
      <div class="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-11/12 lg:w-3/4 max-h-[90vh] overflow-hidden flex flex-col transform transition-all z-10">
        <!-- Close button visible on top mobile -->
        <button 
          on:click={closeDetail}
          class="absolute top-4 right-4 p-2 rounded-full bg-slate-100/20 text-white hover:bg-slate-100/30 lg:hidden z-20"
          title="Tutup Modal"
        >
          <i class="ri-close-line"></i>
        </button>

        <div class="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6 text-white text-center flex-shrink-0">
            <div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
                <i class="ri-file-list-3-line text-3xl"></i>
            </div>
          <h3 class="text-xl font-bold">Detail Laporan Kontrak</h3>
          <p class="text-blue-100 text-sm mt-1 opacity-80 font-medium">Laporan Perpanjangan PK</p>
        </div>

        <div class="p-8 overflow-y-auto custom-scrollbar">
          <dl class="space-y-6">
            <div class="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <i class="ri-user-follow-line text-xl"></i>
              </div>
              <div>
                <dt class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Informasi Pegawai</dt>
                <dd class="text-base font-bold text-slate-800 mt-0.5">{selectedRecord.dataP3k?.nama}</dd>
                <dd class="text-xs text-slate-500 font-mono mt-0.5">{selectedRecord.dataP3k?.nipBaru}</dd>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 rounded-xl bg-orange-50/50 border border-orange-100">
                <dt class="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Jabatan</dt>
                <dd class="text-sm font-semibold text-slate-700 mt-1">{selectedRecord.dataP3k?.jabatanNama || "-"}</dd>
              </div>
              <div class="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
                <dt class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Unit Kerja</dt>
                <dd class="text-sm font-semibold text-slate-700 mt-1 leading-relaxed">
                  {selectedRecord.dataP3k?.unorInduk?.nama ? selectedRecord.dataP3k.unorInduk.nama + ' - ' : ''}
                  {selectedRecord.dataP3k?.unorNama || "-"}
                </dd>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 rounded-xl bg-violet-50 border border-violet-100">
                <dt class="text-[10px] font-bold text-violet-500 uppercase tracking-widest">Kontrak Ke</dt>
                <dd class="text-sm font-bold text-violet-700 mt-1">{selectedRecord.kontrakKe || "-"}</dd>
              </div>
              <div class="p-4 rounded-xl bg-cyan-50 border border-cyan-100">
                <dt class="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">Besaran Gaji</dt>
                <dd class="text-sm font-bold text-cyan-700 mt-1">{selectedRecord.calculatedData?.gaji || "-"}</dd>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <dt class="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Masa Kerja & Gaji</dt>
                <dd class="text-sm font-bold text-slate-700 mt-1 flex items-center gap-4">
                  <span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] uppercase">{selectedRecord.dataP3k?.mkTahun ?? 0} Thn {selectedRecord.dataP3k?.mkBulan ?? 0} Bln</span>
                  <span class="text-indigo-600">{selectedRecord.calculatedData?.gaji || "-"}</span>
                </dd>
              </div>
              <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <dt class="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Masa Kontrak Baru</dt>
                <dd class="text-[11px] font-bold text-emerald-700 mt-1 leading-tight">
                  {selectedRecord.tanggalMulai} <br/> 
                  <span class="text-[9px] text-emerald-400">s/d</span> <br/>
                  {selectedRecord.tanggalSelesai}
                </dd>
              </div>
            </div>

            <div class="pt-6 border-t border-slate-100">
              <button 
                on:click={closeDetail} 
                class="w-full py-3 px-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg shadow-slate-200"
              >
                Tutup Detail
              </button>
            </div>
          </dl>
        </div>
      </div>
    </div>
  </div>
{/if}
