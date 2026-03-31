<script>
  import { addToast } from "$lib/toastStore";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import ConfirmDeleteModal from "$lib/components/ConfirmDeleteModal.svelte";

  $: isAdmin = $authStore.user?.role === "admin";

  let records = [];
  let isLoading = true;
  let templates = [];
  let searchTerm = "";
  let meta = { page: 1, limit: 10, total: 0, totalPages: 1 };

  // Employee search
  let employeeSearch = "";
  let employeeResults = [];
  let showEmployeeDropdown = false;
  let isSearchingEmployee = false;
  let employeeTimeout = null;

  // Modal state
  let showCreateModal = false;
  let showTemplateModal = false;
  let showDeleteConfirmModal = false;
  let deleteConfirmId = null;
  let isDeleting = false;
  let deleteModalConfig = { title: "", message: "", type: "" };
  let isSubmitting = false;
  let isUploadingTemplate = false;
  let editingId = null;
  let form = {
    nipBaru: "",
    namaDisplay: "",
    tanggalMulai: "",
    tanggalSelesai: "",
    nomorKontrak: "",
    tanggalTtd: "",
    keterangan: "",
    templateKontrakId: "",
  };
  let templateForm = { nama: "", deskripsi: "" };
  let templateFile = null;

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login", "error");
      goto("/login");
      return;
    }
    fetchData();
    fetchTemplates();
  });

  const fetchData = async (page = 1) => {
    isLoading = true;
    try {
      const params = new URLSearchParams({ page, limit: meta.limit });
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

  const fetchTemplates = async () => {
    try {
      const result = await apiRequest("/api/v1/perpanjangan/templates", "GET");
      if (result.success) templates = result.data;
    } catch (e) {
      console.error(e);
    }
  };

  const handleEmployeeSearch = (e) => {
    const val = e.target.value;
    employeeSearch = val;
    form.nipBaru = "";
    form.namaDisplay = "";
    if (employeeTimeout) clearTimeout(employeeTimeout);
    if (val.trim().length < 2) {
      employeeResults = [];
      showEmployeeDropdown = false;
      return;
    }
    employeeTimeout = setTimeout(async () => {
      isSearchingEmployee = true;
      try {
        const result = await apiRequest(
          `/api/v1/data-p3k?search=${encodeURIComponent(val)}&limit=5&statusPensiun=AKTIF`,
          "GET",
        );
        if (result.success) {
          employeeResults = result.data;
          showEmployeeDropdown = true;
        }
      } catch (err) {
        console.error(err);
      } finally {
        isSearchingEmployee = false;
      }
    }, 300);
  };

  const selectEmployee = (emp) => {
    form.nipBaru = emp.nipBaru;
    form.namaDisplay = `${emp.nama} (${emp.nipBaru})`;
    employeeSearch = form.namaDisplay;
    showEmployeeDropdown = false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nipBaru) {
      addToast("Pilih pegawai terlebih dahulu", "error");
      return;
    }
    isSubmitting = true;
    try {
      const body = {
        nipBaru: form.nipBaru,
        tanggalMulai: form.tanggalMulai,
        tanggalSelesai: form.tanggalSelesai,
        nomorKontrak: form.nomorKontrak || undefined,
        tanggalTtd: form.tanggalTtd || undefined,
        keterangan: form.keterangan || undefined,
        templateKontrakId: form.templateKontrakId || undefined,
      };

      const url = editingId
        ? `/api/v1/perpanjangan/usulan/${editingId}`
        : `/api/v1/perpanjangan/usulan`;

      const method = editingId ? "PUT" : "POST";
      const result = await apiRequest(url, method, body);

      if (result.success) {
        addToast(result.message || "Usulan berhasil disimpan", "success");
        showCreateModal = false;
        resetForm();
        fetchData();
      } else {
        addToast(result.message || "Gagal menyimpan usulan", "error");
      }
    } catch (err) {
      addToast(err.message || "Terjadi kesalahan sistem", "error");
    } finally {
      isSubmitting = false;
    }
  };

  const handleEditUsulan = (rec) => {
    editingId = rec.id;
    form = {
      nipBaru: rec.dataP3k?.nipBaru || "",
      namaDisplay: rec.dataP3k?.nama
        ? `${rec.dataP3k.nama} (${rec.dataP3k.nipBaru})`
        : "",
      tanggalMulai: rec.tanggalMulai,
      tanggalSelesai: rec.tanggalSelesai,
      nomorKontrak: rec.nomorKontrak || "",
      tanggalTtd: rec.tanggalTtd || "",
      keterangan: rec.keterangan || "",
      templateKontrakId: rec.templateKontrakId || "",
    };
    employeeSearch = form.namaDisplay;
    showCreateModal = true;
  };

  const confirmDeleteUsulan = (id) => {
    deleteConfirmId = id;
    deleteModalConfig = {
      title: "Hapus Usulan?",
      message: "Apakah Anda yakin ingin menghapus usulan ini?",
      type: "STANDARD_USULAN",
      theme: "danger",
      confirmText: "Ya, Hapus"
    };
    showDeleteConfirmModal = true;
  };

  const performDeleteUsulan = async () => {
    isDeleting = true;
    try {
      const result = await apiRequest(
        `/api/v1/perpanjangan/usulan/${deleteConfirmId}`,
        "DELETE",
      );
      if (result.success) {
        addToast(result.message || "Usulan berhasil dihapus", "success");
        fetchData(meta.page);
      } else {
        addToast(result.message || "Gagal menghapus usulan", "error");
      }
    } catch (e) {
      addToast(e.message || "Terjadi kesalahan", "error");
    } finally {
      isDeleting = false;
      showDeleteConfirmModal = false;
      deleteConfirmId = null;
    }
  };

  const confirmDeleteApprovedUsulan = (id) => {
    deleteConfirmId = id;
    deleteModalConfig = {
      title: "Hapus Permanen?",
      message: "Apakah Anda yakin ingin menghapus usulan ini? File kontrak yang telah digenerate untuk pegawai terkait juga akan ikut terhapus secara fisik. Tindakan ini tidak dapat dibatalkan.",
      type: "PERMANENT_USULAN",
      theme: "danger",
      confirmText: "Ya, Hapus"
    };
    showDeleteConfirmModal = true;
  };

  const handleDeleteApprovedUsulan = async () => {
    isDeleting = true;
    try {
      const result = await apiRequest(
        `/api/v1/perpanjangan/usulan/${deleteConfirmId}/approved`,
        "DELETE",
      );
      if (result.success) {
        addToast(result.message || "Usulan berhasil dihapus", "success");
        fetchData(meta.page);
      } else {
        addToast(result.message || "Gagal menghapus", "error");
      }
    } catch (e) {
      addToast(e.message || "Terjadi kesalahan sistem", "error");
    } finally {
      isDeleting = false;
      showDeleteConfirmModal = false;
      deleteConfirmId = null;
    }
  };

  const handleUploadTemplate = async (e) => {
    e.preventDefault();
    if (!templateFile) {
      addToast("Pilih file template Word (.docx)", "error");
      return;
    }
    isUploadingTemplate = true;
    try {
      const fd = new FormData();
      fd.append("nama", templateForm.nama);
      if (templateForm.deskripsi)
        fd.append("deskripsi", templateForm.deskripsi);
      fd.append("file", templateFile);
      const result = await apiRequest(
        "/api/v1/perpanjangan/templates",
        "POST",
        fd,
        true, // isFormData
      );
      if (result.success) {
        addToast(result.message || "Template berhasil diunggah", "success");
        showTemplateModal = false;
        templateForm = { nama: "", deskripsi: "" };
        templateFile = null;
        fetchTemplates();
      } else {
        addToast(result.message || "Gagal mengunggah template", "error");
      }
    } catch (e) {
      addToast(e.message || "Gagal upload template", "error");
    } finally {
      isUploadingTemplate = false;
    }
  };

  const confirmDeleteTemplate = (id) => {
    deleteConfirmId = id;
    deleteModalConfig = {
      title: "Hapus Template?",
      message: "Apakah Anda yakin ingin menghapus template ini?",
      type: "TEMPLATE",
      theme: "danger",
      confirmText: "Ya, Hapus"
    };
    showDeleteConfirmModal = true;
  };

  const performDeleteTemplate = async () => {
    isDeleting = true;
    try {
      const result = await apiRequest(
        `/api/v1/perpanjangan/templates/${deleteConfirmId}`,
        "DELETE",
      );
      if (result.success) {
        addToast(result.message || "Template berhasil dihapus", "success");
        fetchTemplates();
      } else {
        addToast(result.message || "Gagal menghapus template", "error");
      }
    } catch (e) {
      addToast(e.message || "Gagal menghapus template", "error");
    } finally {
      isDeleting = false;
      showDeleteConfirmModal = false;
      deleteConfirmId = null;
    }
  };

  const confirmProcessSrikandi = (id) => {
    deleteConfirmId = id;
    deleteModalConfig = {
      title: "Proses ke Srikandi?",
      message: "Apakah Anda yakin ingin memproses usulan ini ke tahap Upload Srikandi?",
      type: "SRIKANDI",
      theme: "warning",
      confirmText: "Ya, Proses"
    };
    showDeleteConfirmModal = true;
  };

  const performProcessSrikandi = async () => {
    isDeleting = true;
    try {
      const res = await apiRequest(
        `/api/v1/perpanjangan/usulan/${deleteConfirmId}/srikandi`,
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
    } finally {
      isDeleting = false;
      showDeleteConfirmModal = false;
      deleteConfirmId = null;
    }
  };

  const executeDelete = async () => {
    if (deleteModalConfig.type === "PERMANENT_USULAN") {
      await handleDeleteApprovedUsulan();
    } else if (deleteModalConfig.type === "STANDARD_USULAN") {
      await performDeleteUsulan();
    } else if (deleteModalConfig.type === "TEMPLATE") {
      await performDeleteTemplate();
    } else if (deleteModalConfig.type === "SRIKANDI") {
      await performProcessSrikandi();
    }
  };

  const resetForm = () => {
    editingId = null;
    form = {
      nipBaru: "",
      namaDisplay: "",
      tanggalMulai: "",
      tanggalSelesai: "",
      nomorKontrak: "",
      tanggalTtd: "",
      keterangan: "",
      templateKontrakId: "",
    };
    employeeSearch = "";
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
    confirmProcessSrikandi(id);
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

  const handleTanggalMulaiChange = () => {
    if (form.tanggalMulai) {
      const d = new Date(form.tanggalMulai);
      if (!isNaN(d.getTime())) {
        d.setFullYear(d.getFullYear() + 1);
        d.setDate(d.getDate() - 1);
        form.tanggalSelesai = d.toISOString().split("T")[0];
      }
    }
  };
</script>

<svelte:head>
  <title>Usulan Perpanjangan — P3K App</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-800">
        Usulan Perpanjangan Kontrak
      </h1>
      <p class="mt-1 text-sm text-slate-500">
        Buat dan kelola usulan perpanjangan kontrak pegawai PPPK.
      </p>
    </div>
    <div class="flex items-center gap-2 flex-wrap">
      {#if isAdmin}
        <button
          on:click={() => (showTemplateModal = true)}
          class="btn-secondary gap-1.5 text-sm"
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
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            /></svg
          >
          Template
        </button>
      {/if}
      <button
        on:click={() => {
          resetForm();
          showCreateModal = true;
        }}
        class="btn-primary gap-1.5 text-sm"
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
            d="M12 4v16m8-8H4"
          /></svg
        >
        Buat Usulan
      </button>
    </div>
  </div>

  <!-- Search -->
  <div class="card p-4">
    <form
      on:submit|preventDefault={() => {
        meta.page = 1;
        fetchData();
      }}
      class="flex gap-3"
    >
      <input
        type="text"
        bind:value={searchTerm}
        placeholder="Cari nama / NIP pegawai..."
        class="input-field flex-1"
      />
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
              >Periode</th
            >
            <th
              class="hidden lg:table-cell px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase"
              >Template</th
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
                ><p class="text-sm text-slate-400">
                  Belum ada usulan perpanjangan.
                </p></td
              ></tr
            >
          {:else}
            {#each records as rec, i}
              <tr class="hover:bg-slate-50/50 transition-colors">
                <td class="px-4 sm:px-6 py-3 text-sm text-slate-400 font-mono"
                  >{(meta.page - 1) * meta.limit + i + 1}</td
                >
                <td class="px-4 sm:px-6 py-3">
                  <p class="text-sm font-semibold text-slate-800">
                    {rec.dataP3k?.nama || "-"}
                  </p>
                  <p class="text-xs text-slate-400 font-mono">
                    {rec.dataP3k?.nipBaru || "-"}
                  </p>
                </td>
                <td
                  class="hidden md:table-cell px-4 sm:px-6 py-3 text-sm text-slate-600"
                >
                  {formatDate(rec.tanggalMulai)} — {formatDate(rec.tanggalSelesai)}
                </td>
                <td
                  class="hidden lg:table-cell px-4 sm:px-6 py-3 text-sm text-slate-500"
                >
                  {rec.templateKontrak?.nama || "-"}
                </td>
                <td class="px-4 sm:px-6 py-3">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border {statusColor(
                      rec.status,
                    )}">{statusLabel(rec.status)}</span
                  >
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
                    {#if rec.generatedFileUrl && rec.status !== "SELESAI"}
                      <a
                        href={`http://localhost:3000${rec.generatedFileUrl}`}
                        target="_blank"
                        class="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors border border-blue-100 flex items-center justify-center translate-y-[1px]"
                        title="Download Word"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 48 48"
                        >
                          <rect
                            x="22"
                            y="10"
                            width="20"
                            height="28"
                            rx="2"
                            fill="#2196F3"
                          />
                          <path
                            d="M26 16h12M26 21h12M26 26h12M26 31h12"
                            stroke="#fff"
                            stroke-width="2"
                          />
                          <path d="M6 10l20-4v36L6 38z" fill="#0D47A1" />
                          <path
                            d="M11 18l3 12 3-12 3 12 3-12"
                            fill="none"
                            stroke="#fff"
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      </a>
                    {/if}
                    {#if rec.finalFileUrl}
                      <a
                        href={`http://localhost:3000${rec.finalFileUrl}`}
                        target="_blank"
                        class="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors border border-red-100 flex items-center justify-center translate-y-[1px]"
                        title="Download PDF PK"
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
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      </a>
                    {/if}
                    {#if rec.status === "APPROVED"}
                      <button
                        on:click={() => handleProcessToSrikandi(rec.id)}
                        class="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors border border-amber-100 flex items-center justify-center translate-y-[1px]"
                        title="Proses ke Srikandi"
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
                          <line x1="22" y1="2" x2="11" y2="13"></line>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                      </button>
                    {/if}
                    {#if rec.status === "UPLOAD_SRIKANDI"}
                      <button
                        on:click={() => triggerUpload(rec.id)}
                        class="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors border border-indigo-100 flex items-center justify-center translate-y-[1px]"
                        title="Upload PDF PK (Final)"
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
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                      </button>
                    {/if}
                    {#if isAdmin}
                      <button
                        on:click={() =>
                          rec.status === "PENDING" || rec.status === "REJECTED"
                            ? confirmDeleteUsulan(rec.id)
                            : confirmDeleteApprovedUsulan(rec.id)}
                        class="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title={rec.status === "PENDING" || rec.status === "REJECTED" ? "Hapus": "Hapus Permanen"}
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          /></svg
                        >
                      </button>
                    {:else if rec.status === "PENDING" || rec.status === "REJECTED"}
                       <button
                        on:click={() => confirmDeleteUsulan(rec.id)}
                        class="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Hapus"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          /></svg
                        >
                      </button>
                    {/if}
                    {#if rec.status === "REJECTED"}
                      <button
                        on:click={() => handleEditUsulan(rec)}
                        class="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                        title="Edit & Ajukan Kembali"
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
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
            disabled={meta.page === 1}
            on:click={() => fetchData(meta.page - 1)}
            class="btn-secondary !px-2.5 !py-1.5 disabled:opacity-40"
            aria-label="Halaman Sebelumnya"
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
            on:click={() => fetchData(meta.page + 1)}
            class="btn-secondary !px-2.5 !py-1.5 disabled:opacity-40"
            aria-label="Halaman Selanjutnya"
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

<!-- Create Usulan Modal -->
{#if showCreateModal}
  <div
    class="fixed z-50 inset-0 overflow-y-auto"
    role="dialog"
    aria-modal="true"
  >
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <button
        type="button"
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm w-full h-full border-none cursor-default"
        on:click={() => (showCreateModal = false)}
        aria-label="Tutup"
      ></button>
      <div
        class="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 z-10"
      >
        <div
          class="flex items-center justify-between pb-5 border-b border-slate-100 mb-5"
        >
          <h3 class="text-lg font-bold text-slate-800">
            {editingId ? "Edit & Ajukan Kembali" : "Buat Usulan Perpanjangan"}
          </h3>
          <button
            on:click={() => (showCreateModal = false)}
            class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Tutup Modal"
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
        <form on:submit={handleSubmit} class="space-y-4">
          <!-- Employee search -->
          <div class="relative">
            <label for="employee-search-input" class="block text-sm font-medium text-slate-700 mb-1"
              >Pegawai *</label
            >
            <input
              id="employee-search-input"
              type="text"
              value={employeeSearch}
              on:input={handleEmployeeSearch}
              on:focus={() => {
                if (employeeSearch.length >= 2) showEmployeeDropdown = true;
              }}
              on:blur={() =>
                setTimeout(() => (showEmployeeDropdown = false), 200)}
              class="input-field"
              placeholder="Ketik nama atau NIP..."
              autocomplete="off"
            />
            {#if isSearchingEmployee}
              <div class="absolute right-3 top-9">
                <div
                  class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"
                ></div>
              </div>
            {/if}
            {#if showEmployeeDropdown && !isSearchingEmployee}
              <ul
                class="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-48 rounded-md py-1 ring-1 ring-black ring-opacity-5 overflow-auto sm:text-sm"
              >
                {#if employeeResults.length > 0}
                  {#each employeeResults as emp}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
                    <li
                      class="cursor-pointer py-2 pl-3 pr-9 hover:bg-blue-50 text-slate-800"
                      on:click={() => selectEmployee(emp)}
                    >
                      <span class="font-medium">{emp.nama}</span>
                      <span class="text-xs text-slate-400 ml-2"
                        >{emp.nipBaru}</span
                      >
                    </li>
                  {/each}
                {:else}
                  <li class="py-2 pl-3 text-sm text-slate-400 italic">
                    Tidak ditemukan
                  </li>
                {/if}
              </ul>
            {/if}
            {#if form.nipBaru}
              <p class="text-xs text-emerald-600 mt-1">✓ {form.namaDisplay}</p>
            {/if}
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label
                for="tanggalMulai"
                class="block text-sm font-medium text-slate-700 mb-1"
                >Tanggal Mulai *</label
              >
              <input
                id="tanggalMulai"
                type="date"
                bind:value={form.tanggalMulai}
                on:change={handleTanggalMulaiChange}
                class="input-field"
                required
              />
            </div>
            <div>
              <label
                for="tanggalSelesai"
                class="block text-sm font-medium text-slate-700 mb-1"
                >Tanggal Selesai *</label
              >
              <input
                id="tanggalSelesai"
                type="date"
                bind:value={form.tanggalSelesai}
                class="input-field"
                required
              />
            </div>
          </div>
          <div>
            <label
              for="templateKontrak"
              class="block text-sm font-medium text-slate-700 mb-1"
              >Template Kontrak</label
            >
            <select
              id="templateKontrak"
              bind:value={form.templateKontrakId}
              class="input-field"
            >
              <option value="">— Tanpa Template —</option>
              {#each templates as tpl}
                <option value={tpl.id}>{tpl.nama}</option>
              {/each}
            </select>
          </div>
          <div>
            <label
              for="nomorKontrakUsulan"
              class="block text-sm font-medium text-slate-700 mb-1"
              >Nomor Kontrak</label
            >
            <input
              id="nomorKontrakUsulan"
              type="text"
              bind:value={form.nomorKontrak}
              class="input-field"
              placeholder="800.1.13.2/0001/PPPK.Ts/BKPSDMD-B.TU/2025"
            />
          </div>
          <div>
            <label
              for="tanggalTtd"
              class="block text-sm font-medium text-slate-700 mb-1"
              >Tanggal Tanda Tangan Kontrak</label
            >
            <input
              id="tanggalTtd"
              type="date"
              bind:value={form.tanggalTtd}
              class="input-field"
            />
          </div>
          <div>
            <label
              for="keteranganUsulan"
              class="block text-sm font-medium text-slate-700 mb-1"
              >Keterangan</label
            >
            <input
              id="keteranganUsulan"
              type="text"
              bind:value={form.keterangan}
              class="input-field"
              placeholder="Opsional..."
            />
          </div>
          <div
            class="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-2"
          >
            <button
              type="button"
              class="btn-secondary"
              on:click={() => (showCreateModal = false)}
              disabled={isSubmitting}>Batal</button
            >
            <button
              type="submit"
              class="btn-primary"
              disabled={isSubmitting || !form.nipBaru}
            >
              {isSubmitting ? "Menyimpan..." : "Kirim Usulan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- Template Modal -->
{#if showTemplateModal}
  <div
    class="fixed z-50 inset-0 overflow-y-auto"
    role="dialog"
    aria-modal="true"
  >
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <button
        type="button"
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm w-full h-full border-none cursor-default"
        on:click={() => (showTemplateModal = false)}
        aria-label="Tutup"
      ></button>
      <div
        class="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 z-10"
      >
        <div
          class="flex items-center justify-between pb-5 border-b border-slate-100 mb-5"
        >
          <h3 class="text-lg font-bold text-slate-800">
            Kelola Template Kontrak
          </h3>
          <button
            on:click={() => (showTemplateModal = false)}
            class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Tutup Modal"
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

        <!-- Existing Templates -->
        <div class="space-y-2 mb-6 max-h-48 overflow-y-auto">
          {#if templates.length === 0}
            <p class="text-sm text-slate-400 text-center py-4">
              Belum ada template.
            </p>
          {:else}
            {#each templates as tpl}
              <div
                class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div>
                  <p class="text-sm font-semibold text-slate-800">{tpl.nama}</p>
                  {#if tpl.deskripsi}
                    <p class="text-xs text-slate-400">{tpl.deskripsi}</p>
                  {/if}
                  <p class="text-[10px] text-slate-400 mt-0.5">
                    {tpl.namaFile || "File"}
                  </p>
                </div>
                <div class="flex items-center gap-1">
                  <a
                    href={`http://localhost:3000${tpl.fileUrl}`}
                    target="_blank"
                    class="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-100 transition-colors"
                    title="Download template"
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
                  <button
                    on:click={() => confirmDeleteTemplate(tpl.id)}
                    class="p-1.5 rounded-lg text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                    title="Hapus"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      /></svg
                    >
                  </button>
                </div>
              </div>
            {/each}
          {/if}
        </div>

        <!-- Upload new (admin only) -->
        {#if isAdmin}
          <div class="border-t border-slate-100 pt-5">
            <h4 class="text-sm font-bold text-slate-700 mb-3">
              Upload Template Baru
            </h4>
            <p class="text-xs text-slate-400 mb-3">
              Gunakan placeholder di file Word: <code
                class="bg-slate-100 px-1 py-0.5 rounded text-indigo-600"
                >{"{nama}"}</code
              >,
              <code class="bg-slate-100 px-1 py-0.5 rounded text-indigo-600"
                >{"{nipBaru}"}</code
              >,
              <code class="bg-slate-100 px-1 py-0.5 rounded text-indigo-600"
                >{"{jabatan}"}</code
              >,
              <code class="bg-slate-100 px-1 py-0.5 rounded text-indigo-600"
                >{"{tanggalMulai}"}</code
              >,
              <code class="bg-slate-100 px-1 py-0.5 rounded text-indigo-600"
                >{"{tanggalSelesai}"}</code
              >, dll.
            </p>
            <form on:submit={handleUploadTemplate} class="space-y-3">
              <input
                type="text"
                bind:value={templateForm.nama}
                placeholder="Nama template *"
                class="input-field"
                required
              />
              <input
                type="text"
                bind:value={templateForm.deskripsi}
                placeholder="Deskripsi (opsional)"
                class="input-field"
              />
              <input
                type="file"
                accept=".docx"
                on:change={(e) => (templateFile = e.target.files[0])}
                class="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
              <button
                type="submit"
                class="btn-primary w-full text-sm"
                disabled={isUploadingTemplate || !templateForm.nama}
              >
                {isUploadingTemplate ? "Mengupload..." : "Upload Template"}
              </button>
            </form>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirm Modal -->
<ConfirmDeleteModal
  bind:show={showDeleteConfirmModal}
  title={deleteModalConfig.title}
  message={deleteModalConfig.message}
  theme={deleteModalConfig.theme || 'danger'}
  confirmText={deleteModalConfig.confirmText || 'Ya, Hapus'}
  isProcessing={isDeleting}
  on:confirm={executeDelete}
/>

<!-- Hidden File Input -->
<input
  type="file"
  accept=".pdf"
  class="hidden"
  bind:this={fileInput}
  on:change={handleFileUpload}
/>
