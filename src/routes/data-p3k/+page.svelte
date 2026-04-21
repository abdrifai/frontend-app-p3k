<script>
  import { addToast } from "$lib/toastStore";
  import { authStore } from "$lib/store";
  import { apiRequest, API_BASE_URL } from "$lib/api";
  import { onMount, tick } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import * as XLSX from "xlsx";

  let records = [];
  let isLoading = true;
  let isExporting = false;
  let searchTerm = "";
  let filterUnitKerja = "";
  let filterUnitKerjaStatus = "ADA"; // "ALL", "ADA", "KOSONG"
  let filterTmtCpns = "";
  let filterPendidikan = "";
  let filterGolongan = "";
  let filterJenisJabatan = "";
  let showFilters = false;
  let meta = {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  };

  let selectedRecord = null;
  let showModal = false;
  let showEditModal = false;
  let isSubmitting = false;
  let editForm = {
    nama: "",
    unorNama: "",
    unorIndukId: null,
  };

  // Unor Lookup State
  let unorSearchTerm = "";
  let unorResults = [];
  let isSearchingUnor = false;
  let showUnorDropdown = false;
  let searchTimeout = null;

  // Filter Unor Lookup State
  let filterUnorResults = [];
  let isSearchingFilterUnor = false;
  let showFilterUnorDropdown = false;
  let filterSearchTimeout = null;

  // Contract State
  let contracts = [];
  let isLoadingContracts = false;
  let showContractForm = false;
  let isSubmittingContract = false;
  let contractForm = {
    tanggalMulai: "",
    tanggalSelesai: "",
    keterangan: "",
  };
  let contractFile = null;
  let contractFileInput = null;

  $: hasActiveFilters =
    searchTerm ||
    filterUnitKerja ||
    filterTmtCpns ||
    filterUnitKerjaStatus !== "ALL" ||
    filterPendidikan ||
    filterGolongan ||
    filterJenisJabatan;

  $: hasUrlParams =
    $page.url.searchParams.has("tmtCpns") ||
    $page.url.searchParams.has("unitKerja") ||
    $page.url.searchParams.has("unitKerjaStatus") ||
    $page.url.searchParams.has("pendidikan") ||
    $page.url.searchParams.has("golongan") ||
    $page.url.searchParams.has("jenisJabatan");

  const calculateAge = (birthDateStr) => {
    if (!birthDateStr) return "-";
    let birthDate = new Date(birthDateStr);
    if (isNaN(birthDate.getTime())) {
      const parts = birthDateStr.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 2 && parts[2].length === 4) {
          birthDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else {
          birthDate = new Date(birthDateStr);
        }
      }
    }
    if (isNaN(birthDate.getTime())) return birthDateStr;
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();
    if (days < 0) {
      months--;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    return `${years} thn, ${months} bln, ${days} hari`;
  };

  const RETIREMENT_AGE = 58;

  const calculateRetirement = (birthDateStr) => {
    if (!birthDateStr) return null;
    const parts = birthDateStr.split(/[-/]/);
    if (parts.length !== 3) return null;

    let bDay, bMonth, bYear;
    if (parts[0].length === 2 && parts[2].length === 4) {
      bDay = parseInt(parts[0]);
      bMonth = parseInt(parts[1]) - 1;
      bYear = parseInt(parts[2]);
    } else {
      bYear = parseInt(parts[0]);
      bMonth = parseInt(parts[1]) - 1;
      bDay = parseInt(parts[2]);
    }

    const retirementDate = new Date(bYear + RETIREMENT_AGE, bMonth, bDay);
    if (isNaN(retirementDate.getTime())) return null;

    const today = new Date();
    const isPast = retirementDate <= today;

    // Calculate time difference
    let targetDate, refDate;
    if (isPast) {
      targetDate = today;
      refDate = retirementDate;
    } else {
      targetDate = retirementDate;
      refDate = today;
    }

    let years = targetDate.getFullYear() - refDate.getFullYear();
    let months = targetDate.getMonth() - refDate.getMonth();
    let days = targetDate.getDate() - refDate.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        0,
      );
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const retDateStr = `${String(retirementDate.getDate()).padStart(2, "0")}-${String(retirementDate.getMonth() + 1).padStart(2, "0")}-${retirementDate.getFullYear()}`;

    return {
      date: retDateStr,
      isPast,
      remaining: `${years} thn, ${months} bln, ${days} hari`,
      retirementYear: bYear + RETIREMENT_AGE,
    };
  };

  const openDetailModal = (record) => {
    selectedRecord = record;
    showModal = true;
    fetchContracts(record.nipBaru);
  };

  const closeModal = () => {
    showModal = false;
    selectedRecord = null;
    contracts = [];
    showContractForm = false;
  };

  // Contract Functions
  const fetchContracts = async (nipBaru) => {
    isLoadingContracts = true;
    try {
      const result = await apiRequest(`/api/v1/kontrak/${nipBaru}`, "GET");
      if (result.success) {
        contracts = result.data.contracts || [];
      } else {
        contracts = [];
      }
    } catch (error) {
      console.error("Fetch contracts error:", error);
      contracts = [];
    } finally {
      isLoadingContracts = false;
    }
  };

  const openContractForm = () => {
    contractForm = { 
      tanggalMulai: "", 
      tanggalSelesai: "", 
      keterangan: "",
      nomorKontrak: "",
      golongan: selectedRecord.golAkhirNama || selectedRecord.golAwalNama || "",
      gajiPokok: "",
      mkTahun: selectedRecord.mkTahun || 0,
      mkBulan: selectedRecord.mkBulan || 0
    };
    contractFile = null;
    showContractForm = true;
  };

  const closeContractForm = () => {
    showContractForm = false;
    contractFile = null;
  };

  const handleContractFileChange = (e) => {
    contractFile = e.target.files[0] || null;
  };

  const handleAddContract = async (e) => {
    e.preventDefault();
    if (!contractForm.tanggalMulai || !contractForm.tanggalSelesai) {
      addToast("Tanggal mulai dan selesai kontrak wajib diisi", "error");
      return;
    }
    isSubmittingContract = true;
    try {
      const formData = new FormData();
      formData.append("nipBaru", selectedRecord.nipBaru);
      formData.append("tanggalMulai", contractForm.tanggalMulai);
      formData.append("tanggalSelesai", contractForm.tanggalSelesai);
      if (contractForm.keterangan) {
        formData.append("keterangan", contractForm.keterangan);
      }
      if (contractForm.nomorKontrak) {
        formData.append("nomorKontrak", contractForm.nomorKontrak);
      }
      if (contractForm.golongan) {
        formData.append("golongan", contractForm.golongan);
      }
      if (contractForm.gajiPokok) {
        formData.append("gajiPokok", contractForm.gajiPokok);
      }
      if (contractForm.mkTahun !== undefined) {
        formData.append("mkTahun", contractForm.mkTahun);
      }
      if (contractForm.mkBulan !== undefined) {
        formData.append("mkBulan", contractForm.mkBulan);
      }
      if (contractFile) {
        formData.append("file", contractFile);
      }

      const result = await apiRequest("/api/v1/kontrak", "POST", formData, true);
      if (result.success) {
        addToast(result.message || "Kontrak berhasil ditambahkan", "success");
        closeContractForm();
        await fetchContracts(selectedRecord.nipBaru);
      } else {
        addToast(result.message || "Gagal menambahkan kontrak", "error");
      }
    } catch (error) {
      console.error("Add contract error:", error);
      addToast("Terjadi kesalahan sistem", "error");
    } finally {
      isSubmittingContract = false;
    }
  };

  const handleDeleteContract = async (contractId) => {
    if (!confirm("Apakah Anda yakin ingin menghapus riwayat kontrak ini?")) return;
    try {
      const result = await apiRequest(`/api/v1/kontrak/${contractId}`, "DELETE");
      if (result.success) {
        addToast(result.message || "Kontrak berhasil dihapus", "success");
        await fetchContracts(selectedRecord.nipBaru);
      } else {
        addToast(result.message || "Gagal menghapus kontrak", "error");
      }
    } catch (error) {
      console.error("Delete contract error:", error);
      addToast("Terjadi kesalahan sistem", "error");
    }
  };

  const openEditModal = () => {
    editForm = {
      nama: selectedRecord.nama || "",
      unorNama: selectedRecord.unorNama || "",
      unorIndukId: selectedRecord.unorIndukId || null,
    };
    unorSearchTerm = selectedRecord.unorInduk?.nama || "";
    showEditModal = true;
  };

  const closeEditModal = () => {
    showEditModal = false;
    unorSearchTerm = "";
    unorResults = [];
    showUnorDropdown = false;
  };

  const handleUnorSearch = (e) => {
    const value = e.target.value;
    unorSearchTerm = value;
    editForm.unorIndukId = null; // reset id when typing custom search

    if (searchTimeout) clearTimeout(searchTimeout);

    if (value.trim().length < 2) {
      unorResults = [];
      showUnorDropdown = false;
      return;
    }

    searchTimeout = setTimeout(async () => {
      isSearchingUnor = true;
      try {
        const result = await apiRequest(`/api/v1/ref-unor?search=${encodeURIComponent(value)}&limit=5`, "GET");
        if (result.success) {
          unorResults = result.data;
          showUnorDropdown = true;
        }
      } catch (err) {
        console.error("Unor search error:", err);
      } finally {
        isSearchingUnor = false;
      }
    }, 300);
  };

  const selectUnor = (id, nama) => {
    editForm.unorIndukId = id;
    unorSearchTerm = nama;
    showUnorDropdown = false;
  };

  const handleFilterUnorSearch = (e) => {
    const value = e.target.value;
    filterUnitKerja = value;

    if (filterSearchTimeout) clearTimeout(filterSearchTimeout);

    if (value.trim().length < 2) {
      filterUnorResults = [];
      showFilterUnorDropdown = false;
      return;
    }

    filterSearchTimeout = setTimeout(async () => {
      isSearchingFilterUnor = true;
      try {
        const result = await apiRequest(`/api/v1/ref-unor?search=${encodeURIComponent(value)}&limit=5`, "GET");
        if (result.success) {
          filterUnorResults = result.data;
          showFilterUnorDropdown = true;
        }
      } catch (err) {
        console.error("Filter Unor search error:", err);
      } finally {
        isSearchingFilterUnor = false;
      }
    }, 300);
  };

  const selectFilterUnor = (nama) => {
    filterUnitKerja = nama;
    showFilterUnorDropdown = false;
    meta.page = 1;
    fetchData();
  };

  const handleUpdateData = async (e) => {
    e.preventDefault();
    isSubmitting = true;
    try {
      const result = await apiRequest(`/api/v1/data-p3k/${selectedRecord.nipBaru}`, "PUT", editForm);
      if (result.success) {
        addToast(result.message || "Data berhasil diperbarui", "success");
        // Refetch or update optimistic
        selectedRecord = {
          ...selectedRecord,
          ...editForm,
          unorInduk: { nama: unorSearchTerm },
        };
        const index = records.findIndex(
          (r) => r.nipBaru === selectedRecord.nipBaru,
        );
        if (index !== -1) {
          records[index] = {
            ...records[index],
            ...editForm,
            unorInduk: { nama: unorSearchTerm },
          };
        }
        records = [...records]; // trigger reactivity
        closeEditModal();
        await fetchData(meta.page);
      } else {
        addToast(result.message || "Gagal memperbarui data", "error");
      }
    } catch (error) {
      console.error("Update data error:", error);
      addToast("Terjadi kesalahan sistem", "error");
    } finally {
      isSubmitting = false;
    }
  };

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login untuk mengakses halaman ini", "error");
      goto("/login");
      return;
    }

    // Check url params for pre-filters
    const tmtQuery = $page.url.searchParams.get("tmtCpns");
    if (tmtQuery) {
      filterTmtCpns = tmtQuery;
      showFilters = true;
    }

    const unitKerjaQuery = $page.url.searchParams.get("unitKerja");
    if (unitKerjaQuery) {
      filterUnitKerja = unitKerjaQuery;
      showFilters = true;
    }

    const unitKerjaStatusQuery = $page.url.searchParams.get("unitKerjaStatus");
    if (unitKerjaStatusQuery) {
      filterUnitKerjaStatus = unitKerjaStatusQuery;
      showFilters = true;
    }

    const pendidikanQuery = $page.url.searchParams.get("pendidikan");
    if (pendidikanQuery) {
      filterPendidikan = pendidikanQuery;
      showFilters = true;
    }

    const golonganQuery = $page.url.searchParams.get("golongan");
    if (golonganQuery) {
      filterGolongan = golonganQuery;
      showFilters = true;
    }

    const jenisJabatanQuery = $page.url.searchParams.get("jenisJabatan");
    if (jenisJabatanQuery) {
      filterJenisJabatan = jenisJabatanQuery;
      showFilters = true;
    }

    fetchData();
  });

  const fetchData = async (page = 1) => {
    isLoading = true;
    try {
      const queryParams = new URLSearchParams({
        page: page,
        limit: meta.limit,
        statusPensiun: "AKTIF",
      });
      if (searchTerm) queryParams.append("search", searchTerm);
      if (filterUnitKerjaStatus === "KOSONG") {
        queryParams.append("unitKerjaKosong", "true");
      } else if (filterUnitKerjaStatus === "ADA") {
        queryParams.append("unitKerjaAda", "true");
        if (filterUnitKerja) queryParams.append("unitKerja", filterUnitKerja);
      } else if (filterUnitKerja) {
        queryParams.append("unitKerja", filterUnitKerja);
      }
      if (filterTmtCpns) queryParams.append("tmtCpns", filterTmtCpns);
      if (filterPendidikan) queryParams.append("pendidikan", filterPendidikan);
      if (filterGolongan) queryParams.append("golongan", filterGolongan);
      if (filterJenisJabatan) queryParams.append("jenisJabatan", filterJenisJabatan);

      const result = await apiRequest(`/api/v1/data-p3k?${queryParams.toString()}`, "GET");
      if (result.success) {
        records = result.data;
        meta = result.meta;
      } else {
        addToast(result.message || "Gagal memuat data", "error");
      }
    } catch (error) {
      console.error("Fetch data error:", error);
      addToast("Terjadi kesalahan sistem", "error");
    } finally {
      isLoading = false;
    }
  };

  const handleExportExcel = async () => {
    isExporting = true;
    try {
      const queryParams = new URLSearchParams({
        page: 1,
        limit: 100000,
        statusPensiun: "AKTIF",
      });
      // deliberately omitting searchTerm (NIP / Nama)
      if (filterUnitKerjaStatus === "KOSONG") {
        queryParams.append("unitKerjaKosong", "true");
      } else if (filterUnitKerjaStatus === "ADA") {
        queryParams.append("unitKerjaAda", "true");
        if (filterUnitKerja) queryParams.append("unitKerja", filterUnitKerja);
      } else if (filterUnitKerja) {
        queryParams.append("unitKerja", filterUnitKerja);
      }
      if (filterTmtCpns) queryParams.append("tmtCpns", filterTmtCpns);
      if (filterPendidikan) queryParams.append("pendidikan", filterPendidikan);
      if (filterGolongan) queryParams.append("golongan", filterGolongan);
      if (filterJenisJabatan) queryParams.append("jenisJabatan", filterJenisJabatan);

      const result = await apiRequest(`/api/v1/data-p3k?${queryParams.toString()}`, "GET");
      if (result.success) {
        const exportData = result.data.map((record, index) => ({
          "No": index + 1,
          "NIP / NI PPPK": record.nipBaru,
          "Nama": record.nama,
          "Gelar Depan": record.gelarDepan || "-",
          "Gelar Belakang": record.gelarBelakang || "-",
          "TTL": `${record.tempatLahirNama || '-'}, ${record.tanggalLahir || '-'}`,
          "Unit Kerja": record.unorNama || "-",
          "Unit Kerja Induk": record.unorInduk?.nama || "-",
          "Pendidikan": record.pendidikanNama || "-",
          "Jabatan": record.jabatanNama || "-",
          "Golongan": record.golAkhirNama || record.golAwalNama || "-",
          "TMT PPPK": record.tmtCpns || "-"
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data Pegawai");
        
        XLSX.writeFile(workbook, `Data_Pegawai_P3K_${new Date().toISOString().split('T')[0]}.xlsx`);

        addToast("Berhasil mengekspor data ke Excel", "success");
      } else {
        addToast(result.message || "Gagal memuat data untuk export", "error");
      }
    } catch (error) {
      console.error("Export excel error:", error);
      addToast("Terjadi kesalahan sistem saat export", "error");
    } finally {
      isExporting = false;
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    meta.page = 1;
    fetchData();
  };

  const resetFilters = () => {
    searchTerm = "";
    filterUnitKerja = "";
    filterUnitKerjaStatus = "ALL";
    filterTmtCpns = "";
    filterPendidikan = "";
    filterGolongan = "";
    filterJenisJabatan = "";
    // remove from url if present
    if (hasUrlParams) {
      const newUrl = new URL($page.url);
      newUrl.searchParams.delete("tmtCpns");
      newUrl.searchParams.delete("unitKerja");
      newUrl.searchParams.delete("unitKerjaStatus");
      newUrl.searchParams.delete("pendidikan");
      newUrl.searchParams.delete("golongan");
      newUrl.searchParams.delete("jenisJabatan");
      goto(newUrl.toString(), { replaceState: true, keepFocus: true });
    }
    meta.page = 1;
    fetchData();
  };
</script>

<svelte:head>
  <title>Data P3K — App P3K</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-800">
        {searchTerm ? "Hasil Pencarian Pegawai" : "Data Pegawai P3K Aktif"}
      </h1>
      <p class="mt-1 text-sm text-slate-500">
        {searchTerm 
          ? `Menampilkan hasil pencarian untuk "${searchTerm}".`
          : "Data sentral pegawai PPPK aktif yang terdaftar di sistem."
        } Menampilkan <span
          class="font-semibold text-blue-600">{(meta.total || 0).toLocaleString('id-ID')}</span
        >
        sesuai kriteria, dari total keseluruhan
        <span class="font-semibold text-slate-700">{(meta.totalActive || 0).toLocaleString('id-ID')}</span
        > pegawai aktif.
      </p>
    </div>
    <div class="flex items-center gap-2 flex-shrink-0 flex-wrap">
      <a href="/statistik-p3k" class="btn-secondary gap-1.5">
        <svg
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          /></svg
        >
        Statistik
      </a>
      <button
        on:click={() => (showFilters = !showFilters)}
        class="btn-secondary gap-1.5"
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
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          /></svg
        >
        Filter
        {#if hasActiveFilters}
          <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
        {/if}
      </button>
      {#if hasUrlParams}
        <button
          on:click={handleExportExcel}
          disabled={isExporting}
          class="btn-secondary gap-1.5 !text-emerald-700 !border-emerald-200 hover:!bg-emerald-50"
        >
          {#if isExporting}
            <div class="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span class="hidden sm:inline">Mengekspor...</span>
          {:else}
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span class="hidden sm:inline">Export Excel</span>
          {/if}
        </button>
      {/if}
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
  {#if showFilters}
    <div class="card p-4 sm:p-5">
      <form
        on:submit={handleSearch}
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <div>
          <label
            for="search"
            class="block text-xs font-medium text-slate-500 mb-1.5"
            >Cari Nama / NIP</label
          >
          <input
            id="search"
            type="text"
            bind:value={searchTerm}
            placeholder="Ketik nama atau NIP..."
            class="input-field"
          />
        </div>
        <div class="flex flex-col relative w-full lg:col-span-2">
          <label
            for="unitKerja"
            class="block text-xs font-medium text-slate-500 mb-1.5"
            >Unit Kerja Induk (Unor Induk)</label
          >
          <div class="relative">
            <input
              id="unitKerja"
              type="text"
              value={filterUnitKerja}
              on:input={handleFilterUnorSearch}
              on:focus={() => {
                if (filterUnitKerja.trim().length >= 2)
                  showFilterUnorDropdown = true;
              }}
              on:blur={() =>
                setTimeout(() => (showFilterUnorDropdown = false), 200)}
              placeholder="Ketik untuk mencari referensi..."
              class="input-field w-full"
            />
            {#if isSearchingFilterUnor}
              <div class="absolute right-3 top-2.5">
                <div
                  class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"
                ></div>
              </div>
            {/if}
            {#if showFilterUnorDropdown && !isSearchingFilterUnor}
              <ul
                class="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-48 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
              >
                {#if filterUnorResults.length > 0}
                  {#each filterUnorResults as result}
                    <li
                      class="text-slate-900 cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50"
                      on:click={() => selectFilterUnor(result.nama)}
                    >
                      <span class="block truncate font-medium"
                        >{result.nama}</span
                      >
                    </li>
                  {/each}
                {:else}
                  <li
                    class="text-slate-500 cursor-default select-none relative py-2 pl-3 pr-9 italic text-sm"
                  >
                    Referensi tidak ditemukan
                  </li>
                {/if}
              </ul>
            {/if}
          </div>
          <div class="mt-2 text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Status Unor Induk</div>
          <div class="flex gap-4">
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="unorStatus"
                value="ALL"
                bind:group={filterUnitKerjaStatus}
                class="w-3 h-3 text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span class="text-xs text-slate-600">Semua</span>
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="unorStatus"
                value="ADA"
                bind:group={filterUnitKerjaStatus}
                class="w-3 h-3 text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span class="text-xs text-slate-600">Sudah Ada</span>
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="unorStatus"
                value="KOSONG"
                bind:group={filterUnitKerjaStatus}
                class="w-3 h-3 text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span class="text-xs text-slate-600">Kosong</span>
            </label>
          </div>
        </div>
        <div>
          <label
            for="tmtCpns"
            class="block text-xs font-medium text-slate-500 mb-1.5"
            >TMT Perangkatan</label
          >
          <input
            id="tmtCpns"
            type="text"
            bind:value={filterTmtCpns}
            placeholder="TMT (misal: 2021-01-01)..."
            class="input-field"
          />
        </div>
        <div>
          <label
            for="pendidikan"
            class="block text-xs font-medium text-slate-500 mb-1.5"
            >Pendidikan</label
          >
          <input
            id="pendidikan"
            type="text"
            bind:value={filterPendidikan}
            placeholder="Filter Pendidikan..."
            class="input-field"
          />
        </div>
        <div>
          <label
            for="golongan"
            class="block text-xs font-medium text-slate-500 mb-1.5"
            >Golongan</label
          >
          <input
            id="golongan"
            type="text"
            bind:value={filterGolongan}
            placeholder="Filter Golongan..."
            class="input-field"
          />
        </div>
        <div>
          <label
            for="jenisJabatan"
            class="block text-xs font-medium text-slate-500 mb-1.5"
            >Jenis Jabatan</label
          >
          <input
            id="jenisJabatan"
            type="text"
            bind:value={filterJenisJabatan}
            placeholder="Filter Jenis Jabatan..."
            class="input-field"
          />
        </div>

        <div class="flex items-end gap-2">
          <button type="submit" class="btn-primary flex-1">
            <svg
              class="w-4 h-4 mr-1.5"
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
            Cari
          </button>
          {#if hasActiveFilters}
            <button
              type="button"
              on:click={resetFilters}
              class="btn-secondary !text-red-500 !border-red-200 hover:!bg-red-50 flex-shrink-0"
              title="Reset semua filter"
              aria-label="Reset filter"
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
                  d="M6 18L18 6M6 6l12 12"
                /></svg
              >
            </button>
          {/if}
        </div>
      </form>
    </div>
  {/if}

  <!-- Data Table -->
  <div class="card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200">
        <thead>
          <tr class="bg-slate-50/80">
            <th
              scope="col"
              class="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >No</th
            >
            <th
              scope="col"
              class="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >NIP Baru</th
            >
            <th
              scope="col"
              class="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Nama</th
            >
            <th
              scope="col"
              class="hidden md:table-cell px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Pendidikan</th
            >
            <th
              scope="col"
              class="hidden lg:table-cell px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Tanggal Lahir</th
            >
            <th
              scope="col"
              class="hidden lg:table-cell px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Unor SIASN</th
            >
            <th
              scope="col"
              class="hidden lg:table-cell px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Unit Kerja Induk</th
            >
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {#if isLoading}
            <tr>
              <td colspan="7" class="px-6 py-16 text-center">
                <div class="flex flex-col items-center gap-3">
                  <div
                    class="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin"
                  ></div>
                  <span class="text-sm text-slate-400">Memuat data...</span>
                </div>
              </td>
            </tr>
          {:else if records.length === 0}
            <tr>
              <td colspan="7" class="px-6 py-16 text-center">
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
                    >Tidak ada data tersedia.</span
                  >
                  {#if hasActiveFilters}
                    <button
                      on:click={resetFilters}
                      class="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >Hapus filter</button
                    >
                  {/if}
                </div>
              </td>
            </tr>
          {:else}
            {#each records as record, i}
              <tr
                class="hover:bg-blue-50/30 transition-colors cursor-pointer"
                on:click={() => openDetailModal(record)}
              >
                <td class="px-4 sm:px-6 py-3.5 whitespace-nowrap text-sm text-slate-400 font-mono">
                  {(meta.page - 1) * meta.limit + i + 1}
                </td>
                <td class="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-slate-600 font-mono">{record.nipBaru || "-"}</span>
                    {#if record.statusPensiun === "PENSIUN"}
                      <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 uppercase tracking-tighter">Pensiun</span>
                    {/if}
                  </div>
                </td>
                <td class="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                  <div class="flex flex-col">
                    <div class="text-sm font-semibold text-slate-800">
                      {record.nama}{record.gelarBelakang
                        ? ", " + record.gelarBelakang
                        : ""}
                    </div>
                    {#if record.statusPensiun === "PENSIUN"}
                      <div class="text-[10px] font-medium text-red-500 flex items-center gap-1 mt-0.5">
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Sudah Berhenti / Pensiun
                      </div>
                    {/if}
                  </div>
                  <div class="text-xs text-slate-400 md:hidden mt-0.5">
                    {record.pendidikanNama || "-"}
                  </div>
                </td>
                <td class="hidden md:table-cell px-4 sm:px-6 py-3.5 whitespace-nowrap text-sm text-slate-500">
                  {record.pendidikanNama || "-"}
                </td>
                <td
                  class="hidden lg:table-cell px-4 sm:px-6 py-3.5 whitespace-nowrap text-sm text-slate-500"
                  >{record.tanggalLahir || "-"}</td
                >
                <td
                  class="hidden lg:table-cell px-4 sm:px-6 py-3.5 text-sm text-slate-500 max-w-[200px] truncate"
                  title={record.unorNama || "-"}
                  >{record.unorNama || "-"}
                </td>
                <td
                  class="hidden lg:table-cell px-4 sm:px-6 py-3.5 text-sm text-slate-500 max-w-[200px] truncate"
                  title={record.unorInduk?.nama || "-"}
                  >{record.unorInduk?.nama || "-"}
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
          <span class="text-sm font-medium text-slate-600 px-3"
            >{meta.page} / {meta.totalPages}</span
          >
          <button
            disabled={meta.page === meta.totalPages}
            on:click={() => fetchData(meta.page + 1)}
            class="btn-secondary !px-2.5 !py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Halaman berikutnya"
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

<!-- Detail Modal -->
{#if showModal && selectedRecord}
  <div
    class="fixed z-50 inset-0 overflow-y-auto"
    role="dialog"
    aria-modal="true"
  >
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <button
        type="button"
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity w-full h-full border-none cursor-default"
        on:click={closeModal}
        aria-label="Tutup modal"
      ></button>

      <div
        class="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 z-10"
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
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-800">Detail Pegawai</h3>
            <p class="text-sm text-slate-400">Informasi profil PPPK</p>
          </div>
          <button
            on:click={closeModal}
            class="ml-auto p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Tutup detail"
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
                {selectedRecord.nipBaru || "-"}
              </dd>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt
                class="text-xs font-medium text-slate-400 uppercase tracking-wide"
              >
                Nama
              </dt>
              <dd class="mt-1.5 text-sm text-slate-800 font-semibold">
                {selectedRecord.nama || "-"}
              </dd>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt
                class="text-xs font-medium text-slate-400 uppercase tracking-wide"
              >
                Gelar Depan
              </dt>
              <dd class="mt-1.5 text-sm text-slate-700">
                {selectedRecord.gelarDepan || "-"}
              </dd>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt
                class="text-xs font-medium text-slate-400 uppercase tracking-wide"
              >
                Gelar Belakang
              </dt>
              <dd class="mt-1.5 text-sm text-slate-700">
                {selectedRecord.gelarBelakang || "-"}
              </dd>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt
                class="text-xs font-medium text-slate-400 uppercase tracking-wide"
              >
                Tanggal Lahir
              </dt>
              <dd class="mt-1.5 text-sm text-slate-700">
                {selectedRecord.tanggalLahir || "-"}
              </dd>
            </div>
            <div
              class="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100"
            >
              <dt
                class="text-xs font-medium text-blue-500 uppercase tracking-wide"
              >
                Usia
              </dt>
              <dd class="mt-1.5 text-sm text-blue-700 font-semibold">
                {calculateAge(selectedRecord.tanggalLahir)}
              </dd>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt
                class="text-xs font-medium text-slate-400 uppercase tracking-wide"
              >
                Pendidikan
              </dt>
              <dd class="mt-1.5 text-sm text-slate-700">
                {selectedRecord.pendidikanNama || "-"}
              </dd>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt
                class="text-xs font-medium text-slate-400 uppercase tracking-wide"
              >
                Unit Kerja
              </dt>
              <dd class="mt-1.5 text-sm text-slate-700">
                {selectedRecord.unorNama ||
                  selectedRecord.lokasiKerjaNama ||
                  "-"}
              </dd>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt
                class="text-xs font-medium text-slate-400 uppercase tracking-wide"
              >
                Unit Kerja Induk (Unor Induk)
              </dt>
              <dd class="mt-1.5 text-sm text-slate-700">
                {selectedRecord.unorInduk?.nama || "-"}
              </dd>
            </div>
            {#if selectedRecord.statusPensiun === "PENSIUN"}
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
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div class="flex-1">
                    <dt
                      class="text-xs font-medium text-red-500 uppercase tracking-wide"
                    >
                      Status Pegawai
                    </dt>
                    <dd class="mt-1 text-sm text-red-700 font-bold">
                      PENSIUN (Sudah Berhenti)
                    </dd>
                    {#if selectedRecord.arsipSkPensiun}
                      <dd class="text-xs text-red-500 mt-1">
                        SK No: {selectedRecord.arsipSkPensiun.nomorSk} (Tgl: {selectedRecord
                          .arsipSkPensiun.tanggalSk})
                      </dd>
                      <a
                        href={`${API_BASE_URL}${selectedRecord.arsipSkPensiun.fileUrl}`}
                        target="_blank"
                        class="inline-block mt-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md transition-colors"
                      >
                        Lihat SK PDF
                      </a>
                    {/if}
                  </div>
                </div>
              </div>
            {:else if calculateRetirement(selectedRecord.tanggalLahir)}
              {#if calculateRetirement(selectedRecord.tanggalLahir).isPast}
                <div
                  class="p-4 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 sm:col-span-2"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-sm flex-shrink-0"
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
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        /></svg
                      >
                    </div>
                    <div class="flex-1">
                      <dt
                        class="text-xs font-medium text-red-500 uppercase tracking-wide"
                      >
                        Status Pensiun (Berdasarkan Usia)
                      </dt>
                      <dd class="mt-1 text-sm text-red-700 font-semibold">
                        Sudah memasuki masa pensiun
                      </dd>
                      <dd class="text-xs text-red-400 mt-0.5">
                        TMT Pensiun: {calculateRetirement(
                          selectedRecord.tanggalLahir,
                        ).date} — {calculateRetirement(
                          selectedRecord.tanggalLahir,
                        ).remaining} yang lalu
                      </dd>
                    </div>
                  </div>
                </div>
              {:else}
                <div
                  class="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 sm:col-span-2"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm flex-shrink-0"
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
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        /></svg
                      >
                    </div>
                    <div class="flex-1">
                      <dt
                        class="text-xs font-medium text-emerald-500 uppercase tracking-wide"
                      >
                        Waktu Pensiun
                      </dt>
                      <dd class="mt-1 text-sm text-emerald-700 font-semibold">
                        Sisa {calculateRetirement(selectedRecord.tanggalLahir)
                          .remaining} lagi
                      </dd>
                      <dd class="text-xs text-emerald-400 mt-0.5">
                        TMT Pensiun: {calculateRetirement(
                          selectedRecord.tanggalLahir,
                        ).date} (Tahun {calculateRetirement(
                          selectedRecord.tanggalLahir,
                        ).retirementYear})
                      </dd>
                    </div>
                  </div>
                </div>
              {/if}
            {/if}
          </dl>
        </div>

        <!-- Contract History Section -->
        <div class="mt-6 border-t border-slate-100 pt-6">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-base font-bold text-slate-800 flex items-center gap-2">
              <svg class="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Riwayat Kontrak
            </h4>
            <button type="button" on:click={openContractForm} class="text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
              Tambah Kontrak
            </button>
          </div>

          {#if isLoadingContracts}
            <div class="flex items-center justify-center py-6">
              <div class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span class="ml-2 text-sm text-slate-400">Memuat riwayat kontrak...</span>
            </div>
          {:else if contracts.length === 0}
            <div class="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <svg class="w-10 h-10 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p class="text-sm text-slate-400">Belum ada riwayat kontrak</p>
            </div>
          {:else}
            <div class="space-y-3 max-h-64 overflow-y-auto pr-1">
              {#each contracts as contract, i}
                <div class="p-4 rounded-xl border {i === contracts.length - 1 ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-100 bg-slate-50'} relative">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                          {contract.kontrakKe}
                        </span>
                        <span class="text-sm font-semibold text-slate-800">Kontrak ke-{contract.kontrakKe}</span>
                        {#if i === contracts.length - 1}
                          <span class="text-[10px] font-semibold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">Terbaru</span>
                        {/if}
                      </div>
                      <div class="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 mt-3">
                        <div>
                          <span class="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Periode</span>
                          <p class="text-xs text-slate-700 font-semibold">{contract.tanggalMulai} - {contract.tanggalSelesai}</p>
                        </div>
                        <div>
                          <span class="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Nomor Kontrak</span>
                          <p class="text-xs text-slate-700 font-semibold">{contract.nomorKontrak || "-"}</p>
                        </div>
                        <div>
                          <span class="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Golongan</span>
                          <p class="text-xs text-slate-700 font-semibold font-mono">{contract.golongan || "-"}</p>
                        </div>
                        <div>
                          <span class="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Gaji Pokok</span>
                          <p class="text-xs text-indigo-600 font-bold">
                            {contract.gajiPokok ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(contract.gajiPokok) : "-"}
                          </p>
                        </div>
                        <div>
                          <span class="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Masa Kerja</span>
                          <p class="text-xs text-slate-700 font-semibold">
                            {contract.mkTahun ?? "-"} Thn {contract.mkBulan ?? "-"} Bln
                          </p>
                        </div>
                      </div>
                      {#if contract.keterangan}
                        <p class="text-xs text-slate-500 mt-1.5 italic">{contract.keterangan}</p>
                      {/if}
                    </div>
                    <div class="flex items-center gap-1 ml-2">
                      {#if contract.arsipKontrak?.fileUrl}
                        <a
                          href={`${API_BASE_URL}${contract.arsipKontrak.fileUrl}`}
                          target="_blank"
                          class="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-100 transition-colors"
                          title="Lihat PDF Kontrak"
                        >
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </a>
                      {/if}
                      <button
                        type="button"
                        on:click|stopPropagation={() => handleDeleteContract(contract.id)}
                        class="p-1.5 rounded-lg text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                        title="Hapus kontrak"
                      >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}

          <!-- Add Contract Form (Inline) -->
          {#if showContractForm}
            <div class="mt-4 p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/30">
              <h5 class="text-sm font-bold text-indigo-700 mb-3">Perpanjangan / Tambah Kontrak Baru</h5>
              <form on:submit={handleAddContract} class="space-y-3">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label for="tanggalMulai" class="block text-xs font-medium text-slate-600 mb-1">Tanggal Mulai *</label>
                    <input
                      id="tanggalMulai"
                      type="date"
                      bind:value={contractForm.tanggalMulai}
                      class="input-field text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label for="tanggalSelesai" class="block text-xs font-medium text-slate-600 mb-1">Tanggal Selesai *</label>
                    <input
                      id="tanggalSelesai"
                      type="date"
                      bind:value={contractForm.tanggalSelesai}
                      class="input-field text-sm"
                      required
                    />
                  </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label for="nomorKontrak" class="block text-xs font-medium text-slate-600 mb-1">Nomor Kontrak *</label>
                    <input
                      id="nomorKontrak"
                      type="text"
                      bind:value={contractForm.nomorKontrak}
                      class="input-field text-sm"
                      placeholder="Contoh: 800/123/2026"
                      required
                    />
                  </div>
                  <div>
                    <label for="golongan" class="block text-xs font-medium text-slate-600 mb-1">Golongan</label>
                    <input
                      id="golongan"
                      type="text"
                      bind:value={contractForm.golongan}
                      class="input-field text-sm"
                      placeholder="Contoh: IX"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label for="gajiPokok" class="block text-xs font-medium text-slate-600 mb-1">Gaji Pokok</label>
                    <input
                      id="gajiPokok"
                      type="number"
                      bind:value={contractForm.gajiPokok}
                      class="input-field text-sm"
                      placeholder="Contoh: 3000000"
                    />
                  </div>
                  <div>
                    <label for="mkTahun" class="block text-xs font-medium text-slate-600 mb-1">MK Tahun</label>
                    <input
                      id="mkTahun"
                      type="number"
                      bind:value={contractForm.mkTahun}
                      class="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label for="mkBulan" class="block text-xs font-medium text-slate-600 mb-1">MK Bulan</label>
                    <input
                      id="mkBulan"
                      type="number"
                      bind:value={contractForm.mkBulan}
                      class="input-field text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label for="keterangan" class="block text-xs font-medium text-slate-600 mb-1">Keterangan (Opsional)</label>
                  <input
                    id="keterangan"
                    type="text"
                    bind:value={contractForm.keterangan}
                    class="input-field text-sm"
                    placeholder="Misal: Perpanjangan Kontrak Tahun 2026"
                  />
                </div>
                <div>
                  <label for="contractFile" class="block text-xs font-medium text-slate-600 mb-1">File Arsip Kontrak (PDF)</label>
                  <input
                    id="contractFile"
                    type="file"
                    accept=".pdf"
                    on:change={handleContractFileChange}
                    bind:this={contractFileInput}
                    class="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                </div>
                <div class="flex justify-end gap-2 pt-2">
                  <button type="button" on:click={closeContractForm} class="btn-secondary text-xs !py-1.5 !px-3" disabled={isSubmittingContract}>Batal</button>
                  <button type="submit" class="text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50" disabled={isSubmittingContract}>
                    {#if isSubmittingContract}
                      Menyimpan...
                    {:else}
                      Simpan Kontrak
                    {/if}
                  </button>
                </div>
              </form>
            </div>
          {/if}
        </div>

        <div class="mt-6 flex justify-between">
          <button type="button" on:click={openEditModal} class="btn-primary"
            >Edit Data</button
          >
          <button type="button" on:click={closeModal} class="btn-secondary"
            >Tutup</button
          >
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Edit Detail Modal -->
{#if showEditModal && selectedRecord}
  <div
    class="fixed z-[60] inset-0 overflow-y-auto"
    role="dialog"
    aria-modal="true"
  >
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity w-full h-full border-none cursor-default"
        on:click={closeEditModal}
        aria-hidden="true"
      ></div>

      <div
        class="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 z-10"
      >
        <div
          class="flex items-center justify-between pb-5 border-b border-slate-100 mb-5"
        >
          <h3 class="text-lg font-bold text-slate-800">Edit Data Pegawai</h3>
          <button
            on:click={closeEditModal}
            class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Tutup form edit"
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

        <form on:submit={handleUpdateData} class="space-y-4">
          <div>
            <label
              for="editNama"
              class="block text-sm font-medium text-slate-700 mb-1">Nama</label
            >
            <input
              id="editNama"
              type="text"
              bind:value={editForm.nama}
              class="input-field"
              required
            />
          </div>
          <div>
            <label
              for="editUnorNama"
              class="block text-sm font-medium text-slate-700 mb-1"
              >Unit Kerja</label
            >
            <input
              id="editUnorNama"
              type="text"
              bind:value={editForm.unorNama}
              class="input-field"
            />
          </div>
          <div class="relative">
            <label
              for="editUnorInduk"
              class="block text-sm font-medium text-slate-700 mb-1"
              >Unit Kerja Induk (Pilih dari Referensi)</label
            >
            <input
              id="editUnorInduk"
              type="text"
              value={unorSearchTerm}
              on:input={handleUnorSearch}
              on:focus={() => {
                if (unorSearchTerm.trim().length >= 2) showUnorDropdown = true;
              }}
              on:blur={() => setTimeout(() => (showUnorDropdown = false), 200)}
              class="input-field"
              placeholder="Ketik untuk mencari referensi..."
              autocomplete="off"
            />
            {#if isSearchingUnor}
              <div class="absolute right-3 top-9">
                <div
                  class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"
                ></div>
              </div>
            {/if}
            {#if showUnorDropdown && !isSearchingUnor}
              <ul
                class="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-48 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
              >
                {#if unorResults.length > 0}
                  {#each unorResults as result}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
                    <li
                      class="text-slate-900 cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50"
                      on:click={() => selectUnor(result.id, result.nama)}
                    >
                      <span class="block truncate font-medium"
                        >{result.nama}</span
                      >
                    </li>
                  {/each}
                {:else}
                  <li
                    class="text-slate-500 cursor-default select-none relative py-3 px-4 italic text-sm text-center bg-slate-50 block"
                  >
                    <span class="block font-medium text-slate-700 mb-1"
                      >Tidak ditemukan</span
                    >
                    <span class="text-xs"
                      >Tetap gunakan "<span class="text-slate-800 font-semibold"
                        >{unorSearchTerm}</span
                      >" sebagai nilai baru, atau tambahkan ke referensi
                      terlebih dahulu.</span
                    >
                  </li>
                {/if}
              </ul>
            {/if}
          </div>

          <div
            class="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6"
          >
            <button
              type="button"
              class="btn-secondary"
              on:click={closeEditModal}
              disabled={isSubmitting}>Batal</button
            >
            <button type="submit" class="btn-primary" disabled={isSubmitting}>
              {#if isSubmitting}
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
