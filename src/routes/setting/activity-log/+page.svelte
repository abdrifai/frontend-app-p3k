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
      const data = await apiRequest(`/api/v1/activity-logs?page=${page}&limit=10`, "GET");
      if (data.success) {
        logs = data.data.data;
        meta = { 
          page: data.data.page, 
          limit: data.data.limit, 
          total: data.data.total,
          totalPages: Math.ceil(data.data.total / data.data.limit) || 1
        };
      }
    } catch (e) {
      errorMsg = e.message;
    } finally { loading = false; }
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
</script>

<div class="min-h-screen bg-slate-50/50 pb-12">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 class="text-xl font-bold text-slate-800">Laporan Aktivitas Sistem</h1>
          <p class="text-[13px] text-slate-500 mt-1">Lacak riwayat manipulasi data oleh user untuk monitoring keamanan.</p>
        </div>
        <div class="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-4 sm:mt-0 items-start sm:items-center">
          <div class="flex items-center justify-between w-full sm:w-auto bg-slate-50 px-4 py-2 rounded-xl ring-1 ring-slate-100">
            <span class="text-[13px] text-slate-600 font-semibold mr-4">Status Log</span>
            <button 
              class="{isLoggingEnabled ? 'bg-indigo-500' : 'bg-slate-300'} relative inline-flex h-[22px] w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
              onclick={toggleLogging}
            >
              <span class="sr-only">Toggle Logging</span>
              <span class="{isLoggingEnabled ? 'translate-x-[18px]' : 'translate-x-0'} pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
            </button>
          </div>
          <div class="flex items-center gap-2 w-full sm:w-auto border-l-0 sm:border-l border-slate-200 sm:pl-4">
            <input type="number" bind:value={archiveDays} class="w-20 h-[38px] rounded-xl border-slate-200 text-sm p-3 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 transition-colors" min="1" placeholder="Hari"/>
            <button onclick={archiveLogs} class="h-[38px] px-4 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-[13px] font-semibold tracking-wide rounded-xl whitespace-nowrap transition-colors shadow-sm">
              Arsipkan
            </button>
          </div>
        </div>
      </div>

      <!-- Table content -->
      <div class="mt-6 overflow-x-auto ring-1 ring-slate-200 rounded-xl">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="text-[11px] font-bold uppercase tracking-wider bg-slate-50 text-slate-500">
            <tr>
              <th class="px-5 py-4 border-b border-slate-200">Waktu</th>
              <th class="px-5 py-4 border-b border-slate-200">User (Pelaku)</th>
              <th class="px-5 py-4 border-b border-slate-200">Aksi</th>
              <th class="px-5 py-4 border-b border-slate-200">Tabel/Entitas</th>
              <th class="px-5 py-4 border-b border-slate-200">ID Entitas</th>
              <th class="px-5 py-4 border-b border-slate-200 text-right">Detail (JSON)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            {#if loading}
              <tr>
                <td colspan="6" class="px-5 py-8 text-center text-slate-400">
                  <div class="flex items-center justify-center gap-3">
                    <svg class="w-5 h-5 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Memuat log aktivitas...
                  </div>
                </td>
              </tr>
            {:else if logs.length === 0}
              <tr>
                <td colspan="6" class="px-5 py-16 text-center text-slate-400 bg-slate-50/30">
                  <svg class="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <p class="font-medium text-slate-500">Belum ada aktivitas tercatat.</p>
                </td>
              </tr>
            {:else}
              {#each logs as log}
                <tr 
                  class="hover:bg-indigo-50/50 transition-colors group cursor-pointer"
                  onclick={() => selectedLog = log}
                >
                  <td class="px-5 py-3.5 text-slate-500 font-mono text-[11px]">{new Date(log.createdAt).toLocaleString('id-ID')}</td>
                  <td class="px-5 py-3.5">
                    <span class="font-semibold text-slate-700">{log.user?.namaLengkap || log.user?.username || 'System/Unknown'}</span>
                  </td>
                  <td class="px-5 py-3.5">
                    <span class="inline-flex px-2 py-1 rounded border border-transparent text-[10px] font-bold tracking-widest uppercase
                      {log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                       log.action === 'UPDATE' || log.action === 'COMPLETE_TASK' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                       log.action === 'DELETE' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-50 text-slate-700 border-slate-200'}">
                      {log.action}
                    </span>
                  </td>
                  <td class="px-5 py-3.5 text-slate-600 font-semibold text-[13px]">{log.entityType}</td>
                  <td class="px-5 py-3.5 text-slate-400 font-mono text-[11px]">{log.entityId.substring(0,8)}...</td>
                  <td class="px-5 py-3.5 text-right">
                    <div class="inline-block max-w-[250px] truncate text-slate-400 font-mono text-[10px] bg-slate-50 px-2 py-1 rounded" title={log.details}>
                      {log.details || 'N/A'}
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
        <div class="flex items-center justify-between mt-6 pt-5 border-t border-slate-100">
          <p class="text-[13px] text-slate-500">
            Halaman <span class="font-bold text-slate-700">{meta.page}</span> dari <span class="font-bold text-slate-700">{meta.totalPages}</span>
            <span class="mx-1 text-slate-300">•</span> Total <span class="font-semibold">{meta.total}</span> data
          </p>
          <div class="flex items-center gap-2">
            <button 
              class="px-4 py-2 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm disabled:opacity-50 disabled:hover:text-slate-600"
              disabled={meta.page <= 1}
              onclick={() => changePage(meta.page - 1)}
            >
              Kembali
            </button>
            <button 
              class="px-4 py-2 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm disabled:opacity-50 disabled:hover:text-slate-600"
              disabled={meta.page >= meta.totalPages}
              onclick={() => changePage(meta.page + 1)}
            >
              Berikutnya
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
      class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      onclick={() => selectedLog = null}
    ></div>

    <!-- Modal Content -->
    <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 class="text-lg font-bold text-slate-800">Detail Aktivitas</h2>
          <p class="text-[13px] text-slate-500 mt-0.5">Lihat rincian perubahan data (JSON Format)</p>
        </div>
        <button 
          class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          onclick={() => selectedLog = null}
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-6 overflow-y-auto flex-1">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div class="bg-indigo-50/30 rounded-xl p-4 ring-1 ring-indigo-100/50">
            <p class="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Informasi Pelaku</p>
            <p class="text-sm font-bold text-indigo-900">{selectedLog.user?.namaLengkap || selectedLog.user?.username || 'System'}</p>
            <p class="text-[11px] text-indigo-500/80 mt-0.5 font-mono">{new Date(selectedLog.createdAt).toLocaleString('id-ID')}</p>
          </div>
          <div class="bg-slate-50 rounded-xl p-4 ring-1 ring-slate-100/50">
            <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Entitas</p>
            <div class="flex items-center gap-2 mb-1">
              <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase
                {selectedLog.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' :
                 selectedLog.action === 'UPDATE' || selectedLog.action === 'COMPLETE_TASK' ? 'bg-indigo-100 text-indigo-700' :
                 selectedLog.action === 'DELETE' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'}">
                {selectedLog.action}
              </span>
              <span class="text-sm font-semibold text-slate-700">{selectedLog.entityType}</span>
            </div>
            <p class="text-[11px] text-slate-500 font-mono mt-0.5">{selectedLog.entityId}</p>
          </div>
        </div>

        <div>
          <p class="text-[13px] font-bold text-slate-700 mb-2 flex items-center gap-2">
            <svg class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            Payload Detail Data:
          </p>
          <div class="bg-slate-900 rounded-xl p-5 overflow-x-auto shadow-inner ring-1 ring-slate-800">
            <pre class="text-[13px] text-emerald-400 font-mono leading-relaxed">{(() => {
              try {
                // If it's already a js object (like if Prisma returning JSON without stringify)
                if (typeof selectedLog.details === 'object' && selectedLog.details !== null) {
                   return JSON.stringify(selectedLog.details, null, 2);
                }
                // Try parse if string
                return JSON.stringify(JSON.parse(selectedLog.details), null, 2);
              } catch(e) {
                return selectedLog.details || 'Tidak ada detail data yang dicatat.';
              }
            })()}</pre>
          </div>
        </div>
      </div>
      
      <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
        <button 
          class="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm focus:ring-2 focus:ring-slate-200 outline-none"
          onclick={() => selectedLog = null}
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
{/if}

