<script>
  import { onMount } from "svelte";
  import { tteApi } from "$lib/tteApi";
  import { addToast } from "$lib/toastStore";

  let loading = $state(true);
  let riwayatList = $state([]);
  let pejabatInfo = $state(null);
  let pagination = $state({ total: 0, page: 1, limit: 10, totalPages: 1 });
  let searchQuery = $state("");
  let statusFilter = $state("");

  // Modal Preview PDF
  let isPreviewModalOpen = $state(false);
  let previewPdfUrl = $state("");
  let previewJudul = $state("");

  const formatTanggalWaktu = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  const loadRiwayat = async () => {
    loading = true;
    try {
      const res = await tteApi.getRiwayat({
        search: searchQuery,
        status: statusFilter,
        page: pagination.page,
        limit: pagination.limit
      });

      if (res.success) {
        riwayatList = res.data || [];
        pejabatInfo = res.pejabat;
        pagination = res.pagination || pagination;
      } else {
        addToast(res.message || "Gagal memuat riwayat penandatanganan", "error");
      }
    } catch (err) {
      addToast(err.message || "Terjadi kesalahan memuat riwayat", "error");
    } finally {
      loading = false;
    }
  };

  const handleFilter = () => {
    pagination.page = 1;
    loadRiwayat();
  };

  const openPreview = (doc, nama) => {
    previewPdfUrl = doc.signedFileUrl || doc.usulan?.pdfSignedUrl || doc.usulan?.pdfDraftUrl || "";
    previewJudul = `Arsip Dokumen — ${nama || "Kontrak"}`;
    if (!previewPdfUrl) {
      addToast("Berkas PDF belum tersedia untuk dipratinjau", "warning");
      return;
    }
    isPreviewModalOpen = true;
  };

  onMount(() => {
    loadRiwayat();
  });
</script>

