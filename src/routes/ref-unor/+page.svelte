<script>
  import { addToast } from "$lib/toastStore";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let records = $state([]);
  let treeData = $state([]);
  let parentOptions = $state([]);
  let isLoading = $state(true);
  let isLoadingTree = $state(false);
  let viewMode = $state("tree"); // "tree" | "table"
  let searchTerm = $state("");
  let filterJenis = $state("");
  let filterParent = $state("");
  let expandedNodes = $state(new Set());

  let meta = $state({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  let showModal = $state(false);
  let showDeleteModal = $state(false);
  let isSubmitting = $state(false);
  let isEditMode = $state(false);
  let selectedRecord = $state(null);
  let selectedId = $state(null);

  let formRef = $state({
    nama: "",
    kode: "",
    parentId: "",
    jenis: "INDUK",
    keterangan: "",
  });

  const JENIS_OPTIONS = [
    { value: "INDUK", label: "Induk (Dinas / Badan / Setda)", badge: "bg-blue-50 text-blue-700 border-blue-200" },
    { value: "BIDANG", label: "Bidang / Bagian", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    { value: "SEKSI", label: "Seksi / Sub Bagian", badge: "bg-purple-50 text-purple-700 border-purple-200" },
    { value: "UPTD", label: "UPTD", badge: "bg-amber-50 text-amber-700 border-amber-200" },
    { value: "PUSKESMAS", label: "Puskesmas / Faskes", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { value: "SEKOLAH", label: "Sekolah / Satuan Pendidikan", badge: "bg-teal-50 text-teal-700 border-teal-200" },
    { value: "SUB_UNOR", label: "Sub Unit Kerja Lainnya", badge: "bg-slate-50 text-slate-700 border-slate-200" },
  ];

  const getJenisBadge = (jenis) => {
    const opt = JENIS_OPTIONS.find((o) => o.value === jenis);
    return opt ? opt.badge : "bg-slate-50 text-slate-700 border-slate-200";
  };

  const getJenisLabel = (jenis) => {
    const opt = JENIS_OPTIONS.find((o) => o.value === jenis);
    return opt ? opt.label : jenis || "INDUK";
  };

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login untuk mengakses halaman ini", "error");
      goto("/login");
      return;
    }
    loadAll();
  });

  const loadAll = async () => {
    await Promise.all([fetchData(), fetchTree(), fetchParentOptions()]);
  };

  const fetchData = async (page = 1) => {
    isLoading = true;
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: meta.limit.toString(),
      });
      if (searchTerm) queryParams.append("search", searchTerm);
      if (filterJenis) queryParams.append("jenis", filterJenis);
      if (filterParent) queryParams.append("parentId", filterParent);

      const result = await apiRequest(`/api/v1/ref-unor?${queryParams.toString()}`, "GET");
      if (result.success) {
        records = result.data;
        meta = result.meta;
      } else {
        addToast(result.message || "Gagal memuat data referensi", "error");
      }
    } catch (error) {
      console.error("Fetch data error:", error);
      addToast("Terjadi kesalahan sistem saat memuat tabel", "error");
    } finally {
      isLoading = false;
    }
  };

  const fetchTree = async () => {
    isLoadingTree = true;
    try {
      const result = await apiRequest("/api/v1/ref-unor/tree", "GET");
      if (result.success) {
        treeData = result.data || [];
        // Expand top root nodes by default
        const initialExpanded = new Set();
        treeData.forEach((root) => {
          if (root.children && root.children.length > 0) {
            initialExpanded.add(root.id);
          }
        });
        expandedNodes = initialExpanded;
      }
    } catch (error) {
      console.error("Fetch tree error:", error);
    } finally {
      isLoadingTree = false;
    }
  };

  const fetchParentOptions = async () => {
    try {
      const result = await apiRequest("/api/v1/ref-unor?limit=1000", "GET");
      if (result.success) {
        parentOptions = result.data || [];
      }
    } catch (error) {
      console.error("Fetch parent options error:", error);
    }
  };

  const toggleNode = (nodeId) => {
    const next = new Set(expandedNodes);
    if (next.has(nodeId)) {
      next.delete(nodeId);
    } else {
      next.add(nodeId);
    }
    expandedNodes = next;
  };

  const expandAll = () => {
    const next = new Set();
    const collectIds = (nodes) => {
      nodes.forEach((n) => {
        next.add(n.id);
        if (n.children && n.children.length > 0) {
          collectIds(n.children);
        }
      });
    };
    collectIds(treeData);
    expandedNodes = next;
  };

  const collapseAll = () => {
    expandedNodes = new Set();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    meta.page = 1;
    fetchData();
  };

  const openAddModal = (defaultParentId = null) => {
    isEditMode = false;
    selectedId = null;
    selectedRecord = null;
    formRef = {
      nama: "",
      kode: "",
      parentId: defaultParentId || "",
      jenis: defaultParentId ? "SUB_UNOR" : "INDUK",
      keterangan: "",
    };
    showModal = true;
  };

  const openEditModal = (record) => {
    isEditMode = true;
    selectedId = record.id;
    selectedRecord = record;
    formRef = {
      nama: record.nama || "",
      kode: record.kode || "",
      parentId: record.parentId || "",
      jenis: record.jenis || (record.parentId ? "SUB_UNOR" : "INDUK"),
      keterangan: record.keterangan || "",
    };
    showModal = true;
  };

  const closeModal = () => {
    showModal = false;
    selectedId = null;
    selectedRecord = null;
    formRef = {
      nama: "",
      kode: "",
      parentId: "",
      jenis: "INDUK",
      keterangan: "",
    };
  };

  const confirmDelete = (record) => {
    selectedRecord = record;
    selectedId = record.id;
    showDeleteModal = true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formRef.nama.trim()) {
      addToast("Nama unit kerja wajib diisi", "warning");
      return;
    }

    isSubmitting = true;
    const method = isEditMode ? "PUT" : "POST";
    const url = isEditMode ? `/api/v1/ref-unor/${selectedId}` : `/api/v1/ref-unor`;

    try {
      const payload = {
        nama: formRef.nama.trim(),
        kode: formRef.kode?.trim() || null,
        parentId: formRef.parentId || null,
        jenis: formRef.jenis || (formRef.parentId ? "SUB_UNOR" : "INDUK"),
        keterangan: formRef.keterangan?.trim() || null,
      };

      const result = await apiRequest(url, method, payload);
      if (result.success) {
        addToast(
          result.message || (isEditMode ? "Referensi berhasil diperbarui" : "Unit kerja berhasil ditambahkan"),
          "success",
        );
        closeModal();
        loadAll();
      } else {
        addToast(result.message || "Gagal menyimpan referensi unit kerja", "error");
      }
    } catch (error) {
      console.error("Submit ref error:", error);
      addToast("Terjadi kesalahan sistem saat menyimpan data", "error");
    } finally {
      isSubmitting = false;
    }
  };

  const handleDelete = async () => {
    isSubmitting = true;
    try {
      const result = await apiRequest(`/api/v1/ref-unor/${selectedId}`, "DELETE");
      if (result.success) {
        addToast("Referensi unit kerja berhasil dihapus", "success");
        showDeleteModal = false;
        selectedId = null;
        selectedRecord = null;
        loadAll();
      } else {
        addToast(result.message || "Gagal menghapus referensi unit kerja", "error");
      }
    } catch (error) {
      console.error("Delete error:", error);
      addToast("Terjadi kesalahan sistem saat menghapus data", "error");
    } finally {
      isSubmitting = false;
    }
  };

  // Filter out self when editing parent
  let availableParents = $derived(
    parentOptions.filter((p) => {
      if (!isEditMode) return true;
      return p.id !== selectedId;
    })
  );

  // Filtered Tree View for search
  const filterTreeNodes = (nodes, query) => {
    if (!query) return nodes;
    const lowerQuery = query.toLowerCase();

    return nodes.reduce((acc, node) => {
      const matchSelf = node.nama.toLowerCase().includes(lowerQuery) || (node.kode && node.kode.toLowerCase().includes(lowerQuery));
      const filteredChildren = node.children ? filterTreeNodes(node.children, query) : [];

      if (matchSelf || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren,
          isMatch: matchSelf,
        });
      }
      return acc;
    }, []);
  };

  let displayTree = $derived(searchTerm ? filterTreeNodes(treeData, searchTerm) : treeData);
