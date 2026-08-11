<script>
  import { onMount } from 'svelte';
  import { goto }    from '$app/navigation';
  import { authStore }  from '$lib/store';
  import { addToast }   from '$lib/toastStore';

  // ── State ──────────────────────────────────────────────────────────────
  let stats         = null;
  let loadingStats  = true;

  let downloadingSql        = false;
  let downloadingArchive    = {};   // { 'final-pk': bool, 'pension-sk': bool }
  let downloadingAllArchive = false;

  const today = () => new Date().toISOString().slice(0, 10);
  const fmtBytes = (b) => {
    if (!b) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0; let n = b;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(1)} ${units[i]}`;
  };
  const fmtNum = (n) => (n ?? 0).toLocaleString('id-ID');

  // ── Lifecycle ──────────────────────────────────────────────────────────
  onMount(async () => {
    if (!$authStore.isAuthenticated || $authStore.user?.role !== 'admin') {
      addToast('Akses ditolak. Hanya untuk Admin.', 'error');
      goto('/');
      return;
    }
    await fetchStats();
  });

  async function fetchStats() {
    loadingStats = true;
    try {
      const res  = await fetch('/api/backup/stats', { credentials: 'include' });
      const json = await res.json();
      if (json.success) stats = json.data;
    } catch (e) {
      console.error(e);
    } finally {
      loadingStats = false;
    }
  }

  // ── Download SQL ───────────────────────────────────────────────────────
  async function downloadSql() {
    downloadingSql = true;
    try {
      const res = await fetch('/api/backup/sql', { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      triggerDownload(await res.blob(), `backup_db_p3k_${today()}.sql`);
      addToast('Backup database SQL berhasil diunduh!', 'success');
    } catch (e) {
      addToast('Gagal mengunduh SQL: ' + e.message, 'error');
    } finally {
      downloadingSql = false;
    }
  }

  // ── Download Archive ZIP ───────────────────────────────────────────────
  async function downloadArchive(folders, labelKey) {
    if (labelKey === 'all') downloadingAllArchive = true;
    else downloadingArchive = { ...downloadingArchive, [labelKey]: true };

    try {
      const res = await fetch('/api/backup/archive', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folders }),
      });
      if (!res.ok) throw new Error(await res.text());
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
      on:click={fetchStats}
      class="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-sm
             text-slate-600 text-sm hover:bg-slate-50 transition-colors self-start sm:self-auto"
    >
      <svg class="w-4 h-4 {loadingStats ? 'animate-spin' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

  <!-- ── Main Grid ───────────────────────────────────────────────────────── -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

    <!-- ── Backup Database SQL ─────────────────────────────────────────── -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-sm font-semibold text-slate-800">Backup Database</h2>
          <p class="text-[11px] text-slate-400 mt-0.5">Dump penuh via mysqldump — siap restore</p>
        </div>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">.SQL</span>
      </div>

      <div class="p-5 space-y-4">
        <!-- Info rows -->
        <div class="space-y-2.5 bg-slate-50 rounded-xl p-4 border border-slate-100">
          {#each [
            { icon: '🗄️', label: 'Format',  value: 'MySQL / MariaDB SQL Dump' },
            { icon: '🔄', label: 'Restore', value: 'mysql -u root -p db < file.sql' },
            { icon: '🔒', label: 'Konten',  value: 'Seluruh tabel + struktur + data' },
            { icon: '⚡', label: 'Opsi',    value: '--single-transaction, --add-drop-table' },
          ] as row}
            <div class="flex items-start gap-2.5">
              <span class="text-sm mt-0.5">{row.icon}</span>
              <div>
                <span class="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{row.label}</span>
                <p class="text-xs text-slate-600 font-mono leading-tight">{row.value}</p>
              </div>
            </div>
          {/each}
        </div>

        <!-- Warning -->
        <div class="flex gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-100">
          <svg class="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <p class="text-[11px] text-amber-700 leading-relaxed">
            File ini mengandung seluruh data sensitif. Simpan di tempat aman dan jangan dibagikan.
          </p>
        </div>

        <!-- Download button -->
        <button
          id="btn-download-sql"
          on:click={downloadSql}
          disabled={downloadingSql}
          class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white
            bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700
            shadow-sm hover:shadow-md transition-all duration-150
            disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
        >
          {#if downloadingSql}
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Mengunduh SQL...
          {:else}
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Unduh Database (.sql)
          {/if}
        </button>
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
            key:    'pension-sk',
            label:  'Pension SK (SK Pensiun)',
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
          on:click={() => downloadArchive(['final-pk', 'pension-sk'], 'all')}
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

  </div>

  <!-- ── Footer ──────────────────────────────────────────────────────────── -->
  <p class="text-center text-[11px] text-slate-400 pb-4">
    Lakukan backup secara berkala setiap minggu untuk memastikan data selalu aman.
  </p>

</div>
