<script>
  /**
   * RichArticleEditor.svelte
   * Component editor artikel deskripsi masalah dengan WYSIWYG formatting & template cepat
   */
  let {
    value = $bindable(''),
    placeholder = 'Ketikkan deskripsi lengkap atau kronologi masalah di sini seperti menulis sebuah artikel...',
    minHeight = '320px',
    disabled = false
  } = $props();

  let editorElement = $state(null);
  let isFocused = $state(false);
  let lastEmittedValue = $state('');

  // Sync internal content from props when changed externally
  $effect(() => {
    const val = value || '';
    if (editorElement) {
      // If value changed externally or differs from last emitted HTML
      if (val !== lastEmittedValue && editorElement.innerHTML !== val) {
        editorElement.innerHTML = val;
        lastEmittedValue = val;
      }
    }
  });

  function handleInput() {
    if (editorElement) {
      lastEmittedValue = editorElement.innerHTML;
      value = editorElement.innerHTML;
    }
  }

  function execCmd(command, valueArg = null) {
    if (disabled) return;
    if (editorElement) {
      editorElement.focus();
    }
    document.execCommand(command, false, valueArg);
    handleInput();
  }

  function formatHeading(tag) {
    if (disabled) return;
    if (editorElement) {
      editorElement.focus();
    }
    document.execCommand('formatBlock', false, `<${tag}>`);
    handleInput();
  }

  function insertTemplate() {
    if (disabled) return;
    const templateHtml = `
      <h2 style="color: #1e293b; font-size: 1.15rem; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-top: 12px; margin-bottom: 8px;">I. Kronologi & Latar Belakang Kejadian</h2>
      <p style="color: #334155; margin-bottom: 12px; line-height: 1.6;">Uraikan waktu, lokasi, dan alur runtutan peristiwa terjadinya permasalahan...</p>

      <h2 style="color: #1e293b; font-size: 1.15rem; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-top: 16px; margin-bottom: 8px;">II. Fakta & Temuan di Lapangan</h2>
      <ul style="list-style-type: disc; margin-left: 24px; margin-bottom: 12px; color: #334155;">
        <li>Temuan bukti ketidakhadiran / berkas / laporan: ...</li>
        <li>Keterangan dari atasan langsung / rekan kerja: ...</li>
      </ul>

      <h2 style="color: #1e293b; font-size: 1.15rem; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-top: 16px; margin-bottom: 8px;">III. Dampak Terhadap Instansi / Pelayanan</h2>
      <p style="color: #334155; margin-bottom: 12px; line-height: 1.6;">Jelaskan dampak permasalahan terhadap kelancaran tugas pokok, pelayanan publik, atau kedisiplinan organisasi...</p>

      <h2 style="color: #1e293b; font-size: 1.15rem; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-top: 16px; margin-bottom: 8px;">IV. Keterangan / Klarifikasi dari Pegawai</h2>
      <blockquote style="border-left: 4px solid #3b82f6; padding-left: 12px; color: #475569; font-style: italic; margin-bottom: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 4px;">
        "Klarifikasi atau alasan yang disampaikan oleh pegawai yang bersangkutan saat dipanggil/dikonfirmasi..."
      </blockquote>

      <h2 style="color: #1e293b; font-size: 1.15rem; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-top: 16px; margin-bottom: 8px;">V. Saran / Rekomendasi Tindak Lanjut</h2>
      <p style="color: #334155; margin-bottom: 12px; line-height: 1.6;">Rekomendasi pembinaan, teguran lisan/tertulis, peringatan, atau usulan tindak lanjut dari BKPSDM...</p>
    `;

    if (editorElement) {
      editorElement.focus();
      // If editor has some content, ask or append
      if (editorElement.innerHTML.trim() && editorElement.innerHTML !== '<br>') {
        editorElement.innerHTML += templateHtml;
      } else {
        editorElement.innerHTML = templateHtml;
      }
      handleInput();
    }
  }

  // Calculate text stats
  let plainText = $derived(
    value
      ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      : ''
  );
  let wordCount = $derived(plainText ? plainText.split(/\s+/).length : 0);
  let charCount = $derived(plainText.length);
</script>

