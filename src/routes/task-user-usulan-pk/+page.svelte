<script>
  import { addToast } from "$lib/toastStore";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let records = [];
  let isLoading = true;
  let meta = {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  };

  let stats = [];
  let statsLoading = false;
  let activeTmtFilter = "";

  let templates = [];
  let selectedTask = null;
  let showEditModal = false;
  let isSubmitting = false;
  let isRefreshingNomor = false;

  let form = {
    nipBaru: "",
    namaDisplay: "",
    jabatanNama: "",
    unorIndukNama: "",
    tanggalMulai: "",
    tanggalSelesai: "",
    nomorKontrak: "",
    tanggalTtd: "",
    keterangan: "",
    templateKontrakId: "",
    kontrakKe: "",
  };

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login untuk mengakses halaman ini", "error");
      goto("/login");
      return;
    }
    fetchMyTasks();
    fetchTemplates();
    fetchStats();
  });

  const fetchStats = async () => {
    statsLoading = true;
    try {
      const result = await apiRequest("/api/tasks-usulan/my-stats");
      if (result.success) {
        stats = result.data;
      }
    } catch (err) {
      console.error(err);
    } finally {
      statsLoading = false;
    }
  };

  const fetchMyTasks = async (page = 1) => {
    isLoading = true;
    try {
      let url = `/api/tasks-usulan/my-tasks?page=${page}&limit=${meta.limit}`;
      if (activeTmtFilter) {
        url += `&search=${encodeURIComponent(activeTmtFilter)}`;
      }
      const result = await apiRequest(url);
      if (result.success) {
        records = result.data;
        meta = result.meta;
      }
    } catch (error) {
      console.error("Fetch tasks error:", error);
    } finally {
      isLoading = false;
    }
  };

  const setTmtFilter = (tmt) => {
    if (activeTmtFilter === tmt) {
      activeTmtFilter = "";
    } else {
      activeTmtFilter = tmt;
    }
    fetchMyTasks(1);
  };

  const fetchTemplates = async () => {
    try {
      const result = await apiRequest("/api/v1/perpanjangan/templates", "GET");
      if (result.success) templates = result.data;
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNextContractNumber = async () => {
    if (!form.nipBaru) return;
    isRefreshingNomor = true;
    try {
      const res = await apiRequest(
        `/api/v1/perpanjangan/next-contract-number/${form.nipBaru}`,
      );
      if (res.success) {
        form.nomorKontrak = res.data.nomorKontrak;
      } else {
        form.nomorKontrak = "";
      }
    } catch (err) {
      console.error("Fetch next contract number error:", err);
      form.nomorKontrak = "";
    } finally {
      isRefreshingNomor = false;
    }
  };

  const openEditModal = async (task) => {
    selectedTask = task;
    form = {
      nipBaru: task.dataP3k?.nipBaru || "",
      namaDisplay: task.dataP3k?.nama || "",
      jabatanNama: task.dataP3k?.jabatanNama || "",
      unorIndukNama: task.dataP3k?.unorInduk?.nama || "-",
      tanggalMulai: "",
      tanggalSelesai: "",
      nomorKontrak: "Memuat...",
      tanggalTtd: "",
      keterangan: "",
      templateKontrakId: "",
      kontrakKe: "",
    };
    showEditModal = true;

    await fetchNextContractNumber();
  };

  const closeEditModal = () => {
    showEditModal = false;
    selectedTask = null;
  };

  const handleCompleteTask = async (e) => {
    e.preventDefault();
    if (!form.nomorKontrak) {
      addToast("Nomor Perjanjian Kerja wajib diisi", "warning");
      return;
    }
    if (!form.tanggalMulai || !form.tanggalSelesai) {
      addToast("Lengkapi tanggal mulai dan tanggal selesai", "warning");
      return;
    }
    if (!form.kontrakKe) {
      addToast("Urutan kontrak (Kontrak Ke) wajib diisi", "warning");
      return;
    }
    if (!form.tanggalTtd) {
      addToast("Tanggal TTD Kontrak wajib diisi", "warning");
      return;
    }
    if (!form.templateKontrakId) {
      addToast("Silakan pilih Template Kontrak", "warning");
      return;
    }
    isSubmitting = true;

    try {
      // 1. Create Usulan
      const body = {
        nipBaru: form.nipBaru,
        tanggalMulai: form.tanggalMulai,
        tanggalSelesai: form.tanggalSelesai,
        nomorKontrak: form.nomorKontrak,
        tanggalTtd: form.tanggalTtd,
        keterangan: form.keterangan || undefined,
        templateKontrakId: form.templateKontrakId,
        kontrakKe: parseInt(form.kontrakKe),
      };

      const result = await apiRequest(
        "/api/v1/perpanjangan/usulan",
        "POST",
        body,
      );

      if (!result.success) {
        addToast(result.message || "Gagal menyimpan usulan", "error");
        isSubmitting = false;
        return;
      }

      // 2. Task is automatically marked completed on the backend when usulan is created
      addToast("Usulan berhasil dibuat dan tugas selesai!", "success");
      closeEditModal();
      await fetchMyTasks(meta.page);
    } catch (error) {
      console.error("Complete task error:", error);
      // No need to toast here, apiRequest already shows a toast on failure
    } finally {
      isSubmitting = false;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleTanggalMulaiChange = () => {
    if (form.tanggalMulai) {
      const d = new Date(form.tanggalMulai);
      if (!isNaN(d.getTime())) {
        d.setFullYear(d.getFullYear() + 1);
        d.setDate(d.getDate() - 1);
        form.tanggalSelesai = d.toISOString().split("T")[0];
      }
    }
  };
</script>

<svelte:head>
  <title>Task User (Usulan PK P3K) — App P3K</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <!-- Page Header -->
  <div
    class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-lg text-white"
  >
    <div>
      <h1 class="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
        My Usulan Tasks
      </h1>
      <p
        class="text-blue-100 text-sm sm:text-base max-w-xl leading-relaxed opacity-90"
      >
        Daftar usulan perpanjangan kontrak yang ditugaskan untuk Anda buat.
      </p>
    </div>
    <div
      class="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:min-w-[160px] flex flex-col items-center justify-center border border-white/20 shadow-inner"
    >
      <span
        class="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-1"
        >Sisa Tugas</span
      >
      <span
        class="text-3xl font-extrabold text-white tracking-tight leading-none"
        >{meta.total}</span
      >
    </div>
  </div>

  {#if stats.length > 0 || statsLoading}
    <!-- TMT Distribution Summary -->
    <div class="card p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-bold text-slate-700 uppercase tracking-wider">
          Pembagian Berdasarkan Perangkatan (TMT)
        </h3>
        {#if activeTmtFilter}
          <button
            on:click={() => setTmtFilter("")}
            class="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
          >
            Bersihkan Filter
            <svg
              class="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        {/if}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#if statsLoading}
          {#each [1, 2] as _}
            <div class="h-28 bg-slate-100 rounded-xl animate-pulse"></div>
          {/each}
        {:else}
          {#each stats as s}
            <div
              class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
            >
              <div
                class="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between"
              >
                <span class="text-sm font-bold text-slate-700 tracking-tight"
                  >{s.label}</span
                >
                <button
                  on:click={() => setTmtFilter(s.filterValue)}
                  class="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded
                       {activeTmtFilter === s.filterValue
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-500 hover:text-indigo-600'}"
                >
                  {activeTmtFilter === s.filterValue
                    ? "Filter Aktif"
                    : "Pilih Filter"}
                </button>
              </div>

              <div class="grid grid-cols-3 divide-x divide-slate-100">
                <div class="p-3 text-center">
                  <p class="text-xl font-extrabold text-slate-800 leading-none">
                    {s.total}
                  </p>
                  <p
                    class="text-[10px] font-bold text-slate-400 uppercase mt-1.5 leading-none"
                  >
                    Pegawai
                  </p>
                  <p class="text-[9px] text-slate-300 mt-1 italic">(Total)</p>
                </div>

                <div class="p-3 text-center bg-emerald-50/30">
                  <p
                    class="text-xl font-extrabold text-emerald-600 leading-none"
                  >
                    {s.completed}
                  </p>
                  <p
                    class="text-[10px] font-bold text-emerald-500 uppercase mt-1.5 leading-none"
                  >
                    Selesai
                  </p>
                  <p class="text-[9px] text-emerald-400 mt-1 italic">
                    (Usulan)
                  </p>
                </div>

                <div class="p-3 text-center bg-amber-50/30">
                  <p class="text-xl font-extrabold text-amber-600 leading-none">
                    {s.remaining}
                  </p>
                  <p
                    class="text-[10px] font-bold text-amber-500 uppercase mt-1.5 leading-none"
                  >
                    Belum
                  </p>
                  <p class="text-[9px] text-amber-400 mt-1 italic">
                    (Pengerjaan)
                  </p>
                </div>
              </div>

              <!-- Overall Mini Progress Bar -->
              <div class="h-1 w-full bg-slate-100 overflow-hidden">
                <div
                  class="h-full bg-indigo-500 transition-all duration-700"
                  style="width: {(s.completed / s.total) * 100}%"
                ></div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}

  <!-- Data Table -->
  <div
    class="card overflow-hidden border border-slate-200 shadow-sm rounded-xl"
  >
    <div
      class="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center"
    >
      <h2 class="font-semibold text-slate-700 flex items-center gap-2">
        <svg
          class="w-5 h-5 text-indigo-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        Daftar Tugas Usulan Anda
      </h2>
      <button
        on:click={() => fetchMyTasks(meta.page)}
        class="text-slate-500 hover:text-indigo-600 p-1 rounded-md hover:bg-slate-200 transition-colors tooltip"
        aria-label="Refresh List"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200">
        <thead>
          <tr class="bg-white">
            <th
              class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase"
              >No</th
            >
            <th
              class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase"
              >Pegawai Target</th
            >
            <th
              class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase"
              >Ditugaskan Pada</th
            >
            <th
              class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase"
              >Status Tugas</th
            >
            <th
              class="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase"
              >Aksi</th
            >
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">
          {#if isLoading}
            <tr>
              <td colspan="5" class="px-6 py-12 text-center text-slate-500">
                <div
                  class="flex flex-col items-center justify-center space-y-3"
                >
                  <div
                    class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"
                  ></div>
                  <p class="text-sm font-medium">Memuat tugas usulan...</p>
                </div>
              </td>
            </tr>
          {:else if records.length === 0}
            <tr>
              <td colspan="5" class="px-6 py-16 text-center text-slate-500">
                <div class="flex flex-col items-center">
                  <div
                    class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-emerald-500"
                  >
                    <svg
                      class="w-8 h-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p class="text-lg font-medium text-slate-700">
                    Hore! Tidak ada tugas pembagian.
                  </p>
                  <p class="text-sm text-slate-400 mt-1">
                    Anda telah menyelesaikan semua tugas pembuatan usulan.
                  </p>
                </div>
              </td>
            </tr>
          {:else}
            {#each records as task, i}
              {@const isPensiun = task.dataP3k?.statusPensiun === 'PENSIUN'}
              <tr class="transition-colors group {isPensiun ? 'bg-red-50/50 hover:bg-red-50/80 border-l-4 border-l-red-500' : 'hover:bg-slate-50'}">
                <td
                  class="px-4 py-4 whitespace-nowrap text-sm text-slate-400 font-mono"
                  >{(meta.page - 1) * meta.limit + i + 1}</td
                >
                <td class="px-4 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold {isPensiun ? 'text-red-900' : 'text-slate-800'}">
                      {task.dataP3k?.nama}
                    </span>
                    {#if isPensiun}
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        PENSIUN - Hentikan
                      </span>
                    {/if}
                  </div>
                  <div class="text-xs text-slate-500 font-mono mt-0.5">
                    {task.dataP3k?.nipBaru}
                  </div>
                  <div class="text-[11px] text-slate-400 mt-0.5">
                    {task.dataP3k?.jabatanNama || "-"}
                  </div>
                </td>
                <td class="px-4 py-4 whitespace-nowrap">
                  <div class="text-sm text-slate-600">
                    {formatDate(task.createdAt)}
                  </div>
                </td>
                <td class="px-4 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border {isPensiun ? 'text-red-700 bg-red-50 border-red-200' : 'text-amber-700 bg-amber-50 border-amber-200'}"
                  >
                    {isPensiun ? "Pegawai Pensiun" : (task.isCompleted ? "Selesai" : "Belum Selesai")}
                  </span>
                </td>
                <td
                  class="px-4 py-4 whitespace-nowrap text-center text-sm font-medium"
                >
                  <button
                    on:click={() => openEditModal(task)}
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 {isPensiun ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'} rounded-md transition-all duration-200"
                  >
                    {#if isPensiun}
                      <svg
                        class="w-4 h-4 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        /></svg
                      >
                      <span>Pegawai Pensiun</span>
                    {:else}
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 4v16m8-8H4"
                        /></svg
                      >
                      <span>Buat Usulan</span>
                    {/if}
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
      <div
        class="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-between"
      >
        <p class="text-sm text-slate-500 font-medium">
          Hal {meta.page} / {meta.totalPages}
        </p>
        <div class="flex gap-2">
          <button
            disabled={meta.page === 1}
            on:click={() => fetchMyTasks(meta.page - 1)}
            class="btn-secondary !py-1 !px-2 disabled:opacity-50">Prev</button
          >
          <button
            disabled={meta.page === meta.totalPages}
            on:click={() => fetchMyTasks(meta.page + 1)}
            class="btn-secondary !py-1 !px-2 disabled:opacity-50">Next</button
          >
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Create Usulan Modal -->
{#if showEditModal && selectedTask}
  <div
    class="fixed inset-0 z-50 overflow-y-auto"
    role="dialog"
    aria-modal="true"
  >
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <button
        type="button"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity border-none w-full h-full cursor-default"
        aria-label="Tutup Atar Belakang"
        on:click={closeEditModal}
      ></button>

      <div
        class="relative bg-white rounded-2xl shadow-xl w-full max-w-lg z-10 overflow-hidden"
      >
        <!-- Progress Bar at top -->
        <div class="h-1 {selectedTask.dataP3k?.statusPensiun === 'PENSIUN' ? 'bg-red-600' : 'bg-indigo-600'} w-full animate-pulse"></div>

        <div
          class="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"
        >
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-bold text-slate-800">Buat Usulan PK</h3>
              {#if selectedTask.dataP3k?.statusPensiun === 'PENSIUN'}
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                  ⚠️ PENSIUN
                </span>
              {/if}
            </div>
            <p class="text-xs text-slate-500 font-mono mt-1">
              Pegawai: {form.namaDisplay}
            </p>
          </div>
          <button
            on:click={closeEditModal}
            aria-label="Tutup Modal"
            class="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              /></svg
            >
          </button>
        </div>

        <form on:submit={handleCompleteTask} class="p-6">
          <div class="space-y-4">
            {#if selectedTask.dataP3k?.statusPensiun === 'PENSIUN'}
              <!-- Warning Banner for Retired Employee -->
              <div class="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3 text-red-800">
                <svg class="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <div>
                  <h4 class="text-sm font-bold text-red-900">PERINGATAN: PEGAWAI TELAH PENSIUN</h4>
                  <p class="text-xs text-red-700 mt-1 leading-relaxed">
                    Pegawai ini telah berstatus <strong>PENSIUN</strong>. Pembuatan usulan perpanjangan kontrak <strong>sebaiknya dihentikan</strong> karena pegawai tidak lagi aktif.
                  </p>
                </div>
              </div>
            {/if}
            <div
              class="bg-blue-50/50 px-4 py-3 rounded-xl border border-blue-100 flex gap-3"
            >
              <svg
                class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p class="text-sm font-medium text-slate-700 leading-tight">
                  Pegawai Terpilih:
                </p>
                <p class="text-sm font-mono text-blue-700 mt-1">
                  {form.nipBaru} - {form.namaDisplay}
                </p>
                <p class="text-sm font-mono text-blue-700 mt-1">
                  {form.jabatanNama}
                </p>
                <p class="text-sm font-mono text-blue-700 mt-1">
                  Unor Induk: {form.unorIndukNama}
                </p>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label
                  for="nomorKontrak"
                  class="block text-sm font-medium text-slate-700"
                  >Nomor Perjanjian Kerja *
                </label>
                <button
                  type="button"
                  on:click={fetchNextContractNumber}
                  class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 disabled:opacity-50"
                  disabled={isRefreshingNomor}
                >
                  {#if isRefreshingNomor}
                    <svg class="animate-spin h-3 w-3 text-indigo-600" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  {:else}
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  {/if}
                  Refresh Nomor
                </button>
              </div>
              <input
                id="nomorKontrak"
                type="text"
                bind:value={form.nomorKontrak}
                class="input-field w-full"
                placeholder="No. Kontrak"
                required
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label
                  for="tanggalMulai"
                  class="block text-sm font-medium text-slate-700 mb-1"
                  >Tanggal Mulai *</label
                >
                <input
                  id="tanggalMulai"
                  type="date"
                  bind:value={form.tanggalMulai}
                  on:change={handleTanggalMulaiChange}
                  class="input-field w-full"
                  required
                />
              </div>
              <div>
                <label
                  for="tanggalSelesai"
                  class="block text-sm font-medium text-slate-700 mb-1"
                  >Tanggal Selesai *</label
                >
                <input
                  id="tanggalSelesai"
                  type="date"
                  bind:value={form.tanggalSelesai}
                  class="input-field w-full"
                  required
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label
                  for="kontrakKe"
                  class="block text-sm font-medium text-slate-700 mb-1"
                  >Kontrak Ke *
                </label>
                <input
                  id="kontrakKe"
                  type="number"
                  min="1"
                  bind:value={form.kontrakKe}
                  class="input-field w-full"
                  placeholder="Cth: 2"
                  required
                />
              </div>
              <div>
                <label
                  for="tanggalTtd"
                  class="block text-sm font-medium text-slate-700 mb-1"
                  >Tanggal TTD Kontrak *</label
                >
                <input
                  id="tanggalTtd"
                  type="date"
                  bind:value={form.tanggalTtd}
                  class="input-field w-full"
                  required
                />
              </div>
            </div>

            <div>
              <label
                for="templateKontrak"
                class="block text-sm font-medium text-slate-700 mb-1"
                >Template Kontrak *</label
              >
              <select
                id="templateKontrak"
                bind:value={form.templateKontrakId}
                class="input-field w-full"
                required
              >
                <option value="">-- Pilih Template --</option>
                {#each templates as t (t.id)}
                  <option value={t.id}>{t.nama}</option>
                {/each}
              </select>
            </div>

            <div>
              <label
                for="keterangan"
                class="block text-sm font-medium text-slate-700 mb-1"
                >Keterangan Tambahan</label
              >
              <textarea
                id="keterangan"
                bind:value={form.keterangan}
                class="input-field w-full"
                rows="2"
                placeholder="Catatan usulan..."
              ></textarea>
            </div>
          </div>

          <div
            class="mt-8 flex items-center justify-end gap-3 pt-6 border-t border-slate-100"
          >
            <button
              type="button"
              on:click={closeEditModal}
              class="btn-secondary"
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              class="btn-primary shadow-indigo-200"
              disabled={isSubmitting}
            >
              {#if isSubmitting}
                <svg
                  class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  ><circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle><path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path></svg
                >
                Membuat...
              {:else}
                <svg
                  class="w-4 h-4 mr-1.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  /></svg
                >
                Buat Usulan
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}
