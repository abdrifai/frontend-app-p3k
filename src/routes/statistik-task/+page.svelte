<script>
  import { addToast } from "$lib/toastStore";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let peremajaanStats = [];
  let usulanStats = [];
  let isLoading = true;
  let searchTerm = "";

  onMount(async () => {
    if (!$authStore.isAuthenticated) {
      addToast("Silakan login terlebih dahulu untuk mengakses menu ini.", "error");
      goto("/login");
      return;
    }
    await fetchAllStats();
  });

  async function fetchAllStats() {
    isLoading = true;
    try {
      const [peremajaanRes, usulanRes] = await Promise.all([
        apiRequest("/api/tasks/report"),
        apiRequest("/api/tasks-usulan/report"),
      ]);

      if (peremajaanRes && peremajaanRes.success) peremajaanStats = peremajaanRes.data || [];
      if (usulanRes && usulanRes.success) usulanStats = usulanRes.data || [];
    } catch (err) {
      console.error(err);
    } finally {
      isLoading = false;
    }
  }

  // Combine data by userId
  $: combinedStats = (() => {
    const userMap = new Map();

    peremajaanStats.forEach((s) => {
      userMap.set(s.userId, {
        id: s.userId,
        username: s.username,
        namaLengkap: s.namaLengkap,
        peremajaan: {
          assigned: s.totalAssigned,
          completed: s.totalCompleted,
          percent: s.totalAssigned > 0 ? (s.totalCompleted / s.totalAssigned) * 100 : 0
        },
        usulan: { assigned: 0, completed: 0, percent: 0 }
      });
    });

    usulanStats.forEach((s) => {
      if (userMap.has(s.userId)) {
        const existing = userMap.get(s.userId);
        existing.usulan = {
          assigned: s.totalAssigned,
          completed: s.totalCompleted,
          percent: s.totalAssigned > 0 ? (s.totalCompleted / s.totalAssigned) * 100 : 0
        };
      } else {
        userMap.set(s.userId, {
          id: s.userId,
          username: s.username,
          namaLengkap: s.namaLengkap,
          peremajaan: { assigned: 0, completed: 0, percent: 0 },
          usulan: {
            assigned: s.totalAssigned,
            completed: s.totalCompleted,
            percent: s.totalAssigned > 0 ? (s.totalCompleted / s.totalAssigned) * 100 : 0
          }
        });
      }
    });

    return Array.from(userMap.values()).map((u) => {
      const totalAssigned = u.peremajaan.assigned + u.usulan.assigned;
      const totalCompleted = u.peremajaan.completed + u.usulan.completed;
      const totalPercent = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0;
      return {
        ...u,
        totalAssigned,
        totalCompleted,
        totalPercent
      };
    });
  })();

  // Filtered stats by search term
  $: filteredStats = combinedStats.filter((u) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (u.namaLengkap || "").toLowerCase().includes(term) ||
      (u.username || "").toLowerCase().includes(term)
    );
  });

  // Calculate Summary Metrics
  $: totalPeremajaanAssigned = filteredStats.reduce((sum, u) => sum + u.peremajaan.assigned, 0);
  $: totalPeremajaanCompleted = filteredStats.reduce((sum, u) => sum + u.peremajaan.completed, 0);
  $: peremajaanPercentTotal = totalPeremajaanAssigned > 0 ? (totalPeremajaanCompleted / totalPeremajaanAssigned) * 100 : 0;

  $: totalUsulanAssigned = filteredStats.reduce((sum, u) => sum + u.usulan.assigned, 0);
  $: totalUsulanCompleted = filteredStats.reduce((sum, u) => sum + u.usulan.completed, 0);
  $: usulanPercentTotal = totalUsulanAssigned > 0 ? (totalUsulanCompleted / totalUsulanAssigned) * 100 : 0;

  $: grandTotalAssigned = totalPeremajaanAssigned + totalUsulanAssigned;
  $: grandTotalCompleted = totalPeremajaanCompleted + totalUsulanCompleted;
  $: grandTotalPercent = grandTotalAssigned > 0 ? (grandTotalCompleted / grandTotalAssigned) * 100 : 0;
</script>