<div class="space-y-6">
  <!-- Header Riwayat (Light Executive) -->
  <div class="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <div class="flex items-center gap-2">
        <a href="/portal-pejabat" class="text-xs text-blue-700 hover:underline flex items-center gap-1 font-semibold">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Kembali ke Antrian
        </a>
      </div>
      <h2 class="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
        Riwayat Penandatanganan & Paraf Dokumen
      </h2>
      <p class="text-xs text-slate-500 mt-0.5">
        Rekam jejak seluruh dokumen PPPK yang telah Anda paraf, tandatangani, atau kembalikan
      </p>
    </div>

    <!-- Filter Status & Pencarian -->
    <div class="flex flex-wrap items-center gap-3">
      <select
        bind:value={statusFilter}
        onchange={handleFilter}
        class="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      >
        <option value="">Semua Status</option>
        <option value="SUCCESS">Berhasil Ditandatangani</option>
        <option value="FAILED">Ditolak / Dikembalikan</option>
      </select>

      <form onsubmit={(e) => { e.preventDefault(); handleFilter(); }} class="flex items-center gap-2">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Cari nama, NIP, no kontrak..."
          class="w-56 sm:w-64 px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
        <button
          type="submit"
          class="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm"
        >
          Cari
        </button>
      </form>
    </div>
  </div>

  <!-- Content List Riwayat (Light Table) -->
  <div class="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
    {#if loading}
      <div class="p-16 text-center text-slate-500">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3"></div>
        <p class="text-sm">Memuat riwayat dokumen...</p>
      </div>
    {:else if riwayatList.length === 0}
      <div class="p-16 text-center">
        <div class="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4 border border-slate-200">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h4 class="text-base font-bold text-slate-800 mb-1">Belum Ada Riwayat</h4>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">
          Belum ada catatan tanda tangan atau penolakan dokumen yang tersimpan pada akun ini.
        </p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th class="py-3.5 px-6">Waktu & Tindakan</th>
              <th class="py-3.5 px-6">Pegawai PPPK</th>
              <th class="py-3.5 px-6">Nomor Kontrak</th>
              <th class="py-3.5 px-6">Status Hasil</th>
              <th class="py-3.5 px-6">Sertifikasi & Audit</th>
              <th class="py-3.5 px-6 text-right">Berkas</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            {#each riwayatList as item}
              <tr class="hover:bg-blue-50/30 transition">
                <!-- Waktu & Tindakan -->
                <td class="py-4 px-6">
                  <div class="font-bold text-slate-900">
                    {formatTanggalWaktu(item.createdAt)}
                  </div>
                  <div class="text-[11px] text-blue-700 font-semibold mt-0.5">
                    {item.jenis === 'TTE' ? 'Tanda Tangan Elektronik' : 'Paraf Elektronik'}
                  </div>
                  <div class="text-[10px] text-slate-500">
                    Tahap: {item.tahap?.replaceAll('_', ' ')}
                  </div>
                </td>

                <!-- Pegawai PPPK -->
                <td class="py-4 px-6">
                  <div class="font-bold text-slate-900">
                    {item.usulan?.dataP3k?.nama || "-"}
                  </div>
                  <div class="text-slate-500 font-mono text-[11px] mt-0.5">
                    NIP: {item.usulan?.dataP3k?.nipBaru || item.usulan?.dataP3k?.nipLama || "-"}
                  </div>
                  <div class="text-[11px] text-slate-500 mt-0.5">
                    {item.usulan?.dataP3k?.unorNama || "-"}
                  </div>
                </td>

                <!-- Nomor Kontrak -->
                <td class="py-4 px-6 font-mono text-slate-700 font-medium">
                  {item.usulan?.nomorKontrak || "-"}
                </td>

                <!-- Status Hasil -->
                <td class="py-4 px-6">
                  {#if item.status === 'SUCCESS'}
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Berhasil Diproses
                    </span>
                  {:else}
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Ditolak / Koreksi
                    </span>
                    {#if item.catatan}
                      <p class="text-[10px] text-rose-600 mt-1 italic max-w-xs">
                        "{item.catatan}"
                      </p>
                    {/if}
                  {/if}
                </td>

                <!-- Audit BSrE -->
                <td class="py-4 px-6">
                  {#if item.idDokumenBsre}
                    <div class="text-[11px] text-slate-800 font-mono">
                      ID: {item.idDokumenBsre}
                    </div>
                  {/if}
                  <div class="text-[10px] text-slate-400 mt-0.5">
                    IP: {item.ipAddress || "127.0.0.1"}
                  </div>
                </td>

                <!-- Berkas -->
                <td class="py-4 px-6 text-right">
                  {#if item.status === 'SUCCESS' && (item.signedFileUrl || item.usulan?.pdfSignedUrl || item.usulan?.pdfDraftUrl)}
                    <button
                      onclick={() => openPreview(item, item.usulan?.dataP3k?.nama)}
                      class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition inline-flex items-center gap-1"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Lihat Berkas
                    </button>
                  {:else}
                    <span class="text-slate-400 text-[11px]">-</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      {#if pagination.totalPages > 1}
        <div class="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Halaman {pagination.page} dari {pagination.totalPages} ({pagination.total} total log)
          </div>
          <div class="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onclick={() => { pagination.page--; loadRiwayat(); }}
              class="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Sebelumnya
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onclick={() => { pagination.page++; loadRiwayat(); }}
              class="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Berikutnya
            </button>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- Modal Preview Dokumen PDF (Light Theme) -->
{#if isPreviewModalOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-md">
    <div class="bg-white border border-slate-200 rounded-2xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden">
      <div class="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 class="text-sm font-bold text-slate-900 truncate max-w-md">{previewJudul}</h3>
        </div>
        <div class="flex items-center gap-2">
          <a
            href={previewPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
          >
            Buka di Tab Baru
          </a>
          <button
            onclick={() => (isPreviewModalOpen = false)}
            class="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div class="flex-grow bg-slate-100 p-2">
        <iframe
          src={previewPdfUrl}
          title="Pratinjau Dokumen Kontrak"
          class="w-full h-full rounded-xl border border-slate-200 bg-white"
        ></iframe>
      </div>
    </div>
  </div>
{/if}
