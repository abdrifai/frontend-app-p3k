<script>
  import { addToast } from "$lib/toastStore";
  import { authStore, isUserAdmin } from "$lib/store";
  import { apiRequest, API_BASE_URL } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let records = [];
  let isLoading = true;
  let searchTerm = "";
  let filterStatus = "PENDING";
  let meta = { page: 1, limit: 10, total: 0, totalPages: 1 };

  $: isAdmin = isUserAdmin($authStore.user);

  // Detail modal
  let selectedRecord = null;
  let showDetailModal = false;
  let isProcessing = false;
  let rejectReason = "";
  let showRejectForm = false;
  let showApproveConfirm = false;

  // Preview data state
  let previewData = null;
  let isLoadingPreview = false;

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login", "error");
      goto("/login");
      return;
    }
    fetchData();
  });

  const fetchData = async (page = 1) => {
    isLoading = true;
    try {
      const params = new URLSearchParams({ page, limit: meta.limit });
      if (filterStatus) params.append("status", filterStatus);
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
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
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
  <div class="card p-4">
    <form
      on:submit|preventDefault={() => {
        meta.page = 1;
        fetchData();
      }}
      class="flex flex-wrap gap-3"
    >
      <input
        type="text"
        bind:value={searchTerm}
        placeholder="Cari nama / NIP..."
        class="input-field flex-1 min-w-[200px]"
      />
      <select
        bind:value={filterStatus}
        on:change={() => {
          meta.page = 1;
          fetchData();
        }}
        class="input-field w-auto"
      >
        <option value="">Semua Status</option>
        <option value="PENDING">Menunggu</option>
        <option value="APPROVED">Disetujui</option>
        <option value="UPLOAD_SRIKANDI">Upload Srikandi</option>
        <option value="SELESAI">Selesai</option>
        <option value="REJECTED">Ditolak</option>
      </select>
      <button type="submit" class="btn-primary text-sm">Cari</button>
    </form>
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
              <tr
                class="transition-colors cursor-pointer {isPensiun ? 'bg-red-50/40 hover:bg-red-50/70 border-l-4 border-l-red-500' : 'hover:bg-slate-50/50'}"
                on:click={() => openDetail(rec)}
              >
                <td class="px-4 sm:px-6 py-3 text-sm text-slate-400 font-mono"
                  >{(meta.page - 1) * meta.limit + i + 1}</td
                >
                <td class="px-4 sm:px-6 py-3">
                  <div class="flex items-center gap-1.5">
                    <p class="text-sm font-semibold {isPensiun ? 'text-red-900' : 'text-slate-800'}">
                      {rec.dataP3k?.nama || "-"}
                    </p>
                    {#if isPensiun}
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
                  class="hidden md:table-cell px-4 sm:px-6 py-3 text-sm text-slate-600"
                  >{formatDate(rec.tanggalMulai)} — {formatDate(
                    rec.tanggalSelesai,
                  )}</td
                >
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
                <td class="px-4 sm:px-6 py-3">
                  <div class="flex flex-col gap-1 items-start">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border {statusColor(
                        rec.status,
                      )}">{statusLabel(rec.status)}</span
                    >
                    {#if isPensiun}
                      <span class="text-[10px] text-red-600 font-bold">Hentikan Usulan</span>
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
                    {#if rec.status === "UPLOAD_SRIKANDI"}
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
    {#if meta.totalPages > 1}
      <div
        class="border-t border-slate-100 px-4 sm:px-6 py-4 flex items-center justify-between gap-3"
      >
        <p class="text-sm text-slate-500">
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
</div>

<!-- Detail & Approval Modal -->
{#if showDetailModal && selectedRecord}
  <div
    class="fixed z-50 inset-0 overflow-y-auto"
    role="dialog"
    aria-modal="true"
  >
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <button
        type="button"
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm w-full h-full border-none cursor-default"
        on:click={closeDetail}
        aria-label="Tutup"
      ></button>
      <div
        class="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 z-10"
      >
        <div
          class="flex items-center justify-between pb-5 border-b border-slate-100 mb-5"
        >
          <h3 class="text-lg font-bold text-slate-800">Detail Usulan</h3>
          <button
            aria-label="Tutup Dialog"
            on:click={closeDetail}
            class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
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
        {#if selectedRecord.dataP3k?.statusPensiun === 'PENSIUN'}
          <div class="mb-5 bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3 text-red-800">
            <svg class="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <div>
              <h4 class="text-sm font-bold text-red-900">PERINGATAN: PEGAWAI TELAH PENSIUN</h4>
              <p class="text-xs text-red-700 mt-1 leading-relaxed">
                Pegawai ini telah berstatus <strong>PENSIUN</strong>. Usulan perpanjangan kontrak ini <strong>harus dihentikan / ditolak</strong> karena pegawai yang bersangkutan sudah tidak aktif.
              </p>
            </div>
          </div>
        {/if}

        <dl class="grid grid-cols-2 gap-4">
          <div
            class="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2"
          >
            <dt class="text-xs font-medium text-slate-400 uppercase">
              Pegawai
            </dt>
            <dd class="mt-1 text-sm font-semibold text-slate-800">
              {selectedRecord.dataP3k?.nama}
            </dd>
            <dd class="text-xs text-slate-500 font-mono">
              {selectedRecord.dataP3k?.nipBaru}
            </dd>
            <dd class="mt-1 text-sm text-slate-700">
              {selectedRecord.dataP3k?.jabatanNama || "-"}
            </dd>
          </div>
          <div
            class="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2"
          >
            <dt class="text-xs font-medium text-slate-400 uppercase">
              Unit Kerja
            </dt>
            <dd class="mt-1 text-sm text-slate-700">
              {selectedRecord.dataP3k?.unorInduk?.nama ||
                selectedRecord.dataP3k?.unorNama ||
                "-"}
            </dd>
          </div>
          <div class="p-3 rounded-xl bg-blue-50 border border-blue-100">
            <dt class="text-xs font-medium text-blue-500 uppercase">
              Tanggal Mulai
            </dt>
            <dd class="mt-1 text-sm font-semibold text-blue-700">
              {formatDate(selectedRecord.tanggalMulai)}
            </dd>
          </div>
          <div class="p-3 rounded-xl bg-blue-50 border border-blue-100">
            <dt class="text-xs font-medium text-blue-500 uppercase">
              Tanggal Selesai
            </dt>
            <dd class="mt-1 text-sm font-semibold text-blue-700">
              {formatDate(selectedRecord.tanggalSelesai)}
            </dd>
          </div>
          {#if selectedRecord.keterangan}
            <div
              class="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2"
            >
              <dt class="text-xs font-medium text-slate-400 uppercase">
                Keterangan
              </dt>
              <dd class="mt-1 text-sm text-slate-700">
                {selectedRecord.keterangan}
              </dd>
            </div>
          {/if}
          <div
            class="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2"
          >
            <dt class="text-xs font-medium text-slate-400 uppercase">Status</dt>
            <dd class="mt-1">
              <span
                class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border {statusColor(
                  selectedRecord.status,
                )}">{statusLabel(selectedRecord.status)}</span
              >
            </dd>
            {#if selectedRecord.alasanPenolakan}
              <dd class="mt-1 text-xs text-red-500 italic">
                Alasan: {selectedRecord.alasanPenolakan}
              </dd>
            {/if}
          </div>
        </dl>

        <!-- Preview Section for PENDING -->
        {#if selectedRecord.status === "PENDING"}
          <div class="mt-6 border-t border-slate-100 pt-5">
            <h4
              class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"
            >
              <svg
                class="w-4 h-4 text-indigo-500"
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
              Preview Data Cetak
            </h4>

            {#if isLoadingPreview}
              <div
                class="flex items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-100"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-5 h-5 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin"
                  ></div>
                  <span class="text-sm text-slate-500 font-medium"
                    >Memuat kalkulasi...</span
                  >
                </div>
              </div>
            {:else if previewData}
              <div class="bg-slate-800 rounded-xl p-4 text-slate-300">
                <dl class="space-y-3">
                  <div
                    class="flex justify-between items-center pb-2 border-b border-slate-700/50"
                  >
                    <dt class="text-xs font-medium text-slate-400">
                      TMT Awal PPPK
                    </dt>
                    <dd class="text-sm font-semibold text-white">
                      {formatDateIndoFull(previewData.tmtCpns)}
                    </dd>
                  </div>
                  <div
                    class="flex justify-between items-center pb-2 border-b border-slate-700/50"
                  >
                    <dt class="text-xs font-medium text-slate-400">
                      Nomor Kontrak
                    </dt>
                    <dd class="text-sm font-semibold text-white">
                      {#if previewData.nomorKontrak}
                        {previewData.nomorKontrak}
                      {:else}
                        <span class="text-amber-400 italic">Belum diisi</span>
                      {/if}
                    </dd>
                  </div>
                  <div
                    class="flex justify-between items-center pb-2 border-b border-slate-700/50"
                  >
                    <dt class="text-xs font-medium text-slate-400">
                      Masa Kerja (Hitung)
                    </dt>
                    <dd class="text-sm font-semibold text-white">
                      {previewData.mkTahun} Tahun {previewData.mkBulan} Bulan
                    </dd>
                  </div>
                  <div
                    class="flex justify-between items-center pb-2 border-b border-slate-700/50"
                  >
                    <dt class="text-xs font-medium text-slate-400">
                      Gaji Pokok
                    </dt>
                    <dd
                      class="text-sm font-semibold {previewData.gaji === '0'
                        ? 'text-amber-400'
                        : 'text-emerald-400'}"
                    >
                      Rp {previewData.gaji}
                    </dd>
                  </div>
                  <div class="flex justify-between items-start pt-1">
                    <dt
                      class="text-xs font-medium text-slate-400 mt-0.5 whitespace-nowrap mr-4"
                    >
                      Terbilang
                    </dt>
                    <dd
                      class="text-sm font-medium text-white italic text-right leading-tight"
                    >
                      {#if previewData.terbilang}
                        {previewData.terbilang}
                      {:else}
                        <span class="text-amber-400"
                          >Tabel gaji belum diatur</span
                        >
                      {/if}
                    </dd>
                  </div>
                </dl>

                {#if previewData.gaji === "0"}
                  <div
                    class="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-3 text-amber-200 text-xs"
                  >
                    <svg
                      class="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5"
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
                    <p>
                      Gaji untuk Golongan <strong
                        >{previewData.golonganAkhirNama || "-"}</strong
                      >
                      dengan Masa Kerja
                      <strong
                        >{previewData.mkTahun} Tahun {previewData.mkBulan} Bulan</strong
                      > belum diatur di referensi Tabel Gaji. Harap sesuaikan sebelum
                      menyetujui jika ingin angka tercetak.
                    </p>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/if}

        {#if selectedRecord.finalFileUrl}
          <div class="mt-4">
            <a
              href={`${API_BASE_URL}${selectedRecord.finalFileUrl}`}
              target="_blank"
              class="bg-red-600 hover:bg-red-700 text-white w-full text-sm gap-2 justify-center py-2.5 rounded-lg transition-colors flex items-center font-semibold"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                ></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              Download PDF PK (Final)
            </a>
          </div>
        {/if}

        {#if selectedRecord.status === "PENDING"}
          <div class="mt-6 border-t pt-5 border-slate-100">
            {#if showApproveConfirm}
              <div class="space-y-3">
                <div
                  class="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm"
                >
                  <p class="font-semibold mb-1">Konfirmasi Persetujuan</p>
                  <p>
                    Apakah Anda yakin menyetujui usulan ini? Sistem akan membuat
                    dokumen kontrak secara otomatis untuk pegawai bersangkutan.
                  </p>
                </div>
                <div class="flex gap-2">
                  <button
                    on:click={() => (showApproveConfirm = false)}
                    class="btn-secondary flex-1 text-sm"
                    disabled={isProcessing}>Batal</button
                  >
                  <button
                    on:click={handleApprove}
                    class="flex-1 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Memproses..." : "Ya, Setujui"}
                  </button>
                </div>
              </div>
            {:else if showRejectForm}
              <div class="space-y-3">
                <label
                  for="alasanPenolakanTextArea"
                  class="block text-sm font-medium text-slate-700"
                  >Alasan Penolakan *</label
                >
                <textarea
                  id="alasanPenolakanTextArea"
                  bind:value={rejectReason}
                  rows="3"
                  class="input-field"
                  placeholder="Tuliskan alasan penolakan..."
                ></textarea>
                <div class="flex gap-2">
                  <button
                    on:click={() => (showRejectForm = false)}
                    class="btn-secondary flex-1 text-sm"
                    disabled={isProcessing}>Batal</button
                  >
                  <button
                    on:click={handleReject}
                    class="flex-1 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Memproses..." : "Konfirmasi Tolak"}
                  </button>
                </div>
              </div>
            {:else}
              <div class="flex gap-3">
                <button
                  on:click={() => (showApproveConfirm = true)}
                  class="flex-1 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Memproses..." : "✓ Setujui"}
                </button>
                <button
                  on:click={() => (showRejectForm = true)}
                  class="flex-1 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 py-2.5 rounded-lg transition-colors"
                  disabled={isProcessing}
                >
                  ✕ Tolak
                </button>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- Hidden File Input -->
<input
  type="file"
  accept=".pdf"
  class="hidden"
  bind:this={fileInput}
  on:change={handleFileUpload}
/>
