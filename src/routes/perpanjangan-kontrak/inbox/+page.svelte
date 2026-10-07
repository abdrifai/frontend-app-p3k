<script>
  import { addToast } from "$lib/toastStore";
  import { authStore, isUserAdmin } from "$lib/store";
  import { apiRequest, API_BASE_URL } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import SrikandiTimelineModal from "$lib/components/SrikandiTimelineModal.svelte";

  let records = [];
  let isLoading = true;
  let searchTerm = "";
  let filterStatus = "PENDING";
  let filterStatusSrikandi = "";
  let meta = { page: 1, limit: 10, total: 0, totalPages: 1 };

  $: isSrikandiDisabled = filterStatus === "PENDING" || filterStatus === "APPROVED" || filterStatus === "REJECTED";

  function handleStatusChange() {
    if (isSrikandiDisabled) {
      filterStatusSrikandi = "";
    }
    meta.page = 1;
    fetchData(1);
  }

  function handleStatusSrikandiChange() {
    meta.page = 1;
    fetchData(1);
  }

  function resetFilter() {
    searchTerm = "";
    filterStatus = "PENDING";
    filterStatusSrikandi = "";
    meta.page = 1;
    fetchData(1);
  }

  $: isAdmin = isUserAdmin($authStore.user);

  // Detail modal
  let selectedRecord = null;
  let showDetailModal = false;
  let isProcessing = false;
  let rejectReason = "";
  let showRejectForm = false;
  let showApproveConfirm = false;

  // Srikandi Modal state
  let showSrikandiModal = false;
  let srikandiModalUsulanId = null;
  let srikandiModalUsulanData = null;

  const srikandiStatusLabels = {
    VERIFIKASI_KABAN: "Srikandi: Verif Kaban",
    VERIFIKASI_SEKDA: "Srikandi: Verif Sekda",
    TTE_PPPK: "Srikandi: TTE PPPK",
    TTE_BUPATI: "Srikandi: TTE Bupati",
    TOLAK_TIDAK_DITERUSKAN: "Srikandi: Tolak (Final)",
    TOLAK_KONSEPTOR: "Srikandi: Tolak (Konseptor)"
  };

  const srikandiStatusColors = {
    VERIFIKASI_KABAN: "bg-blue-50 text-blue-700 border-blue-200",
    VERIFIKASI_SEKDA: "bg-indigo-50 text-indigo-700 border-indigo-200",
    TTE_PPPK: "bg-purple-50 text-purple-700 border-purple-200",
    TTE_BUPATI: "bg-emerald-50 text-emerald-700 border-emerald-200",
    TOLAK_TIDAK_DITERUSKAN: "bg-red-50 text-red-700 border-red-200",
    TOLAK_KONSEPTOR: "bg-amber-50 text-amber-700 border-amber-200"
  };

  function openSrikandiTimeline(rec) {
    srikandiModalUsulanId = rec.id;
    srikandiModalUsulanData = {
      namaPegawai: rec.dataP3k?.nama,
      nipBaru: rec.dataP3k?.nipBaru,
      nomorKontrak: rec.nomorKontrak,
      status: rec.status,
      statusSrikandi: rec.statusSrikandi,
      jabatanNama: rec.dataP3k?.jabatanNama,
      unorNama: rec.dataP3k?.unorNama
    };
    showSrikandiModal = true;
  }

  function handleSrikandiStatusUpdated(event) {
    const { usulanId, statusSrikandi } = event.detail;
    records = records.map((r) =>
      r.id === usulanId ? { ...r, statusSrikandi } : r
    );
    if (selectedRecord && selectedRecord.id === usulanId) {
      selectedRecord = { ...selectedRecord, statusSrikandi };
    }
    addToast("Status Srikandi berhasil diperbarui", "success");
  }

  // Preview data state
  let previewData = null;
  let isLoadingPreview = false;

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login", "error");
      goto("/login");
      return;
    }
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has("status")) {
        filterStatus = urlParams.get("status") || "";
      }
      if (urlParams.has("statusSrikandi")) {
        filterStatusSrikandi = urlParams.get("statusSrikandi") || "";
      }
    }
    fetchData();
  });

  const fetchData = async (page = 1) => {
    isLoading = true;
    try {
      const params = new URLSearchParams({ page, limit: meta.limit });
      if (filterStatus) params.append("status", filterStatus);
      if (filterStatusSrikandi) params.append("statusSrikandi", filterStatusSrikandi);
      if (searchTerm) params.append("search", searchTerm);
      const result = await apiRequest(
        `/api/v1/perpanjangan/usulan?${params}`,
        "GET",
      );
      if (result.success) {
        records = result.data;
        meta = result.meta;
      }
    } catch (e) {
      console.error(e);
    } finally {
      isLoading = false;
    }
  };

  const openDetail = async (rec) => {
    selectedRecord = rec;
    showDetailModal = true;
    showRejectForm = false;
    showApproveConfirm = false;
    rejectReason = "";
    previewData = null;

    if (rec.status === "PENDING") {
      isLoadingPreview = true;
      try {
        const result = await apiRequest(
          `/api/v1/perpanjangan/usulan/${rec.id}/preview`,
          "GET",
        );
        if (result.success) {
          previewData = result.data;
        }
      } catch (e) {
        console.error("Gagal load preview", e);
      } finally {
        isLoadingPreview = false;
      }
    }
  };

  const closeDetail = () => {
    showDetailModal = false;
    selectedRecord = null;
    showRejectForm = false;
    showApproveConfirm = false;
  };

  const handleApprove = async () => {
    isProcessing = true;
    showApproveConfirm = false;
    try {
      const result = await apiRequest(
        `/api/v1/perpanjangan/usulan/${selectedRecord.id}/approve`,
        "POST",
      );
      if (result.success) {
        addToast(result.message || "Usulan disetujui", "success");
        closeDetail();
        fetchData();
      } else {
        addToast(result.message || "Gagal menyetujui", "error");
      }
    } catch (e) {
      addToast(e.message || "Terjadi kesalahan sistem", "error");
    } finally {
      isProcessing = false;
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      addToast("Alasan penolakan wajib diisi", "error");
      return;
    }
    isProcessing = true;
    try {
      const result = await apiRequest(
        `/api/v1/perpanjangan/usulan/${selectedRecord.id}/reject`,
        "POST",
        { alasanPenolakan: rejectReason },
      );
      if (result.success) {
        addToast(result.message || "Usulan ditolak", "success");
        closeDetail();
        fetchData();
      } else {
        addToast(result.message || "Gagal menolak", "error");
      }
    } catch (e) {
      addToast(e.message || "Terjadi kesalahan sistem", "error");
    } finally {
      isProcessing = false;
    }
  };

  const handleGenerate = async (id) => {
    isProcessing = true;
    try {
      const result = await apiRequest(
        `/api/v1/perpanjangan/usulan/${id}/generate`,
        "POST",
      );
      if (result.success) {
        addToast("Dokumen berhasil di-generate", "success");
        fetchData();
        if (result.data?.fileUrl) {
          window.open(`${API_BASE_URL}${result.data.fileUrl}`, "_blank");
        }
      } else {
        addToast(result.message || "Gagal", "error");
      }
    } catch (e) {
      addToast(e.message || "Gagal generate dokumen", "error");
    } finally {
      isProcessing = false;
    }
  };

  const statusColor = (s) => {
    if (s === "APPROVED")
      return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (s === "UPLOAD_SRIKANDI")
      return "text-indigo-700 bg-indigo-50 border-indigo-200";
    if (s === "SELESAI") return "text-blue-700 bg-blue-50 border-blue-200";
    if (s === "REJECTED") return "text-red-700 bg-red-50 border-red-200";
    return "text-amber-700 bg-amber-50 border-amber-200";
  };
  const statusLabel = (s) => {
    if (s === "APPROVED") return "Disetujui";
    if (s === "UPLOAD_SRIKANDI") return "Upload Srikandi";
    if (s === "SELESAI") return "Selesai";
    if (s === "REJECTED") return "Ditolak";
    return "Menunggu";
  };

  let fileInput;
  let uploadingId = null;

  async function triggerUpload(id) {
    uploadingId = id;
    fileInput.click();
  }

  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file || !uploadingId) return;

    if (file.type !== "application/pdf") {
      addToast("File harus berformat PDF", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiRequest(
        `/api/v1/perpanjangan/usulan/${uploadingId}/upload-final`,
        "POST",
        formData,
        true,
      );
      if (res.success) {
        addToast("Dokumen berhasil diunggah", "success");
        fetchData();
      } else {
        addToast(res.message || "Gagal mengunggah dokumen", "error");
      }
    } catch (err) {
      console.error("Upload error:", err);
      addToast("Terjadi kesalahan saat mengunggah dokumen", "error");
    } finally {
      uploadingId = null;
      event.target.value = "";
    }
  }

  async function handleProcessToSrikandi(id) {
    if (!confirm("Proses usulan ini ke tahap Upload Srikandi?")) return;
    try {
      const res = await apiRequest(
        `/api/v1/perpanjangan/usulan/${id}/srikandi`,
        "POST",
      );
      if (res.success) {
        addToast("Usulan berhasil diproses ke Srikandi", "success");
        fetchData();
      } else {
        addToast(res.message || "Gagal memproses", "error");
      }
    } catch (err) {
      addToast("Terjadi kesalahan sistem", "error");
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const formatDateIndoFull = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    const d = String(date.getDate()).padStart(2, "0");
    const m = months[date.getMonth()];
    const y = date.getFullYear();
    return `${d} ${m} ${y}`;
  };

  const formatGajiDisplay = (gajiVal) => {
    if (!gajiVal || gajiVal === "0") return "Rp 0";
    if (typeof gajiVal === "string" && gajiVal.includes("Rp.")) {
      return gajiVal;
    }
    const numOnly = String(gajiVal).replace(/[^0-9]/g, "");
    if (!numOnly || numOnly === "0") return "Rp 0";
    const num = parseInt(numOnly, 10);
    if (isNaN(num) || num === 0) return "Rp 0";
    return `Rp.${new Intl.NumberFormat("id-ID").format(num)},-`;
  };

  const isGajiNol = (gajiVal) => {
    if (!gajiVal || gajiVal === "0") return true;
    const numOnly = String(gajiVal).replace(/[^0-9]/g, "");
    return !numOnly || parseInt(numOnly, 10) === 0;
  };
</script>

<svelte:head>
  <title>Inbox Perpanjangan — P3K App</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-800">
        Inbox Perpanjangan Kontrak
      </h1>
      <p class="mt-1 text-sm text-slate-500">
        Proses persetujuan dan penolakan usulan perpanjangan kontrak.
      </p>
    </div>
  </div>

  <!-- Filters -->
  <div class="card p-4 space-y-3">
    <form
      on:submit|preventDefault={() => {
        meta.page = 1;
        fetchData(1);
      }}
      class="flex flex-col lg:flex-row gap-3"
    >
      <div class="relative flex-1">
        <input
          type="text"
          bind:value={searchTerm}
          placeholder="Cari nama / NIP / no kontrak..."
          class="input-field pl-9 w-full"
        />
        <svg
          class="w-4 h-4 text-slate-400 absolute left-3 top-3"
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

      <div class="flex flex-wrap items-center gap-2">
        <!-- Filter 1: Status Usulan (Induk) -->
        <select
          bind:value={filterStatus}
          on:change={handleStatusChange}
          class="input-field !w-auto text-sm font-medium text-slate-700 bg-white"
          title="Filter Status Usulan (Tahap Dokumen)"
        >
          <option value="">Semua Status Usulan</option>
          <option value="PENDING">Menunggu (Pending)</option>
          <option value="APPROVED">Disetujui (Approved)</option>
          <option value="UPLOAD_SRIKANDI">Upload Srikandi</option>
          <option value="SELESAI">Selesai</option>
          <option value="REJECTED">Ditolak</option>
        </select>

        <!-- Filter 2: Status Srikandi (Berjenjang) -->
        <select
          bind:value={filterStatusSrikandi}
          on:change={handleStatusSrikandiChange}
          disabled={isSrikandiDisabled}
          class="input-field !w-auto text-sm font-medium text-slate-700 bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
          title={isSrikandiDisabled
            ? "Status ini belum/tidak melalui proses Srikandi"
            : "Filter berdasarkan tahapan Srikandi"}
        >
          {#if isSrikandiDisabled}
            <option value="">- Tidak Ada Srikandi -</option>
          {:else if filterStatus === "UPLOAD_SRIKANDI"}
            <option value="">Semua Tahap Srikandi</option>
            <option value="NONE">Belum Masuk Srikandi</option>
            <option value="VERIFIKASI_KABAN">1. Verifikasi Kaban</option>
            <option value="VERIFIKASI_SEKDA">2. Verifikasi Sekda</option>
            <option value="TTE_PPPK">3. TTE PPPK</option>
            <option value="TTE_BUPATI">4. TTE Bupati</option>
            <option value="TOLAK_KONSEPTOR">Tolak (ke Konseptor)</option>
            <option value="TOLAK_TIDAK_DITERUSKAN">Tolak (Final)</option>
          {:else if filterStatus === "SELESAI"}
            <option value="">Semua Srikandi (Selesai)</option>
            <option value="TTE_BUPATI">TTE Bupati (Selesai)</option>
            <option value="TTE_PPPK">TTE PPPK</option>
            <option value="NONE">Non-Srikandi / Selesai Langsung</option>
          {:else}
            <option value="">Semua Status Srikandi</option>
            <option value="VERIFIKASI_KABAN">1. Verifikasi Kaban</option>
            <option value="VERIFIKASI_SEKDA">2. Verifikasi Sekda</option>
            <option value="TTE_PPPK">3. TTE PPPK</option>
            <option value="TTE_BUPATI">4. TTE Bupati</option>
            <option value="TOLAK_KONSEPTOR">Tolak (ke Konseptor)</option>
            <option value="TOLAK_TIDAK_DITERUSKAN">Tolak (Final)</option>
            <option value="NONE">Belum Masuk Srikandi</option>
          {/if}
        </select>

        <select
          bind:value={meta.limit}
          on:change={() => {
            meta.page = 1;
            fetchData(1);
          }}
          class="input-field !w-auto text-sm font-medium text-slate-700 bg-white"
        >
          <option value={10}>10 baris</option>
          <option value={25}>25 baris</option>
          <option value={50}>50 baris</option>
          <option value={100}>100 baris</option>
          <option value="all">Semua baris</option>
        </select>

        <button type="submit" class="btn-primary text-sm">Cari</button>

        {#if filterStatus !== "PENDING" || filterStatusSrikandi || searchTerm}
          <button
            type="button"
            on:click={resetFilter}
            class="px-2.5 py-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl font-bold flex items-center gap-1 transition-colors"
            title="Reset filter ke default (Pending)"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reset
          </button>
        {/if}
      </div>
    </form>

    <!-- Filter aktif indicator -->
    {#if filterStatus || filterStatusSrikandi}
      <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
        <span class="text-slate-400 font-medium">Filter berjenjang aktif:</span>
        {#if filterStatus}
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span>Status: <b>{filterStatus}</b></span>
            <button
              type="button"
              on:click={() => {
                filterStatus = "";
                handleStatusChange();
              }}
              class="hover:bg-blue-200/60 rounded-full w-4 h-4 inline-flex items-center justify-center ml-0.5"
              title="Hapus filter status"
            >
              ×
            </button>
          </span>
        {/if}
        {#if filterStatusSrikandi}
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span>Srikandi: <b>{srikandiStatusLabels[filterStatusSrikandi] || (filterStatusSrikandi === 'NONE' ? 'Belum Masuk Srikandi' : filterStatusSrikandi)}</b></span>
            <button
              type="button"
              on:click={() => {
                filterStatusSrikandi = "";
                handleStatusSrikandiChange();
              }}
              class="hover:bg-purple-200/60 rounded-full w-4 h-4 inline-flex items-center justify-center ml-0.5"
              title="Hapus filter status Srikandi"
            >
              ×
            </button>
          </span>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Table -->
  <div class="card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200">
        <thead>
          <tr class="bg-slate-50/80">
            <th
              class="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase"
              >No</th
            >
            <th
              class="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase"
              >Pegawai</th
            >
            <th
              class="hidden md:table-cell px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase"
              >Periode Kontrak</th
            >
            <th
              class="hidden lg:table-cell px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase"
              >Masa Kerja</th
            >
            <th
              class="hidden lg:table-cell px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase"
              >Unit Kerja</th
            >
            <th
              class="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase"
              >Status</th
            >
            {#if isAdmin}
              <th
                class="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-indigo-500 uppercase"
                >Pengusul</th
              >
            {/if}
            <th
              class="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase"
              >Aksi</th
            >
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {#if isLoading}
            <tr
              ><td colspan="6" class="px-6 py-16 text-center"
                ><div class="flex flex-col items-center gap-3">
                  <div
                    class="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin"
                  ></div>
                  <span class="text-sm text-slate-400">Memuat...</span>
                </div></td
              ></tr
            >
          {:else if records.length === 0}
            <tr
              ><td colspan="6" class="px-6 py-16 text-center"
                ><p class="text-sm text-slate-400">Tidak ada data.</p></td
              ></tr
            >
          {:else}
            {#each records as rec, i}
              {@const isPensiun = rec.dataP3k?.statusPensiun === 'PENSIUN'}
              {@const isPensiunUnfinished = isPensiun && rec.status !== 'SELESAI'}
              <tr
                class="transition-colors cursor-pointer {isPensiunUnfinished ? 'bg-red-50/40 hover:bg-red-50/70 border-l-4 border-l-red-500' : 'hover:bg-slate-50/50'}"
                on:click={() => openDetail(rec)}
              >
                <td class="px-4 sm:px-6 py-3 text-sm text-slate-400 font-mono"
                  >{(meta.page - 1) * meta.limit + i + 1}</td
                >
                <td class="px-4 sm:px-6 py-3">
                  <div class="flex items-center gap-1.5">
                    <p class="text-sm font-semibold {isPensiunUnfinished ? 'text-red-900' : 'text-slate-800'}">
                      {rec.dataP3k?.nama || "-"}
                    </p>
                    {#if isPensiunUnfinished}
                      <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 whitespace-nowrap">
                        ⚠️ PENSIUN
                      </span>
                    {/if}
                  </div>
                  <p class="text-xs text-slate-400 font-mono">
                    {rec.dataP3k?.nipBaru || "-"}
                  </p>
                  <p class="text-[11px] text-slate-500 mt-0.5">
                    {rec.dataP3k?.jabatanNama || "-"}
                  </p>
                </td>
                <td
                  class="hidden md:table-cell px-4 sm:px-6 py-3 whitespace-nowrap"
                >
                  <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-xs">
                    <i class="ri-calendar-line text-slate-400 text-xs"></i>
                    <span class="font-medium text-slate-700">{formatDate(rec.tanggalMulai)}</span>
                    <span class="text-slate-300 font-bold text-[10px]">&ndash;</span>
                    <span class="font-medium text-slate-700">{formatDate(rec.tanggalSelesai)}</span>
                  </div>
                </td>
                <td class="hidden lg:table-cell px-4 sm:px-6 py-3">
                  <span
                    class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase whitespace-nowrap"
                  >
                    {rec.calculatedData?.mkTahun ?? 0} Thn {rec.calculatedData
                      ?.mkBulan ?? 0} Bln
                  </span>
                </td>
                <td
                  class="hidden lg:table-cell px-4 sm:px-6 py-3 text-sm text-slate-500 max-w-[200px] truncate"
                  >{rec.dataP3k?.unorInduk?.nama ||
                    rec.dataP3k?.unorNama ||
                    "-"}</td
                >
                <td class="px-4 sm:px-6 py-3 whitespace-nowrap">
                  <div class="flex items-center gap-1.5">
                    {#if rec.status === "UPLOAD_SRIKANDI"}
                      <button
                        type="button"
                        on:click|stopPropagation={() => openSrikandiTimeline(rec)}
                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/90 transition-all cursor-pointer group"
                        title="Klik untuk melihat Linimasa Srikandi"
                      >
                        <span class="w-1.5 h-1.5 rounded-full bg-purple-600 group-hover:scale-125 transition-transform animate-pulse"></span>
                        <span>{srikandiStatusLabels[rec.statusSrikandi] || 'Srikandi: Verif Kaban'}</span>
                        <i class="ri-route-line text-xs text-purple-400 group-hover:text-purple-700 transition-colors"></i>
                      </button>
                    {:else}
                      <span
                        class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border {statusColor(
                          rec.status,
                        )}">{statusLabel(rec.status)}</span
                      >
                    {/if}
                    {#if isPensiunUnfinished}
                      <span class="text-[10px] text-red-600 font-bold ml-1">Hentikan Usulan</span>
                    {/if}
                  </div>
                </td>
                {#if isAdmin}
                  <td class="px-4 sm:px-6 py-3">
                    <p class="text-xs font-medium text-slate-700">
                      {rec.editedBy?.namaLengkap ||
                        rec.editedBy?.username ||
                        "-"}
                    </p>
                  </td>
                {/if}
                <td class="px-4 sm:px-6 py-3">
                  <div class="flex items-center gap-1">
                    {#if rec.finalFileUrl}
                      <a
                        href={`${API_BASE_URL}${rec.finalFileUrl}`}
                        target="_blank"
                        on:click|stopPropagation
                        class="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors border border-red-100"
                        title="Download PDF PK"
                      >
                        <i class="ri-file-pdf-2-fill text-lg"></i>
                      </a>
                    {/if}
                    {#if rec.status === "APPROVED"}
                      <button
                        on:click|stopPropagation={() =>
                          handleProcessToSrikandi(rec.id)}
                        class="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors border border-amber-100"
                        title="Proses ke Srikandi"
                      >
                        <i class="ri-send-plane-2-line text-lg"></i>
                      </button>
                    {/if}
                    {#if rec.status === "UPLOAD_SRIKANDI" || rec.statusSrikandi}
                      <button
                        on:click|stopPropagation={() => openSrikandiTimeline(rec)}
                        class="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors border border-purple-100"
                        title="Linimasa Status Srikandi"
                      >
                        <i class="ri-route-line text-lg"></i>
                      </button>
                      <button
                        on:click|stopPropagation={() => triggerUpload(rec.id)}
                        class="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors border border-indigo-100"
                        title="Upload PDF PK (Final)"
                      >
                        <i class="ri-upload-cloud-2-line text-lg"></i>
                      </button>
                    {/if}
                    {#if (rec.status === "APPROVED" || rec.status === "UPLOAD_SRIKANDI") && rec.templateKontrak}
                      <button
                        on:click|stopPropagation={() => handleGenerate(rec.id)}
                        class="p-1.5 rounded-lg text-teal-500 hover:bg-teal-50 transition-colors"
                        title="Re-generate dokumen"
                        disabled={isProcessing}
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
                      </button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
    {#if meta.total > 0}
      <div
        class="border-t border-slate-100 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3"
      >
        <p class="text-sm text-slate-500">
          Menampilkan <span class="font-medium text-slate-700">{records.length}</span> dari
          <span class="font-medium text-slate-700">{meta.total}</span> usulan
        </p>
        {#if meta.totalPages > 1}
          <div class="flex items-center gap-2">
            <p class="text-xs text-slate-500">
              Hal. <span class="font-medium text-slate-700">{meta.page}</span> dari
              <span class="font-medium text-slate-700">{meta.totalPages}</span>
            </p>
            <div class="flex gap-1">
              <button
                aria-label="Halaman Sebelumnya"
                disabled={meta.page === 1}
                on:click={() => fetchData(meta.page - 1)}
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
                aria-label="Halaman Selanjutnya"
                disabled={meta.page === meta.totalPages}
                on:click={() => fetchData(meta.page + 1)}
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
    {/if}
  </div>
</div>

<!-- Detail & Approval Modal -->
{#if showDetailModal && selectedRecord}
  <div
    class="fixed z-50 inset-0 overflow-y-auto"
    role="dialog"
    aria-modal="true"
  >
    <div class="flex items-center justify-center min-h-screen px-4 py-6 sm:p-6">
      <button
        type="button"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm w-full h-full border-none cursor-default transition-opacity"
        on:click={closeDetail}
        aria-label="Tutup"
      ></button>

      <div
        class="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full z-10 overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
      >
        <!-- Modal Header -->
        <div class="px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-200 bg-white">
          <div>
            <div class="flex items-center gap-2.5">
              <h3 class="text-base font-bold text-slate-800">Detail Usulan Perpanjangan Kontrak</h3>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border {statusColor(selectedRecord.status)}">
                {statusLabel(selectedRecord.status)}
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">
              Informasi data pegawai, masa kerja, dan kalkulasi usulan perpanjangan
            </p>
          </div>
          <button
            aria-label="Tutup Dialog"
            on:click={closeDetail}
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Scrollable Modal Body -->
        <div class="p-6 overflow-y-auto space-y-5 bg-white">
          <!-- Peringatan Pegawai Telah Pensiun -->
          {#if selectedRecord.dataP3k?.statusPensiun === 'PENSIUN' && selectedRecord.status !== 'SELESAI'}
            <div class="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-xs">
              <svg class="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <span class="font-bold text-red-900 block">PERINGATAN: PEGAWAI TELAH PENSIUN</span>
                <p class="mt-0.5 text-red-700 leading-relaxed">
                  Pegawai ini tercatat berstatus <strong>PENSIUN</strong>. Usulan perpanjangan kontrak ini disarankan untuk dihentikan atau ditolak.
                </p>
              </div>
            </div>
          {/if}

          <!-- Grid 2 Kolom Bersih & Rapi -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            <!-- Kolom 1: Data Pegawai & Kontrak -->
            <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-slate-200">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <i class="ri-user-line text-blue-600"></i>
                  Data Pegawai & Kontrak
                </span>
                {#if selectedRecord.kontrakKe}
                  <span class="text-[11px] font-semibold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-md">
                    Kontrak Ke-{selectedRecord.kontrakKe}
                  </span>
                {/if}
              </div>

              <dl class="space-y-3 text-xs">
                <div>
                  <dt class="text-slate-400 font-medium">Nama Lengkap</dt>
                  <dd class="text-sm font-bold text-slate-800 mt-0.5">
                    {selectedRecord.dataP3k?.nama || "-"}
                  </dd>
                </div>

                <div class="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <dt class="text-slate-400 font-medium">NIP</dt>
                    <dd class="font-mono font-semibold text-slate-700 mt-0.5">
                      {selectedRecord.dataP3k?.nipBaru || "-"}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-slate-400 font-medium">Nomor Kontrak</dt>
                    <dd class="font-mono text-slate-700 mt-0.5">
                      {selectedRecord.nomorKontrak || "-"}
                    </dd>
                  </div>
                </div>

                <div class="pt-1">
                  <dt class="text-slate-400 font-medium">Jabatan</dt>
                  <dd class="text-slate-700 font-medium mt-0.5">
                    {selectedRecord.dataP3k?.jabatanNama || "-"}
                  </dd>
                </div>

                <div class="pt-1">
                  <dt class="text-slate-400 font-medium">Unit Kerja</dt>
                  <dd class="text-slate-700 leading-relaxed mt-0.5">
                    {selectedRecord.dataP3k?.unorInduk?.nama || selectedRecord.dataP3k?.unorNama || "-"}
                  </dd>
                </div>

                <div class="pt-2 border-t border-slate-200/70 grid grid-cols-2 gap-3">
                  <div>
                    <dt class="text-slate-400 font-medium">Tanggal Mulai</dt>
                    <dd class="font-semibold text-slate-800 mt-0.5">
                      {formatDate(selectedRecord.tanggalMulai)}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-slate-400 font-medium">Tanggal Selesai</dt>
                    <dd class="font-semibold text-slate-800 mt-0.5">
                      {formatDate(selectedRecord.tanggalSelesai)}
                    </dd>
                  </div>
                </div>

                {#if selectedRecord.keterangan}
                  <div class="pt-2 border-t border-slate-200/70">
                    <dt class="text-slate-400 font-medium">Catatan Usulan</dt>
                    <dd class="text-slate-600 italic mt-0.5 leading-relaxed">
                      {selectedRecord.keterangan}
                    </dd>
                  </div>
                {/if}

                {#if selectedRecord.editedBy}
                  <div class="pt-2 border-t border-slate-200/70 flex justify-between text-[11px]">
                    <span class="text-slate-400">Pengusul:</span>
                    <span class="text-slate-600 font-medium">{selectedRecord.editedBy?.namaLengkap || selectedRecord.editedBy?.username}</span>
                  </div>
                {/if}
              </dl>
            </div>

            <!-- Kolom 2: Kalkulasi & Berkas -->
            <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-slate-200">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <i class="ri-calculator-line text-emerald-600"></i>
                  {selectedRecord.status === "PENDING" ? "Kalkulasi Masa Kerja & Gaji" : "Status & Berkas"}
                </span>
                {#if selectedRecord.status === "PENDING"}
                  <span class="text-[11px] font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                    Otomatis
                  </span>
                {/if}
              </div>

              {#if selectedRecord.status === "PENDING"}
                {#if isLoadingPreview}
                  <div class="py-8 flex items-center justify-center gap-2.5 text-xs text-slate-500">
                    <div class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Memuat kalkulasi sistem...</span>
                  </div>
                {:else if previewData}
                  <dl class="space-y-3 text-xs">
                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <dt class="text-slate-400 font-medium">TMT Awal PPPK</dt>
                        <dd class="font-semibold text-slate-800 mt-0.5 truncate">
                          {formatDateIndoFull(previewData.tmtCpns)}
                        </dd>
                      </div>
                      <div>
                        <dt class="text-slate-400 font-medium">Masa Kerja (Hitung)</dt>
                        <dd class="font-semibold text-slate-800 mt-0.5">
                          {previewData.mkTahun} Thn {previewData.mkBulan} Bln
                        </dd>
                      </div>
                    </div>

                    <!-- Gaji Pokok Bersih & Sederhana -->
                    <div class="p-3.5 rounded-lg bg-white border border-slate-200">
                      <div class="flex items-center justify-between">
                        <span class="text-slate-500 font-medium">Gaji Pokok Baru</span>
                        <span class="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          Gol. {previewData.golonganAkhirNama || "-"}
                        </span>
                      </div>
                      <p class="text-xl font-bold font-mono {isGajiNol(previewData.gaji) ? 'text-amber-600' : 'text-emerald-700'} mt-1">
                        {formatGajiDisplay(previewData.gaji)}
                      </p>
                      {#if previewData.terbilang}
                        <p class="text-[11px] text-slate-500 italic mt-0.5">
                          Terbilang: {previewData.terbilang}
                        </p>
                      {/if}
                    </div>

                    {#if isGajiNol(previewData.gaji)}
                      <div class="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                        Gaji untuk Golongan <strong>{previewData.golonganAkhirNama || "-"}</strong> (Masa Kerja {previewData.mkTahun} Thn) belum diatur di tabel referensi gaji.
                      </div>
                    {/if}
                  </dl>
                {/if}
              {:else}
                <dl class="space-y-3 text-xs">
                  <div class="flex justify-between">
                    <dt class="text-slate-400">Tanggal Diajukan</dt>
                    <dd class="font-medium text-slate-700">{formatDate(selectedRecord.createdAt)}</dd>
                  </div>
                  {#if selectedRecord.statusSrikandi}
                    <div class="flex justify-between pt-1 border-t border-slate-200/60">
                      <dt class="text-slate-400">Tahap Srikandi</dt>
                      <dd class="font-semibold text-purple-700">{srikandiStatusLabels[selectedRecord.statusSrikandi] || selectedRecord.statusSrikandi}</dd>
                    </div>
                  {/if}
                  {#if selectedRecord.alasanPenolakan}
                    <div class="pt-2 border-t border-slate-200/60">
                      <dt class="text-red-500 font-bold mb-1">Alasan Penolakan:</dt>
                      <dd class="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 leading-relaxed">{selectedRecord.alasanPenolakan}</dd>
                    </div>
                  {/if}
                </dl>
              {/if}

              <!-- Dokumen Berkas Kontrak -->
              {#if selectedRecord.finalFileUrl}
                <div class="pt-3 border-t border-slate-200">
                  <a
                    href={`${API_BASE_URL}${selectedRecord.finalFileUrl}`}
                    target="_blank"
                    class="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                  >
                    <i class="ri-file-pdf-2-line text-base"></i>
                    Buka / Unduh Dokumen Kontrak (PDF)
                  </a>
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Modal Footer / Aksi -->
        <div class="px-6 py-3.5 bg-slate-50 border-t border-slate-200 shrink-0">
          {#if selectedRecord.status === "PENDING"}
            {#if showApproveConfirm}
              <div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span class="text-slate-600">
                  Konfirmasi setujui usulan kontrak untuk pegawai ini?
                </span>
                <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    on:click={() => (showApproveConfirm = false)}
                    class="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white transition-colors"
                    disabled={isProcessing}
                  >
                    Batal
                  </button>
                  <button
                    on:click={handleApprove}
                    class="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors disabled:opacity-50"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Memproses..." : "Ya, Setujui"}
                  </button>
                </div>
              </div>
            {:else if showRejectForm}
              <div class="space-y-2.5 text-xs">
                <label for="alasanPenolakanTextArea" class="block font-semibold text-slate-700">
                  Alasan Penolakan Usulan:
                </label>
                <textarea
                  id="alasanPenolakanTextArea"
                  bind:value={rejectReason}
                  rows="2"
                  class="w-full p-2.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
                  placeholder="Tuliskan catatan atau alasan penolakan..."
                ></textarea>
                <div class="flex justify-end gap-2">
                  <button
                    on:click={() => (showRejectForm = false)}
                    class="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white transition-colors"
                    disabled={isProcessing}
                  >
                    Batal
                  </button>
                  <button
                    on:click={handleReject}
                    class="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-50"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Memproses..." : "Konfirmasi Tolak"}
                  </button>
                </div>
              </div>
            {:else}
              <div class="flex items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  on:click={closeDetail}
                  class="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-200/60 font-medium transition-colors"
                >
                  Tutup
                </button>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    on:click={() => (showRejectForm = true)}
                    class="px-3.5 py-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 font-semibold transition-colors"
                    disabled={isProcessing}
                  >
                    Tolak
                  </button>
                  <button
                    type="button"
                    on:click={() => (showApproveConfirm = true)}
                    class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors shadow-xs disabled:opacity-50"
                    disabled={isProcessing}
                  >
                    Setujui Usulan
                  </button>
                </div>
              </div>
            {/if}
          {:else}
            <div class="flex items-center justify-end text-xs">
              <button
                type="button"
                on:click={closeDetail}
                class="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Srikandi Timeline Modal -->
<SrikandiTimelineModal
  bind:show={showSrikandiModal}
  usulanId={srikandiModalUsulanId}
  usulanData={srikandiModalUsulanData}
  canEdit={isAdmin || true}
  on:statusUpdated={handleSrikandiStatusUpdated}
/>

<!-- Hidden File Input -->
<input
  type="file"
  accept=".pdf"
  class="hidden"
  bind:this={fileInput}
  on:change={handleFileUpload}
/>
