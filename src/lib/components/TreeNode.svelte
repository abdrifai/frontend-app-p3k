<script>
  import TreeNode from "./TreeNode.svelte";

  let {
    node,
    expandedNodes,
    toggleNode,
    openAddModal,
    openEditModal,
    confirmDelete,
    depth = 0,
    isLast = false
  } = $props();

  const JENIS_META = {
    INDUK: { label: "Induk", icon: "🏛️", badge: "bg-blue-50 text-blue-700 border-blue-200" },
    BIDANG: { label: "Bidang", icon: "📑", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    SEKSI: { label: "Seksi", icon: "📂", badge: "bg-purple-50 text-purple-700 border-purple-200" },
    UPTD: { label: "UPTD", icon: "🏭", badge: "bg-amber-50 text-amber-700 border-amber-200" },
    PUSKESMAS: { label: "Puskesmas", icon: "🏥", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    SEKOLAH: { label: "Sekolah", icon: "🏫", badge: "bg-teal-50 text-teal-700 border-teal-200" },
    SUB_UNOR: { label: "Sub-Unor", icon: "📁", badge: "bg-slate-50 text-slate-700 border-slate-200" },
  };

  const getMeta = (jenis) => {
    return JENIS_META[jenis] || JENIS_META.SUB_UNOR;
  };

  const hasChildren = $derived(node.children && node.children.length > 0);
  const isExpanded = $derived(expandedNodes.has(node.id));
  const meta = $derived(getMeta(node.jenis));
</script>

<div class="relative select-none">
  <!-- Node Card Row -->
  <div
    class="group flex items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl border transition-all
      {depth === 0
        ? 'bg-white border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-teal-300'
        : depth === 1
        ? 'bg-slate-50/70 border-slate-200/70 hover:bg-white hover:border-teal-200'
        : 'bg-white/80 border-slate-100 hover:border-slate-300'}"
  >
    <!-- Left: Expand Button, Icon, Name, Badges -->
    <div class="flex items-center gap-2 flex-1 min-w-0">
      <!-- Expand / Collapse Toggle -->
      {#if hasChildren}
        <button
          type="button"
          onclick={() => toggleNode(node.id)}
          class="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 flex items-center justify-center shrink-0 shadow-2xs transition-all"
          title={isExpanded ? "Tutup Sub-Unor" : "Buka Sub-Unor"}
        >
          <svg
            class="w-3.5 h-3.5 transition-transform duration-200 {isExpanded ? 'rotate-90 text-teal-600' : ''}"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      {:else}
        <div class="w-6 h-6 flex items-center justify-center shrink-0 text-slate-300">
          <span class="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
        </div>
      {/if}

      <!-- Type Icon -->
      <span class="text-base shrink-0" title={meta.label}>{meta.icon}</span>

      <!-- Title & Details -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs sm:text-sm font-bold text-slate-800 leading-snug break-words">
            {node.nama}
          </span>

          {#if node.kode}
            <span class="font-mono text-[10px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
              {node.kode}
            </span>
          {/if}

          <span class="text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 {meta.badge}">
            {meta.label}
          </span>
        </div>

        <!-- Meta Subtitle -->
        <div class="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-medium flex-wrap">
          {#if hasChildren}
            <span class="text-slate-600 font-semibold">
              📁 {node.children.length} Sub-Unor
            </span>
            <span>•</span>
          {/if}
          <span>
            👥 <strong class="text-teal-700">{node._count?.dataP3ks || 0}</strong> Pegawai
          </span>
          {#if node.keterangan}
            <span>•</span>
            <span class="truncate max-w-[200px] text-slate-400 italic">
              {node.keterangan}
            </span>
          {/if}
        </div>
      </div>
    </div>

    <!-- Right: Action Buttons -->
    <div class="flex items-center gap-1 shrink-0 opacity-90 group-hover:opacity-100 transition-opacity">
      <!-- Quick Add Sub -->
      <button
        type="button"
        onclick={() => openAddModal(node.id)}
        class="px-2 py-1 rounded-lg text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 transition-colors flex items-center gap-1 shadow-2xs"
        title="Tambah Sub-Unor di bawah {node.nama}"
      >
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        <span class="hidden md:inline">Tambah Sub</span>
      </button>

      <!-- Edit -->
      <button
        type="button"
        onclick={() => openEditModal(node)}
        class="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        title="Edit {node.nama}"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>

      <!-- Delete -->
      <button
        type="button"
        onclick={() => confirmDelete(node)}
        class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        title="Hapus {node.nama}"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  </div>

  <!-- Children Recursive Tree Branches with Visual Guide Lines -->
  {#if hasChildren && isExpanded}
    <div class="relative pl-6 sm:pl-8 ml-3.5 sm:ml-4 border-l-2 border-dashed border-teal-200/80 space-y-2 pt-2">
      {#each node.children as child, index (child.id)}
        <div class="relative before:absolute before:-left-6 sm:before:-left-8 before:top-4 before:w-6 sm:before:w-8 before:h-px before:border-t-2 before:border-dashed before:border-teal-200/80">
          <TreeNode
            node={child}
            {expandedNodes}
            {toggleNode}
            {openAddModal}
            {openEditModal}
            {confirmDelete}
            depth={depth + 1}
            isLast={index === node.children.length - 1}
          />
        </div>
      {/each}
    </div>
  {/if}
</div>