<div class="rich-editor-container border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
  <!-- Toolbar -->
  <div class="bg-slate-50/80 border-b border-slate-200/80 px-3 py-2 flex flex-wrap items-center justify-between gap-1.5 text-slate-700 select-none">
    <div class="flex flex-wrap items-center gap-1">
      <!-- Heading Options -->
      <div class="flex items-center border-r border-slate-200 pr-1.5 mr-1 gap-0.5">
        <button
          type="button"
          class="px-2 py-1 text-xs font-semibold rounded hover:bg-slate-200/80 text-slate-700 transition-colors"
          title="Heading 2 (Sub Judul Utama)"
          onclick={() => formatHeading('h2')}
          {disabled}
        >
          H2
        </button>
        <button
          type="button"
          class="px-2 py-1 text-xs font-semibold rounded hover:bg-slate-200/80 text-slate-700 transition-colors"
          title="Heading 3 (Sub Judul Kecil)"
          onclick={() => formatHeading('h3')}
          {disabled}
        >
          H3
        </button>
        <button
          type="button"
          class="px-2 py-1 text-xs rounded hover:bg-slate-200/80 text-slate-700 transition-colors"
          title="Paragraf Normal"
          onclick={() => formatHeading('p')}
          {disabled}
        >
          Normal
        </button>
      </div>

      <!-- Basic Formatting -->
      <div class="flex items-center border-r border-slate-200 pr-1.5 mr-1 gap-0.5">
        <button
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/80 text-slate-700 font-bold transition-colors"
          title="Tebal (Bold) - Ctrl+B"
          onclick={() => execCmd('bold')}
          {disabled}
        >
          B
        </button>
        <button
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/80 text-slate-700 italic font-serif transition-colors"
          title="Miring (Italic) - Ctrl+I"
          onclick={() => execCmd('italic')}
          {disabled}
        >
          I
        </button>
        <button
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/80 text-slate-700 underline transition-colors"
          title="Garis Bawah (Underline) - Ctrl+U"
          onclick={() => execCmd('underline')}
          {disabled}
        >
          U
        </button>
        <button
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/80 text-slate-700 line-through transition-colors"
          title="Coret (Strikethrough)"
          onclick={() => execCmd('strikeThrough')}
          {disabled}
        >
          S
        </button>
      </div>

      <!-- Lists & Quotes -->
      <div class="flex items-center border-r border-slate-200 pr-1.5 mr-1 gap-0.5">
        <button
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/80 text-slate-700 transition-colors"
          title="Daftar Poin (Bullet List)"
          onclick={() => execCmd('insertUnorderedList')}
          {disabled}
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/80 text-slate-700 transition-colors"
          title="Daftar Angka (Numbered List)"
          onclick={() => execCmd('insertOrderedList')}
          {disabled}
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 6h13M7 12h13M7 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        </button>
        <button
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/80 text-slate-700 transition-colors"
          title="Kutipan / Klarifikasi (Blockquote)"
          onclick={() => formatHeading('blockquote')}
          {disabled}
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
        <button
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/80 text-slate-700 transition-colors"
          title="Garis Pembatas (Divider)"
          onclick={() => execCmd('insertHorizontalRule')}
          {disabled}
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
          </svg>
        </button>
      </div>

      <!-- Clear Formatting -->
      <button
        type="button"
        class="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/80 text-slate-500 hover:text-red-600 transition-colors"
        title="Bersihkan Format"
        onclick={() => execCmd('removeFormat')}
        {disabled}
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>

    <!-- Quick Action: Insert Template -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all shadow-2xs"
        onclick={insertTemplate}
        {disabled}
      >
        <svg class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>+ Sisipkan Format Kronologi</span>
      </button>
    </div>
  </div>

  <!-- Editable Article Body -->
  <div
    bind:this={editorElement}
    contenteditable={!disabled}
    class="rich-editor-content p-4 text-slate-800 text-sm md:text-base leading-relaxed focus:outline-hidden overflow-y-auto"
    style="min-height: {minHeight};"
    oninput={handleInput}
    onfocus={() => (isFocused = true)}
    onblur={() => (isFocused = false)}
    data-placeholder={placeholder}
  ></div>

  <!-- Editor Footer / Statistics -->
  <div class="bg-slate-50/70 border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-400 flex items-center justify-between select-none">
    <div class="flex items-center gap-3">
      <span>{wordCount} kata</span>
      <span>&bull;</span>
      <span>{charCount} karakter</span>
    </div>
    <div class="text-[10px] text-slate-400 italic">
      Format artikel siap disimpan & direkap
    </div>
  </div>
</div>

<style>
  .rich-editor-content:empty:before {
    content: attr(data-placeholder);
    color: #94a3b8;
    pointer-events: none;
    display: block;
  }

  .rich-editor-content :global(h2) {
    font-size: 1.15rem;
    font-weight: 700;
    color: #0f172a;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 0.25rem;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }

  .rich-editor-content :global(h3) {
    font-size: 1.05rem;
    font-weight: 600;
    color: #1e293b;
    margin-top: 0.75rem;
    margin-bottom: 0.35rem;
  }

  .rich-editor-content :global(p) {
    margin-bottom: 0.65rem;
    line-height: 1.65;
    color: #334155;
  }

  .rich-editor-content :global(ul) {
    list-style-type: disc;
    margin-left: 1.5rem;
    margin-bottom: 0.75rem;
  }

  .rich-editor-content :global(ol) {
    list-style-type: decimal;
    margin-left: 1.5rem;
    margin-bottom: 0.75rem;
  }

  .rich-editor-content :global(li) {
    margin-bottom: 0.25rem;
  }

  .rich-editor-content :global(blockquote) {
    border-left: 4px solid #3b82f6;
    background: #f8fafc;
    padding: 0.5rem 0.85rem;
    border-radius: 0.25rem;
    color: #475569;
    font-style: italic;
    margin-bottom: 0.75rem;
  }

  .rich-editor-content :global(hr) {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 1rem 0;
  }
</style>
