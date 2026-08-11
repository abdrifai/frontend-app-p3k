<script>
  import { onMount } from "svelte";
  import { authStore } from "$lib/store";
  import { goto } from "$app/navigation";
  import { apiRequest } from "$lib/api";
  
  let logs = $state([]);
  let meta = $state({ page: 1, limit: 10, totalPages: 1, total: 0 });
  let isLoggingEnabled = $state(true);
  let loading = $state(true);
  let errorMsg = $state(null);
  let archiveDays = $state(30);
  let selectedLog = $state(null);
  let copyFeedback = $state(false);

  // Search and Filter States
  let searchNip = $state("");
  let searchQuery = $state("");
  let selectedAction = $state("");
  let selectedEntityType = $state("");
  let dateStart = $state("");
  let dateEnd = $state("");
  let matchedEmployee = $state(null);

  const actionOptions = [
    { value: "", label: "Semua Aksi" },
    { value: "UPDATE", label: "UPDATE" },
    { value: "COMPLETE_TASK", label: "COMPLETE_TASK" },
    { value: "DELETE_USULAN", label: "DELETE_USULAN" },
    { value: "DELETE_APPROVED_USULAN", label: "DELETE_APPROVED_USULAN" },
    { value: "CREATE", label: "CREATE" },
    { value: "DELETE", label: "DELETE" }
  ];

  const entityOptions = [
    { value: "", label: "Semua Entitas" },
    { value: "DataP3k", label: "DataP3k" },
    { value: "TaskPeremajaan", label: "TaskPeremajaan" },
    { value: "TaskUsulan", label: "TaskUsulan" },
    { value: "UsulanPerpanjangan", label: "UsulanPerpanjangan" }
  ];

  onMount(async () => {
    if (!$authStore.isAuthenticated || $authStore.user?.role !== "admin") {
      goto("/");
      return;
    }
    await checkStatus();
    await fetchLogs(1);
  });

  const checkStatus = async () => {
    try {
      const data = await apiRequest("/api/v1/activity-logs/settings/status", "GET");
      if (data.success) {
        isLoggingEnabled = data.data.isEnabled;
      }
    } catch (e) { console.error(e); }
  };

  const fetchLogs = async (page = 1) => {
    try {
      loading = true;
      errorMsg = null;
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "10"
      });

      if (searchNip.trim()) queryParams.append("nip", searchNip.trim());
      if (searchQuery.trim()) queryParams.append("search", searchQuery.trim());
      if (selectedAction) queryParams.append("action", selectedAction);
      if (selectedEntityType) queryParams.append("entityType", selectedEntityType);
      if (dateStart) queryParams.append("startDate", dateStart);
      if (dateEnd) queryParams.append("endDate", dateEnd);

      const data = await apiRequest(`/api/v1/activity-logs?${queryParams.toString()}`, "GET");
      if (data.success) {
        logs = data.data.data;
        matchedEmployee = data.data.matchedEmployee || null;
        meta = { 
          page: data.data.page, 
          limit: data.data.limit, 
          total: data.data.total,
          totalPages: data.data.totalPages || Math.ceil(data.data.total / data.data.limit) || 1
        };
      }
    } catch (e) {
      errorMsg = e.message;
    } finally { 
      loading = false; 
    }
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    fetchLogs(1);
  };

  const resetFilters = () => {
    searchNip = "";
    searchQuery = "";
    selectedAction = "";
    selectedEntityType = "";
    dateStart = "";
    dateEnd = "";
    matchedEmployee = null;
    fetchLogs(1);
  };

  const toggleLogging = async () => {
    try {
      const data = await apiRequest("/api/v1/activity-logs/settings/toggle", "PATCH", { enabled: !isLoggingEnabled });
      if (data.success) {
        isLoggingEnabled = data.data.isEnabled;
      }
    } catch(e) { console.error(e); }
  };

  const archiveLogs = async () => {
    if (!confirm(`Tindakan ini akan memindahkan data log yang lebih tua dari ${archiveDays} hari ke tabel arsip. Lakukan?`)) return;
    try {
      const data = await apiRequest("/api/v1/activity-logs/archive", "POST", { daysOlder: archiveDays });
      alert(data.message || 'Log berhasil diarsipkan');
      fetchLogs(1);
    } catch(e) { console.error(e); }
  };

  const changePage = (p) => {
    if (p >= 1 && p <= meta.totalPages) {
      fetchLogs(p);
    }
  };

  const copyDetailsToClipboard = (details) => {
    try {
      let formatted = details;
      if (typeof details === 'string') {
        try {
          formatted = JSON.stringify(JSON.parse(details), null, 2);
        } catch {
          formatted = details;
        }
      } else if (typeof details === 'object') {
        formatted = JSON.stringify(details, null, 2);
      }
      navigator.clipboard.writeText(formatted);
      copyFeedback = true;
      setTimeout(() => { copyFeedback = false; }, 2000);
    } catch (err) {
      console.error('Failed to copy JSON:', err);
    }
  };

  const hasActiveFilters = () => {
    return searchNip.trim() || searchQuery.trim() || selectedAction || selectedEntityType || dateStart || dateEnd;
  };
