<script>
  import { addToast } from "$lib/toastStore";
  import { authStore } from "$lib/store";
  import { apiRequest, API_BASE_URL } from "$lib/api";
  import { onMount, tick } from "svelte";
  import { goto } from "$app/navigation";

  let records = [];
  let isLoading = true;
  let meta = {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  };

  let selectedTask = null;
  let showEditModal = false;
  let isSubmitting = false;
  let editForm = {};
  let selectedFileSkCpns = null;

  // Element references for fast keyboard focus management
  let submitBtnEl = null;
  let kerjakanBtnEls = [];

  // Active field configs from backend
  let activeFields = [];
  let isLoadingFields = false;

  // Search logic for Unor Induk (for 'search' type fields)
  let searchTerms = {};
  let searchResults = {};
  let isSearching = {};
  let showDropdown = {};
  let searchTimeouts = {};

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login untuk mengakses halaman ini", "error");
      goto("/login");
      return;
    }
    fetchMyTasks();
    fetchActiveFields();
  });

  const fetchActiveFields = async () => {
    isLoadingFields = true;
    try {
      const result = await apiRequest("/api/task-field-configs?activeOnly=true");
      if (result.success) {
        activeFields = result.data;
      }
    } catch (err) {
      console.error(err);
    } finally {
      isLoadingFields = false;
    }
  };

  const fetchMyTasks = async (page = 1) => {
    isLoading = true;
    try {
      const result = await apiRequest(
        `/api/tasks/my-tasks?page=${page}&limit=${meta.limit}`,
      );
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

  const handleSearchField = (fieldName, e) => {
    const value = e.target.value;
    searchTerms[fieldName] = value;
    editForm[fieldName] = null;

    if (searchTimeouts[fieldName]) clearTimeout(searchTimeouts[fieldName]);

    if (value.trim().length < 2) {
      searchResults[fieldName] = [];
      showDropdown[fieldName] = false;
      return;
    }

    searchTimeouts[fieldName] = setTimeout(async () => {
      isSearching[fieldName] = true;
      try {
        const result = await apiRequest(
          `/api/v1/ref-unor?search=${encodeURIComponent(value)}&limit=10`,
        );
        if (result.success) {
          searchResults[fieldName] = result.data;
          showDropdown[fieldName] = true;
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        isSearching[fieldName] = false;
      }
    }, 300);
  };

  const selectSearchResult = (fieldName, id, nama) => {
    editForm[fieldName] = id;
    searchTerms[fieldName] = nama;
    showDropdown[fieldName] = false;
  };

  const openEditModal = async (task) => {
    selectedTask = task;
    // Initialize form from existing data
    editForm = {};
    searchTerms = {};
    searchResults = {};
    isSearching = {};
    showDropdown = {};
    selectedFileSkCpns = null;

    for (const field of activeFields) {
      if (field.inputType === "search" && field.fieldName === "unorIndukId") {
        editForm[field.fieldName] = task.dataP3k?.unorIndukId || "";
        searchTerms[field.fieldName] = task.dataP3k?.unorInduk?.nama || "";
      } else {
        editForm[field.fieldName] = task.dataP3k?.[field.fieldName] || "";
      }
    }
    showEditModal = true;

    // Immediately focus on 'Selesaikan Tugas' submit button for fast Enter workflow
    await tick();
    setTimeout(() => {
      if (submitBtnEl) submitBtnEl.focus();
    }, 50);
  };

  const closeEditModal = async (restoreFocus = true) => {
    showEditModal = false;
    selectedTask = null;
    searchTerms = {};
    searchResults = {};
    showDropdown = {};
    selectedFileSkCpns = null;

    if (restoreFocus) {
      await tick();
      setTimeout(() => {
        if (kerjakanBtnEls && kerjakanBtnEls[0]) {
          kerjakanBtnEls[0].focus();
        }
      }, 50);
    }
  };

  const handleFileSkCpnsChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        addToast("Hanya file PDF yang diperbolehkan!", "warning");
        e.target.value = "";
        selectedFileSkCpns = null;
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        addToast("Ukuran file maksimal 10MB", "warning");
        e.target.value = "";
        selectedFileSkCpns = null;
        return;
      }
      selectedFileSkCpns = file;
    } else {
      selectedFileSkCpns = null;
    }
  };

  const handleCompleteTask = async (e) => {
    e.preventDefault();

    // 1. Validation for search fields
    for (const field of activeFields) {
      if (field.inputType === "search" && !editForm[field.fieldName]) {
        addToast(`Silakan pilih ${field.label} dari referensi`, "warning");
        return;
      }
    }

    // 2. Validation for nomorSkCpns & SK CPNS Document upload (if active)
    const isNomorSkCpnsActive = activeFields.some(f => f.fieldName === "nomorSkCpns");
    if (isNomorSkCpnsActive) {
      const nomorVal = editForm.nomorSkCpns ? String(editForm.nomorSkCpns).trim() : "";
      if (!nomorVal) {
        addToast("Nomor SK CPNS wajib diisi sebelum data disimpan!", "warning");
        return;
      }

      const hasExistingFile = !!selectedTask?.dataP3k?.arsipSkCpns?.fileUrl;
      if (!selectedFileSkCpns && !hasExistingFile) {
        addToast("Dokumen berkas SK CPNS (PDF) wajib diunggah sebelum data disimpan!", "warning");
        return;
      }
    }

    isSubmitting = true;
    try {
      let bodyPayload;
      let isForm = false;

      if (selectedFileSkCpns) {
        isForm = true;
        bodyPayload = new FormData();
        for (const [k, v] of Object.entries(editForm)) {
          if (v !== null && v !== undefined) {
            bodyPayload.append(k, v);
          }
        }
        bodyPayload.append("fileSkCpns", selectedFileSkCpns);
      } else {
        bodyPayload = editForm;
        isForm = false;
      }

      const result = await apiRequest(
        `/api/tasks/${selectedTask.id}/complete`,
        "PUT",
        bodyPayload,
        isForm
      );
      if (result.success) {
        addToast("Tugas berhasil diselesaikan!", "success");
        await closeEditModal(false);
        await fetchMyTasks(meta.page);
        
        // Immediately move focus back to the top 'Kerjakan' button for fast Enter workflow
        await tick();
        setTimeout(() => {
          if (kerjakanBtnEls && kerjakanBtnEls[0]) {
            kerjakanBtnEls[0].focus();
          }
        }, 50);
      }
    } catch (error) {
      console.error("Complete task error:", error);
    } finally {
      isSubmitting = false;
    }
  };

  // Responsive modal size
  $: isLargeModal = activeFields.length > 5;

  // Group active fields by groupName
  $: groupedActiveFields = activeFields.reduce((acc, field) => {
    const group = field.groupName || "Lainnya";
    if (!acc[group]) acc[group] = [];
    acc[group].push(field);
    return acc;
  }, {});
