<script>
  import { addToast } from "$lib/toastStore";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let records = [];
  let isLoading = false;
  let searchTerm = "";
  let meta = {
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  };

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login untuk mengakses halaman ini", "error");
      goto("/login");
      return;
    }
    fetchDifferences();
  });

  const fetchDifferences = async (page = 1) => {
    isLoading = true;
    try {
      const queryParams = new URLSearchParams({
        page: page,
        limit: meta.limit,
      });
      if (searchTerm) queryParams.append("search", searchTerm);

      const result = await apiRequest(`/api/v1/data-p3k/differences?${queryParams.toString()}`, "GET");
      if (result.success) {
        records = result.data;
        meta = result.meta || meta;
      } else {
        addToast(result.message || "Gagal memuat data", "error");
      }
    } catch (error) {
      console.error("Fetch differences error:", error);
      addToast("Terjadi kesalahan sistem", "error");
    } finally {
      isLoading = false;
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    meta.page = 1;
    fetchDifferences();
  };

  const resetSearch = () => {
    searchTerm = "";
    meta.page = 1;
    fetchDifferences();
  };
</script>

<svelte:head>
  <title>Perbedaan Data Utama & Import — SIPPPK</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
        Perbedaan Data P3K
      </h1>
      <p class="mt-2 text-sm text-slate-500 max-w-2xl">
        Menampilkan perbedaan data berdasarkan NIP, Nama, dan Unit Kerja antara
        Data P3K Utama dan Data Import SIASN.
      </p>
    </div>
  </div>

  <div class="card p-6 border-t-4 border-t-rose-500 shadow-sm">
    <!-- Filters & Search -->
    <div
      class="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6"
    >
      <form
        onsubmit={handleSearch}
        class="w-full sm:max-w-xs relative flex gap-2"
      >
        <div class="relative flex-grow">
          <div
            class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
          >
            <svg
              class="w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            bind:value={searchTerm}
            class="input-field pl-9 pr-4 text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors"
            placeholder="Cari NIP / Nama / Unit..."
          />
          {#if searchTerm}
            <button
              type="button"
              onclick={resetSearch}
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          {/if}
        </div>
        <button
          type="submit"
          class="btn-primary whitespace-nowrap px-4 tracking-wide shadow-sm hover:shadow active:scale-95 transition-all"
        >
          Cari
        </button>
      </form>

      <div
        class="text-sm font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center gap-2"
      >
        Total Perbedaan: <span
          class="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md min-w-[2rem] text-center inline-block"
          >{meta.total}</span
        >
      </div>
    </div>

    <!-- Table -->
    <div
      class="overflow-x-auto -mx-6 sm:mx-0 rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5"
    >
      <table class="min-w-full divide-y divide-slate-200 text-sm">
        <thead>
          <tr class="bg-slate-50/80">
            <th
              scope="col"
              class="py-3.5 pl-4 pr-3 text-left font-semibold text-slate-700 sm:pl-6 w-12"
              >No</th
            >
            <th
              scope="col"
              class="px-3 py-3.5 text-left font-semibold text-slate-700"
              >NIP Baru</th
            >
            <th
              scope="col"
              class="px-3 py-3.5 text-left font-semibold text-slate-700"
              >Nama (Utama vs Import)</th
            >
            <th
              scope="col"
              class="px-3 py-3.5 text-left font-semibold text-slate-700"
              >Unit Kerja (Utama vs Import)</th
            >
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">
          {#if isLoading}
            <tr>
              <td colspan="4" class="py-12 text-center">
                <svg
                  class="animate-spin -ml-1 mr-3 h-8 w-8 text-rose-500 inline-block"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <p class="mt-3 text-sm text-slate-500 font-medium">
                  Memuat data perbedaan...
                </p>
              </td>
            </tr>
          {:else if records.length === 0}
            <tr>
              <td colspan="4" class="py-12 text-center">
                <div
                  class="w-16 h-16 rounded-full bg-slate-50 mx-auto flex items-center justify-center mb-3 border border-slate-100 shadow-sm"
                >
                  <svg
                    class="w-8 h-8 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p class="text-base text-slate-600 font-medium">
                  Tidak ada perbedaan data
                </p>
                <p class="text-sm text-slate-400 mt-1">
                  Semua data antara tabel utama dan import sudah
                  tersinkronisasi.
                </p>
              </td>
            </tr>
          {:else}
            {#each records as record, i}
              <tr class="hover:bg-slate-50/80 transition-colors group">
                <td
                  class="whitespace-nowrap py-4 pl-4 pr-3 text-slate-500 font-medium sm:pl-6"
                >
                  {(meta.page - 1) * meta.limit + i + 1}
                </td>
                <td class="whitespace-nowrap px-3 py-4">
                  <span
                    class="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-50 text-slate-700 border border-slate-200 font-mono text-xs tracking-wide group-hover:bg-white transition-colors"
                  >
                    {record.nip || "-"}
                  </span>
                </td>
                <td class="px-3 py-4">
                  <div class="flex flex-col gap-1.5">
                    <div class="flex items-start gap-2">
                      <span
                        class="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12 pt-0.5"
                        >Utama</span
                      >
                      <span class="text-slate-800 font-medium"
                        >{record.namaUtama || "-"}</span
                      >
                    </div>
                    {#if record.namaUtama !== record.namaImport}
                      <div class="flex items-start gap-2">
                        <span
                          class="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12 pt-0.5"
                          >Import</span
                        >
                        <span
                          class="text-rose-600 bg-rose-50 px-1 rounded font-medium"
                          >{record.namaImport || "-"}</span
                        >
                      </div>
                    {:else}
                      <div class="flex items-start gap-2">
                        <span
                          class="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12 pt-0.5"
                          >Import</span
                        >
                        <span class="text-slate-500"
                          >{record.namaImport || "-"}</span
                        >
                      </div>
                    {/if}
                  </div>
                </td>
                <td class="px-3 py-4 max-w-sm">
                  <div class="flex flex-col gap-1.5">
                    <div class="flex items-start gap-2">
                      <span
                        class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 w-12"
                        >Utama</span
                      >
                      <span
                        class="text-slate-600 line-clamp-2"
                        title={record.unorUtama}>{record.unorUtama || "-"}</span
                      >
                    </div>
                    {#if record.unorUtama !== record.unorImport}
                      <div class="flex items-start gap-2">
                        <span
                          class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 w-12"
                          >Import</span
                        >
                        <span
                          class="text-amber-600 bg-amber-50 px-1 rounded line-clamp-2"
                          title={record.unorImport}
                          >{record.unorImport || "-"}</span
                        >
                      </div>
                    {:else}
                      <div class="flex items-start gap-2">
                        <span
                          class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 w-12"
                          >Import</span
                        >
                        <span
                          class="text-slate-500 line-clamp-2"
                          title={record.unorImport}
                          >{record.unorImport || "-"}</span
                        >
                      </div>
                    {/if}
                  </div>
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
        class="flex items-center justify-between border-t border-slate-200 px-4 py-3 sm:px-6 mt-6 bg-white rounded-xl shadow-sm ring-1 ring-slate-900/5"
      >
        <div class="flex flex-1 justify-between sm:hidden">
          <button
            onclick={() => fetchDifferences(meta.page - 1)}
            disabled={meta.page === 1}
            class="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Sebelumnya
          </button>
          <button
            onclick={() => fetchDifferences(meta.page + 1)}
            disabled={meta.page === meta.totalPages}
            class="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Selanjutnya
          </button>
        </div>
        <div
          class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between"
        >
          <div>
            <p class="text-sm text-slate-700">
              Menampilkan
              <span class="font-medium">{(meta.page - 1) * meta.limit + 1}</span
              >
              sampai
              <span class="font-medium"
                >{Math.min(meta.page * meta.limit, meta.total)}</span
              >
              dari <span class="font-medium">{meta.total}</span> data
            </p>
          </div>
          <div>
            <nav
              class="isolate inline-flex -space-x-px rounded-md shadow-sm"
              aria-label="Pagination"
            >
              <button
                onclick={() => fetchDifferences(meta.page - 1)}
                disabled={meta.page === 1}
                class="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50 focus:z-20 focus:outline-offset-0"
              >
                <span class="sr-only">Sebelumnya</span>
                <svg
                  class="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                  ><path
                    fill-rule="evenodd"
                    d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                    clip-rule="evenodd"
                  /></svg
                >
              </button>

              <span
                class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 focus:outline-offset-0 bg-white"
              >
                {meta.page} / {meta.totalPages}
              </span>

              <button
                onclick={() => fetchDifferences(meta.page + 1)}
                disabled={meta.page === meta.totalPages}
                class="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50 focus:z-20 focus:outline-offset-0"
              >
                <span class="sr-only">Selanjutnya</span>
                <svg
                  class="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                  ><path
                    fill-rule="evenodd"
                    d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                    clip-rule="evenodd"
                  /></svg
                >
              </button>
            </nav>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
