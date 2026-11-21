<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { addToast } from "$lib/toastStore";
  import { authStore, isUserAdmin } from "$lib/store";
  import { apiRequest, API_BASE_URL } from "$lib/api";
  import ConfirmDeleteModal from "$lib/components/ConfirmDeleteModal.svelte";

  $: isAdmin = isUserAdmin($authStore.user);

  let templates = [];
  let isLoading = true;

  // Upload Form
  let templateForm = { nama: "", deskripsi: "" };
  let templateFile = null;
  let fileInput;
  let isUploading = false;

  // Delete Modal
  let showDeleteModal = false;
  let deleteId = null;
  let isDeleting = false;

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login untuk mengakses halaman ini", "error");
      goto("/login");
      return;
    }
    fetchTemplates();
  });

  const fetchTemplates = async () => {
    isLoading = true;
    try {
      const result = await apiRequest("/api/v1/perpanjangan/templates", "GET");
      if (result.success) {
        templates = result.data;
      } else {
        addToast(result.message || "Gagal memuat template", "error");
      }
    } catch (e) {
      console.error(e);
      addToast("Terjadi kesalahan saat memuat data template", "error");
    } finally {
      isLoading = false;
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (
        !file.name.endsWith(".docx") &&
        file.type !==
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        addToast("Hanya file format Word (.docx) yang diperbolehkan", "error");
        e.target.value = "";
        templateFile = null;
        return;
      }
      templateFile = file;
      if (!templateForm.nama) {
        // Otomatis isi nama dari nama file tanpa ekstensi
        templateForm.nama = file.name.replace(/\.docx$/i, "");
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!templateFile) {
      addToast("Pilih file template Word (.docx)", "error");
      return;
    }
    if (!templateForm.nama.trim()) {
      addToast("Nama template wajib diisi", "error");
      return;
    }

    isUploading = true;
    try {
      const fd = new FormData();
      fd.append("nama", templateForm.nama.trim());
      if (templateForm.deskripsi.trim()) {
        fd.append("deskripsi", templateForm.deskripsi.trim());
      }
      fd.append("file", templateFile);

      const result = await apiRequest(
        "/api/v1/perpanjangan/templates",
        "POST",
        fd,
        true, // isFormData
      );

      if (result.success) {
        addToast(result.message || "Template berhasil diunggah", "success");
        templateForm = { nama: "", deskripsi: "" };
        templateFile = null;
        if (fileInput) fileInput.value = "";
        fetchTemplates();
      } else {
        addToast(result.message || "Gagal mengunggah template", "error");
      }
    } catch (e) {
      addToast(e.message || "Gagal upload template", "error");
    } finally {
      isUploading = false;
    }
  };

  const confirmDelete = (id) => {
    deleteId = id;
    showDeleteModal = true;
  };

  const performDelete = async () => {
    if (!deleteId) return;
    isDeleting = true;
    try {
      const result = await apiRequest(
        `/api/v1/perpanjangan/templates/${deleteId}`,
        "DELETE",
      );
      if (result.success) {
        addToast(result.message || "Template berhasil dihapus", "success");
        fetchTemplates();
      } else {
        addToast(result.message || "Gagal menghapus template", "error");
      }
    } catch (e) {
      addToast(e.message || "Terjadi kesalahan saat menghapus", "error");
    } finally {
      isDeleting = false;
      showDeleteModal = false;
      deleteId = null;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };
</script>

<svelte:head>
  <title>Kelola Template Kontrak — App P3K</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
    <div>
      <div class="flex items-center gap-2 text-sm text-slate-500 mb-1">
        <span>Pengaturan</span>
        <span>/</span>
        <span>Referensi</span>
        <span>/</span>
        <span class="text-blue-600 font-medium">Template Kontrak</span>
      </div>
      <h1 class="text-2xl font-bold text-slate-800">
        Kelola Template Kontrak
      </h1>
      <p class="mt-1 text-sm text-slate-500">
        Kelola master berkas template Word (.docx) untuk pembuatan dokumen Perjanjian Kerja PPPK.
      </p>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Form Upload (Left Column) -->
    <div class="lg:col-span-1 space-y-6">
      <div class="card p-5 sm:p-6 shadow-sm border border-slate-200">
        <div class="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
          <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div>
            <h3 class="font-bold text-slate-800 text-base">Upload Template</h3>
            <p class="text-xs text-slate-400">Unggah berkas template baru format .docx</p>
          </div>
        </div>

        {#if isAdmin}
          <form on:submit|preventDefault={handleUpload} class="space-y-4">
            <div>
              <label for="templateNama" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Template *
              </label>
              <input
                id="templateNama"
                type="text"
                bind:value={templateForm.nama}
                placeholder="Contoh: Template Kontrak PPPK Teknis 2027"
                class="input-field w-full text-sm"
                required
              />
            </div>

            <div>
              <label for="templateDeskripsi" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Deskripsi (Opsional)
              </label>
              <textarea
                id="templateDeskripsi"
                bind:value={templateForm.deskripsi}
                rows="2"
                placeholder="Catatan tambahan, contoh: Digunakan untuk perpanjangan tenaga teknis tahun anggaran 2027"
                class="input-field w-full text-sm resize-none"
              ></textarea>
            </div>

            <div>
              <label for="templateFile" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                File Dokumen (.docx) *
              </label>
              <input
                id="templateFile"
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                bind:this={fileInput}
                on:change={handleFileChange}
                class="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isUploading || !templateFile}
              class="btn-primary w-full justify-center gap-2 mt-2"
            >
              {#if isUploading}
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Mengunggah...
              {:else}
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Unggah Template
              {/if}
            </button>
          </form>
        {:else}
          <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            Hanya Administrator yang memiliki akses untuk mengunggah template kontrak baru.
          </div>
        {/if}
      </div>

      <!-- Placeholder Helper Card -->
      <div class="card p-5 bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-indigo-100/60 rounded-2xl space-y-3">
        <h4 class="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
          <svg class="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Daftar Tag Placeholder
        </h4>
        <p class="text-xs text-slate-600 leading-relaxed">
          Gunakan tag berikut di dalam berkas Word Anda. Sistem akan otomatis mengganti tag dengan data pegawai saat dokumen dibuat:
        </p>
        <div class="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
          <span class="bg-white/80 border border-slate-200 px-2 py-1 rounded text-indigo-700 font-semibold truncate">&#123;nama&#125;</span>
          <span class="bg-white/80 border border-slate-200 px-2 py-1 rounded text-indigo-700 font-semibold truncate">&#123;nipBaru&#125;</span>
          <span class="bg-white/80 border border-slate-200 px-2 py-1 rounded text-indigo-700 font-semibold truncate">&#123;nik&#125;</span>
          <span class="bg-white/80 border border-slate-200 px-2 py-1 rounded text-indigo-700 font-semibold truncate">&#123;jabatan&#125;</span>
          <span class="bg-white/80 border border-slate-200 px-2 py-1 rounded text-indigo-700 font-semibold truncate">&#123;unorNama&#125;</span>
          <span class="bg-white/80 border border-slate-200 px-2 py-1 rounded text-indigo-700 font-semibold truncate">&#123;nomorKontrak&#125;</span>
          <span class="bg-white/80 border border-slate-200 px-2 py-1 rounded text-indigo-700 font-semibold truncate">&#123;tanggalMulai&#125;</span>
          <span class="bg-white/80 border border-slate-200 px-2 py-1 rounded text-indigo-700 font-semibold truncate">&#123;tanggalSelesai&#125;</span>
          <span class="bg-white/80 border border-slate-200 px-2 py-1 rounded text-indigo-700 font-semibold truncate">&#123;tanggalTtd&#125;</span>
          <span class="bg-white/80 border border-slate-200 px-2 py-1 rounded text-indigo-700 font-semibold truncate">&#123;kontrakKe&#125;</span>
          <span class="bg-white/80 border border-slate-200 px-2 py-1 rounded text-indigo-700 font-semibold truncate">&#123;golongan&#125;</span>
          <span class="bg-white/80 border border-slate-200 px-2 py-1 rounded text-indigo-700 font-semibold truncate">&#123;gaji&#125;</span>
        </div>
      </div>
    </div>

    <!-- Template List (Right Column) -->
    <div class="lg:col-span-2 space-y-4">
      <div class="card overflow-hidden border border-slate-200">
        <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 class="font-bold text-slate-800 text-base">Daftar Template Aktif</h3>
            <p class="text-xs text-slate-500">Total {templates.length} template terdaftar di sistem</p>
          </div>
          <button
            on:click={fetchTemplates}
            class="p-2 text-slate-500 hover:text-blue-600 bg-white rounded-lg shadow-sm border border-slate-200 hover:border-blue-200 transition-colors"
            title="Refresh"
            aria-label="Refresh Data"
          >
            <svg class="w-4 h-4 {isLoading ? 'animate-spin text-blue-600' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {#if isLoading}
          <div class="p-12 text-center text-slate-400">
            <div class="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p class="text-sm">Memuat data template...</p>
          </div>
        {:else if templates.length === 0}
          <div class="p-12 text-center text-slate-400 space-y-3">
            <div class="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p class="text-sm font-medium text-slate-600">Belum ada template yang diunggah</p>
            <p class="text-xs text-slate-400 max-w-sm mx-auto">
              Gunakan formulir di sebelah kiri untuk mengunggah template perjanjian kerja pertama.
            </p>
          </div>
        {:else}
          <div class="divide-y divide-slate-100">
            {#each templates as tpl (tpl.id)}
              <div class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div class="flex items-start gap-3.5">
                  <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 class="font-bold text-slate-800 text-sm">{tpl.nama}</h4>
                    {#if tpl.deskripsi}
                      <p class="text-xs text-slate-500 mt-0.5">{tpl.deskripsi}</p>
                    {/if}
                    <div class="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5 flex-wrap">
                      <span class="inline-flex items-center gap-1 font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {tpl.namaFile || "template.docx"}
                      </span>
                      <span>Diunggah: {formatDate(tpl.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <a
                    href={`${API_BASE_URL}${tpl.fileUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn-secondary !py-1.5 !px-3 text-xs gap-1.5"
                    title="Download template"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Unduh
                  </a>

                  {#if isAdmin}
                    <button
                      type="button"
                      on:click={() => confirmDelete(tpl.id)}
                      class="p-2 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 border border-slate-200 transition-colors"
                      title="Hapus template"
                      aria-label="Hapus template"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<ConfirmDeleteModal
  bind:show={showDeleteModal}
  title="Hapus Template Kontrak?"
  message="Apakah Anda yakin ingin menghapus template ini? Tindakan ini tidak dapat dibatalkan."
  theme="danger"
  confirmText="Ya, Hapus"
  isLoading={isDeleting}
  onConfirm={performDelete}
  onCancel={() => {
    showDeleteModal = false;
    deleteId = null;
  }}
/>