</script>

<div class="min-h-screen bg-slate-50/60 pb-16">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
    
    <!-- Top Header Card -->
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
      <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 class="text-xl font-bold text-slate-800">Laporan Log Aktivitas Sistem</h1>
              <p class="text-[13px] text-slate-500">Lacak riwayat perubahan, pembaruan, dan manipulasi data PPPK serta audit aktivitas user.</p>
            </div>
          </div>
        </div>

        <!-- Controls: Status Toggle & Archive -->
        <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <!-- Status Toggle -->
          <div class="flex items-center bg-slate-50 px-3.5 py-2 rounded-xl ring-1 ring-slate-200/80">
            <span class="text-[12px] text-slate-600 font-semibold mr-3">Status Logging</span>
            <button 
              class="{isLoggingEnabled ? 'bg-indigo-600' : 'bg-slate-300'} relative inline-flex h-[22px] w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
              onclick={toggleLogging}
              title={isLoggingEnabled ? 'Pencatatan log aktif' : 'Pencatatan log nonaktif'}
            >
              <span class="sr-only">Toggle Logging</span>
              <span class="{isLoggingEnabled ? 'translate-x-[18px]' : 'translate-x-0'} pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
            </button>
          </div>

          <!-- Archive Box -->
          <div class="flex items-center gap-2 bg-slate-50 p-1 rounded-xl ring-1 ring-slate-200/80">
            <div class="flex items-center px-2">
              <input 
                type="number" 
                bind:value={archiveDays} 
                class="w-14 h-8 rounded-lg border-slate-200 text-xs font-semibold text-center focus:ring-indigo-500 focus:border-indigo-500 bg-white" 
                min="1" 
                placeholder="Hari"
              />
              <span class="text-[11px] font-medium text-slate-500 ml-1.5 mr-1">hari</span>
            </div>
            <button 
              onclick={archiveLogs} 
              class="h-8 px-3 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors shadow-xs"
            >
              Arsipkan
            </button>
          </div>
        </div>
      </div>

      <!-- Search & Filters Section -->
      <form onsubmit={handleSearch} class="mt-5 space-y-4">
        <!-- Main Search Bar Row -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
          <!-- NIP Search Input (Primary) -->
          <div class="md:col-span-5 relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-500">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
            </div>
            <input 
              type="text" 
              bind:value={searchNip}
              placeholder="Cari berdasarkan NIP PPPK (cth: 19850101...)" 
              class="w-full h-11 pl-10 pr-9 bg-slate-50/80 hover:bg-white focus:bg-white rounded-xl border border-slate-200 text-sm placeholder-slate-400 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {#if searchNip}
              <button 
                type="button" 
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                onclick={() => { searchNip = ""; handleSearch(); }}
                title="Bersihkan pencarian NIP"
                aria-label="Bersihkan pencarian NIP"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            {/if}
          </div>

          <!-- General Search Input -->
          <div class="md:col-span-4 relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input 
              type="text" 
              bind:value={searchQuery}
              placeholder="Cari user pelaku, kata kunci, payload..." 
              class="w-full h-11 pl-10 pr-9 bg-slate-50/80 hover:bg-white focus:bg-white rounded-xl border border-slate-200 text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {#if searchQuery}
              <button 
                type="button" 
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                onclick={() => { searchQuery = ""; handleSearch(); }}
                title="Bersihkan pencarian umum"
                aria-label="Bersihkan pencarian umum"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            {/if}
          </div>

          <!-- Action Buttons -->
          <div class="md:col-span-3 flex items-center gap-2">
            <button 
              type="submit" 
              class="flex-1 h-11 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Cari Log</span>
            </button>
            {#if hasActiveFilters()}
              <button 
                type="button" 
                onclick={resetFilters}
                class="h-11 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                title="Reset Semua Filter"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Reset</span>
              </button>
            {/if}
          </div>
        </div>

        <!-- Filter Row (Action, Entity, Date Range) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <!-- Filter Aksi -->
          <div>
            <label for="filter-action" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tipe Aksi</label>
            <select 
              id="filter-action"
              bind:value={selectedAction}
              onchange={() => fetchLogs(1)}
              class="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {#each actionOptions as opt}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </div>

          <!-- Filter Entitas -->
          <div>
            <label for="filter-entity" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tabel / Entitas</label>
            <select 
              id="filter-entity"
              bind:value={selectedEntityType}
              onchange={() => fetchLogs(1)}
              class="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {#each entityOptions as opt}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </div>

          <!-- Filter Tanggal Mulai -->
          <div>
            <label for="filter-date-start" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dari Tanggal</label>
            <input 
              id="filter-date-start"
              type="date" 
              bind:value={dateStart}
              onchange={() => fetchLogs(1)}
              class="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <!-- Filter Tanggal Sampai -->
          <div>
            <label for="filter-date-end" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sampai Tanggal</label>
            <input 
              id="filter-date-end"
              type="date" 
              bind:value={dateEnd}
              onchange={() => fetchLogs(1)}
              class="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>
      </form>

      <!-- Matched Employee Banner (if NIP search matches a PPPK) -->
      {#if matchedEmployee}
        <div class="mt-5 p-4 rounded-xl bg-indigo-50/60 border border-indigo-100/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {matchedEmployee.nama ? matchedEmployee.nama.charAt(0).toUpperCase() : 'P'}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-sm text-indigo-950">{matchedEmployee.nama}</span>
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-indigo-100 text-indigo-700 uppercase">
                  PPPK Terkait
                </span>
              </div>
              <div class="flex flex-wrap items-center gap-x-3 text-xs text-indigo-700/80 mt-0.5">
                <span class="font-mono font-medium">NIP: {matchedEmployee.nipBaru}</span>
                {#if matchedEmployee.jabatanNama}
                  <span>•</span>
                  <span>{matchedEmployee.jabatanNama}</span>
                {/if}
                {#if matchedEmployee.satuanKerjaKerjaNama}
                  <span>•</span>
                  <span>{matchedEmployee.satuanKerjaKerjaNama}</span>
                {/if}
              </div>
            </div>
          </div>
          <button 
            type="button" 
            onclick={() => { searchNip = ""; matchedEmployee = null; fetchLogs(1); }}
            class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline self-end sm:self-center"
          >
            Hapus Filter NIP
          </button>
        </div>
      {/if}
    </div>

    <!-- Main Table Card -->
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <h2 class="text-base font-bold text-slate-800">Riwayat Log</h2>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            {meta.total} Entri Ditemukan
          </span>
        </div>
        {#if searchNip.trim()}
          <span class="text-xs text-indigo-600 font-medium bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
            Menampilkan aktivitas terkait NIP: <strong class="font-mono">{searchNip}</strong>
          </span>
        {/if}
      </div>

      <!-- Table Content -->
      <div class="overflow-x-auto ring-1 ring-slate-200/80 rounded-xl">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="text-[11px] font-bold uppercase tracking-wider bg-slate-50 text-slate-500">
            <tr>
              <th class="px-5 py-3.5 border-b border-slate-200">Waktu</th>
              <th class="px-5 py-3.5 border-b border-slate-200">User (Pelaku)</th>
              <th class="px-5 py-3.5 border-b border-slate-200">Aksi</th>
              <th class="px-5 py-3.5 border-b border-slate-200">Tabel / Entitas</th>
              <th class="px-5 py-3.5 border-b border-slate-200">ID Entitas / NIP</th>
              <th class="px-5 py-3.5 border-b border-slate-200 text-right">Rincian Perubahan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            {#if loading}
              <tr>
                <td colspan="6" class="px-5 py-12 text-center text-slate-400">
                  <div class="flex items-center justify-center gap-3">
                    <svg class="w-5 h-5 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>Memuat log aktivitas...</span>
                  </div>
                </td>
              </tr>
            {:else if errorMsg}
              <tr>
                <td colspan="6" class="px-5 py-8 text-center text-rose-500 bg-rose-50/50">
                  <p class="font-medium">{errorMsg}</p>
                </td>
              </tr>
            {:else if logs.length === 0}
              <tr>
                <td colspan="6" class="px-5 py-16 text-center text-slate-400 bg-slate-50/30">
                  <svg class="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p class="font-semibold text-slate-600 text-sm">Tidak ada log aktivitas yang ditemukan.</p>
                  {#if hasActiveFilters()}
                    <p class="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau bersihkan filter yang aktif.</p>
                    <button 
                      onclick={resetFilters} 
                      class="mt-3 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      Bersihkan Semua Filter
                    </button>
                  {/if}
                </td>
              </tr>
            {:else}
              {#each logs as log}
                <tr 
                  class="hover:bg-indigo-50/40 transition-colors group cursor-pointer"
                  onclick={() => selectedLog = log}
                >
                  <!-- Waktu -->
                  <td class="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                    {new Date(log.createdAt).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </td>

                  <!-- User (Pelaku) -->
                  <td class="px-5 py-3.5">
                    <div class="flex items-center gap-2">
                      <div class="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {log.user?.namaLengkap ? log.user.namaLengkap.charAt(0).toUpperCase() : (log.user?.username ? log.user.username.charAt(0).toUpperCase() : 'S')}
                      </div>
                      <span class="font-semibold text-slate-700 text-xs">
                        {log.user?.namaLengkap || log.user?.username || 'System'}
                      </span>
                    </div>
                  </td>

                  <!-- Aksi -->
                  <td class="px-5 py-3.5">
                    <span class="inline-flex px-2 py-0.5 rounded-md border text-[10px] font-bold tracking-wider uppercase
                      {log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                       log.action === 'UPDATE' || log.action === 'COMPLETE_TASK' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                       log.action.includes('DELETE') ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-700 border-slate-200'}">
                      {log.action}
                    </span>
                  </td>

                  <!-- Entitas -->
                  <td class="px-5 py-3.5 text-slate-600 font-semibold text-xs">
                    {log.entityType}
                  </td>

                  <!-- ID Entitas -->
                  <td class="px-5 py-3.5">
                    {#if /^\d{15,21}$/.test(log.entityId) || (searchNip && log.entityId.includes(searchNip))}
                      <span class="inline-flex items-center px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        NIP: {log.entityId}
                      </span>
                    {:else}
                      <span class="text-slate-400 font-mono text-[11px]" title={log.entityId}>
                        {log.entityId ? (log.entityId.length > 12 ? `${log.entityId.substring(0, 10)}...` : log.entityId) : '-'}
                      </span>
                    {/if}
                  </td>

                  <!-- Detail -->
                  <td class="px-5 py-3.5 text-right">
                    <div class="inline-flex items-center gap-1 max-w-[220px] truncate text-slate-500 font-mono text-[10px] bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60 group-hover:border-indigo-200 group-hover:bg-white transition-colors" title={log.details}>
                      <span class="truncate">{log.details || 'N/A'}</span>
                      <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      {#if meta.totalPages > 1}
        <div class="flex flex-col sm:flex-row items-center justify-between mt-6 pt-5 border-t border-slate-100 gap-4">
          <p class="text-xs text-slate-500">
            Halaman <span class="font-bold text-slate-700">{meta.page}</span> dari <span class="font-bold text-slate-700">{meta.totalPages}</span>
            <span class="mx-1 text-slate-300">•</span> Total <span class="font-semibold text-slate-700">{meta.total}</span> data aktivitas
          </p>
          <div class="flex items-center gap-2">
            <button 
              class="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-2xs disabled:opacity-40 disabled:hover:text-slate-600"
              disabled={meta.page <= 1}
              onclick={() => changePage(meta.page - 1)}
            >
              ← Sebelumnya
            </button>
            
            <!-- Quick Page Indicator -->
            <span class="px-2 text-xs font-semibold text-slate-600">
              {meta.page} / {meta.totalPages}
            </span>

            <button 
              class="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-2xs disabled:opacity-40 disabled:hover:text-slate-600"
              disabled={meta.page >= meta.totalPages}
              onclick={() => changePage(meta.page + 1)}
            >
              Berikutnya →
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Modal Detail Log -->
{#if selectedLog}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
      class="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      onclick={() => selectedLog = null}
    ></div>

    <!-- Modal Content -->
    <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
      
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-bold text-slate-800">Detail Aktivitas Sistem</h2>
            <p class="text-xs text-slate-500 font-mono">ID Log: {selectedLog.id}</p>
          </div>
        </div>
        <button 
          class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          onclick={() => selectedLog = null}
          title="Tutup detail aktivitas"
          aria-label="Tutup detail aktivitas"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 overflow-y-auto flex-1 space-y-5">
        
        <!-- Info Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="bg-indigo-50/40 rounded-xl p-4 ring-1 ring-indigo-100/60">
            <p class="text-[11px] font-bold text-indigo-500 uppercase tracking-wider mb-1">Informasi Pelaku (User)</p>
            <p class="text-sm font-bold text-indigo-950">{selectedLog.user?.namaLengkap || selectedLog.user?.username || 'System'}</p>
            <p class="text-xs text-indigo-600/70 mt-0.5">Username: {selectedLog.user?.username || '-'}</p>
            <p class="text-[11px] text-indigo-500/80 mt-1 font-mono">{new Date(selectedLog.createdAt).toLocaleString('id-ID')}</p>
          </div>
          
          <div class="bg-slate-50 rounded-xl p-4 ring-1 ring-slate-100">
            <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Entitas & Aksi</p>
            <div class="flex items-center gap-2 mb-1">
              <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase
                {selectedLog.action === 'CREATE' ? 'bg-emerald-100 text-emerald-800' :
                 selectedLog.action === 'UPDATE' || selectedLog.action === 'COMPLETE_TASK' ? 'bg-indigo-100 text-indigo-800' :
                 selectedLog.action.includes('DELETE') ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-800'}">
                {selectedLog.action}
              </span>
              <span class="text-sm font-bold text-slate-700">{selectedLog.entityType}</span>
            </div>
            <p class="text-xs text-slate-500 font-mono mt-1 break-all">ID: {selectedLog.entityId}</p>
          </div>
        </div>

        <!-- Payload Section -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs font-bold text-slate-700 flex items-center gap-2">
              <svg class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Payload Detail Data:
            </p>
            <button 
              type="button" 
              onclick={() => copyDetailsToClipboard(selectedLog.details)}
              class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              {#if copyFeedback}
                <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-emerald-700">Tersalin!</span>
              {:else}
                <svg class="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Salin JSON</span>
              {/if}
            </button>
          </div>

          <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto shadow-inner ring-1 ring-slate-800">
            <pre class="text-xs text-emerald-400 font-mono leading-relaxed">{(() => {
              try {
                if (typeof selectedLog.details === 'object' && selectedLog.details !== null) {
                  return JSON.stringify(selectedLog.details, null, 2);
                }
                return JSON.stringify(JSON.parse(selectedLog.details), null, 2);
              } catch(e) {
                return selectedLog.details || 'Tidak ada detail data yang dicatat.';
              }
            })()}</pre>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-end">
        <button 
          class="px-5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors shadow-2xs"
          onclick={() => selectedLog = null}
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
{/if}