</script>

<svelte:head>
  <title>Task User (Usul Peremajaan) — App P3K</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <!-- Page Header -->
  <div
    class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-lg text-white"
  >
    <div>
      <h1 class="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
        My Tasks
      </h1>
      <p
        class="text-blue-100 text-sm sm:text-base max-w-xl leading-relaxed opacity-90"
      >
        Data pegawai P3K yang ditugaskan kepada Anda untuk dilengkapi atau
        divalidasi.
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
        Daftar Tugas Anda
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
              >NIP & Nama</th
            >
            <th
              class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase"
              >Kontak</th
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
              <td colspan="4" class="px-6 py-12 text-center text-slate-500">
                <div
                  class="flex flex-col items-center justify-center space-y-3"
                >
                  <div
                    class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"
                  ></div>
                  <p class="text-sm font-medium">Memuat tugas...</p>
                </div>
              </td>
            </tr>
          {:else if records.length === 0}
            <tr>
              <td colspan="4" class="px-6 py-16 text-center text-slate-500">
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
                    Hore! Tidak ada tugas tersisa.
                  </p>
                  <p class="text-sm text-slate-400 mt-1">
                    Anda telah menyelesaikan semua pekerjaan.
                  </p>
                </div>
              </td>
            </tr>
          {:else}
            {#each records as task, i}
              <tr class="hover:bg-slate-50 transition-colors group">
                <td
                  class="px-4 py-4 whitespace-nowrap text-sm text-slate-400 font-mono"
                  >{(meta.page - 1) * meta.limit + i + 1}</td
                >
                <td class="px-4 py-4 whitespace-nowrap">
                  <div class="text-sm font-semibold text-slate-800">
                    {task.dataP3k?.nama}
                    {task.dataP3k?.gelarBelakang
                      ? ", " + task.dataP3k?.gelarBelakang
                      : ""}
                  </div>
                  <div class="text-xs text-slate-500 font-mono mt-0.5">
                    {task.dataP3k?.nipBaru}
                  </div>
                </td>
                <td class="px-4 py-4 whitespace-nowrap">
                  <div class="text-sm text-slate-600 flex items-center gap-1.5">
                    <svg
                      class="w-3.5 h-3.5 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      /></svg
                    >
                    {task.dataP3k?.nomorHp || "-"}
                  </div>
                  <div
                    class="text-xs text-slate-400 flex items-center gap-1.5 mt-1"
                  >
                    <svg
                      class="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      /></svg
                    >
                    {task.dataP3k?.email || "-"}
                  </div>
                </td>
                <td
                  class="px-4 py-4 whitespace-nowrap text-center text-sm font-medium"
                >
                  <button
                    bind:this={kerjakanBtnEls[i]}
                    on:click={() => openEditModal(task)}
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-md transition-all duration-200 focus:ring-4 focus:ring-indigo-300 focus:outline-none"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      /></svg
                    >
                    Kerjakan
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

<!-- Edit & Complete Task Modal -->
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
        on:click={closeEditModal}
      ></button>

      <div
        class="relative bg-white rounded-2xl shadow-xl w-full z-10 overflow-hidden {isLargeModal ? 'max-w-5xl' : 'max-w-lg'}"
      >
        <!-- Progress Bar at top -->
        <div class="h-1 bg-indigo-600 w-full animate-pulse"></div>

        <div
          class="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"
        >
          <div>
            <h3 class="text-lg font-bold text-slate-800">Lengkapi Data</h3>
            <p class="text-xs text-slate-500 font-mono mt-1">
              NIP: {selectedTask.dataP3k?.nipBaru}
            </p>
          </div>
          <button
            on:click={closeEditModal}
            aria-label="Tutup"
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

        <form on:submit={handleCompleteTask} class="p-6 {isLargeModal ? 'max-h-[70vh] overflow-y-auto' : ''}">
          <div class="space-y-6">
            <div class="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
              <h4
                class="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1"
              >
                DATA SAAT INI
              </h4>
              <p class="text-sm text-slate-700 font-semibold">
                {selectedTask.dataP3k?.nama}
              </p>
              <p class="text-xs text-slate-500 mt-1 break-words whitespace-normal leading-relaxed">
                Unit Kerja: {selectedTask.dataP3k?.unorNama ||
                  selectedTask.dataP3k?.lokasiKerjaNama ||
                  "-"}
              </p>
            </div>

            {#if activeFields.length === 0}
              <div class="text-center py-6 text-slate-400">
                <p class="text-sm">Belum ada field yang dikonfigurasi oleh admin.</p>
              </div>
            {:else}
              <!-- Dynamic Fields by Group -->
              {#each Object.entries(groupedActiveFields) as [group, fields]}
                <div>
                  <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b pb-2">{group}</h4>
                  <div class="{isLargeModal ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}">
                    {#each fields as field}
                      <div>
                        <label
                          class="block text-sm font-bold text-slate-700 mb-1.5 break-words whitespace-normal"
                          for="field-{field.fieldName}"
                        >
                          {field.label}
                          {#if field.fieldName === "nomorSkCpns"}
                            <span class="text-rose-600 font-bold ml-1 text-xs">* (Wajib)</span>
                          {/if}
                        </label>

                        {#if field.inputType === "search"}
                          <!-- Search field (like unorIndukId) -->
                          <div class="relative">
                            <input
                              id="field-{field.fieldName}"
                              type="text"
                              value={searchTerms[field.fieldName] || ""}
                              on:input={(e) => handleSearchField(field.fieldName, e)}
                              on:focus={() => {
                                if ((searchTerms[field.fieldName] || "").trim().length >= 2)
                                  showDropdown[field.fieldName] = true;
                              }}
                              on:blur={() =>
                                setTimeout(() => (showDropdown[field.fieldName] = false), 200)}
                              class="input-field pr-10 focus:ring-2 focus:ring-indigo-500 transition-all"
                              placeholder="Ketik minimal 2 huruf untuk mencari..."
                              autocomplete="off"
                            />

                            {#if isSearching[field.fieldName]}
                              <div class="absolute right-3 top-2.5">
                                <div
                                  class="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"
                                ></div>
                              </div>
                            {:else}
                              <div class="absolute right-3 top-2.5 text-slate-400">
                                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                              </div>
                            {/if}

                            {#if showDropdown[field.fieldName] && !isSearching[field.fieldName]}
                              <ul
                                class="absolute z-50 mt-1 w-full bg-white shadow-xl max-h-60 rounded-xl py-2 text-sm ring-1 ring-black ring-opacity-5 overflow-auto border border-slate-100"
                              >
                                {#if (searchResults[field.fieldName] || []).length > 0}
                                  {#each searchResults[field.fieldName] as result}
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
                                    <li
                                      class="px-4 py-3 hover:bg-indigo-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                                      on:click={() => selectSearchResult(field.fieldName, result.id, result.nama)}
                                    >
                                      <div class="font-medium text-slate-800 break-words whitespace-normal leading-snug">{result.nama}</div>
                                    </li>
                                  {/each}
                                {:else}
                                  <li class="px-4 py-4 text-center text-slate-400">Tidak ditemukan</li>
                                {/if}
                              </ul>
                            {/if}
                          </div>

                          {#if editForm[field.fieldName] && searchTerms[field.fieldName]}
                            <div class="mt-2 p-2.5 bg-indigo-50/80 border border-indigo-100 rounded-xl text-xs font-semibold text-indigo-900 break-words whitespace-normal leading-relaxed flex items-start gap-2">
                              <svg class="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                              </svg>
                              <div>
                                <span class="text-indigo-600 text-[10px] uppercase font-bold tracking-wider block">Pilihan Terpilih:</span>
                                <span>{searchTerms[field.fieldName]}</span>
                              </div>
                            </div>
                          {/if}

                        {:else if field.inputType === "date"}
                          <input
                            id="field-{field.fieldName}"
                            type="date"
                            bind:value={editForm[field.fieldName]}
                            class="input-field focus:ring-2 focus:ring-indigo-500"
                          />

                        {:else}
                          <!-- text input (default) -->
                          <input
                            id="field-{field.fieldName}"
                            type="text"
                            bind:value={editForm[field.fieldName]}
                            class="input-field focus:ring-2 focus:ring-indigo-500"
                            placeholder="Masukkan {field.label.toLowerCase()}"
                          />
                        {/if}

                        {#if field.fieldName === "nomorSkCpns"}
                          <!-- Upload SK CPNS (PDF) Component -->
                          <div class="mt-3 p-4 rounded-xl bg-blue-50/75 border border-blue-200 space-y-3 {isLargeModal ? 'col-span-full' : ''}">
                            <div class="flex flex-wrap items-center justify-between gap-2">
                              <span class="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                                <svg class="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                Upload Dokumen SK CPNS (PDF) <span class="text-rose-600 font-bold">* (Wajib)</span>
                              </span>
                              {#if selectedTask?.dataP3k?.arsipSkCpns?.fileUrl}
                                <a
                                  href={`${API_BASE_URL}${selectedTask.dataP3k.arsipSkCpns.fileUrl}`}
                                  target="_blank"
                                  class="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors shadow-xs"
                                >
                                  <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Dokumen Tersedia (Lihat PDF)
                                </a>
                              {/if}
                            </div>

                            <input
                              type="file"
                              accept="application/pdf"
                              on:change={handleFileSkCpnsChange}
                              class="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer cursor-pointer border border-blue-200 rounded-xl bg-white p-1.5 shadow-xs"
                            />

                            {#if selectedFileSkCpns}
                              <div class="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200">
                                <svg class="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>File baru dipilih: <strong>{selectedFileSkCpns.name}</strong> ({(selectedFileSkCpns.size / 1024).toFixed(1)} KB)</span>
                              </div>
                            {:else if selectedTask?.dataP3k?.arsipSkCpns?.fileUrl}
                              <p class="text-[11px] text-slate-500">Pilih file baru jika ingin mengganti dokumen SK CPNS yang sudah ada.</p>
                            {:else}
                              <p class="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                                <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Format: PDF (Maks. 10MB). Wajib diunggah sebelum menyimpan.
                              </p>
                            {/if}
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            {/if}
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
              bind:this={submitBtnEl}
              class="btn-primary shadow-indigo-200 focus:ring-4 focus:ring-indigo-300 focus:outline-none"
              disabled={isSubmitting || activeFields.length === 0}
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
                Memproses...
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
                Selesaikan Tugas
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}
