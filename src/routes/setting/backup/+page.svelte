<script>
  import { onMount } from 'svelte';
  import { goto }    from '$app/navigation';
  import { authStore, isUserAdmin }  from '$lib/store';
  import { addToast }   from '$lib/toastStore';
  import { get }        from 'svelte/store';
  import { API_BASE_URL } from '$lib/api';

  // ── State ──────────────────────────────────────────────────────────────
  let stats         = null;
  let loadingStats  = true;

  let downloadingArchive    = {};   // { 'final-pk': bool, 'pensiun-sk': bool }
  let downloadingAllArchive = false;

  // ── Backup Otomatis State ──────────────────────────────────────────────
  let backupHistory       = [];
  let loadingHistory      = true;
  let triggeringBackup    = false;
  let deletingFile        = {};      // { filename: bool }
  let downloadingFile     = {};      // { filename: bool }

  const today = () => new Date().toISOString().slice(0, 10);
  const fmtBytes = (b) => {
    if (!b) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0; let n = b;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(1)} ${units[i]}`;
  };
  const fmtNum = (n) => (n ?? 0).toLocaleString('id-ID');

  /**
   * Format ISO date string ke format lokal yang lebih readable
   */
  const fmtDate = (isoStr) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  // ── Lifecycle ──────────────────────────────────────────────────────────
  onMount(async () => {
    if (!$authStore.isAuthenticated || !isUserAdmin($authStore.user)) {
      addToast('Akses ditolak. Hanya untuk Admin.', 'error');
      goto('/');
      return;
    }
    await Promise.all([fetchStats(), fetchBackupHistory()]);
  });

  // Helper: fetch dengan Bearer token
  function authFetch(url, options = {}) {
    const auth = get(authStore);
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        'Authorization': auth.token ? `Bearer ${auth.token}` : '',
      },
    });
  }

  async function fetchStats() {
    loadingStats = true;
    try {
      const res  = await authFetch('/api/backup/stats');
      const json = await res.json();
      if (json.success) stats = json.data;
    } catch (e) {
      console.error(e);
    } finally {
      loadingStats = false;
    }
  }

  // ── Backup Otomatis Functions ──────────────────────────────────────────

  async function fetchBackupHistory() {
    loadingHistory = true;
    try {
      const res  = await authFetch('/api/backup/history');
      const json = await res.json();
      if (json.success) backupHistory = json.data;
    } catch (e) {
      console.error(e);
    } finally {
      loadingHistory = false;
    }
  }

  async function triggerManualBackup() {
    triggeringBackup = true;
    try {
      const res  = await authFetch('/api/backup/trigger', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        addToast('Backup database berhasil dibuat!', 'success');
        await fetchBackupHistory();
      } else {
        addToast(json.message || 'Gagal membuat backup', 'error');
      }
    } catch (e) {
      addToast('Gagal membuat backup: ' + e.message, 'error');
    } finally {
      triggeringBackup = false;
    }
  }

  async function downloadBackupFile(filename) {
    downloadingFile = { ...downloadingFile, [filename]: true };
    try {
      const res = await authFetch(`/api/backup/download/${encodeURIComponent(filename)}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || res.statusText);
      }
      triggerDownload(await res.blob(), filename);
      addToast(`File ${filename} berhasil diunduh!`, 'success');
    } catch (e) {
      addToast('Gagal mengunduh file: ' + e.message, 'error');
    } finally {
      downloadingFile = { ...downloadingFile, [filename]: false };
    }
  }

  async function deleteBackupFile(filename) {
    if (!confirm(`Yakin ingin menghapus file backup "${filename}"?`)) return;
    deletingFile = { ...deletingFile, [filename]: true };
    try {
      const res  = await authFetch(`/api/backup/delete/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        addToast('File backup berhasil dihapus', 'success');
        await fetchBackupHistory();
      } else {
        addToast(json.message || 'Gagal menghapus file', 'error');
      }
    } catch (e) {
      addToast('Gagal menghapus file: ' + e.message, 'error');
    } finally {
      deletingFile = { ...deletingFile, [filename]: false };
    }
  }

  // ── Download Archive ZIP ───────────────────────────────────────────────
  async function downloadArchive(folders, labelKey) {
    if (labelKey === 'all') downloadingAllArchive = true;
    else downloadingArchive = { ...downloadingArchive, [labelKey]: true };

    try {
      const res = await authFetch('/api/backup/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folders }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(JSON.stringify(json) || res.statusText);
      }
      const suffix = labelKey === 'all' ? 'semua' : labelKey;
      triggerDownload(await res.blob(), `backup_arsip_${suffix}_${today()}.zip`);
      addToast(`Backup arsip ${suffix} berhasil diunduh!`, 'success');
    } catch (e) {
      addToast('Gagal mengunduh arsip: ' + e.message, 'error');
    } finally {
      if (labelKey === 'all') downloadingAllArchive = false;
      else downloadingArchive = { ...downloadingArchive, [labelKey]: false };
    }
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
</script>

<svelte:head>
  <title>Backup & Restore | P3K Admin</title>
  <meta name="description" content="Backup database SQL dan arsip file sistem P3K." />
</svelte:head>

<div class="max-w-5xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">

  <!-- ── Header ──────────────────────────────────────────────────────────── -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
        <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
        </svg>
      </div>
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Backup & Restore</h1>
        <p class="mt-0.5 text-sm text-slate-500">Unduh dump database SQL dan arsip file sistem</p>
      </div>
    </div>
    <button
      on:click={() => { fetchStats(); fetchBackupHistory(); }}
      class="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-sm
             text-slate-600 text-sm hover:bg-slate-50 transition-colors self-start sm:self-auto"
    >
      <svg class="w-4 h-4 {loadingStats || loadingHistory ? 'animate-spin' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
      Refresh
    </button>
  </div>

  <!-- ── Stat Cards ──────────────────────────────────────────────────────── -->
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
    {#each [
      { label: 'Total P3K',  value: stats?.db?.totalP3k,   icon: '👥', bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-100' },
      { label: 'P3K Aktif',  value: stats?.db?.totalAktif,  icon: '✅', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
      { label: 'Total Task', value: stats?.db?.totalTask,   icon: '📋', bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-100' },
      { label: 'Pengguna',   value: stats?.db?.totalUser,   icon: '🔑', bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-100' },
    ] as s}
      <div class="rounded-xl {s.bg} border {s.border} p-4">
        <div class="text-xl mb-1.5">{s.icon}</div>
        {#if loadingStats}
          <div class="h-6 w-14 bg-slate-200 animate-pulse rounded-md mb-1"></div>
        {:else}
          <div class="text-xl font-bold {s.text}">{fmtNum(s.value)}</div>
        {/if}
        <div class="text-[11px] text-slate-500 font-medium mt-0.5">{s.label}</div>
      </div>
    {/each}
  </div>

  <!-- ══════════════════════════════════════════════════════════════════════ -->
  <!-- ── SECTION: Backup Otomatis Database ─────────────────────────────── -->
  <!-- ══════════════════════════════════════════════════════════════════════ -->
  <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <!-- Header -->
    <div class="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-sm font-semibold text-slate-800">Backup Otomatis Database</h2>
          <p class="text-[11px] text-slate-400 mt-0.5">Backup terjadwal setiap hari pukul 00:00 WITA — tersimpan di server</p>
        </div>
      </div>
      <!-- Trigger Manual Button -->
      <button
        id="btn-trigger-backup"
        on:click={triggerManualBackup}
        disabled={triggeringBackup}
        class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white
          bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700
          shadow-sm hover:shadow-md transition-all duration-150
          disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] self-start sm:self-auto"
      >
        {#if triggeringBackup}
          <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          Memproses...
        {:else}
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
          Backup Sekarang
        {/if}
      </button>
    </div>

    <!-- Info Card: Jadwal -->
    <div class="px-5 pt-4">
      <div class="flex gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-100">
        <svg class="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <div class="text-[11px] text-blue-700 leading-relaxed">
          <strong>Jadwal Otomatis:</strong> Backup database berjalan otomatis setiap hari pukul <strong>00:00 WITA</strong>.
          File disimpan di folder <code class="bg-blue-100 px-1 py-0.5 rounded text-[10px]">backupdb/</code> dengan format
          <code class="bg-blue-100 px-1 py-0.5 rounded text-[10px]">NAMA_DB_tanggal_waktu.sql</code>.
          Anda juga dapat memicu backup secara manual kapan saja dengan tombol di atas.
        </div>
      </div>
    </div>

    <!-- Tabel Riwayat Backup -->
    <div class="p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Riwayat Backup ({backupHistory.length} file)</h3>
        <button
          on:click={fetchBackupHistory}
          class="text-[11px] text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
        >
          <svg class="w-3 h-3 {loadingHistory ? 'animate-spin' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </button>
      </div>

      {#if loadingHistory}
        <!-- Skeleton loader -->
        <div class="space-y-2">
          {#each [1, 2, 3] as _}
            <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 animate-pulse">
              <div class="h-4 w-48 bg-slate-200 rounded"></div>
              <div class="h-4 w-16 bg-slate-200 rounded ml-auto"></div>
              <div class="h-4 w-24 bg-slate-200 rounded"></div>
              <div class="h-4 w-20 bg-slate-200 rounded"></div>
            </div>
          {/each}
        </div>
      {:else if backupHistory.length === 0}
        <!-- Empty state -->
        <div class="text-center py-10 bg-slate-50 rounded-xl border border-slate-100">
          <div class="text-3xl mb-2">📂</div>
          <p class="text-sm text-slate-500 font-medium">Belum ada file backup</p>
          <p class="text-[11px] text-slate-400 mt-1">Klik "Backup Sekarang" untuk membuat backup pertama</p>
        </div>
      {:else}
        <!-- Responsive: Table on desktop, Cards on mobile -->
        <!-- Desktop Table -->
        <div class="hidden sm:block overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-100">
                <th class="text-left py-2 px-3 text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Nama File</th>
                <th class="text-left py-2 px-3 text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Ukuran</th>
                <th class="text-left py-2 px-3 text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Tanggal Backup</th>
                <th class="text-right py-2 px-3 text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {#each backupHistory as file}
                <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td class="py-2.5 px-3">
                    <div class="flex items-center gap-2">
                      <span class="text-sm">🗄️</span>
                      <span class="text-xs text-slate-700 font-mono truncate max-w-[250px]" title={file.filename}>{file.filename}</span>
                    </div>
                  </td>
                  <td class="py-2.5 px-3">
                    <span class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {fmtBytes(file.sizeBytes)}
                    </span>
                  </td>
                  <td class="py-2.5 px-3">
                    <span class="text-xs text-slate-500">{fmtDate(file.createdAt)}</span>
                  </td>
                  <td class="py-2.5 px-3">
                    <div class="flex items-center justify-end gap-1.5">
                      <!-- Download -->
                      <button
                        id="btn-dl-{file.filename}"
                        on:click={() => downloadBackupFile(file.filename)}
                        disabled={downloadingFile[file.filename]}
                        class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold
                          bg-blue-50 text-blue-700 border border-blue-200
                          hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download"
                      >
                        {#if downloadingFile[file.filename]}
                          <div class="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        {:else}
                          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                          </svg>
                        {/if}
                        Unduh
                      </button>
                      <!-- Delete -->
                      <button
                        id="btn-del-{file.filename}"
                        on:click={() => deleteBackupFile(file.filename)}
                        disabled={deletingFile[file.filename]}
                        class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold
                          bg-red-50 text-red-700 border border-red-200
                          hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Hapus"
                      >
                        {#if deletingFile[file.filename]}
                          <div class="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                        {:else}
                          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        {/if}
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards -->
        <div class="sm:hidden space-y-2">
          {#each backupHistory as file}
            <div class="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-2">
              <div class="flex items-start gap-2">
                <span class="text-sm mt-0.5">🗄️</span>
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-slate-700 font-mono truncate" title={file.filename}>{file.filename}</p>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600">{fmtBytes(file.sizeBytes)}</span>
                    <span class="text-[10px] text-slate-400">{fmtDate(file.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div class="flex gap-2">
                <button
                  on:click={() => downloadBackupFile(file.filename)}
                  disabled={downloadingFile[file.filename]}
                  class="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-semibold
                    bg-blue-50 text-blue-700 border border-blue-200
                    hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  {#if downloadingFile[file.filename]}
                    <div class="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  {:else}
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                  {/if}
                  Unduh
                </button>
                <button
                  on:click={() => deleteBackupFile(file.filename)}
                  disabled={deletingFile[file.filename]}
                  class="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-semibold
                    bg-red-50 text-red-700 border border-red-200
                    hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {#if deletingFile[file.filename]}
                    <div class="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                  {:else}
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  {/if}
                  Hapus
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- ── Backup Arsip File ───────────────────────────────────────────── -->
  <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div class="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
        <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <h2 class="text-sm font-semibold text-slate-800">Backup Arsip File</h2>
        <p class="text-[11px] text-slate-400 mt-0.5">Arsip PDF dari folder uploads — dikemas dalam ZIP</p>
      </div>
      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">.ZIP</span>
    </div>

      <div class="p-5 space-y-3">
        <!-- Folder cards -->
        {#each [
          {
            key:    'final-pk',
            label:  'Final PK (Perpanjangan Kontrak)',
            icon:   '📄',
            desc:   'Dokumen final kontrak perpanjangan yang telah ditandatangani',
            bg:     'bg-blue-50',
            border: 'border-blue-100',
            badge:  'bg-blue-100 text-blue-700 border-blue-200',
          },
          {
            key:    'pensiun-sk',
            label:  'SK Pensiun',
            icon:   '🗂️',
            desc:   'Dokumen SK pensiun pegawai P3K yang telah diarsipkan',
            bg:     'bg-violet-50',
            border: 'border-violet-100',
            badge:  'bg-violet-100 text-violet-700 border-violet-200',
          },
        ] as folder}
          <div class="rounded-xl {folder.bg} border {folder.border} p-4">
            <div class="flex items-start gap-2.5 mb-3">
              <span class="text-lg">{folder.icon}</span>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-semibold text-slate-700">{folder.label}</div>
                <div class="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{folder.desc}</div>
              </div>
            </div>

            <!-- Stats -->
            {#if loadingStats}
              <div class="flex gap-3 mb-3">
                <div class="h-4 w-16 bg-slate-200 animate-pulse rounded"></div>
                <div class="h-4 w-12 bg-slate-200 animate-pulse rounded"></div>
              </div>
            {:else}
              <div class="flex items-center gap-3 mb-3">
                <span class="text-[11px] font-medium px-2 py-0.5 rounded-full {folder.badge} border">
                  {fmtNum(stats?.archive?.[folder.key]?.count ?? 0)} file
                </span>
                <span class="text-[11px] text-slate-400">
                  {fmtBytes(stats?.archive?.[folder.key]?.totalSize)}
                </span>
              </div>
            {/if}

            <!-- Per-folder button -->
            <button
              id="btn-download-{folder.key}"
              on:click={() => downloadArchive([folder.key], folder.key)}
              disabled={downloadingArchive[folder.key]}
              class="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold
                bg-white border border-slate-200 text-slate-600
                hover:bg-slate-50 hover:border-slate-300 shadow-sm
                transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {#if downloadingArchive[folder.key]}
                <div class="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                Mengunduh...
              {:else}
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                Unduh {folder.icon} saja
              {/if}
            </button>
          </div>
        {/each}

        <!-- Download ALL button -->
        <button
          id="btn-download-arsip-all"
          on:click={() => downloadArchive(['final-pk', 'pensiun-sk'], 'all')}
          disabled={downloadingAllArchive}
          class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white
            bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700
            shadow-sm hover:shadow-md transition-all duration-150
            disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
        >
          {#if downloadingAllArchive}
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Mengunduh Semua Arsip...
          {:else}
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>
            </svg>
            Unduh Semua Arsip (.zip)
          {/if}
        </button>
      </div>
    </div>

  <!-- ── Footer ──────────────────────────────────────────────────────────── -->
  <p class="text-center text-[11px] text-slate-400 pb-4">
    Backup otomatis berjalan setiap hari pukul 00:00 WITA. Lakukan juga backup manual secara berkala untuk memastikan data selalu aman.
  </p>

</div>
