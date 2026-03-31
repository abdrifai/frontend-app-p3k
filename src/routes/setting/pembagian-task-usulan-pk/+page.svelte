<script>
  import { addToast } from "$lib/toastStore";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let reports = [];
  let users = [];
  let isLoading = true;
  let isSubmitting = false;

  // Assignment states
  let assignMode = "auto"; // 'auto' or 'manual'
  let autoAmount = 10;
  let useEvenDistribution = false;
  let isAllUsersSelected = false;

  // Array to hold user selection for auto assign [{id, selected}]
  let selectedUsersForAuto = [];
  $: isAllUsersSelected = selectedUsersForAuto.length > 0 && selectedUsersForAuto.every((u) => u.selected);

  // Array for manual mode [{userId, amount}]
  let manualAssignments = [];

  // TMT Configuration states
  let activeTab = "assignment"; // 'assignment' or 'perangkatan'
  let unassignedStats = [];
  let tmtFilters = []; // array of filterValue strings
  let isLoadingStats = false;

  onMount(() => {
    if (!$authStore.isAuthenticated || $authStore.user?.role !== "admin") {
      addToast("Akses ditolak. Hanya untuk Admin.", "error");
      goto("/");
      return;
    }
    fetchReports();
    fetchUsers();
    fetchUnassignedStats();
  });

  const fetchUnassignedStats = async () => {
    isLoadingStats = true;
    try {
      const result = await apiRequest("/api/tasks-usulan/unassigned-stats");
      if (result.success) {
        unassignedStats = result.data;
      }
    } catch (err) {
      console.error(err);
    } finally {
      isLoadingStats = false;
    }
  };

  const fetchReports = async () => {
    isLoading = true;
    try {
      const result = await apiRequest("/api/tasks-usulan/report");
      if (result.success) {
        reports = result.data;
      }
    } catch (err) {
      console.error(err);
    } finally {
      isLoading = false;
    }
  };

  const fetchUsers = async () => {
    try {
      const result = await apiRequest("/api/users");
      if (result.success) {
        users = result.data.filter((u) => !u.isDeleted);
        // Initialize selected users logic
        selectedUsersForAuto = users.map((u) => ({
          id: u.id,
          selected: false,
        }));
        manualAssignments = users.map((u) => ({ userId: u.id, amount: 0 }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAutoAssign = async () => {
    const selectedIds = selectedUsersForAuto
      .filter((u) => u.selected)
      .map((u) => u.id);
    if (selectedIds.length === 0) {
      addToast("Pilih minimal 1 user", "warning");
      return;
    }

    let finalAmount = autoAmount;
    if (useEvenDistribution) {
      finalAmount = Math.ceil(totalAvailable / selectedIds.length);
      if (finalAmount <= 0) {
        addToast("Tidak ada data tersedia untuk dibagikan", "warning");
        return;
      }
    } else if (autoAmount <= 0) {
      addToast("Jumlah task harus lebih dari 0", "warning");
      return;
    }

    const totalNeeded = useEvenDistribution
      ? totalAvailable
      : selectedIds.length * autoAmount;

    if (totalNeeded > totalAvailable) {
      addToast(
        `Jumlah tugas yang akan dibagikan (${totalNeeded}) melebihi jumlah data tersedia (${totalAvailable})`,
        "warning",
      );
      return;
    }

    isSubmitting = true;
    try {
      const result = await apiRequest("/api/tasks-usulan/assign/auto", "POST", {
        userIds: selectedIds,
        amountPerUser: finalAmount,
        tmtFilters: tmtFilters,
      });
      if (result.success) {
        addToast(result.message, "success");
        fetchReports(); // refresh table
        fetchUnassignedStats(); // refresh counts
      }
    } catch (err) {
      console.error(err);
    } finally {
      isSubmitting = false;
    }
  };

  const handleManualAssign = async () => {
    const validAssignments = manualAssignments.filter((m) => m.amount > 0);
    if (validAssignments.length === 0) {
      addToast("Isi minimal 1 jumlah task untuk user", "warning");
      return;
    }

    const totalNeeded = validAssignments.reduce((sum, m) => sum + m.amount, 0);
    if (totalNeeded > totalAvailable) {
      addToast(
        `Jumlah tugas yang akan dibagikan (${totalNeeded}) melebihi jumlah data tersedia (${totalAvailable})`,
        "warning",
      );
      return;
    }

    isSubmitting = true;
    try {
      const result = await apiRequest(
        "/api/tasks-usulan/assign/manual",
        "POST",
        {
          assignments: validAssignments,
          tmtFilters: tmtFilters,
        },
      );
      if (result.success) {
        addToast(result.message, "success");
        // Reset manual
        manualAssignments = users.map((u) => ({ userId: u.id, amount: 0 }));
        fetchReports();
        fetchUnassignedStats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      isSubmitting = false;
    }
  };

  const revokeTasks = async (userId) => {
    if (
      !confirm(
        "Tarik (Unassign) sisa tugas usulan yang belum selesai dari user ini?",
      )
    )
      return;

    try {
      const result = await apiRequest(
        `/api/tasks-usulan/reset/${userId}`,
        "POST",
      );
      if (result.success) {
        addToast(result.message, "success");
        fetchReports();
        fetchUnassignedStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetAllTasks = async () => {
    if (
      !confirm(
        "Tarik SEMUA sisa tugas usulan yang belum selesai dari SELURUH user?",
      )
    )
      return;

    try {
      const result = await apiRequest("/api/tasks-usulan/reset-all", "POST");
      if (result.success) {
        addToast(result.message, "success");
        fetchReports();
        fetchUnassignedStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleAllUsers = (e) => {
    isAllUsersSelected = e.target.checked;
    selectedUsersForAuto = selectedUsersForAuto.map((u) => ({
      ...u,
      selected: isAllUsersSelected,
    }));
  };

  const toggleTmtFilter = (filterValue) => {
    if (tmtFilters.includes(filterValue)) {
      tmtFilters = tmtFilters.filter((f) => f !== filterValue);
    } else {
      tmtFilters = [...tmtFilters, filterValue];
    }
  };

  const toggleAllTmt = (active) => {
    if (active) {
      tmtFilters = unassignedStats.map((s) => s.filterValue);
    } else {
      tmtFilters = [];
    }
  };

  $: totalAvailable = unassignedStats.reduce((sum, s) => {
    if (tmtFilters.length === 0 || tmtFilters.includes(s.filterValue)) {
      return sum + s.count;
    }
    return sum;
  }, 0);

  $: selectedTmtLabels = unassignedStats
    .filter((s) => tmtFilters.includes(s.filterValue))
    .map((s) => s.label);
</script>

<svelte:head>
  <title>Task Usulan PK — App P3K</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-800">Task Usulan PK</h1>
      <p class="mt-1 text-sm text-slate-500">
        Bagikan data pegawai P3K aktif ke user untuk dibuatkan usulan
        perpanjangan kontrak.
      </p>
    </div>
  </div>

  <!-- Main Tabs -->
  <div class="flex p-1 bg-slate-100 rounded-xl w-fit">
    <button
      type="button"
      class="px-5 py-2 text-sm font-semibold rounded-lg transition-all {activeTab ===
      'assignment'
        ? 'bg-white shadow-sm text-blue-600'
        : 'text-slate-500 hover:text-slate-700'}"
      on:click={() => (activeTab = "assignment")}
    >
      <span class="flex items-center gap-2">
        <svg
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          /></svg
        >
        Pembagian Tugas
      </span>
    </button>
    <button
      type="button"
      class="px-5 py-2 text-sm font-semibold rounded-lg transition-all {activeTab ===
      'perangkatan'
        ? 'bg-white shadow-sm text-blue-600'
        : 'text-slate-500 hover:text-slate-700'}"
      on:click={() => (activeTab = "perangkatan")}
    >
      <span class="flex items-center gap-2">
        <svg
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          /></svg
        >
        Konfigurasi Perangkatan
        {#if tmtFilters.length > 0}
          <span
            class="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            >{tmtFilters.length}</span
          >
        {/if}
      </span>
    </button>
  </div>

  {#if activeTab === "assignment"}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Assignment Panel -->
      <div class="lg:col-span-1 space-y-4">
        <div class="card p-5">
          <h3 class="font-semibold text-slate-800 mb-4 border-b pb-2">
            Pengaturan Pembagian
          </h3>

          <!-- Mode Tabs -->
          <div class="flex p-1 bg-slate-100 rounded-lg mb-5">
            <button
              type="button"
              class="flex-1 py-1.5 text-sm font-medium rounded-md transition-all {assignMode ===
              'auto'
                ? 'bg-white shadow-sm text-blue-600'
                : 'text-slate-500 hover:text-slate-700'}"
              on:click={() => (assignMode = "auto")}
            >
              Otomatis
            </button>
            <button
              type="button"
              class="flex-1 py-1.5 text-sm font-medium rounded-md transition-all {assignMode ===
              'manual'
                ? 'bg-white shadow-sm text-blue-600'
                : 'text-slate-500 hover:text-slate-700'}"
              on:click={() => (assignMode = "manual")}
            >
              Manual
            </button>
          </div>

          <!-- Filter Summary -->
          {#if tmtFilters.length > 0}
            <div class="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <div class="flex items-center justify-between mb-2">
                <span
                  class="text-[10px] font-bold text-blue-600 uppercase tracking-wider"
                  >Filter Perangkatan Aktif</span
                >
                <button
                  on:click={() => toggleAllTmt(false)}
                  class="text-[10px] text-red-500 hover:underline">Hapus</button
                >
              </div>
              <div class="flex flex-wrap gap-1">
                {#each selectedTmtLabels as label}
                  <span
                    class="px-1.5 py-0.5 bg-white border border-blue-200 text-blue-700 text-[9px] font-medium rounded-md"
                    >{label}</span
                  >
                {/each}
              </div>
              <div
                class="mt-2 pt-2 border-t border-blue-100 flex justify-between items-center text-xs"
              >
                <span class="text-slate-500">Tersedia untuk dibagi:</span>
                <strong class="text-slate-700"
                  >{(totalAvailable || 0).toLocaleString("id-ID")} Data</strong
                >
              </div>
            </div>
          {:else}
            <div
              class="mb-4 gap-2 p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center text-xs"
            >
              <span class="text-slate-500 italic">Sisa Pegawai Aktif</span>
              <strong class="text-slate-700"
                >{(totalAvailable || 0).toLocaleString("id-ID")} Data</strong
              >
            </div>
          {/if}

          {#if assignMode === "auto"}
            <div class="space-y-4">
              <div
                class="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200"
              >
                <span class="text-xs font-medium text-slate-700"
                  >Mode Bagi Rata</span
                >
                <button
                  type="button"
                  on:click={() => (useEvenDistribution = !useEvenDistribution)}
                  aria-label="Toggle Mode Bagi Rata"
                  class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none {useEvenDistribution
                    ? 'bg-blue-600'
                    : 'bg-slate-200'}"
                >
                  <span
                    class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {useEvenDistribution
                      ? 'translate-x-4'
                      : 'translate-x-0'}"
                  ></span>
                </button>
              </div>

              {#if useEvenDistribution}
                <div
                  class="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-[10px] text-emerald-700"
                >
                  <p class="font-bold mb-1 italic">Mode Bagi Rata Aktif</p>
                  <p>
                    Seluruh data ({(totalAvailable || 0).toLocaleString(
                      "id-ID",
                    )}) akan dibagi habis kepada {selectedUsersForAuto.filter(
                      (u) => u.selected,
                    ).length} user terpilih.
                  </p>
                </div>
              {:else}
                <div>
                  <label
                    for="autoAmount"
                    class="block text-sm font-medium text-slate-700 mb-1.5"
                    >Jumlah Task Per User</label
                  >
                  <input
                    id="autoAmount"
                    type="number"
                    min="1"
                    bind:value={autoAmount}
                    class="input-field w-full"
                  />
                </div>
              {/if}

              <div
                class="border rounded-lg p-3 bg-slate-50 max-h-60 overflow-y-auto"
              >
                <div class="flex items-center gap-2 mb-2 pb-2 border-b">
                  <input
                    type="checkbox"
                    id="selectAllAuto"
                    bind:checked={isAllUsersSelected}
                    on:change={toggleAllUsers}
                    class="w-4 h-4 text-blue-600 rounded border-slate-300"
                  />
                  <label
                    for="selectAllAuto"
                    class="text-sm font-medium text-slate-700"
                    >Pilih Semua User</label
                  >
                </div>
                <div class="space-y-2 mt-2">
                  {#each users as user, i (user.id)}
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <input
                          type="checkbox"
                          bind:checked={selectedUsersForAuto[i].selected}
                          class="w-4 h-4 text-blue-600 rounded border-slate-300"
                        />
                        <div>
                          <p class="text-sm text-slate-700 leading-tight">
                            {user.namaLengkap || user.username}
                          </p>
                          <p class="text-[10px] text-slate-400 leading-tight">
                            {user.role}
                          </p>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>

              <button
                on:click={handleAutoAssign}
                disabled={isSubmitting}
                class="btn-primary w-full justify-center"
              >
                {#if isSubmitting}
                  <div
                    class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"
                  ></div>
                {/if}
                Bagikan Otomatis
              </button>
            </div>
          {:else}
            <div class="space-y-4">
              <p class="text-xs text-slate-500 text-center">
                Tentukan jumlah spesifik untuk tiap user
              </p>
              <div
                class="border rounded-lg p-3 bg-slate-50 max-h-80 overflow-y-auto space-y-3"
              >
                {#each users as user, i (user.id)}
                  <div
                    class="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 last:border-0 last:pb-0"
                  >
                    <div class="flex-1 truncate">
                      <p class="text-sm text-slate-700 font-medium truncate">
                        {user.namaLengkap || user.username}
                      </p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      bind:value={manualAssignments[i].amount}
                      class="input-field !py-1 !px-2 w-20 text-center"
                    />
                  </div>
                {/each}
              </div>

              <button
                on:click={handleManualAssign}
                disabled={isSubmitting}
                class="btn-primary w-full justify-center"
              >
                {#if isSubmitting}
                  <div
                    class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"
                  ></div>
                {/if}
                Bagikan Manual
              </button>
            </div>
          {/if}
        </div>
      </div>

      <!-- Report Panel -->
      <div class="lg:col-span-2">
        <div class="card overflow-hidden">
          <div
            class="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50"
          >
            <h3 class="font-semibold text-slate-800">Laporan Tugas Usulan</h3>
            <div class="flex gap-2">
              <button
                on:click={resetAllTasks}
                class="text-xs bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-md font-medium transition-all shadow-sm border border-red-100 italic"
              >
                Reset Semua
              </button>
              <button
                on:click={fetchReports}
                class="p-1.5 text-slate-400 hover:text-blue-600 bg-white rounded-md shadow-sm border border-slate-200"
                title="Refresh"
              >
                <svg
                  class="w-4 h-4"
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
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-200">
              <thead>
                <tr class="bg-white">
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase"
                    >User</th
                  >
                  <th
                    class="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase"
                    >Total Dibagi</th
                  >
                  <th
                    class="px-4 py-3 text-center text-xs font-semibold text-emerald-600 uppercase"
                    >Selesai</th
                  >
                  <th
                    class="px-4 py-3 text-center text-xs font-semibold text-amber-600 uppercase"
                    >Sisa</th
                  >
                  <th
                    class="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase"
                    >Aksi</th
                  >
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                {#if isLoading}
                  <tr>
                    <td
                      colspan="5"
                      class="px-6 py-8 text-center text-sm text-slate-400"
                      >Loading...</td
                    >
                  </tr>
                {:else if reports.length === 0}
                  <tr>
                    <td
                      colspan="5"
                      class="px-6 py-8 text-center text-sm text-slate-400"
                      >Belum ada data tugas usulan yang dibagikan</td
                    >
                  </tr>
                {:else}
                  {#each reports as r}
                    <tr class="hover:bg-slate-50/50 transition-colors">
                      <td class="px-4 py-3">
                        <p class="text-sm font-medium text-slate-800">
                          {r.namaLengkap || r.username}
                        </p>
                        <p class="text-[10px] text-slate-400">{r.role}</p>
                      </td>
                      <td
                        class="px-4 py-3 text-center text-sm font-medium text-slate-600 bg-slate-50/50"
                      >
                        {r.totalAssigned}
                      </td>
                      <td
                        class="px-4 py-3 text-center text-sm font-bold text-emerald-600"
                      >
                        {r.totalCompleted}
                      </td>
                      <td
                        class="px-4 py-3 text-center text-sm font-bold text-amber-600"
                      >
                        {r.remaining}
                      </td>
                      <td class="px-4 py-3 text-right">
                        {#if r.remaining > 0}
                          <button
                            on:click={() => revokeTasks(r.userId)}
                            class="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2.5 py-1.5 rounded-md font-medium transition-colors"
                          >
                            Tarik Sisa
                          </button>
                        {:else}
                          <span class="text-xs text-slate-400 italic"
                            >Clear</span
                          >
                        {/if}
                      </td>
                    </tr>
                  {/each}
                {/if}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  {:else if activeTab === "perangkatan"}
    <div class="space-y-4">
      <div
        class="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <h3 class="font-semibold text-slate-800">
            Konfigurasi Perangkatan (TMT)
          </h3>
          <p class="text-xs text-slate-500 mt-0.5">
            Pilih perangkatan yang akan dibagikan tugasnya. Jika tidak ada yang
            dipilih, maka akan mengambil dari seluruh perangkatan.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-500">
            <strong class="text-blue-600"
              >{(totalAvailable || 0).toLocaleString("id-ID")}</strong
            >
            / {(
              unassignedStats.reduce((s, a) => s + a.count, 0) || 0
            ).toLocaleString("id-ID")} pegawai tersedia
          </span>
          <button
            on:click={() => toggleAllTmt(true)}
            class="text-xs px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md font-medium transition-colors"
          >
            Pilih Semua
          </button>
          <button
            on:click={() => toggleAllTmt(false)}
            class="text-xs px-2.5 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md font-medium transition-colors"
          >
            Kosongkan
          </button>
        </div>
      </div>

      {#if isLoadingStats}
        <div class="card p-12 text-center text-slate-400">Loading...</div>
      {:else}
        <div
          class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"
        >
          {#each unassignedStats as s}
            {@const isActive = tmtFilters.includes(s.filterValue)}
            <button
              on:click={() => toggleTmtFilter(s.filterValue)}
              class="relative overflow-hidden group p-3 rounded-xl border transition-all text-left
                     {isActive
                ? 'border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500'
                : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'}"
            >
              <div class="relative z-10">
                <p
                  class="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1 group-hover:text-blue-400 transition-colors"
                >
                  {s.label}
                </p>
                <p
                  class="text-xl font-extrabold text-slate-700 group-hover:text-blue-600 transition-colors"
                >
                  {(s.count || 0).toLocaleString("id-ID")}
                  <span
                    class="text-xs font-medium text-slate-500 group-hover:text-blue-400 transition-colors"
                    >pegawai</span
                  >
                </p>
              </div>
              <div
                class="absolute bottom-0 right-0 w-8 h-8 -mr-2 -mb-2 bg-slate-100 rounded-full group-hover:bg-blue-100 transition-colors opacity-50"
              ></div>

              {#if isActive}
                <div class="absolute top-2 right-2">
                  <div
                    class="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm"
                  ></div>
                </div>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