</script>

<svelte:head>
  <title>Referensi Unit Kerja & Sub Unor — App P3K</title>
</svelte:head>

<div class="max-w-[1440px] mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <div class="flex items-center gap-2">
        <span class="p-2 rounded-xl bg-teal-50 text-teal-600">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </span>
        <div>
          <h1 class="text-2xl font-bold text-slate-800">
            Referensi Unit Kerja & Hierarki Sub Unor
          </h1>
          <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola master struktur organisasi (Unit Kerja Induk dan Sub Unit Kerja / Bidang / Puskesmas / Sekolah).
          </p>
        </div>
      </div>
    </div>

    <!-- Top Action Buttons -->
    <div class="flex items-center gap-2 flex-wrap">
      <!-- View Mode Switcher -->
      <div class="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
        <button
          type="button"
          onclick={() => (viewMode = "tree")}
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 {viewMode === 'tree' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600 hover:text-slate-800'}"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h10M4 18h7" />
          </svg>
          Struktur Pohon (Tree)
        </button>
        <button
          type="button"
          onclick={() => (viewMode = "table")}
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 {viewMode === 'table' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600 hover:text-slate-800'}"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Daftar Tabel
        </button>
      </div>

      <button onclick={() => openAddModal(null)} class="btn-primary gap-1.5 text-xs sm:text-sm">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Tambah Unit Kerja
      </button>

      <button onclick={loadAll} class="btn-secondary gap-1.5 text-xs sm:text-sm" title="Muat ulang data">
        <svg class="w-4 h-4 {isLoading || isLoadingTree ? 'animate-spin' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span class="hidden sm:inline">Refresh</span>
      </button>
    </div>
  </div>

  <!-- Search & Filter Bar -->
  <div class="card p-4 sm:p-5">
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div class="relative flex-1">
        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          bind:value={searchTerm}
          placeholder="Cari nama unit kerja atau sub-unor..."
          class="input-field w-full pl-10 pr-10 text-xs sm:text-sm"
          oninput={() => {
            if (viewMode === "table") {
              meta.page = 1;
              fetchData();
            }
          }}
        />
        {#if searchTerm}
          <button
            type="button"
            onclick={() => {
              searchTerm = "";
              if (viewMode === "table") fetchData();
            }}
            class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        {/if}
      </div>

      {#if viewMode === "tree"}
        <div class="flex items-center gap-2">
          <button type="button" onclick={expandAll} class="btn-secondary !px-3 !py-2 text-xs font-semibold">
            Buka Semua
          </button>
          <button type="button" onclick={collapseAll} class="btn-secondary !px-3 !py-2 text-xs font-semibold">
            Tutup Semua
          </button>
        </div>
      {/if}
    </div>
  </div>

  <!-- CONTENT SECTION -->
  {#if viewMode === "tree"}
    <!-- ================= TREE VIEW ================= -->
    <div class="card p-4 sm:p-6 overflow-hidden">
      <div class="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <h2 class="text-sm font-bold text-slate-700 uppercase tracking-wider">
          Hierarki Struktur Organisasi ({treeData.length} Induk)
        </h2>
        <span class="text-xs text-slate-400 font-medium">Klik tanda panah untuk melihat sub-unor</span>
      </div>

      {#if isLoadingTree}
        <div class="py-16 text-center">
          <div class="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p class="text-xs sm:text-sm text-slate-400">Memuat struktur hierarki unit kerja...</p>
        </div>
      {:else if displayTree.length === 0}
        <div class="py-16 text-center">
          <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p class="text-sm font-semibold text-slate-600">Tidak ada unit kerja ditemukan</p>
          <p class="text-xs text-slate-400 mt-1">Coba kata kunci pencarian yang lain atau tambah unit kerja baru</p>
        </div>
      {:else}
        <div class="space-y-2">
          {#each displayTree as rootNode (rootNode.id)}
            <div class="rounded-xl border border-slate-200/80 bg-slate-50/50 overflow-hidden transition-all">
              <!-- Root Item -->
              <div class="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-100/70 transition-colors">
                <div class="flex items-center gap-2.5 flex-1 min-w-0">
                  {#if rootNode.children && rootNode.children.length > 0}
                    <button
                      type="button"
                      onclick={() => toggleNode(rootNode.id)}
                      class="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-teal-50 hover:text-teal-700 flex items-center justify-center shadow-2xs transition-transform"
                      aria-label="Toggle node"
                    >
                      <svg
                        class="w-4 h-4 transition-transform duration-200 {expandedNodes.has(rootNode.id) ? 'rotate-90 text-teal-600' : ''}"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  {:else}
                    <span class="w-7 h-7 flex items-center justify-center text-slate-300">🏢</span>
                  {/if}

                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-bold text-slate-800 text-sm sm:text-base leading-tight">
                        {rootNode.nama}
                      </span>
                      {#if rootNode.kode}
                        <span class="font-mono text-[10px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                          {rootNode.kode}
                        </span>
                      {/if}
                      <span class="text-[11px] font-bold px-2 py-0.5 rounded-md border {getJenisBadge(rootNode.jenis)}">
                        {getJenisLabel(rootNode.jenis)}
                      </span>
                    </div>

                    <div class="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
                      <span>Sub-Unor: <strong class="text-slate-700">{rootNode.children ? rootNode.children.length : 0}</strong></span>
                      <span>•</span>
                      <span>Pegawai Aktif: <strong class="text-teal-700">{rootNode._count?.dataP3ks || 0}</strong></span>
                    </div>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onclick={() => openAddModal(rootNode.id)}
                    class="p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors flex items-center gap-1"
                    title="Tambah Sub Unit Kerja di bawah {rootNode.nama}"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span class="hidden sm:inline">Tambah Sub</span>
                  </button>

                  <button
                    type="button"
                    onclick={() => openEditModal(rootNode)}
                    class="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-white transition-colors"
                    title="Edit {rootNode.nama}"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onclick={() => confirmDelete(rootNode)}
                    class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Hapus {rootNode.nama}"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Nested Sub Unor List (Level 2+) -->
              {#if expandedNodes.has(rootNode.id) && rootNode.children && rootNode.children.length > 0}
                <div class="bg-white px-3 sm:px-6 py-2.5 border-t border-slate-200/80 divide-y divide-slate-100">
                  {#each rootNode.children as child (child.id)}
                    <div class="py-2.5 pl-6 sm:pl-8 flex items-center justify-between gap-3 relative before:absolute before:left-2 before:top-1/2 before:-translate-y-1/2 before:w-3 before:h-px before:bg-slate-300">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="text-sm font-semibold text-slate-800 leading-snug">
                            {child.nama}
                          </span>
                          {#if child.kode}
                            <span class="font-mono text-[10px] text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                              {child.kode}
                            </span>
                          {/if}
                          <span class="text-[10px] font-bold px-2 py-0.5 rounded-md border {getJenisBadge(child.jenis)}">
                            {getJenisLabel(child.jenis)}
                          </span>
                        </div>
                        {#if child.keterangan}
                          <p class="text-xs text-slate-400 mt-0.5">{child.keterangan}</p>
                        {/if}
                      </div>

                      <div class="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onclick={() => openEditModal(child)}
                          class="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit sub-unor"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onclick={() => confirmDelete(child)}
                          class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus sub-unor"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <!-- ================= TABLE VIEW ================= -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto scrollbar-thin">
        <table class="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
          <thead>
            <tr class="bg-slate-50/80">
              <th class="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-12">No</th>
              <th class="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[200px]">Nama Unit Kerja</th>
              <th class="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[180px]">Unit Kerja Induk (Parent)</th>
              <th class="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Tingkat</th>
              <th class="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-36">Jenis</th>
              <th class="px-4 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Sub-Unor</th>
              <th class="px-4 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Pegawai P3K</th>
              <th class="px-4 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            {#if isLoading}
              <tr>
                <td colspan="8" class="px-6 py-16 text-center">
                  <div class="flex flex-col items-center gap-3">
                    <div class="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                    <span class="text-xs sm:text-sm text-slate-400">Memuat data tabel referensi...</span>
                  </div>
                </td>
              </tr>
            {:else if records.length === 0}
              <tr>
                <td colspan="8" class="px-6 py-16 text-center text-slate-400">
                  Belum ada data unit kerja.
                </td>
              </tr>
            {:else}
              {#each records as record, i}
                <tr class="hover:bg-slate-50/70 transition-colors">
                  <td class="px-4 py-3.5 text-slate-400 font-mono">{(meta.page - 1) * meta.limit + i + 1}</td>
                  <td class="px-4 py-3.5">
                    <p class="font-bold text-slate-800 leading-snug">{record.nama}</p>
                    {#if record.kode}
                      <span class="font-mono text-[10px] text-slate-400">{record.kode}</span>
                    {/if}
                  </td>
                  <td class="px-4 py-3.5">
                    {#if record.parent}
                      <div class="flex items-center gap-1.5">
                        <span class="text-teal-600">🏢</span>
                        <span class="font-medium text-slate-700">{record.parent.nama}</span>
                      </div>
                    {:else}
                      <span class="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                        ⭐ Unit Kerja Induk
                      </span>
                    {/if}
                  </td>
                  <td class="px-4 py-3.5 font-semibold text-slate-600">
                    Level {record.level || (record.parentId ? 2 : 1)}
                  </td>
                  <td class="px-4 py-3.5">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-md border {getJenisBadge(record.jenis)}">
                      {getJenisLabel(record.jenis)}
                    </span>
                  </td>
                  <td class="px-4 py-3.5 text-center font-bold text-slate-700">
                    {record._count?.children || 0}
                  </td>
                  <td class="px-4 py-3.5 text-center font-bold text-teal-700">
                    {record._count?.dataP3ks || 0}
                  </td>
                  <td class="px-4 py-3.5 text-right font-medium whitespace-nowrap">
                    <button
                      onclick={() => openEditModal(record)}
                      class="text-blue-600 hover:text-blue-800 font-semibold mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onclick={() => confirmDelete(record)}
                      class="text-rose-500 hover:text-rose-700 font-semibold"
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
        <div class="border-t border-slate-100 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p class="text-xs sm:text-sm text-slate-500">
            Menampilkan <span class="font-medium text-slate-700">{(meta.page - 1) * meta.limit + 1}</span> –
            <span class="font-medium text-slate-700">{Math.min(meta.page * meta.limit, meta.total)}</span> dari
            <span class="font-medium text-slate-700">{meta.total}</span> data
          </p>
          <div class="flex items-center gap-1">
            <button
              disabled={meta.page === 1}
              onclick={() => fetchData(meta.page - 1)}
              class="btn-secondary !px-2.5 !py-1.5 disabled:opacity-40"
            >
              ←
            </button>
            <span class="text-xs sm:text-sm font-medium text-slate-600 px-3">
              {meta.page} / {meta.totalPages}
            </span>
            <button
              disabled={meta.page === meta.totalPages}
              onclick={() => fetchData(meta.page + 1)}
              class="btn-secondary !px-2.5 !py-1.5 disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- ================= FORM MODAL (ADD / EDIT) ================= -->
{#if showModal}
  <div class="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <!-- Backdrop -->
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onclick={closeModal}></div>

      <!-- Modal Card -->
      <div class="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 z-10 animate-scale-up border border-slate-100">
        <div class="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <span class="p-2 rounded-xl bg-teal-50 text-teal-600">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </span>
            <h3 class="text-lg sm:text-xl font-bold text-slate-800">
              {isEditMode ? "Edit Unit Kerja" : "Tambah Unit Kerja Baru"}
            </h3>
          </div>
          <button onclick={closeModal} class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100" aria-label="Tutup modal">
            ✕
          </button>
        </div>

        <form onsubmit={handleSubmit} class="space-y-4">
          <!-- Nama Unit Kerja -->
          <div>
            <label for="namaRef" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Unit Kerja <span class="text-rose-500">*</span>
            </label>
            <input
              id="namaRef"
              type="text"
              bind:value={formRef.nama}
              placeholder="Misal: Dinas Kesehatan / Puskesmas Wakai"
              class="input-field w-full text-xs sm:text-sm"
              required
            />
          </div>

          <!-- Unit Kerja Induk (Parent) -->
          <div>
            <label for="parentRef" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Unit Kerja Induk (Parent)
            </label>
            <select
              id="parentRef"
              bind:value={formRef.parentId}
              class="input-field w-full text-xs sm:text-sm"
              onchange={() => {
                if (formRef.parentId && formRef.jenis === 'INDUK') {
                  formRef.jenis = 'SUB_UNOR';
                } else if (!formRef.parentId && formRef.jenis === 'SUB_UNOR') {
                  formRef.jenis = 'INDUK';
                }
              }}
            >
              <option value="">-- Tidak Ada / Sebagai Unit Kerja Induk (Root) --</option>
              {#each availableParents as parent}
                <option value={parent.id}>
                  {parent.level > 1 ? '↳ '.repeat(parent.level - 1) : '🏢 '} {parent.nama}
                </option>
              {/each}
            </select>
            <p class="text-[11px] text-slate-400 mt-1">
              Pilih unit kerja induk jika entri ini merupakan sub unit kerja / puskesmas / sekolah / bidang.
            </p>
          </div>

          <!-- Grid: Jenis & Kode -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Jenis Unit Kerja -->
            <div>
              <label for="jenisRef" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Klasifikasi Jenis
              </label>
              <select id="jenisRef" bind:value={formRef.jenis} class="input-field w-full text-xs sm:text-sm">
                {#each JENIS_OPTIONS as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
            </div>

            <!-- Kode Unor -->
            <div>
              <label for="kodeRef" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Kode Organisasi (Opsional)
              </label>
              <input
                id="kodeRef"
                type="text"
                bind:value={formRef.kode}
                placeholder="Misal: 1.02.01"
                class="input-field w-full text-xs sm:text-sm font-mono"
              />
            </div>
          </div>

          <!-- Keterangan -->
          <div>
            <label for="ketRef" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Keterangan Tambahan
            </label>
            <textarea
              id="ketRef"
              bind:value={formRef.keterangan}
              rows="2"
              placeholder="Catatan / alamat lokasi..."
              class="input-field w-full text-xs sm:text-sm"
            ></textarea>
          </div>

          <!-- Footer Buttons -->
          <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onclick={closeModal} class="btn-secondary" disabled={isSubmitting}>
              Batal
            </button>
            <button type="submit" class="btn-primary" disabled={isSubmitting}>
              {#if isSubmitting}
                Menyimpan...
              {:else}
                {isEditMode ? "Simpan Perubahan" : "Simpan Unit Kerja"}
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- ================= DELETE CONFIRMATION MODAL ================= -->
{#if showDeleteModal && selectedRecord}
  <div class="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onclick={() => (showDeleteModal = false)}></div>

      <div class="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10 animate-scale-up border border-slate-100">
        <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h3 class="text-center text-lg font-bold text-slate-800">
          Hapus Unit Kerja?
        </h3>
        <p class="text-center text-xs sm:text-sm text-slate-500 mt-2">
          Apakah Anda yakin ingin menghapus <strong>"{selectedRecord.nama}"</strong>?
        </p>

        {#if selectedRecord.children && selectedRecord.children.length > 0}
          <div class="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
            ⚠️ <strong>Perhatian:</strong> Unit kerja ini membawahi <strong>{selectedRecord.children.length} sub-unor</strong>. Anda harus menghapus atau memindahkan sub-unor terlebih dahulu.
          </div>
        {/if}

        <div class="mt-6 flex gap-3">
          <button type="button" onclick={() => (showDeleteModal = false)} class="btn-secondary flex-1" disabled={isSubmitting}>
            Batal
          </button>
          <button type="button" onclick={handleDelete} class="btn-primary !bg-rose-600 hover:!bg-rose-700 flex-1" disabled={isSubmitting}>
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
