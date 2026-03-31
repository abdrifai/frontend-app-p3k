<script>
  import { addToast } from "$lib/toastStore";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let records = [];
  let isLoading = true;
  let searchTerm = "";
  let meta = {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  };

  let showModal = false;
  let showDeleteModal = false;
  let isSubmitting = false;
  let isEditMode = false;
  let selectedId = null;

  let formRef = {
    nama: "",
  };

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login untuk mengakses halaman ini", "error");
      goto("/login");
      return;
    }
    fetchData();
  });

  const fetchData = async (page = 1) => {
    isLoading = true;
    try {
      const queryParams = new URLSearchParams({
        page: page,
        limit: meta.limit,
      });
      if (searchTerm) queryParams.append("search", searchTerm);

      const result = await apiRequest(`/api/v1/ref-unor?${queryParams.toString()}`, "GET");
      if (result.success) {
        records = result.data;
        meta = result.meta;
      } else {
        addToast(result.message || "Gagal memuat data referensi", "error");
      }
    } catch (error) {
      console.error("Fetch data error:", error);
      addToast("Terjadi kesalahan sistem", "error");
    } finally {
      isLoading = false;
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    meta.page = 1;
    fetchData();
  };

  const openAddModal = () => {
    isEditMode = false;
    selectedId = null;
    formRef = { nama: "" };
    showModal = true;
  };

  const openEditModal = (record) => {
    isEditMode = true;
    selectedId = record.id;
    formRef = { nama: record.nama };
    showModal = true;
  };

  const closeModal = () => {
    showModal = false;
    formRef = { nama: "" };
  };

  const confirmDelete = (id) => {
    selectedId = id;
    showDeleteModal = true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    isSubmitting = true;

    const method = isEditMode ? "PUT" : "POST";
    const url = isEditMode
      ? `/api/v1/ref-unor/${selectedId}`
      : `/api/v1/ref-unor`;

    try {
      const result = await apiRequest(url, method, formRef);
      if (result.success) {
        addToast(
          result.message || "Referensi Unit Kerja berhasil disimpan",
          "success",
        );
        closeModal();
        fetchData();
      } else {
        addToast(result.message || "Gagal menyimpan referensi", "error");
      }
    } catch (error) {
      console.error("Submit ref error:", error);
      addToast("Terjadi kesalahan sistem", "error");
    } finally {
      isSubmitting = false;
    }
  };

  const handleDelete = async () => {
    isSubmitting = true;
    try {
      const result = await apiRequest(`/api/v1/ref-unor/${selectedId}`, "DELETE");

      if (result.success) {
        addToast("Referensi berhasil dihapus", "success");
        showDeleteModal = false;
        fetchData();
      } else {
        addToast(result.message || "Gagal menghapus referensi", "error");
      }
    } catch (error) {
      console.error("Delete error:", error);
      addToast("Terjadi kesalahan sistem", "error");
    } finally {
      isSubmitting = false;
    }
  };
</script>

<svelte:head>
  <title>Referensi Unit Kerja — App P3K</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-800">
        Referensi Unit Kerja Induk
      </h1>
      <p class="mt-1 text-sm text-slate-500">
        Kelola database master untuk merapikan isian Unit Kerja Induk.
      </p>
    </div>
    <div class="flex items-center gap-2 flex-shrink-0 flex-wrap">
      <button on:click={openAddModal} class="btn-primary gap-1.5">
        <svg
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          /></svg
        >
        Tambah Entri
      </button>
      <button
        on:click={() => fetchData(meta.page)}
        class="btn-secondary gap-1.5"
        aria-label="Refresh data"
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
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          /></svg
        >
        <span class="hidden sm:inline">Refresh</span>
      </button>
    </div>
  </div>

  <!-- Filter Panel -->
  <div class="card p-4 sm:p-5">
    <form
      on:submit={handleSearch}
      class="flex flex-col sm:flex-row items-end gap-3"
    >
      <div class="flex-1 w-full">
        <label
          for="search"
          class="block text-xs font-medium text-slate-500 mb-1.5"
          >Cari Nama Unit Kerja</label
        >
        <input
          id="search"
          type="text"
          bind:value={searchTerm}
          placeholder="Ketik nama unit kerja..."
          class="input-field"
        />
      </div>

      <div class="flex items-end gap-2 w-full sm:w-auto">
        <button type="submit" class="btn-secondary w-full sm:w-auto">
          Cari
        </button>
        {#if searchTerm}
          <button
            type="button"
            on:click={() => {
              searchTerm = "";
              fetchData();
            }}
            class="btn-secondary !text-red-500 !border-red-200 hover:!bg-red-50 flex-shrink-0"
            title="Reset filter"
            aria-label="Reset pencarian"
          >
            Clear
          </button>
        {/if}
      </div>
    </form>
  </div>

  <!-- Data Table -->
  <div class="card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200">
        <thead>
          <tr class="bg-slate-50/80">
            <th
              scope="col"
              class="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-16"
              >No</th
            >
            <th
              scope="col"
              class="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Nama Unit Kerja Induk</th
            >
            <th
              scope="col"
              class="px-4 sm:px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-32"
              >Aksi</th
            >
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {#if isLoading}
            <tr>
              <td colspan="3" class="px-6 py-16 text-center">
                <div class="flex flex-col items-center gap-3">
                  <div
                    class="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin"
                  ></div>
                  <span class="text-sm text-slate-400">Memuat referensi...</span
                  >
                </div>
              </td>
            </tr>
          {:else if records.length === 0}
            <tr>
              <td colspan="3" class="px-6 py-16 text-center">
                <div class="flex flex-col items-center gap-3">
                  <div
                    class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center"
                  >
                    <svg
                      class="w-6 h-6 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      /></svg
                    >
                  </div>
                  <span class="text-sm text-slate-400"
                    >Belum ada data referensi.</span
                  >
                </div>
              </td>
            </tr>
          {:else}
            {#each records as record, i}
              <tr class="hover:bg-blue-50/30 transition-colors">
                <td
                  class="px-4 sm:px-6 py-3.5 whitespace-nowrap text-sm text-slate-400 font-mono"
                  >{(meta.page - 1) * meta.limit + i + 1}</td
                >
                <td class="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                  <div class="text-sm font-semibold text-slate-800">
                    {record.nama}
                  </div>
                </td>
                <td
                  class="px-4 sm:px-6 py-3.5 whitespace-nowrap text-sm text-right font-medium"
                >
                  <button
                    on:click={() => openEditModal(record)}
                    class="text-blue-600 hover:text-blue-900 mr-4"
                    aria-label="Edit {record.nama}"
                  >
                    Edit
                  </button>
                  <button
                    on:click={() => confirmDelete(record.id)}
                    class="text-red-500 hover:text-red-700"
                    aria-label="Hapus {record.nama}"
                  >
                    Hapus
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
        class="border-t border-slate-100 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3"
      >
        <p class="text-sm text-slate-500">
          Menampilkan <span class="font-medium text-slate-700"
            >{(meta.page - 1) * meta.limit + 1}</span
          >
          –
          <span class="font-medium text-slate-700"
            >{Math.min(meta.page * meta.limit, meta.total)}</span
          >
          dari <span class="font-medium text-slate-700">{meta.total}</span>
        </p>
        <div class="flex items-center gap-1">
          <button
            disabled={meta.page === 1}
            on:click={() => fetchData(meta.page - 1)}
            class="btn-secondary !px-2.5 !py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Halaman sebelumnya"
          >
            ←
          </button>
          <span class="text-sm font-medium text-slate-600 px-3"
            >{meta.page} / {meta.totalPages}</span
          >
          <button
            disabled={meta.page === meta.totalPages}
            on:click={() => fetchData(meta.page + 1)}
            class="btn-secondary !px-2.5 !py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Halaman berikutnya"
          >
            →
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Form Modal (Add / Edit) -->
{#if showModal}
  <div
    class="fixed inset-0 z-50 overflow-y-auto"
    role="dialog"
    aria-modal="true"
  >
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        on:click={closeModal}
      ></div>

      <div
        class="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8 z-10 transition-all"
      >
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-xl font-bold text-slate-800">
            {isEditMode ? "Edit Referensi" : "Tambah Referensi"}
          </h3>
          <button
            on:click={closeModal}
            class="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
            aria-label="Tutup modal"
          >
            ✕
          </button>
        </div>

        <form on:submit={handleSubmit} class="space-y-4">
          <div>
            <label
              for="namaRef"
              class="block text-sm font-medium text-slate-700 mb-1"
              >Nama Unit Kerja Induk</label
            >
            <input
              id="namaRef"
              type="text"
              bind:value={formRef.nama}
              placeholder="Misal: Dinas Pendidikan"
              class="input-field"
              required
            />
          </div>

          <div
            class="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100"
          >
            <button
              type="button"
              on:click={closeModal}
              class="btn-secondary"
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button type="submit" class="btn-primary" disabled={isSubmitting}>
              {#if isSubmitting}
                Memproses...
              {:else}
                Simpan
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteModal}
  <div
    class="fixed inset-0 z-50 overflow-y-auto"
    role="dialog"
    aria-modal="true"
  >
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        on:click={() => (showDeleteModal = false)}
      ></div>

      <div
        class="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 sm:p-8 z-10 text-center"
      >
        <div
          class="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4"
        >
          <span class="text-2xl text-red-600">!</span>
        </div>
        <h3 class="text-xl font-bold text-slate-800 mb-2">Hapus Data?</h3>
        <p class="text-sm text-slate-600 mb-6">
          Apakah Anda yakin ingin menghapus referensi unit kerja ini? Tindakan
          ini tidak dapat merusak data pegawai, namun nama tersebut akan hilang
          dari daftar dropdown.
        </p>
        <div class="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            on:click={() => (showDeleteModal = false)}
            class="btn-secondary w-full"
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            type="button"
            on:click={handleDelete}
            class="w-full justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-all disabled:opacity-50"
            disabled={isSubmitting}
          >
            {#if isSubmitting}
              Menghapus...
            {:else}
              Ya, Hapus
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
