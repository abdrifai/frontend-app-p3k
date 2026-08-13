<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/store";
  import { apiRequest, API_BASE_URL } from "$lib/api";
  import { addToast } from "$lib/toastStore";

  const API_BASE = `${API_BASE_URL}/api/v1/data-p3k`;

  // State
  let activeTab = "set-pensiun"; // 'set-pensiun' | 'data-pensiun'
  let isLoading = false;
  let records = [];
  let pensiunRecords = [];
  let meta = { total: 0, page: 1, limit: 10, totalPages: 0 };
  let pensiunMeta = { total: 0, page: 1, limit: 10, totalPages: 0 };
  let searchTerm = "";
  let pensiunSearchTerm = "";

  // Set Pensiun Modal
  let showSetPensiunModal = false;
  let selectedRecord = null;
  let pensiunForm = { nomorSk: "", tanggalSk: "", file: null };
  let isSubmitting = false;

  // Edit Pensiun Modal
  let showEditModal = false;
  let editRecord = null;
  let editForm = { nomorSk: "", tanggalSk: "", file: null };
  let isEditing = false;

  // Revert Confirmation Modal
  let showRevertModal = false;
  let revertRecord = null;
  let isReverting = false;

  // Detail Modal
  let showDetailModal = false;
  let detailRecord = null;

  // --- API calls ---
  const fetchActiveEmployees = async (page = 1) => {
    isLoading = true;
    try {
      const params = new URLSearchParams({
        page,
        limit: 10,
        statusPensiun: "AKTIF",
      });
      if (searchTerm) params.set("search", searchTerm);

      const result = await apiRequest(`/api/v1/data-p3k?${params.toString()}`, "GET");
      if (result.success) {
        records = result.data;
        meta = result.meta;
      }
    } catch (err) {
      addToast("Gagal memuat data pegawai aktif", "error");
    } finally {
      isLoading = false;
    }
  };

  const fetchPegawaiPensiun = async (page = 1) => {
    isLoading = true;
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (pensiunSearchTerm) params.set("search", pensiunSearchTerm);

      const result = await apiRequest(`/api/v1/data-p3k/pensiun?${params.toString()}`, "GET");
      if (result.success) {
        pensiunRecords = result.data;
        pensiunMeta = result.meta;
      }
    } catch (err) {
      addToast("Gagal memuat data pegawai pensiun", "error");
    } finally {
      isLoading = false;
    }
  };

  const handleSetPensiun = async () => {
    if (!pensiunForm.nomorSk || !pensiunForm.tanggalSk || !pensiunForm.file) {
      addToast("Semua field wajib diisi termasuk file SK", "error");
      return;
    }
    isSubmitting = true;
    try {
      const fd = new FormData();
      fd.append("nipBaru", selectedRecord.nipBaru);
      fd.append("nomorSk", pensiunForm.nomorSk);
      fd.append("tanggalSk", pensiunForm.tanggalSk);
      fd.append("file", pensiunForm.file);

      const result = await apiRequest("/api/v1/data-p3k/set-pensiun", "POST", fd, true);
      if (result.success) {
        addToast(
          `${selectedRecord.nama} berhasil diubah menjadi PENSIUN`,
          "success",
        );
        closeSetPensiunModal();
        fetchActiveEmployees(meta.page);
        fetchPegawaiPensiun(pensiunMeta.page);
      }
    } catch (err) {
      console.error("handleSetPensiun error:", err);
    } finally {
      isSubmitting = false;
    }
  };

  const handleUpdatePensiun = async () => {
    if (!editForm.nomorSk && !editForm.tanggalSk && !editForm.file) {
      addToast("Minimal satu field harus diubah", "error");
      return;
    }
    isEditing = true;
    try {
      const fd = new FormData();
      fd.append("nipBaru", editRecord.nipBaru);
      if (editForm.nomorSk) fd.append("nomorSk", editForm.nomorSk);
      if (editForm.tanggalSk) fd.append("tanggalSk", editForm.tanggalSk);
      if (editForm.file) fd.append("file", editForm.file);

      const result = await apiRequest("/api/v1/data-p3k/update-pensiun", "PUT", fd, true);
      if (result.success) {
        addToast("Data SK Pensiun berhasil diperbarui", "success");
        closeEditModal();
        fetchPegawaiPensiun(pensiunMeta.page);
      }
    } catch (err) {
      console.error("handleUpdatePensiun error:", err);
    } finally {
      isEditing = false;
    }
  };

  const handleRevertPensiun = async () => {
    isReverting = true;
    try {
      const result = await apiRequest("/api/v1/data-p3k/revert-pensiun", "POST", { nipBaru: revertRecord.nipBaru });
      if (result.success) {
        addToast(
          `${revertRecord.nama} berhasil dikembalikan ke status AKTIF`,
          "success",
        );
        closeRevertModal();
        fetchActiveEmployees(meta.page);
        fetchPegawaiPensiun(pensiunMeta.page);
      }
    } catch (err) {
      console.error("handleRevertPensiun error:", err);
    } finally {
      isReverting = false;
    }
  };

  // --- Modal handlers ---
  const openSetPensiunModal = (rec) => {
    selectedRecord = rec;
    pensiunForm = { nomorSk: "", tanggalSk: "", file: null };
    showSetPensiunModal = true;
  };
  const closeSetPensiunModal = () => {
    showSetPensiunModal = false;
    selectedRecord = null;
  };

  const openEditModal = (rec) => {
    editRecord = rec;
    editForm = {
      nomorSk: rec.arsipSkPensiun?.nomorSk || "",
      tanggalSk: rec.arsipSkPensiun?.tanggalSk || "",
      file: null,
    };
    showEditModal = true;
  };
  const closeEditModal = () => {
    showEditModal = false;
    editRecord = null;
  };

  const openRevertModal = (rec) => {
    revertRecord = rec;
    showRevertModal = true;
  };
  const closeRevertModal = () => {
    showRevertModal = false;
    revertRecord = null;
  };

  const openDetailModal = (rec) => {
    detailRecord = rec;
    showDetailModal = true;
  };
  const closeDetailModal = () => {
    showDetailModal = false;
    detailRecord = null;
  };

  // --- Search helpers ---
  const handleSearchActive = (e) => {
    e.preventDefault();
    fetchActiveEmployees(1);
  };
  const handleSearchPensiun = (e) => {
    e.preventDefault();
    fetchPegawaiPensiun(1);
  };

  // --- Tab switch ---
  const switchTab = (tab) => {
    activeTab = tab;
    if (tab === "set-pensiun" && records.length === 0) fetchActiveEmployees();
    if (tab === "data-pensiun" && pensiunRecords.length === 0)
      fetchPegawaiPensiun();
  };

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login untuk mengakses halaman ini", "error");
      goto("/login");
      return;
    }
    const role = String($authStore.user?.role || "").toLowerCase();
    if (role !== "admin" && role !== "pensiun" && role !== "operator_pensiun") {
      addToast("Akses ditolak. Anda tidak memiliki izin untuk mengelola data pensiun.", "error");
      goto("/");
      return;
    }
    fetchActiveEmployees();
    fetchPegawaiPensiun();
  });
