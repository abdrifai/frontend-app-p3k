<script>
  import { addToast } from "$lib/toastStore";
  import { authStore, isUserAdmin } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let reports = [];
  let users = [];
  let isLoading = true;
  let isSubmitting = false;
  let kegiatan = '';       // nilai label yang terpilih / diketik
  let kegiatanId = null;   // id kegiatan terpilih

  // Combobox kegiatan
  let kegiatanList = [];
  let kegiatanSearch = '';
  let showKegiatanDropdown = false;
  let kegiatanLoading = false;
  let kegiatanDebounce;

  const fetchKegiatanList = async (q = '') => {
    kegiatanLoading = true;
    try {
      const params = new URLSearchParams({ page: '1', limit: '20' });
      if (q) params.append('search', q);
      const result = await apiRequest(`/api/kegiatan?${params.toString()}`);
      if (result.success) {
        kegiatanList = result.data?.data ?? result.data ?? [];
      }
    } catch (e) {
      console.error(e);
    } finally {
      kegiatanLoading = false;
    }
  };

  const onKegiatanInput = () => {
    kegiatanId = null;          // reset pilihan jika user mengetik manual
    showKegiatanDropdown = true;
    clearTimeout(kegiatanDebounce);
    kegiatanDebounce = setTimeout(() => fetchKegiatanList(kegiatan), 300);
  };

  const selectKegiatan = (k) => {
    kegiatan = k.label ?? k.nama;
    kegiatanId = k.id;
    showKegiatanDropdown = false;
    fetchUnassignedStats(kegiatan); // refresh stats untuk kegiatan terpilih
  };

  const clearKegiatan = () => {
    kegiatan = '';
    kegiatanId = null;
    showKegiatanDropdown = false;
    fetchUnassignedStats(''); // kembali ke hitungan umum
  };

  const closeKegiatanDropdown = () => {
    setTimeout(() => { showKegiatanDropdown = false; }, 150);
  };


  // Assignment states
  let assignMode = "auto"; // 'auto' or 'manual'
  let autoAmount = 10;
  let useEvenDistribution = false;
  let totalAvailable = 0;
  let isAllUsersSelected = false;

  // Array to hold user selection for auto assign [{id, selected}]
  let selectedUsersForAuto = [];
  $: isAllUsersSelected =
    selectedUsersForAuto.length > 0 &&
    selectedUsersForAuto.every((u) => u.selected);

  // Array for manual mode [{userId, amount}]
  let manualAssignments = [];

  // Field Builder states
  let fieldConfigs = [];
  let isLoadingFields = true;
  let isSavingFields = false;
  let activeTab = "assignment"; // 'assignment' or 'fields'

  onMount(() => {
    if (!$authStore.isAuthenticated || !isUserAdmin($authStore.user)) {
      addToast("Akses ditolak. Hanya untuk Admin.", "error");
      goto("/");
      return;
    }
    fetchReports();
    fetchUsers();
    fetchFieldConfigs();
    fetchUnassignedStats();
    fetchKegiatanList();
  });

  const fetchUnassignedStats = async (kegiatanLabel = '') => {
    try {
      const params = new URLSearchParams();
      if (kegiatanLabel) params.set('kegiatan', kegiatanLabel);
      const result = await apiRequest(`/api/tasks/unassigned-count?${params.toString()}`);
      if (result.success) {
        totalAvailable = result.data.totalAvailable;
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFieldConfigs = async () => {
    isLoadingFields = true;
    try {
      const result = await apiRequest("/api/task-field-configs");
      if (result.success) {
        fieldConfigs = result.data;
      }
    } catch (err) {
      console.error(err);
    } finally {
      isLoadingFields = false;
    }
  };

  const saveFieldConfigs = async () => {
    isSavingFields = true;
    try {
      const result = await apiRequest("/api/task-field-configs", "PUT", {
        configs: fieldConfigs.map((f) => ({
          id: f.id,
          isActive: f.isActive,
          sortOrder: f.sortOrder,
          label: f.label,
          inputType: f.inputType,
          groupName: f.groupName,
        })),
      });
      if (result.success) {
        addToast(result.message, "success");
      }
    } catch (err) {
      console.error(err);
    } finally {
      isSavingFields = false;
    }
  };

  const toggleFieldActive = (index) => {
    fieldConfigs[index].isActive = !fieldConfigs[index].isActive;
    fieldConfigs = fieldConfigs; // trigger reactivity
  };

  const toggleAllFields = (active) => {
    fieldConfigs = fieldConfigs.map((f) => ({ ...f, isActive: active }));
  };

  // Group fields by groupName for display
  $: groupedFields = fieldConfigs.reduce((acc, field) => {
    const group = field.groupName || "Lainnya";
    if (!acc[group]) acc[group] = [];
    acc[group].push(field);
    return acc;
  }, {});

  $: activeFieldCount = fieldConfigs.filter((f) => f.isActive).length;

  const fetchReports = async () => {
    isLoading = true;
    try {
      const result = await apiRequest("/api/tasks/report");
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
      const result = await apiRequest("/api/users?limit=all");
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
      const result = await apiRequest("/api/tasks/assign/auto", "POST", {
        userIds: selectedIds,
        amountPerUser: finalAmount,
        kegiatan,
      });
      if (result.success) {
        addToast(result.message, "success");
        fetchReports(); // refresh table
        fetchUnassignedStats(); // refresh remaining stats
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
      const result = await apiRequest("/api/tasks/assign/manual", "POST", {
        assignments: validAssignments,
        kegiatan,
      });
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
      !confirm("Tarik (Unassign) sisa tugas yang belum selesai dari user ini?")
    )
      return;

    try {
      const result = await apiRequest(`/api/tasks/reset/${userId}`, "POST");
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
      !confirm("Tarik SEMUA sisa tugas yang belum selesai dari SELURUH user?")
    )
      return;

    try {
      const result = await apiRequest("/api/tasks/reset-all", "POST");
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

  const groupColors = {
    Identitas: "blue",
    Kontak: "emerald",
    Kepegawaian: "violet",
    Jabatan: "amber",
    Pendidikan: "rose",
    "Unit Kerja": "teal",
    Lainnya: "slate",
  };

  const getGroupColor = (group) => groupColors[group] || "slate";
</script>

<svelte:head>
  <title>Task Peremajaan Data — App P3K</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-800">Task Peremajaan Data</h1>
      <p class="mt-1 text-sm text-slate-500">
        Bagikan data pegawai P3K aktif ke user untuk diperbarui (Peremajaan
        Data).
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
      'fields'
        ? 'bg-white shadow-sm text-blue-600'
        : 'text-slate-500 hover:text-slate-700'}"
      on:click={() => (activeTab = "fields")}
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
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          /></svg
        >
        Konfigurasi Field
        {#if activeFieldCount > 0}
          <span
            class="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            >{activeFieldCount}</span
          >
        {/if}
      </span>
    </button>
  </div>

  <!-- TAB: Assignment -->
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

          <div class="mb-4 gap-2 p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center text-xs">
            <span class="text-slate-500 italic">
              {#if kegiatan}
                Sisa untuk kegiatan <strong class="text-violet-600">{kegiatan}</strong>
              {:else}
                Total Pegawai P3K Aktif
              {/if}
            </span>
            <strong class="text-slate-700">{(totalAvailable || 0).toLocaleString("id-ID")} Pegawai</strong>
          </div>
          <div class="mb-4">
            <div class="flex items-center justify-between mb-1.5">
              <label for="kegiatan-input" class="block text-sm font-medium text-slate-700">
                Kegiatan
              </label>
              <a
                href="/setting/kegiatan"
                class="text-[10px] text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
              >
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Kelola
              </a>
            </div>

            <!-- Combobox wrapper -->
            <div class="relative">
              <div class="relative">
                <!-- Search icon / selected indicator -->
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {#if kegiatanId}
                    <div class="w-2 h-2 rounded-full bg-violet-500"></div>
                  {:else}
                    <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                  {/if}
                </div>

                <input
                  id="kegiatan-input"
                  type="text"
                  bind:value={kegiatan}
                  on:input={onKegiatanInput}
                  on:focus={() => { showKegiatanDropdown = true; fetchKegiatanList(kegiatan); }}
                  on:blur={closeKegiatanDropdown}
                  placeholder="Cari atau pilih kegiatan..."
                  class="input-field w-full pl-8 pr-8"
                  autocomplete="off"
                />

                <!-- Clear button -->
                {#if kegiatan}
                  <button
                    type="button"
                    on:click={clearKegiatan}
                    class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-300 hover:text-slate-500 transition-colors"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                {/if}
              </div>

              <!-- Dropdown -->
              {#if showKegiatanDropdown}
                <div class="absolute z-30 w-full mt-1 bg-white rounded-lg shadow-xl shadow-slate-200/60 border border-slate-200 overflow-hidden">
                  {#if kegiatanLoading}
                    <div class="px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                      <div class="w-3.5 h-3.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
                      Memuat...
                    </div>
                  {:else if kegiatanList.length === 0}
                    <div class="px-4 py-3 text-xs text-slate-400">
                      {kegiatan ? `Tidak ada hasil untuk "${kegiatan}"` : 'Belum ada kegiatan tersedia.'}
                    </div>
                  {:else}
                    <ul class="max-h-48 overflow-y-auto py-1">
                      {#each kegiatanList as k}
                        <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
                        <li
                          role="option"
                          aria-selected={kegiatanId === k.id}
                          on:mousedown={() => selectKegiatan(k)}
                          class="flex items-center gap-2.5 px-3 py-2.5 text-sm cursor-pointer transition-colors
                            {kegiatanId === k.id
                              ? 'bg-violet-50 text-violet-700 font-medium'
                              : 'text-slate-700 hover:bg-slate-50'}"
                        >
                          <div class="w-1.5 h-1.5 rounded-full flex-shrink-0
                            {kegiatanId === k.id ? 'bg-violet-500' : 'bg-slate-300'}">
                          </div>
                          {k.label ?? k.nama}
                          {#if kegiatanId === k.id}
                            <svg class="w-3.5 h-3.5 ml-auto text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                            </svg>
                          {/if}
                        </li>
                      {/each}
                    </ul>
                  {/if}
                </div>
              {/if}
            </div>

            <!-- Selected badge -->
            {#if kegiatanId}
              <div class="mt-1.5 flex items-center gap-1.5 text-[10px] text-violet-600">
                <div class="w-1.5 h-1.5 rounded-full bg-violet-400"></div>
                Kegiatan terpilih: <strong>{kegiatan}</strong>
              </div>
            {/if}
          </div>


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
            <h3 class="font-semibold text-slate-800">Laporan Tugas</h3>
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
                      >Belum ada data tugas yang dibagikan</td
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

    <!-- TAB: Field Builder -->
  {:else if activeTab === "fields"}
    <div class="space-y-4">
      <!-- Header bar -->
      <div
        class="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <h3 class="font-semibold text-slate-800">
            Konfigurasi Field Peremajaan
          </h3>
          <p class="text-xs text-slate-500 mt-0.5">
            Pilih field yang harus dikerjakan user saat menyelesaikan tugas
            peremajaan.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-500">
            <strong class="text-blue-600">{activeFieldCount}</strong> / {fieldConfigs.length}
            field aktif
          </span>
          <button
            on:click={() => toggleAllFields(true)}
            class="text-xs px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md font-medium transition-colors"
          >
            Aktifkan Semua
          </button>
          <button
            on:click={() => toggleAllFields(false)}
            class="text-xs px-2.5 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md font-medium transition-colors"
          >
            Nonaktifkan Semua
          </button>
        </div>
      </div>

      {#if isLoadingFields}
        <div class="card p-12 text-center">
          <div
            class="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"
          ></div>
          <p class="text-sm text-slate-500">Memuat konfigurasi...</p>
        </div>
      {:else}
        <!-- Group cards -->
        {#each Object.entries(groupedFields) as [group, fields]}
          {@const color = getGroupColor(group)}
          {@const activeCount = fields.filter((f) => f.isActive).length}
          <div class="card overflow-hidden">
            <div
              class="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between"
            >
              <div class="flex items-center gap-2.5">
                <div class="w-2.5 h-2.5 rounded-full bg-{color}-500"></div>
                <h4 class="font-semibold text-slate-700 text-sm">{group}</h4>
                <span
                  class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-{color}-100 text-{color}-700"
                >
                  {activeCount}/{fields.length}
                </span>
              </div>
            </div>
            <div class="divide-y divide-slate-50">
              {#each fields as field, i}
                {@const globalIndex = fieldConfigs.findIndex(
                  (f) => f.id === field.id,
                )}
                <div
                  class="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors {field.isActive
                    ? ''
                    : 'opacity-60'}"
                >
                  <div class="flex items-center gap-3 flex-1 min-w-0">
                    <!-- svelte-ignore a11y_consider_explicit_label -->
                    <button
                      type="button"
                      on:click={() => toggleFieldActive(globalIndex)}
                      class="relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 {field.isActive
                        ? 'bg-blue-600'
                        : 'bg-slate-300'}"
                    >
                      <span
                        class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 {field.isActive
                          ? 'translate-x-5'
                          : 'translate-x-0'}"
                      ></span>
                    </button>
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-slate-800 truncate">
                        {field.label}
                      </p>
                      <p class="text-[10px] text-slate-400 font-mono">
                        {field.fieldName}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <span
                      class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium capitalize"
                      >{field.inputType}</span
                    >
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}

        <!-- Save Button -->
        <div class="flex justify-end sticky bottom-4">
          <button
            on:click={saveFieldConfigs}
            disabled={isSavingFields}
            class="btn-primary shadow-lg shadow-blue-600/20 px-8"
          >
            {#if isSavingFields}
              <div
                class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"
              ></div>
              Menyimpan...
            {:else}
              <svg
                class="w-4 h-4 mr-2"
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
              Simpan Konfigurasi
            {/if}
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>
