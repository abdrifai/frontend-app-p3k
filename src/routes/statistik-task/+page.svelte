<script>
  import { addToast } from "$lib/toastStore";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let peremajaanStats = [];
  let usulanStats = [];
  let isLoading = true;

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

      if (peremajaanRes.success) peremajaanStats = peremajaanRes.data;
      if (usulanRes.success) usulanStats = usulanRes.data;
    } catch (err) {
      console.error(err);
      addToast("Gagal memuat data statistik", "error");
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

    return Array.from(userMap.values());
  })();
</script>

<svelte:head>
  <title>Statistik Task — App P3K</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Laporan Statistik Task</h1>
      <p class="mt-1 text-sm text-slate-500">Monitor performa penyelesaian tugas peremajaan dan usulan kontrak per user.</p>
    </div>
    <button on:click={fetchAllStats} class="btn-secondary" disabled={isLoading}>
      {#if isLoading}
        <div class="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mr-2"></div>
      {:else}
        <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      {/if}
      Refresh Data
    </button>
  </div>

  {#if isLoading}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each Array(6) as _}
        <div class="card h-48 animate-pulse bg-slate-50 border-slate-100"></div>
      {/each}
    </div>
  {:else if combinedStats.length === 0}
    <div class="card p-12 text-center">
      <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <h3 class="text-slate-800 font-semibold">Belum Ada Data Tugas</h3>
      <p class="text-slate-500 text-sm mt-1 max-w-sm mx-auto">Silakan lakukan pembagian tugas terlebih dahulu di menu Setting untuk melihat statistik di sini.</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {#each combinedStats as user}
        <div class="card overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div class="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 class="font-bold text-slate-800">{user.namaLengkap || user.username}</h3>
                <p class="text-[10px] text-slate-500 uppercase tracking-widest font-semibold font-mono">ID: {user.id.split("-")[0]}</p>
              </div>
            </div>
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider {user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}">
              {user.role}
            </span>
          </div>
          
          <div class="p-6 grid grid-cols-2 gap-6">
            <!-- stats-peremajaan -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Task Peremajaan</span>
                <span class="text-xs font-bold {user.peremajaan.percent === 100 ? 'text-emerald-600' : 'text-blue-600'}">{user.peremajaan.percent.toFixed(0)}%</span>
              </div>
              
              <div class="relative pt-1">
                <div class="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-slate-100">
                  <div style="width:{user.peremajaan.percent}%" class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center {user.peremajaan.percent === 100 ? 'bg-emerald-500' : 'bg-blue-500'} transition-all duration-500"></div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2 text-center">
                <div class="bg-slate-50 rounded-lg p-2.5">
                  <p class="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Assigned</p>
                  <p class="text-sm font-bold text-slate-700">{user.peremajaan.assigned}</p>
                </div>
                <div class="bg-slate-50 rounded-lg p-2.5">
                  <p class="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Done</p>
                  <p class="text-sm font-bold text-emerald-600">{user.peremajaan.completed}</p>
                </div>
              </div>
            </div>

            <!-- stats-usulan -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Task Usulan PK</span>
                <span class="text-xs font-bold {user.usulan.percent === 100 ? 'text-emerald-600' : 'text-violet-600'}">{user.usulan.percent.toFixed(0)}%</span>
              </div>

              <div class="relative pt-1">
                <div class="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-slate-100">
                  <div style="width:{user.usulan.percent}%" class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center {user.usulan.percent === 100 ? 'bg-emerald-500' : 'bg-violet-500'} transition-all duration-500"></div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2 text-center">
                <div class="bg-slate-50 rounded-lg p-2.5">
                  <p class="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Assigned</p>
                  <p class="text-sm font-bold text-slate-700">{user.usulan.assigned}</p>
                </div>
                <div class="bg-slate-50 rounded-lg p-2.5">
                  <p class="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Done</p>
                  <p class="text-sm font-bold text-emerald-600">{user.usulan.completed}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
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