</script>

<svelte:head>
  <title>Manajemen Pensiun — SIPPPK</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
    <div>
      <div class="flex items-center gap-3">
        <div
          class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-amber-500/25"
        >
          <svg
            class="w-6 h-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-slate-800">
            Manajemen Pensiun P3K
          </h1>
          <p class="text-sm text-slate-500 mt-0.5">
            Kelola status pensiun dan arsip SK pegawai PPPK
          </p>
        </div>
      </div>
    </div>
    <!-- Summary stats -->
    <div class="flex gap-3">
      <div
        class="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200"
      >
        <p
          class="text-[10px] uppercase font-bold text-emerald-500 tracking-wider"
        >
          Aktif
        </p>
        <p class="text-lg font-bold text-emerald-700">{meta.total}</p>
      </div>
      <div class="px-4 py-2.5 rounded-xl bg-red-50 border border-red-200">
        <p class="text-[10px] uppercase font-bold text-red-500 tracking-wider">
          Pensiun
        </p>
        <p class="text-lg font-bold text-red-700">{pensiunMeta.total}</p>
      </div>
    </div>
  </div>

  <!-- Tabs -->
  <div
    class="flex gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/50"
  >
    <button
      type="button"
      on:click={() => switchTab("set-pensiun")}
      class="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
        {activeTab === 'set-pensiun'
        ? 'bg-white text-amber-700 shadow-sm border border-slate-200/50'
        : 'text-slate-500 hover:text-slate-700'}"
    >
      <span class="flex items-center justify-center gap-2">
        <svg
          class="w-4 h-4"
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
        Set Pensiun
      </span>
    </button>
    <button
      type="button"
      on:click={() => switchTab("data-pensiun")}
      class="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
        {activeTab === 'data-pensiun'
        ? 'bg-white text-red-700 shadow-sm border border-slate-200/50'
        : 'text-slate-500 hover:text-slate-700'}"
    >
      <span class="flex items-center justify-center gap-2">
        <svg
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          /></svg
        >
        Data Pensiun
        {#if pensiunMeta.total > 0}
          <span
            class="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            >{pensiunMeta.total}</span
          >
        {/if}
      </span>
    </button>
  </div>

  <!-- ============ TAB 1: SET PENSIUN ============ -->
  {#if activeTab === "set-pensiun"}
    <div class="space-y-4">
      <!-- Search bar -->
      <form on:submit={handleSearchActive} class="card p-4">
        <div class="flex gap-3">
          <div class="flex-1 relative">
            <svg
              class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              /></svg
            >
            <input
              type="text"
              bind:value={searchTerm}
              placeholder="Cari nama atau NIP pegawai aktif..."
              class="input-field !pl-10"
            />
          </div>
          <button type="submit" class="btn-primary">Cari</button>
        </div>
      </form>

      <!-- Table -->
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200">
            <thead>
              <tr class="bg-slate-50/80">
                <th
                  class="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >No</th
                >
                <th
                  class="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >NIP</th
                >
                <th
                  class="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >Nama</th
                >
                <th
                  class="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >Unit Kerja</th
                >
                <th
                  class="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >Aksi</th
                >
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-slate-100">
              {#if isLoading}
                <tr>
                  <td colspan="5" class="px-6 py-12 text-center">
                    <div
                      class="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"
                    ></div>
                    <p class="text-sm text-slate-400 mt-3">Memuat data...</p>
                  </td>
                </tr>
              {:else if records.length === 0}
                <tr>
                  <td colspan="5" class="px-6 py-12 text-center">
                    <p class="text-sm text-slate-400">
                      Tidak ada pegawai aktif ditemukan
                    </p>
                  </td>
                </tr>
              {:else}
                {#each records as rec, i}
                  <tr class="hover:bg-amber-50/30 transition-colors">
                    <td
                      class="px-4 sm:px-6 py-3 text-sm text-slate-400 font-mono"
                      >{(meta.page - 1) * meta.limit + i + 1}</td
                    >
                    <td
                      class="px-4 sm:px-6 py-3 text-sm text-slate-600 font-mono"
                      >{rec.nipBaru || "-"}</td
                    >
                    <td class="px-4 sm:px-6 py-3">
                      <p class="text-sm font-semibold text-slate-800">
                        {rec.nama}
                      </p>
                      <p class="text-xs text-slate-400 md:hidden">
                        {rec.unorNama || "-"}
                      </p>
                    </td>
                    <td
                      class="hidden md:table-cell px-4 sm:px-6 py-3 text-sm text-slate-500 max-w-[200px] truncate"
                      >{rec.unorNama || rec.lokasiKerjaNama || "-"}</td
                    >
                    <td class="px-4 sm:px-6 py-3 text-right">
                      <button
                        on:click={() => openSetPensiunModal(rec)}
                        class="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 px-3.5 py-1.5 rounded-lg transition-all shadow-sm shadow-amber-500/20 hover:shadow-md hover:shadow-amber-500/30"
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
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          /></svg
                        >
                        Set Pensiun
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
            class="border-t border-slate-100 px-4 sm:px-6 py-4 flex items-center justify-between"
          >
            <p class="text-sm text-slate-500">
              Hal. <span class="font-semibold text-slate-700">{meta.page}</span>
              / {meta.totalPages}
              <span class="text-slate-400">({meta.total} data)</span>
            </p>
            <div class="flex gap-1">
              <button
                disabled={meta.page === 1}
                on:click={() => fetchActiveEmployees(meta.page - 1)}
                class="btn-secondary !px-2.5 !py-1.5 disabled:opacity-40"
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
                    d="M15 19l-7-7 7-7"
                  /></svg
                >
              </button>
              <button
                disabled={meta.page === meta.totalPages}
                on:click={() => fetchActiveEmployees(meta.page + 1)}
                class="btn-secondary !px-2.5 !py-1.5 disabled:opacity-40"
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
                    d="M9 5l7 7-7 7"
                  /></svg
                >
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- ============ TAB 2: DATA PENSIUN ============ -->
  {#if activeTab === "data-pensiun"}
    <div class="space-y-4">
      <!-- Search bar -->
      <form on:submit={handleSearchPensiun} class="card p-4">
        <div class="flex gap-3">
          <div class="flex-1 relative">
            <svg
              class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              /></svg
            >
            <input
              type="text"
              bind:value={pensiunSearchTerm}
              placeholder="Cari pegawai pensiun..."
              class="input-field !pl-10"
            />
          </div>
          <button
            type="submit"
            class="btn-primary !bg-red-600 hover:!bg-red-700 shadow-red-200"
            >Cari</button
          >
        </div>
      </form>

      <!-- Table -->
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200">
            <thead>
              <tr class="bg-red-50/50">
                <th
                  class="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >No</th
                >
                <th
                  class="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >NIP</th
                >
                <th
                  class="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >Nama</th
                >
                <th
                  class="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >No. SK</th
                >
                <th
                  class="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >Tgl SK</th
                >
                <th
                  class="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >Aksi</th
                >
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-slate-100">
              {#if isLoading}
                <tr>
                  <td colspan="6" class="px-6 py-12 text-center">
                    <div
                      class="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"
                    ></div>
                    <p class="text-sm text-slate-400 mt-3">Memuat data...</p>
                  </td>
                </tr>
              {:else if pensiunRecords.length === 0}
                <tr>
                  <td colspan="6" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center gap-2">
                      <svg
                        class="w-12 h-12 text-slate-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="1.5"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        /></svg
                      >
                      <p class="text-sm text-slate-400">
                        Belum ada pegawai pensiun
                      </p>
                    </div>
                  </td>
                </tr>
              {:else}
                {#each pensiunRecords as rec, i}
                  <tr class="hover:bg-red-50/30 transition-colors">
                    <td
                      class="px-4 sm:px-6 py-3 text-sm text-slate-400 font-mono"
                      >{(pensiunMeta.page - 1) * pensiunMeta.limit +
                        i +
                        1}</td
                    >
                    <td
                      class="px-4 sm:px-6 py-3 text-sm text-slate-600 font-mono"
                      >{rec.nipBaru || "-"}</td
                    >
                    <td class="px-4 sm:px-6 py-3">
                      <p class="text-sm font-semibold text-slate-800">
                        {rec.nama}
                      </p>
                      <p class="text-xs text-slate-400">
                        {rec.unorNama || "-"}
                      </p>
                    </td>
                    <td
                      class="hidden md:table-cell px-4 sm:px-6 py-3 text-sm text-slate-600 font-mono"
                    >
                      {rec.arsipSkPensiun?.nomorSk || "-"}
                    </td>
                    <td
                      class="hidden lg:table-cell px-4 sm:px-6 py-3 text-sm text-slate-500"
                    >
                      {rec.arsipSkPensiun?.tanggalSk || "-"}
                    </td>
                    <td class="px-4 sm:px-6 py-3 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <!-- Detail -->
                        <button
                          on:click={() => openDetailModal(rec)}
                          class="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                          title="Detail"
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
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            /><path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            /></svg
                          >
                        </button>
                        <!-- View PDF -->
                        {#if rec.arsipSkPensiun?.fileUrl}
                          <a
                            href={`${API_BASE_URL}${rec.arsipSkPensiun.fileUrl}`}
                            target="_blank"
                            class="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-colors"
                            title="Lihat SK PDF"
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
                                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              /></svg
                            >
                          </a>
                        {/if}
                        <!-- Edit -->
                        <button
                          on:click={() => openEditModal(rec)}
                          class="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors"
                          title="Edit SK"
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
                        </button>
                        <!-- Revert -->
                        <button
                          on:click={() => openRevertModal(rec)}
                          class="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="Batalkan Pensiun"
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
                              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                            /></svg
                          >
                        </button>
                      </div>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
        <!-- Pagination -->
        {#if pensiunMeta.totalPages > 1}
          <div
            class="border-t border-slate-100 px-4 sm:px-6 py-4 flex items-center justify-between"
          >
            <p class="text-sm text-slate-500">
              Hal. <span class="font-semibold text-slate-700"
                >{pensiunMeta.page}</span
              >
              / {pensiunMeta.totalPages}
              <span class="text-slate-400">({pensiunMeta.total} data)</span>
            </p>
            <div class="flex gap-1">
              <button
                disabled={pensiunMeta.page === 1}
                on:click={() => fetchPegawaiPensiun(pensiunMeta.page - 1)}
                class="btn-secondary !px-2.5 !py-1.5 disabled:opacity-40"
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
                    d="M15 19l-7-7 7-7"
                  /></svg
                >
              </button>
              <button
                disabled={pensiunMeta.page === pensiunMeta.totalPages}
                on:click={() => fetchPegawaiPensiun(pensiunMeta.page + 1)}
                class="btn-secondary !px-2.5 !py-1.5 disabled:opacity-40"
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
                    d="M9 5l7 7-7 7"
                  /></svg
                >
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- ==================== MODALS ==================== -->

<!-- SET PENSIUN MODAL -->
{#if showSetPensiunModal && selectedRecord}
  <div
    class="fixed z-[60] inset-0 overflow-y-auto"
    role="dialog"
    aria-modal="true"
  >
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <button
        type="button"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm w-full h-full border-none cursor-default"
        on:click={closeSetPensiunModal}
      ></button>
      <div
        class="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 z-10"
      >
        <div class="flex items-center gap-4 pb-5 border-b border-slate-100">
          <div
            class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/20"
          >
            <svg
              class="h-6 w-6 text-white"
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
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-800">Set Pensiun</h3>
            <p class="text-sm text-slate-400">
              Arsip SK untuk <span class="font-semibold text-slate-600"
                >{selectedRecord.nama}</span
              >
            </p>
          </div>
          <button
            on:click={closeSetPensiunModal}
            class="ml-auto p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
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
        <form
          on:submit|preventDefault={handleSetPensiun}
          class="mt-6 space-y-4"
        >
          <div>
            <label
              for="sp-nomorSk"
              class="block text-sm font-medium text-slate-700 mb-1"
              >Nomor SK Pensiun</label
            >
            <input
              id="sp-nomorSk"
              type="text"
              bind:value={pensiunForm.nomorSk}
              placeholder="Contoh: 800/123/BKPSDM/2024"
              class="input-field"
              required
            />
          </div>
          <div>
            <label
              for="sp-tanggalSk"
              class="block text-sm font-medium text-slate-700 mb-1"
              >Tanggal SK</label
            >
            <input
              id="sp-tanggalSk"
              type="date"
              bind:value={pensiunForm.tanggalSk}
              class="input-field"
              required
            />
          </div>
          <div>
            <p class="block text-sm font-medium text-slate-700 mb-1">
              Arsip SK (PDF)
            </p>
            <label
              for="sp-file"
              class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-amber-400 hover:bg-amber-50/30 transition-all cursor-pointer group"
            >
              <div class="space-y-1 text-center">
                <svg
                  class="mx-auto h-10 w-10 text-slate-400 group-hover:text-amber-500 transition-colors"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  ><path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  /></svg
                >
                <p
                  class="text-sm font-medium text-amber-600 group-hover:text-amber-500"
                >
                  Klik untuk upload SK Pensiun
                </p>
                <p class="text-xs text-slate-500">PDF, maksimal 5MB</p>
                {#if pensiunForm.file}
                  <p
                    class="text-sm text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-md inline-block mt-2 border border-emerald-100"
                  >
                    ✓ {pensiunForm.file.name}
                  </p>
                {/if}
              </div>
            </label>
            <input
              id="sp-file"
              type="file"
              accept="application/pdf"
              class="sr-only"
              on:change={(e) => (pensiunForm.file = e.target.files[0])}
              required
            />
          </div>
          <div class="pt-4 flex gap-3">
            <button
              type="button"
              on:click={closeSetPensiunModal}
              class="flex-1 btn-secondary">Batal</button
            >
            <button
              type="submit"
              disabled={isSubmitting}
              class="flex-1 btn-primary !bg-amber-600 hover:!bg-amber-700 shadow-amber-200 disabled:opacity-50"
            >
              {#if isSubmitting}
                <div
                  class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"
                ></div>
                Memproses...
              {:else}
                Simpan & Set Pensiun
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- EDIT PENSIUN MODAL -->
{#if showEditModal && editRecord}
  <div
    class="fixed z-[60] inset-0 overflow-y-auto"
    role="dialog"
    aria-modal="true"
  >
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <button
        type="button"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm w-full h-full border-none cursor-default"
        on:click={closeEditModal}
      ></button>
      <div
        class="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 z-10"
      >
        <div class="flex items-center gap-4 pb-5 border-b border-slate-100">
          <div
            class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20"
          >
            <svg
              class="h-6 w-6 text-white"
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
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-800">Edit SK Pensiun</h3>
            <p class="text-sm text-slate-400">
              Perbarui data SK untuk <span class="font-semibold text-slate-600"
                >{editRecord.nama}</span
              >
            </p>
          </div>
          <button
            on:click={closeEditModal}
            class="ml-auto p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
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
        <form
          on:submit|preventDefault={handleUpdatePensiun}
          class="mt-6 space-y-4"
        >
          <div>
            <label
              for="ed-nomorSk"
              class="block text-sm font-medium text-slate-700 mb-1"
              >Nomor SK Pensiun</label
            >
            <input
              id="ed-nomorSk"
              type="text"
              bind:value={editForm.nomorSk}
              placeholder="Nomor SK baru..."
              class="input-field"
            />
          </div>
          <div>
            <label
              for="ed-tanggalSk"
              class="block text-sm font-medium text-slate-700 mb-1"
              >Tanggal SK</label
            >
            <input
              id="ed-tanggalSk"
              type="date"
              bind:value={editForm.tanggalSk}
              class="input-field"
            />
          </div>
          <div>
            <p class="block text-sm font-medium text-slate-700 mb-1">
              Ganti File SK (Opsional)
            </p>
            {#if editRecord.arsipSkPensiun?.fileUrl}
              <p class="text-xs text-slate-400 mb-2">
                File saat ini: <a
                  href={`${API_BASE_URL}${editRecord.arsipSkPensiun.fileUrl}`}
                  target="_blank"
                  class="text-blue-500 hover:underline">Lihat PDF</a
                >
              </p>
            {/if}
            <label
              for="ed-file"
              class="flex justify-center px-6 pt-4 pb-4 border-2 border-slate-300 border-dashed rounded-xl hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
            >
              <div class="space-y-1 text-center">
                <svg
                  class="mx-auto h-8 w-8 text-slate-400 group-hover:text-blue-500 transition-colors"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  ><path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  /></svg
                >
                <p
                  class="text-sm font-medium text-blue-600 group-hover:text-blue-500"
                >
                  Klik untuk pilih file baru
                </p>
                <p class="text-xs text-slate-500">
                  Biarkan kosong jika tidak ingin mengganti
                </p>
                {#if editForm.file}
                  <p
                    class="text-sm text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-md inline-block mt-1 border border-emerald-100"
                  >
                    ✓ {editForm.file.name}
                  </p>
                {/if}
              </div>
            </label>
            <input
              id="ed-file"
              type="file"
              accept="application/pdf"
              class="sr-only"
              on:change={(e) => (editForm.file = e.target.files[0])}
            />
          </div>
          <div class="pt-4 flex gap-3">
            <button
              type="button"
              on:click={closeEditModal}
              class="flex-1 btn-secondary">Batal</button
            >
            <button
              type="submit"
              disabled={isEditing}
              class="flex-1 btn-primary disabled:opacity-50"
            >
              {#if isEditing}
                <div
                  class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"
                ></div>
                Menyimpan...
              {:else}
                Simpan Perubahan
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- REVERT CONFIRMATION MODAL -->
{#if showRevertModal && revertRecord}
  <div
    class="fixed z-[60] inset-0 overflow-y-auto"
    role="dialog"
    aria-modal="true"
  >
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <button
        type="button"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm w-full h-full border-none cursor-default"
        on:click={closeRevertModal}
      ></button>
      <div
        class="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 z-10"
      >
        <div class="text-center">
          <div
            class="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/25 mb-4"
          >
            <svg
              class="w-7 h-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              /></svg
            >
          </div>
          <h3 class="text-lg font-bold text-slate-800">
            Batalkan Status Pensiun?
          </h3>
          <p class="mt-2 text-sm text-slate-500">
            Status pegawai <span class="font-semibold text-slate-700"
              >{revertRecord.nama}</span
            >
            akan dikembalikan menjadi
            <span class="font-bold text-emerald-600">AKTIF</span>. Arsip SK
            Pensiun akan dihapus.
          </p>
        </div>
        <div class="mt-6 flex gap-3">
          <button
            type="button"
            on:click={closeRevertModal}
            class="flex-1 btn-secondary">Batal</button
          >
          <button
            type="button"
            on:click={handleRevertPensiun}
            disabled={isReverting}
            class="flex-1 btn-primary !bg-red-600 hover:!bg-red-700 shadow-red-200 disabled:opacity-50"
          >
            {#if isReverting}
              <div
                class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"
              ></div>
              Memproses...
            {:else}
              Ya, Batalkan Pensiun
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- DETAIL MODAL -->
{#if showDetailModal && detailRecord}
  <div
    class="fixed z-[60] inset-0 overflow-y-auto"
    role="dialog"
    aria-modal="true"
  >
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <button
        type="button"
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm w-full h-full border-none cursor-default"
        on:click={closeDetailModal}
      ></button>
      <div
        class="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 z-10"
      >
        <div class="flex items-center gap-4 pb-5 border-b border-slate-100">
          <div
            class="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-md shadow-red-500/20"
          >
            <svg
              class="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              /></svg
            >
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-800">
              Detail Pegawai Pensiun
            </h3>
            <p class="text-sm text-slate-400">{detailRecord.nama}</p>
          </div>
          <button
            on:click={closeDetailModal}
            class="ml-auto p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
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
        <div class="mt-5">
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt
                class="text-xs font-medium text-slate-400 uppercase tracking-wide"
              >
                NIP Baru
              </dt>
              <dd class="mt-1.5 text-sm text-slate-800 font-semibold font-mono">
                {detailRecord.nipBaru || "-"}
              </dd>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt
                class="text-xs font-medium text-slate-400 uppercase tracking-wide"
              >
                Nama
              </dt>
              <dd class="mt-1.5 text-sm text-slate-800 font-semibold">
                {detailRecord.nama || "-"}
              </dd>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt
                class="text-xs font-medium text-slate-400 uppercase tracking-wide"
              >
                Unit Kerja
              </dt>
              <dd class="mt-1.5 text-sm text-slate-700">
                {detailRecord.unorNama || detailRecord.lokasiKerjaNama || "-"}
              </dd>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt
                class="text-xs font-medium text-slate-400 uppercase tracking-wide"
              >
                Tanggal Lahir
              </dt>
              <dd class="mt-1.5 text-sm text-slate-700">
                {detailRecord.tanggalLahir || "-"}
              </dd>
            </div>
            <!-- SK info -->
            <div
              class="p-4 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 sm:col-span-2"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center shadow-md flex-shrink-0"
                >
                  <svg
                    class="w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    ><path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    /></svg
                  >
                </div>
                <div class="flex-1">
                  <dt
                    class="text-xs font-medium text-red-500 uppercase tracking-wide"
                  >
                    Arsip SK Pensiun
                  </dt>
                  {#if detailRecord.arsipSkPensiun}
                    <dd class="mt-1 text-sm text-red-700 font-bold">
                      No. {detailRecord.arsipSkPensiun.nomorSk}
                    </dd>
                    <dd class="text-xs text-red-500 mt-0.5">
                      Tanggal: {detailRecord.arsipSkPensiun.tanggalSk || "-"}
                    </dd>
                    {#if detailRecord.arsipSkPensiun.fileUrl}
                      <a
                        href={`${API_BASE_URL}${detailRecord.arsipSkPensiun.fileUrl}`}
                        target="_blank"
                        class="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
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
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          /></svg
                        >
                        Download SK PDF
                      </a>
                    {/if}
                  {:else}
                    <dd class="mt-1 text-sm text-red-500">
                      Data SK tidak tersedia
                    </dd>
                  {/if}
                </div>
              </div>
            </div>
          </dl>
        </div>
        <div class="mt-6 flex justify-end">
          <button
            type="button"
            on:click={closeDetailModal}
            class="btn-secondary">Tutup</button
          >
        </div>
      </div>
    </div>
  </div>
{/if}
