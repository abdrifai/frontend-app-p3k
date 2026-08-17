<script>
  import { onMount } from "svelte";
  import { addToast } from "$lib/toastStore";
  import { authStore, isUserAdmin } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { goto } from "$app/navigation";

  let records = [];
  let isLoading = true;
  let isSubmitting = false;
  let isDeleting = null;

  let currentPage = 1;
  let totalPages = 1;
  let totalCount = 0;
  let limit = 10;
  let searchQuery = "";
  let searchTimeout;

  // Form tambah
  let showAddForm = false;
  let formLabel = "";

  // Inline edit
  let editingId = null;
  let editLabel = "";

  onMount(() => {
    if (!$authStore.isAuthenticated || !isUserAdmin($authStore.user)) {
      addToast("Akses ditolak. Hanya untuk Admin.", "error");
      goto("/");
      return;
    }
    fetchKegiatan();
  });

  const handleSearchInput = () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage = 1;
      fetchKegiatan();
    }, 400);
  };

  const fetchKegiatan = async () => {
    isLoading = true;
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const result = await apiRequest(`/api/kegiatan?${params.toString()}`);
      if (result.success) {
        records = result.data?.data ?? result.data ?? [];
        totalPages = result.data?.totalPages ?? result.meta?.totalPages ?? 1;
        totalCount = result.data?.total ?? result.meta?.total ?? records.length;
      } else {
        addToast(result.message || "Gagal mengambil data kegiatan", "error");
      }
    } catch (e) {
      console.error(e);
      addToast("Terjadi kesalahan sistem", "error");
    } finally {
      isLoading = false;
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formLabel.trim()) {
      addToast("Label kegiatan tidak boleh kosong", "warning");
      return;
    }
    isSubmitting = true;
    try {
      const result = await apiRequest("/api/kegiatan", "POST", {
        label: formLabel.trim(),
      });
      if (result.success) {
        addToast(result.message || "Kegiatan berhasil ditambahkan", "success");
        formLabel = "";
        showAddForm = false;
        currentPage = 1;
        fetchKegiatan();
      } else {
        addToast(result.message || "Gagal menambahkan kegiatan", "error");
      }
    } catch (e) {
      addToast("Terjadi kesalahan sistem", "error");
    } finally {
      isSubmitting = false;
    }
  };

  const startEdit = (rec) => {
    editingId = rec.id;
    editLabel = rec.label ?? rec.nama ?? "";
  };

  const cancelEdit = () => {
    editingId = null;
    editLabel = "";
  };

  const handleUpdate = async (id) => {
    if (!editLabel.trim()) {
      addToast("Label tidak boleh kosong", "warning");
      return;
    }
    isSubmitting = true;
    try {
      const result = await apiRequest(`/api/kegiatan/${id}`, "PUT", {
        label: editLabel.trim(),
      });
      if (result.success) {
        addToast(result.message || "Kegiatan berhasil diperbarui", "success");
        editingId = null;
        editLabel = "";
        fetchKegiatan();
      } else {
        addToast(result.message || "Gagal memperbarui kegiatan", "error");
      }
    } catch (e) {
      addToast("Terjadi kesalahan sistem", "error");
    } finally {
      isSubmitting = false;
    }
  };

  const handleDelete = async (id, label) => {
    if (!confirm(`Hapus kegiatan "${label}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    isDeleting = id;
    try {
      const result = await apiRequest(`/api/kegiatan/${id}`, "DELETE");
      if (result.success) {
        addToast("Kegiatan berhasil dihapus", "success");
        fetchKegiatan();
      } else {
        addToast(result.message || "Gagal menghapus kegiatan", "error");
      }
    } catch (e) {
      addToast("Terjadi kesalahan sistem", "error");
    } finally {
      isDeleting = null;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  $: startRecord = (currentPage - 1) * limit + 1;
  $: endRecord = Math.min(currentPage * limit, totalCount);
  $: pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1);
</script>

<svelte:head>
  <title>Manajemen Kegiatan — App P3K</title>
</svelte:head>

<div class="max-w-4xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">

  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 flex-shrink-0">
        <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      </div>
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Manajemen Kegiatan</h1>
        <p class="mt-0.5 text-sm text-slate-500">
          Kelola label kegiatan yang digunakan dalam pembagian tugas peremajaan data.
        </p>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:flex-shrink-0">
      <!-- Search -->
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          bind:value={searchQuery}
          on:input={handleSearchInput}
          placeholder="Cari kegiatan..."
          class="input-field pl-9 w-full sm:w-56 bg-white"
        />
      </div>
      <!-- Tombol Tambah -->
      <button
        on:click={() => { showAddForm = !showAddForm; formLabel = ""; }}
        class="btn-primary whitespace-nowrap"
      >
        <svg
          class="w-4 h-4 mr-1.5 transition-transform duration-200 {showAddForm ? 'rotate-45' : ''}"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        {showAddForm ? "Batal" : "Tambah Kegiatan"}
      </button>
    </div>
  </div>

  <!-- Form Tambah -->
  {#if showAddForm}
    <div class="card p-5 border-violet-100 bg-gradient-to-br from-violet-50/60 to-indigo-50/40">
      <h2 class="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <div class="w-5 h-5 rounded-md bg-violet-100 flex items-center justify-center flex-shrink-0">
          <svg class="w-3 h-3 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        Tambah Kegiatan Baru
      </h2>
      <form on:submit={handleAdd} class="flex flex-col sm:flex-row gap-3 items-end">
        <div class="flex-1">
          <label for="formLabel" class="block text-sm font-medium text-slate-700 mb-1.5">
            Label Kegiatan <span class="text-red-500">*</span>
          </label>
          <input
            id="formLabel"
            type="text"
            bind:value={formLabel}
            placeholder="Contoh: Peremajaan Data Gaji, Verifikasi Jabatan..."
            class="input-field w-full bg-white"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          class="btn-primary whitespace-nowrap"
        >
          {#if isSubmitting}
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5"></div>
          {/if}
          {isSubmitting ? "Menyimpan..." : "Simpan"}
        </button>
      </form>
    </div>
  {/if}

  <!-- Stats / Filter badge -->
  {#if !isLoading}
    <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <div class="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
        <div class="w-2 h-2 rounded-full bg-violet-400"></div>
        Total: <strong class="text-slate-700 ml-0.5">{totalCount}</strong> kegiatan
      </div>
      {#if searchQuery}
        <div class="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
          <svg class="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <span class="text-amber-700">Filter: "<strong>{searchQuery}</strong>"</span>
          <button
            on:click={() => { searchQuery = ""; currentPage = 1; fetchKegiatan(); }}
            class="ml-1 text-amber-400 hover:text-amber-600"
            title="Hapus filter"
          >
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Tabel -->
  <div class="card overflow-hidden">
    <!-- Table header bar -->
    <div class="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
      <h3 class="font-semibold text-slate-700 text-sm">Daftar Kegiatan</h3>
      <button
        on:click={fetchKegiatan}
        class="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        title="Refresh"
      >
        <svg class="w-4 h-4 {isLoading ? 'animate-spin' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
      </button>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200">
        <thead>
          <tr class="bg-white">
            <th class="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase w-12">#</th>
            <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Label Kegiatan</th>
            <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Dibuat</th>
            <th class="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase w-28">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {#if isLoading}
            {#each Array(5) as _}
              <tr>
                <td class="px-5 py-4"><div class="h-3.5 bg-slate-100 rounded animate-pulse w-5"></div></td>
                <td class="px-5 py-4"><div class="h-3.5 bg-slate-100 rounded animate-pulse w-48"></div></td>
                <td class="px-5 py-4 hidden sm:table-cell"><div class="h-3.5 bg-slate-100 rounded animate-pulse w-24"></div></td>
                <td class="px-5 py-4"><div class="h-3.5 bg-slate-100 rounded animate-pulse w-14 ml-auto"></div></td>
              </tr>
            {/each}
          {:else if records.length === 0}
            <tr>
              <td colspan="4" class="px-5 py-14 text-center">
                <div class="flex flex-col items-center gap-3">
                  <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <svg class="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-slate-600">Belum ada kegiatan</p>
                    <p class="text-xs text-slate-400 mt-0.5">
                      {searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : 'Klik "Tambah Kegiatan" untuk memulai.'}
                    </p>
                  </div>
                  {#if searchQuery}
                    <button
                      on:click={() => { searchQuery = ""; currentPage = 1; fetchKegiatan(); }}
                      class="btn-secondary text-xs px-3 py-1.5"
                    >
                      Hapus Filter
                    </button>
                  {/if}
                </div>
              </td>
            </tr>
          {:else}
            {#each records as rec, i}
              <tr class="hover:bg-slate-50/60 transition-colors group">
                <td class="px-5 py-3.5 text-xs text-slate-400 font-mono">
                  {startRecord + i}
                </td>
                <td class="px-5 py-3.5">
                  {#if editingId === rec.id}
                    <input
                      type="text"
                      bind:value={editLabel}
                      class="input-field !py-1.5 text-sm w-full max-w-xs"
                      placeholder="Label kegiatan"
                      on:keydown={(e) => e.key === 'Escape' && cancelEdit()}
                    />
                  {:else}
                    <div class="flex items-center gap-2.5">
                      <div class="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0"></div>
                      <span class="text-sm font-medium text-slate-800">{rec.label ?? rec.nama ?? '-'}</span>
                    </div>
                  {/if}
                </td>
                <td class="px-5 py-3.5 text-xs text-slate-400 hidden sm:table-cell">
                  {formatDate(rec.createdAt)}
                </td>
                <td class="px-5 py-3.5 text-right">
                  {#if editingId === rec.id}
                    <div class="flex items-center justify-end gap-1.5">
                      <button
                        on:click={() => handleUpdate(rec.id)}
                        disabled={isSubmitting}
                        class="p-1.5 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
                        title="Simpan"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                        </svg>
                      </button>
                      <button
                        on:click={cancelEdit}
                        class="p-1.5 rounded-lg text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                        title="Batal"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  {:else}
                    <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <button
                        on:click={() => startEdit(rec)}
                        class="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      <button
                        on:click={() => handleDelete(rec.id, rec.label ?? rec.nama)}
                        disabled={isDeleting === rec.id}
                        class="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Hapus"
                      >
                        {#if isDeleting === rec.id}
                          <div class="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                        {:else}
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        {/if}
                      </button>
                    </div>
                  {/if}
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Pagination -->
  {#if totalPages > 1}
    <div class="flex flex-col sm:flex-row items-center justify-between bg-white px-4 py-3 sm:px-5 rounded-xl border border-slate-200 shadow-sm gap-3">
      <p class="text-xs text-slate-500">
        Menampilkan <strong class="text-slate-700">{startRecord}–{endRecord}</strong>
        dari <strong class="text-slate-700">{totalCount}</strong> kegiatan
      </p>
      <nav class="isolate inline-flex -space-x-px rounded-lg shadow-sm overflow-hidden border border-slate-200">
        <!-- Prev -->
        <button
          disabled={currentPage === 1}
          on:click={() => { currentPage--; fetchKegiatan(); }}
          class="relative inline-flex items-center px-2.5 py-2 text-slate-400 bg-white hover:bg-slate-50 focus:z-20 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed border-r border-slate-200 transition-colors"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd"/>
          </svg>
        </button>

        <!-- Page numbers with ellipsis -->
        {#each pageNumbers as p, idx}
          {#if idx > 0 && pageNumbers[idx - 1] !== p - 1}
            <span class="relative inline-flex items-center px-3 py-2 text-xs text-slate-400 bg-white border-r border-slate-200 select-none">…</span>
          {/if}
          <button
            on:click={() => { currentPage = p; fetchKegiatan(); }}
            class="relative inline-flex items-center px-3.5 py-2 text-xs font-medium border-r border-slate-200 transition-colors
              {currentPage === p ? 'bg-blue-600 text-white hover:bg-blue-700 z-10' : 'text-slate-600 bg-white hover:bg-slate-50'}"
          >
            {p}
          </button>
        {/each}

        <!-- Next -->
        <button
          disabled={currentPage === totalPages}
          on:click={() => { currentPage++; fetchKegiatan(); }}
          class="relative inline-flex items-center px-2.5 py-2 text-slate-400 bg-white hover:bg-slate-50 focus:z-20 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/>
          </svg>
        </button>
      </nav>
    </div>
  {/if}

</div>

