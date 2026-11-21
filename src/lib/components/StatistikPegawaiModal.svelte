<script>
  import { apiRequest } from "$lib/api";
  import { addToast } from "$lib/toastStore";

  let {
    isOpen = false,
    category = "",
    categoryLabel = "",
    value = "",
    filterValue = "",
    initialGender = "",
    onClose = () => {}
  } = $props();

  let employees = $state([]);
  let isLoading = $state(false);
  let searchQuery = $state("");
  let activeGender = $state("");
  let page = $state(1);
  const limit = 10;
  let pagination = $state({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1
  });
  let searchTimer = null;

  // Watch prop changes when modal opens
  $effect(() => {
    if (isOpen && value) {
      activeGender = initialGender || "";
      searchQuery = "";
      page = 1;
      fetchEmployees(1);
    }
  });

  function handleSearchInput() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      page = 1;
      fetchEmployees(1);
    }, 300);
  }

  function handleGenderChange(g) {
    activeGender = g;
    page = 1;
    fetchEmployees(1);
  }

  function handlePageChange(newPage) {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    page = newPage;
    fetchEmployees(newPage);
  }

  async function fetchEmployees(targetPage = 1) {
    isLoading = true;
    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: limit.toString()
      });

      if (searchQuery && searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      if (activeGender) {
        params.set("jenisKelamin", activeGender);
      }

      // Map specific category filter
      switch (category) {
        case "pendidikan":
          params.set("tingkatPendidikanNama", value);
          break;
        case "jabatan":
          params.set("jabatanNama", value);
          break;
        case "kelompokJabatan":
          params.set("kelompokJabatan", filterValue || value);
          break;
        case "unitKerja":
          params.set("unorNama", value);
          break;
        case "usia":
          params.set("ageRange", value);
          break;
        case "jenisJabatan":
          params.set("jenisJabatanNama", value);
          break;
        case "lokasiKerja":
          params.set("lokasiKerjaNama", value);
          break;
        case "demografi":
          const agamaList = ["islam", "kristen", "katolik", "hindu", "buddha", "konghucu"];
          if (agamaList.some((a) => (value || "").toLowerCase().includes(a))) {
            params.set("agamaNama", value);
          } else {
            params.set("jenisKawinNama", value);
          }
          break;
        case "pengangkatan":
          params.set("tmtCpns", filterValue || value);
          break;
      }

      const res = await apiRequest(`/api/v1/p3k-paruh-waktu/master?${params.toString()}`, "GET");
      if (res && res.success) {
        employees = res.data || [];
        pagination = res.pagination || {
          total: 0,
          page: targetPage,
          limit,
          totalPages: 1
        };
      } else {
        addToast(res?.message || "Gagal memuat daftar pegawai", "error");
      }
    } catch (err) {
      console.error("fetchEmployees error:", err);
      addToast("Terjadi kesalahan saat memuat daftar pegawai", "error");
    } finally {
      isLoading = false;
    }
  }

  function calculateAge(birthDateStr) {
    if (!birthDateStr) return "-";
    const parts = birthDateStr.trim().split("-");
    if (parts.length === 3) {
      let d = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10) - 1;
      let y = parseInt(parts[2], 10);
      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
        d = parseInt(parts[2], 10);
      }
      const birth = new Date(y, m, d);
      if (isNaN(birth.getTime())) return birthDateStr;
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const mDiff = today.getMonth() - birth.getMonth();
      if (mDiff < 0 || (mDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return `${age} thn`;
    }
    return birthDateStr;
  }

  function exportModalCsv() {
    if (!employees || employees.length === 0) return;
    const lines = [
      ["No", "NIP", "Nama", "Jenis Kelamin", "Jabatan", "Unit Kerja", "Pendidikan", "TMT CPNS", "Tanggal Lahir"],
      ...employees.map((emp, i) => [
        (pagination.page - 1) * limit + i + 1,
        `'${emp.nipBaru || ""}`,
        `"${(emp.nama || "").replace(/"/g, '""')}"`,
        emp.jenisKelamin === "L" || emp.jenisKelamin === "M" ? "Laki-laki" : "Perempuan",
        `"${(emp.jabatanNama || "").replace(/"/g, '""')}"`,
        `"${(emp.unorNama || "").replace(/"/g, '""')}"`,
        `"${(emp.tingkatPendidikanNama || emp.pendidikanNama || "").replace(/"/g, '""')}"`,
        `"${emp.tmtCpns || ""}"`,
        `"${emp.tanggalLahir || ""}"`
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8," + lines.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Pegawai_${category}_${(value || "").replace(/\s+/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Daftar pegawai berhasil diunduh", "success");
  }

  function handleKeydown(e) {
    if (e.key === "Escape" && isOpen) {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 transition-all"
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <!-- Modal Card -->
    <div
      class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      <!-- Modal Header -->
      <div class="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-violet-100 text-violet-700 border border-violet-200">
              {categoryLabel || "Statistik"}
            </span>
            <span class="text-xs font-semibold text-slate-400">·</span>
            <span class="text-xs font-bold text-slate-600">
              {pagination.total.toLocaleString("id-ID")} Pegawai Terdaftar
            </span>
          </div>
          <h2 id="modal-title" class="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
            {value}
          </h2>
          <p class="text-xs text-slate-500">
            Daftar pegawai PPPK Paruh Waktu yang termasuk dalam kelompok data ini.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            onclick={exportModalCsv}
            disabled={employees.length === 0}
            class="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-40"
            title="Unduh daftar pegawai ini ke CSV"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Ekspor
          </button>
          <button
            type="button"
            onclick={onClose}
            class="w-8 h-8 rounded-xl bg-white hover:bg-slate-200 border border-slate-200 text-slate-500 flex items-center justify-center transition-colors"
            aria-label="Tutup jendela"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Filter Controls Bar -->
      <div class="p-4 sm:px-6 bg-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <!-- Gender Filter Segmented -->
        <div class="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto text-xs font-semibold">
          <button
            type="button"
            onclick={() => handleGenderChange("")}
            class="px-3 py-1 rounded-lg transition-all {activeGender === '' ? 'bg-white text-slate-800 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'}"
          >
            Semua
          </button>
          <button
            type="button"
            onclick={() => handleGenderChange("L")}
            class="px-3 py-1 rounded-lg transition-all flex items-center gap-1 {activeGender === 'L' ? 'bg-indigo-600 text-white shadow-xs font-bold' : 'text-slate-500 hover:text-indigo-600'}"
          >
            <span class="w-1.5 h-1.5 rounded-full {activeGender === 'L' ? 'bg-white' : 'bg-indigo-500'}"></span>
            Laki-laki
          </button>
          <button
            type="button"
            onclick={() => handleGenderChange("P")}
            class="px-3 py-1 rounded-lg transition-all flex items-center gap-1 {activeGender === 'P' ? 'bg-rose-500 text-white shadow-xs font-bold' : 'text-slate-500 hover:text-rose-600'}"
          >
            <span class="w-1.5 h-1.5 rounded-full {activeGender === 'P' ? 'bg-white' : 'bg-rose-400'}"></span>
            Perempuan
          </button>
        </div>

        <!-- Search Input -->
        <div class="relative w-full sm:w-72">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            bind:value={searchQuery}
            oninput={handleSearchInput}
            placeholder="Cari NIP, nama, unit..."
            class="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      <!-- Table Body Area -->
      <div class="flex-grow overflow-y-auto min-h-[300px] p-4 sm:p-6">
        {#if isLoading}
          <div class="space-y-3 py-6">
            {#each [1, 2, 3, 4, 5] as _}
              <div class="animate-pulse p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div class="space-y-1.5">
                  <div class="h-4 w-44 bg-slate-200 rounded"></div>
                  <div class="h-3 w-28 bg-slate-100 rounded"></div>
                </div>
                <div class="h-6 w-20 bg-slate-100 rounded-lg"></div>
              </div>
            {/each}
          </div>
        {:else if employees.length === 0}
          <div class="py-16 text-center space-y-2">
            <div class="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 class="text-sm font-bold text-slate-700">Tidak ada pegawai ditemukan</h3>
            <p class="text-xs text-slate-400 max-w-sm mx-auto">
              Tidak ada data pegawai yang sesuai dengan kriteria filter pencarian atau kelompok ini.
            </p>
          </div>
        {:else}
          <div class="overflow-x-auto rounded-2xl border border-slate-100 shadow-2xs">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th class="py-3 px-3.5 text-center w-12">No</th>
                  <th class="py-3 px-4">Pegawai</th>
                  <th class="py-3 px-4">Jabatan</th>
                  <th class="py-3 px-4">Unit Kerja</th>
                  <th class="py-3 px-4">Pendidikan</th>
                  <th class="py-3 px-3 text-center">Usia</th>
                  <th class="py-3 px-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-xs text-slate-700">
                {#each employees as emp, idx}
                  {@const isMale = emp.jenisKelamin === "L" || emp.jenisKelamin === "M"}
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-3 px-3.5 text-center font-mono text-slate-400 text-[11px]">
                      {(pagination.page - 1) * limit + idx + 1}
                    </td>

                    <!-- Pegawai (Nama, NIP, Gender) -->
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-2.5">
                        <div class="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 {isMale ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'}">
                          {isMale ? "L" : "P"}
                        </div>
                        <div class="min-w-0">
                          <p class="font-bold text-slate-800 truncate" title={emp.nama}>
                            {emp.nama}
                          </p>
                          <p class="font-mono text-[11px] text-slate-400">
                            {emp.nipBaru}
                          </p>
                        </div>
                      </div>
                    </td>

                    <!-- Jabatan -->
                    <td class="py-3 px-4">
                      <p class="font-semibold text-slate-800 line-clamp-1" title={emp.jabatanNama}>
                        {emp.jabatanNama || "-"}
                      </p>
                      <span class="text-[10px] text-slate-400">
                        {emp.jenisJabatanNama || "Jabatan Pelaksana"}
                      </span>
                    </td>

                    <!-- Unit Kerja -->
                    <td class="py-3 px-4">
                      <p class="text-slate-600 line-clamp-1 text-xs" title={emp.unorNama}>
                        {emp.unorNama || "Tanpa Unit Kerja"}
                      </p>
                    </td>

                    <!-- Pendidikan -->
                    <td class="py-3 px-4">
                      <span class="inline-flex px-2 py-0.5 rounded-md font-semibold text-[10px] bg-slate-100 text-slate-700">
                        {emp.tingkatPendidikanNama || "Belum Diatur"}
                      </span>
                      {#if emp.pendidikanNama}
                        <p class="text-[10px] text-slate-400 line-clamp-1 mt-0.5" title={emp.pendidikanNama}>
                          {emp.pendidikanNama}
                        </p>
                      {/if}
                    </td>

                    <!-- Usia -->
                    <td class="py-3 px-3 text-center whitespace-nowrap">
                      <span class="font-bold text-slate-700">
                        {calculateAge(emp.tanggalLahir)}
                      </span>
                    </td>

                    <!-- Aksi -->
                    <td class="py-3 px-3.5 text-right whitespace-nowrap">
                      <a
                        href="/profil-pegawai"
                        class="px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold text-[11px] transition-colors inline-flex items-center gap-1 border border-violet-200/50"
                        title="Buka profil pegawai di menu Profil"
                      >
                        Profil
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </a>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>

      <!-- Modal Footer with Pagination -->
      <div class="p-4 sm:px-6 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div class="text-slate-500">
          Menampilkan <span class="font-bold text-slate-700">{employees.length ? (pagination.page - 1) * limit + 1 : 0}</span> sampai <span class="font-bold text-slate-700">{Math.min(pagination.page * limit, pagination.total)}</span> dari <span class="font-bold text-slate-700">{pagination.total}</span> pegawai
        </div>

        {#if pagination.totalPages > 1}
          <div class="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              type="button"
              onclick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              class="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-all font-semibold"
            >
              Sebelumnya
            </button>
            <span class="px-2 font-bold text-slate-700">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              onclick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              class="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-all font-semibold"
            >
              Berikutnya
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