<svelte:head>
  <title>Laporan Statistik Task — App P3K</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <!-- Header Title & Action -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Laporan Statistik Task Operator</h1>
      <p class="mt-1 text-sm text-slate-500">Tabel monitoring performa penyelesaian tugas peremajaan data & usulan perpanjangan PK per operator.</p>
    </div>
    <button on:click={fetchAllStats} class="btn-secondary" disabled={isLoading}>
      {#if isLoading}
        <div class="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mr-2"></div>
      {:else}
        <svg class="w-4 h-4 mr-2 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      {/if}
      Refresh Data
    </button>
  </div>

  <!-- Metric Overview Summary Cards -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <!-- Total Operators -->
    <div class="card p-5 flex items-center justify-between">
      <div>
        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Operator</p>
        <h3 class="text-2xl font-black text-slate-800 mt-1">{filteredStats.length}</h3>
        <p class="text-[11px] text-slate-500 mt-0.5">Petugas penanganan task</p>
      </div>
      <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </div>
    </div>

    <!-- Task Peremajaan -->
    <div class="card p-5 flex items-center justify-between">
      <div>
        <p class="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Task Peremajaan</p>
        <h3 class="text-2xl font-black text-slate-800 mt-1">{totalPeremajaanCompleted} <span class="text-xs font-semibold text-slate-400">/ {totalPeremajaanAssigned}</span></h3>
        <p class="text-[11px] text-emerald-600 font-bold mt-0.5">{peremajaanPercentTotal.toFixed(0)}% Selesai</p>
      </div>
      <div class="w-12 h-12 rounded-xl bg-blue-50/80 flex items-center justify-center text-blue-600">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </div>
    </div>

    <!-- Task Usulan PK -->
    <div class="card p-5 flex items-center justify-between">
      <div>
        <p class="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Task Usulan PK</p>
        <h3 class="text-2xl font-black text-slate-800 mt-1">{totalUsulanCompleted} <span class="text-xs font-semibold text-slate-400">/ {totalUsulanAssigned}</span></h3>
        <p class="text-[11px] text-emerald-600 font-bold mt-0.5">{usulanPercentTotal.toFixed(0)}% Selesai</p>
      </div>
      <div class="w-12 h-12 rounded-xl bg-indigo-50/80 flex items-center justify-center text-indigo-600">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    </div>

    <!-- Grand Total Progress -->
    <div class="card p-5 flex items-center justify-between">
      <div>
        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Grand Total Progres</p>
        <h3 class="text-2xl font-black text-emerald-600 mt-1">{grandTotalPercent.toFixed(0)}%</h3>
        <p class="text-[11px] text-slate-500 mt-0.5">{grandTotalCompleted} dari {grandTotalAssigned} Task</p>
      </div>
      <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </div>
  </div>

  <!-- Search Filter Bar -->
  <div class="card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
    <div class="relative w-full sm:w-80">
      <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        bind:value={searchTerm}
        placeholder="Cari nama operator / username..."
        class="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
    {#if searchTerm}
      <button on:click={() => (searchTerm = "")} class="text-xs font-semibold text-rose-600 hover:text-rose-700">
        Reset Pencarian
      </button>
    {/if}
  </div>

  <!-- Table View -->
  <div class="card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse min-w-[900px]">
        <thead>
          <tr class="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <th rowspan="2" class="py-3.5 px-4 text-center border-r border-slate-200 w-12">No</th>
            <th rowspan="2" class="py-3.5 px-4 border-r border-slate-200">Operator / Petugas</th>
            <th colspan="3" class="py-2.5 px-4 text-center border-r border-slate-200 bg-blue-50/60 text-blue-800">Task Peremajaan Data</th>
            <th colspan="3" class="py-2.5 px-4 text-center border-r border-slate-200 bg-indigo-50/60 text-indigo-800">Task Usulan PK</th>
            <th colspan="3" class="py-2.5 px-4 text-center bg-slate-100/70 text-slate-800">Total Keseluruhan</th>
          </tr>
          <tr class="bg-slate-50/90 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <!-- Peremajaan sub-headers -->
            <th class="py-2 px-3 text-center bg-blue-50/30">Assigned</th>
            <th class="py-2 px-3 text-center bg-blue-50/30">Selesai</th>
            <th class="py-2 px-3 text-center border-r border-slate-200 bg-blue-50/30">Progres</th>
            <!-- Usulan sub-headers -->
            <th class="py-2 px-3 text-center bg-indigo-50/30">Assigned</th>
            <th class="py-2 px-3 text-center bg-indigo-50/30">Selesai</th>
            <th class="py-2 px-3 text-center border-r border-slate-200 bg-indigo-50/30">Progres</th>
            <!-- Total sub-headers -->
            <th class="py-2 px-3 text-center bg-slate-50">Assigned</th>
            <th class="py-2 px-3 text-center bg-slate-50">Selesai</th>
            <th class="py-2 px-3 text-center min-w-[140px] bg-slate-50">Progres Total</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 text-xs">
          {#if isLoading}
            <tr>
              <td colspan="11" class="py-16 text-center">
                <div class="flex flex-col items-center gap-3">
                  <div class="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span class="text-xs text-slate-400 font-medium">Memuat data statistik task...</span>
                </div>
              </td>
            </tr>
          {:else if filteredStats.length === 0}
            <tr>
              <td colspan="11" class="py-16 text-center">
                <div class="flex flex-col items-center gap-2">
                  <div class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <span class="text-slate-500 font-bold">Tidak ada data statistik ditemukan.</span>
                  <span class="text-xs text-slate-400">Pastikan pembagian task sudah dikonfigurasi pada menu Setting.</span>
                </div>
              </td>
            </tr>
          {:else}
            {#each filteredStats as user, i}
              <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="py-3.5 px-4 text-center font-mono text-slate-400 border-r border-slate-100">{i + 1}</td>
                <td class="py-3.5 px-4 border-r border-slate-100">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p class="font-bold text-slate-800">{user.namaLengkap || user.username}</p>
                      <p class="text-[10px] text-slate-400 font-mono">@{user.username}</p>
                    </div>
                  </div>
                </td>
                <!-- Peremajaan -->
                <td class="py-3.5 px-3 text-center font-semibold text-slate-700">{user.peremajaan.assigned}</td>
                <td class="py-3.5 px-3 text-center font-bold text-emerald-600">{user.peremajaan.completed}</td>
                <td class="py-3.5 px-3 text-center font-bold border-r border-slate-100 text-blue-600">{user.peremajaan.percent.toFixed(0)}%</td>
                <!-- Usulan -->
                <td class="py-3.5 px-3 text-center font-semibold text-slate-700">{user.usulan.assigned}</td>
                <td class="py-3.5 px-3 text-center font-bold text-emerald-600">{user.usulan.completed}</td>
                <td class="py-3.5 px-3 text-center font-bold border-r border-slate-100 text-indigo-600">{user.usulan.percent.toFixed(0)}%</td>
                <!-- Total -->
                <td class="py-3.5 px-3 text-center font-bold text-slate-800">{user.totalAssigned}</td>
                <td class="py-3.5 px-3 text-center font-bold text-emerald-600">{user.totalCompleted}</td>
                <td class="py-3.5 px-4">
                  <div class="space-y-1">
                    <div class="flex justify-between items-center text-[10px] font-bold">
                      <span class="text-slate-500">{user.totalCompleted} / {user.totalAssigned}</span>
                      <span class="{user.totalPercent === 100 ? 'text-emerald-600' : 'text-blue-600'}">{user.totalPercent.toFixed(0)}%</span>
                    </div>
                    <div class="overflow-hidden h-1.5 rounded-full bg-slate-100">
                      <div
                        style="width: {user.totalPercent}%"
                        class="h-full rounded-full transition-all duration-500 {user.totalPercent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}"
                      ></div>
                    </div>
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
        {#if !isLoading && filteredStats.length > 0}
          <tfoot class="bg-slate-100/90 font-bold border-t-2 border-slate-200 text-xs">
            <tr>
              <td colspan="2" class="py-3.5 px-4 text-slate-800 border-r border-slate-200 uppercase tracking-wider text-[11px]">Total Keseluruhan ({filteredStats.length} Operator)</td>
              <td class="py-3.5 px-3 text-center text-slate-800">{totalPeremajaanAssigned}</td>
              <td class="py-3.5 px-3 text-center text-emerald-700">{totalPeremajaanCompleted}</td>
              <td class="py-3.5 px-3 text-center border-r border-slate-200 text-blue-700">{peremajaanPercentTotal.toFixed(0)}%</td>
              <td class="py-3.5 px-3 text-center text-slate-800">{totalUsulanAssigned}</td>
              <td class="py-3.5 px-3 text-center text-emerald-700">{totalUsulanCompleted}</td>
              <td class="py-3.5 px-3 text-center border-r border-slate-200 text-indigo-700">{usulanPercentTotal.toFixed(0)}%</td>
              <td class="py-3.5 px-3 text-center text-slate-900">{grandTotalAssigned}</td>
              <td class="py-3.5 px-3 text-center text-emerald-700">{grandTotalCompleted}</td>
              <td class="py-3.5 px-4">
                <div class="flex justify-between items-center text-[11px] font-extrabold text-blue-800">
                  <span>{grandTotalPercent.toFixed(0)}% Selesai</span>
                </div>
              </td>
            </tr>
          </tfoot>
        {/if}
      </table>
    </div>
  </div>
</div>

<style>
  .btn-secondary {
    @apply inline-flex items-center justify-center px-4 py-2 border border-slate-200 
           text-sm font-semibold rounded-lg text-slate-600 bg-white 
           hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 
           transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed;
  }
  .card {
    @apply bg-white rounded-2xl border border-slate-200/60 shadow-sm;
  }
</style>
