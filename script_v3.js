// ==========================================
// 1. KONFIGURASI GOOGLE APPS SCRIPT
// ==========================================
const SCRIPT_URL ="https://script.google.com/macros/s/AKfycbxMTgkVYcYbpSDSdVJKc6BfWHY8DXuQCjQZs_wT4TtO2zC5V4eSqXD-8Wq8lLi2ilT3/exec";


// HELPER: Auto-recalculate inventory asynchronously
async function autoRecalculateInventory(sheetName) {
    if(!['Inbond', 'Outbond', 'Return'].includes(sheetName)) return;
    try {
        const syncBadge = document.getElementById('syncBadge');
        if(syncBadge) syncBadge.classList.remove('hidden');
        await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'recalculate' })
        });
        tabCache['tab-stock-inventory'] = false;
        tabCache['tab-dashboard'] = false;
        if(typeof window.loadDashboardData === 'function') window.loadDashboardData();
        if(syncBadge) syncBadge.classList.add('hidden');
    } catch(e) {}
}
let preloadedUsers = null;
let usersFetchPromise = null;

// Initialize as a global function so it can be called safely
window.preloadUsers = function() {
    try {
        if(typeof SCRIPT_URL !== 'undefined') {
            usersFetchPromise = fetch(SCRIPT_URL + "?sheet=Users")
                .then(res => res.text())
                .then(text => {
                    if (!text.startsWith('Error:')) {
                        preloadedUsers = JSON.parse(text);
                    }
                })
                .catch(err => console.error("Prefetch error", err));
        }
    } catch(e) {}
};
window.preloadUsers();

// VALIDASI APPS SCRIPT VERSI BARU
(async function checkAppsScriptVersion() {
    try {
        const res = await fetch(SCRIPT_URL + "?action=download_packing_list&sheet=Packing%20List");
        const text = await res.text();
        if (text.startsWith("[")) {
            Swal.fire({
                title: 'CRITICAL UPDATE REQUIRED!',
                html: `<div style="text-align: left; font-size: 14px;">
                    <p class="text-red-600 font-bold mb-2">Google Apps Script Bapak masih versi LAMA!</p>
                    <p>Karena itu fitur Upload sangat lambat/gagal, dan fitur Download Bin/Box tidak akan berfungsi.</p>
                    <p class="mt-2 font-bold">CARA MEMPERBAIKI:</p>
                    <ol class="list-decimal pl-5 mt-1 space-y-1">
                        <li>Buka Google Spreadsheet WMS Bapak.</li>
                        <li>Klik <b>Ekstensi > Apps Script</b>.</li>
                        <li>Buka file <b>apps_script.js</b> di VS Code Bapak, copy SEMUA isinya.</li>
                        <li>Paste dan timpa semua kode di Google Apps Script, lalu <b>Save (Disket)</b>.</li>
                        <li>Klik <b>Terapkan (Deploy) > Kelola deployment (Manage deployments)</b>.</li>
                        <li>Klik ikon <b>Pensil (Edit)</b>, pilih versi <b>Versi baru (New version)</b>, lalu klik <b>Terapkan</b>.</li>
                        <li>Copy <b>URL Aplikasi Web</b> yang baru muncul.</li>
                        <li>Buka <b>script_v3.js</b> di VS Code, ubah tulisan <b>SCRIPT_URL</b> di baris paling atas dengan URL baru tersebut.</li>
                        <li>Upload ulang (Commit & Push) ke GitHub.</li>
                    </ol>
                </div>`,
                icon: 'error',
                allowOutsideClick: false,
                confirmButtonText: 'Saya Mengerti'
            });
        }
    } catch(e) {}
})();



// ==========================================
// 2. UI & STATE MANAGEMENT
// ==========================================
lucide.createIcons();

const loginContainer = document.getElementById('loginContainer');
const appContainer = document.getElementById('appContainer');

// Theme Toggle
document.getElementById('btnThemeToggle').addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  document.getElementById('themeIcon').setAttribute('data-lucide', isDark ? 'sun' : 'moon');
  document.getElementById('themeText').textContent = isDark ? 'Mode Terang' : 'Mode Redup';
  lucide.createIcons();
  
  // Auto hide sidebar on mobile
  if (window.innerWidth < 1024) {
      document.getElementById('sidebar').classList.add('-ml-64');
  }
});

// Tab Navigation
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
const pageTitle = document.getElementById('pageTitle');

navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.innerWidth < 1024) {
        document.getElementById('sidebar').classList.add('-ml-64');
    }
    navItems.forEach(n => n.classList.remove('active', 'bg-white/10', 'border-l-4', 'border-yellow-400'));
    item.classList.add('active', 'bg-white/10', 'border-l-4', 'border-yellow-400');

    const targetId = item.getAttribute('data-target');
    tabContents.forEach(tab => tab.classList.add('hidden'));
    document.getElementById(targetId).classList.remove('hidden');
    pageTitle.textContent = item.textContent.trim();
    
    // Toggle Upload, Template, and Date Filter buttons
    const btnUpload = document.getElementById('btnUploadCsv');
    const btnTemplate = document.getElementById('btnDownloadTemplate');
    const btnDownload = document.getElementById('btnDownloadFile');
    const headerDateFilter = document.getElementById('headerDateFilter');
    const btnSync = document.getElementById('btnSyncInventory');
    const btnToggleForm = document.getElementById('btnToggleForm');
    
    if(headerDateFilter) {
        if(targetId === 'tab-dashboard') {
            headerDateFilter.classList.remove('hidden');
            headerDateFilter.classList.add('flex');
        } else {
            headerDateFilter.classList.add('hidden');
            headerDateFilter.classList.remove('flex');
        }
    }
    
    if(btnSync) {
        if(targetId === 'tab-stock-inventory') {
            btnSync.classList.remove('hidden');
        } else {
            btnSync.classList.add('hidden');
        }
    }
    
    if(btnToggleForm) {
        let txt = 'SCAN / INPUT';
        if(targetId === 'tab-inbond') txt = 'SCAN INBOND';
        if(targetId === 'tab-outbond') txt = 'SCAN OUTBOND';
        if(targetId === 'tab-return') txt = 'SCAN RETURN';
        if(targetId === 'tab-pengiriman') txt = 'INPUT PENGIRIMAN';
        if(targetId === 'tab-packing-list') {
            txt = 'INPUT PACKING LIST';
            document.getElementById('headerPackDropdown')?.classList.remove('hidden');
            const gs = document.getElementById('globalSearchContainer');
            if(gs) { gs.classList.add('hidden'); gs.classList.remove('flex'); }
            
            const val = document.getElementById('headerPackDropdown')?.value;
            const btnMove = document.getElementById('btnMoveToOutbond');
            const userRole = localStorage.getItem('userRole');
            if(btnMove && val && userRole === 'Admin') {
                btnMove.classList.remove('hidden');
                btnMove.classList.add('flex');
            }
        } else {
            document.getElementById('headerPackDropdown')?.classList.add('hidden');
            const gs = document.getElementById('globalSearchContainer');
            if(gs) { gs.classList.remove('hidden'); gs.classList.add('flex'); }
            
            const btnMove = document.getElementById('btnMoveToOutbond');
            if(btnMove) {
                btnMove.classList.add('hidden');
                btnMove.classList.remove('flex');
            }
        }
        
        if(targetId === 'tab-verifikasi') {
            populatePackingListDropdown();
        }

        if(['tab-inbond', 'tab-outbond', 'tab-return', 'tab-pengiriman', 'tab-packing-list'].includes(targetId)) {
            btnToggleForm.classList.remove('hidden');
        } else {
            btnToggleForm.classList.add('hidden');
        }
        
        // Selalu tutup form saat pindah tab
        ['Inbond', 'Outbond', 'Return', 'Pengiriman', 'PackingList'].forEach(t => {
            const p = document.getElementById('panelForm' + t);
            if(p) p.classList.add('hidden');
        });
        btnToggleForm.innerHTML = `<i data-lucide="scan-line" class="w-4 h-4 mr-2"></i> <span id="lblToggleForm">${txt}</span>`;
        btnToggleForm.classList.remove('bg-red-600', 'hover:bg-red-700');
        btnToggleForm.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
        if(window.lucide) window.lucide.createIcons();
    }
    if(btnUpload && btnTemplate) {
        if(['tab-inbond', 'tab-outbond', 'tab-return', 'tab-pengiriman', 'tab-packing-list'].includes(targetId)) {
            if (targetId !== 'tab-packing-list' && targetId !== 'tab-verifikasi') {
                btnUpload.classList.remove('hidden');
                btnTemplate.classList.remove('hidden');
                if (btnDownload) btnDownload.classList.remove('hidden');
                if (document.getElementById('btnUploadPackingList')) document.getElementById('btnUploadPackingList').classList.add('hidden');
                if (document.getElementById('btnDownloadPackingList')) document.getElementById('btnDownloadPackingList').classList.add('hidden');
            } else {
                btnUpload.classList.add('hidden');
                btnTemplate.classList.remove('hidden'); // SHOW TEMPLATE FOR PACKING LIST!
                if (btnDownload) btnDownload.classList.add('hidden');
                if (document.getElementById('btnUploadPackingList')) document.getElementById('btnUploadPackingList').classList.remove('hidden');
                if (document.getElementById('btnDownloadPackingList')) document.getElementById('btnDownloadPackingList').classList.remove('hidden');
            }
        } else {
            btnUpload.classList.add('hidden');
            btnTemplate.classList.add('hidden');
            if (btnDownload && targetId !== 'tab-dashboard') btnDownload.classList.remove('hidden');
            else if (btnDownload && targetId === 'tab-dashboard') btnDownload.classList.add('hidden');
            
            if (document.getElementById('btnUploadPackingList')) document.getElementById('btnUploadPackingList').classList.add('hidden');
            if (document.getElementById('btnDownloadPackingList')) document.getElementById('btnDownloadPackingList').classList.add('hidden');
        }
    }
    
    // FETCH DATA ONLY FOR THIS TAB
    loadDataForTab(targetId);
  });
});

// Modal Master
function toggleModal(id, show) {
  const modal = document.getElementById(id);
  if (show) {
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); modal.querySelector('div').classList.remove('scale-95'); }, 10);
  } else {
    modal.classList.add('opacity-0'); modal.querySelector('div').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
  }
}
// document.getElementById('btnTambahModal').addEventListener('click', () => toggleModal('modalMaster', true)); // Dihapus sesuai request
document.getElementById('btnCloseModal').addEventListener('click', () => toggleModal('modalMaster', false));

// GLOBAL SEARCH LOGIC (SERVER-SIDE)
let searchTimeout;

const executeGlobalSearch = () => {
    const val = document.getElementById('globalSearch').value;

    
    const activeTab = document.querySelector('.tab-content:not(.hidden)');
    if(!activeTab || activeTab.id === 'tab-dashboard') return;
    
    // Khusus User & Master Data biarkan pencarian lokal jika belum disupport server
    if(activeTab.id === 'tab-users' || activeTab.id === 'tab-master-data') {
        const valLower = val.toLowerCase();
        const rows = activeTab.querySelectorAll('tbody tr');
        rows.forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(valLower) ? '' : 'none';
        });
        return;
    }
    
    // Tab besar: Lakukan pencarian server-side (Debounced)
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        const sheetName = activeTab.id.replace('tab-', '').replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()); // e.g. tab-inbond -> Inbond
        let actualSheetName = sheetName;
        if(activeTab.id === 'tab-stock-inventory') actualSheetName = 'Inventory';
        
        let tbodyId = '';
        if(actualSheetName === 'Inbond') tbodyId = 'inbondTableBody';
        else if(actualSheetName === 'Outbond') tbodyId = 'outbondTableBody';
        else if(actualSheetName === 'Return') tbodyId = 'returnTableBody';
        else if(actualSheetName === 'Pengiriman') tbodyId = 'pengirimanTableBody';
        else if(actualSheetName === 'Packing List') tbodyId = 'packingListTbody';
        
        const tbody = tbodyId ? document.getElementById(tbodyId) : activeTab.querySelector('tbody');
        
        if(tbody) {
            // Jika form sedang terbuka, kita tutup formnya agar hasil pencarian terlihat
            const btnToggleForm = document.getElementById('btnToggleForm');
            const panelForm = activeTab.querySelector('[id^="panelForm"]');
            const panelTable = activeTab.querySelector('[id^="panelTable"]');
            if(panelForm && panelTable && !panelForm.classList.contains('hidden')) {
                panelForm.classList.add('hidden');
                panelTable.classList.remove('hidden');
                if(btnToggleForm) {
                    btnToggleForm.innerHTML = `<i data-lucide="scan" class="w-4 h-4 mr-2"></i> BUKA FORM`;
                    btnToggleForm.classList.replace('bg-red-600', 'bg-indigo-600');
                    btnToggleForm.classList.replace('hover:bg-red-700', 'hover:bg-indigo-700');
                    if(window.lucide) window.lucide.createIcons();
                }
            }
        
            tbody.innerHTML = `<tr><td colspan="15" class="p-6 text-center text-blue-600 font-bold"><i data-lucide="search" class="w-6 h-6 animate-pulse mx-auto mb-2"></i>Mencari"${val}" di server...</td></tr>`;
            if(window.lucide) window.lucide.createIcons();
        }
        
        try {
            // Jika kosong, load 100 terakhir (seperti semula)
            const url = val.trim() === '' 
                ? `${SCRIPT_URL}?sheet=${actualSheetName}&limit=100&t=${Date.now()}` 
                : `${SCRIPT_URL}?sheet=${actualSheetName}&search_table=${encodeURIComponent(val)}&t=${Date.now()}`;
                
            if (val.trim() !== '') {
                logActivity('Pencarian', `Mencari keyword: ${val} di sheet ${actualSheetName}`);
            }
                
            const response = await fetch(url);
            const data = await response.json();
            
            // Re-render table by forcing loadDataForTab rendering path
            tbody.innerHTML = '';
            if(data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="15" class="p-6 text-center text-gray-500">Tidak ada data ditemukan.</td></tr>`;
            } else {
                if(actualSheetName === 'Inventory') renderInventoryRows(data, tbody);
                else if(actualSheetName === 'Inbond') renderInbondRows(data, tbody);
                else if(actualSheetName === 'Outbond') renderOutbondRows(data, tbody);
                else if(actualSheetName === 'Return') renderReturnRows(data, tbody);
                else if(actualSheetName === 'Pengiriman') renderPengirimanRows(data, tbody);
                else if(actualSheetName === 'Packing List') renderPackingListRows(data, tbody);
            }
            if(window.lucide) window.lucide.createIcons();
            
        } catch(err) {
            console.error("Gagal mencari", err);
            if(tbody) tbody.innerHTML = `<tr><td colspan="15" class="p-6 text-center text-red-600">Pencarian gagal: ${err.message}</td></tr>`;
        }
    }, 10);
};

document.getElementById('globalSearch')?.addEventListener('keydown', (e) => { if(e.key === 'Enter') executeGlobalSearch(); });
document.getElementById('btnGlobalSearch')?.addEventListener('click', executeGlobalSearch);



function renderPackingListRows(data, tbody) {
    tbody.innerHTML = '';
    data.forEach(d => {
        if(d.Barcode) {
            tbody.innerHTML += `<tr>
                <td class="p-3 text-center">
                    <button class="bg-red-500 text-white rounded p-1 hover:bg-red-600 shadow" title="Data Server tidak bisa dihapus langsung"><i data-lucide="lock" class="w-4 h-4"></i></button>
                </td>
                <td class="p-3 text-xs text-gray-500">${d.Tanggal || d.Date || d.Waktu || ''}</td>
                <td class="p-3">${d.Scan || ''}</td>
                <td class="p-3">${d.Brand || ''}</td>
                <td class="p-3">${d.Barcode || ''}</td>
                <td class="p-3">${d.SKU || ''}</td>
                <td class="p-3">${d.Description || ''}</td>
                <td class="p-3">${d.Colour || ''}</td>
                <td class="p-3">${d.Size || ''}</td>
                <td class="p-3">${d.Price || ''}</td>
                <td class="p-3">${d.Qty || ''}</td>
                <td class="p-3">${d['Bin/Box'] || d.Bin || ''}</td>
                <td class="p-3">${d.ITN || d.IT || d['Inventory Transfer Number'] || ''}</td>
                <td class="p-3">${d.From || d['From Location'] || ''}</td>
                <td class="p-3">${d.To || d['To Location'] || ''}</td>
            </tr>`;
        }
    });
}

function renderInventoryRows(data, tbody) {
    data.forEach(d => {
        if(d.Barcode) {
            const scan = d.Scan || '';
            const brand = d.Brand || '';
            const price = d.Price || '';
            tbody.innerHTML += `<tr><td class="p-3 text-xs text-gray-500">${scan}</td><td class="p-3">${brand}</td><td class="p-3">${d.Barcode}</td><td class="p-3">${d.SKU||''}</td><td class="p-3">${d.Description||''}</td><td class="p-3">${d.Colour||''}</td><td class="p-3">${d.Size||''}</td><td class="p-3">${price}</td><td class="p-3 text-green-700 bg-green-50 text-center">${d.Inbond||0}</td><td class="p-3 text-yellow-700 bg-yellow-50 text-center">${d.Outbond||0}</td><td class="p-3 text-orange-700 bg-orange-50 text-center">${d.Return||0}</td><td class="p-3 font-black text-red-700 bg-red-50 text-center">${d.Stock||0}</td></tr>`;
        }
    });
}
function getActionCell(d, sheetName) {
      if(!d._row_index) return '<td class="p-3 text-center">-</td>';
      const role = localStorage.getItem('userRole') || '';
      if (role.trim().toLowerCase() !== 'admin') return '<td class="p-3 text-center">-</td>';
      const dataStr = encodeURIComponent(JSON.stringify(d));
      return `<td class="p-3 text-center">
        <button class="text-blue-500 hover:text-blue-700 mx-1" onclick="handleEditRow('${sheetName}', '${dataStr}')" title="Edit"><i data-lucide="pencil" class="w-4 h-4 inline"></i></button>
        <button class="text-red-500 hover:text-red-700 mx-1" onclick="handleDeleteRow('${sheetName}', '${dataStr}')" title="Hapus"><i data-lucide="trash-2" class="w-4 h-4 inline"></i></button>
      </td>`;
  }

  function renderInbondRows(data, tbody) {
      data.forEach(d => {
          if(d.Barcode || d.Scan) {
              let timeStr = formatDate(d.Tanggal || d.Date || d.Waktu || d.Scan || '');
              let loc = d['From Location'] || d['Location'] || '';
              tbody.innerHTML += `<tr><td class="p-3 text-xs">${timeStr}</td><td class="p-3">${d.Scan||d.Barcode||''}</td><td class="p-3">${d.Brand||''}</td><td class="p-3">${d.Barcode||''}</td><td class="p-3">${d.SKU||''}</td><td class="p-3">${d.Description||''}</td><td class="p-3">${d.Colour||''}</td><td class="p-3">${d.Size||''}</td><td class="p-3">${d.Price||''}</td><td class="p-3">${d.Qty||''}</td><td class="p-3">${d['Bin/Box']||''}</td><td class="p-3">${d['Inventory Transfer Number']||d['Transfer Number']||''}</td><td class="p-3">${loc}</td>${getActionCell(d, 'Inbond')}</tr>`;
          }
      });
  }
  function renderOutbondRows(data, tbody) {
      data.forEach(d => {
          if(d.Barcode || d.Scan) {
              let timeStr = formatDate(d.Tanggal || d.Date || d.Waktu || d.Scan || '');
              let toLoc = d['To Location'] || d['Location'] || '';
              let tfNumber = d['Inventory Transfer Number'] || d['Transfer Number'] || '';
              tbody.innerHTML += `<tr><td class="p-3 text-xs">${timeStr}</td><td class="p-3">${d.Scan||d.Barcode||''}</td><td class="p-3">${d.Brand||''}</td><td class="p-3">${d.Barcode||''}</td><td class="p-3">${d.SKU||''}</td><td class="p-3">${d.Description||''}</td><td class="p-3">${d.Colour||''}</td><td class="p-3">${d.Size||''}</td><td class="p-3">${d.Price||''}</td><td class="p-3">${d.Qty||''}</td><td class="p-3">${d['Bin/Box']||''}</td><td class="p-3">${tfNumber}</td><td class="p-3">${toLoc}</td>${getActionCell(d, 'Outbond')}</tr>`;
          }
      });
  }
  function renderReturnRows(data, tbody) {
      data.forEach(d => {
          if(d.Barcode || d.Scan) {
              let timeStr = formatDate(d.Tanggal || d.Date || d.Waktu || d.Scan || '');
              let tfNumber = d['Inventory Transfer Number'] || d['Transfer Number'] || '';
              tbody.innerHTML += `<tr><td class="p-3 text-xs">${timeStr}</td><td class="p-3">${d.Scan||d.Barcode||''}</td><td class="p-3">${d.Brand||''}</td><td class="p-3">${d.Barcode||''}</td><td class="p-3">${d.SKU||''}</td><td class="p-3">${d.Description||''}</td><td class="p-3">${d.Colour||''}</td><td class="p-3">${d.Size||''}</td><td class="p-3">${d.Price||''}</td><td class="p-3">${d.Qty||''}</td><td class="p-3">${d['Bin/Box']||''}</td><td class="p-3">${tfNumber}</td><td class="p-3">${d['From Location']||''}</td><td class="p-3">${d['To Location']||''}</td>${getActionCell(d, 'Return')}</tr>`;
          }
      });
  }

// DOWNLOAD FILE LOGIC (CSV LANGSUNG DARI GOOGLE SHEETS)
document.getElementById('btnDownloadFile').addEventListener('click', async () => {
    const activeTab = document.querySelector('.tab-content:not(.hidden)');
    if(!activeTab) return alert("Pilih tab tabel yang ingin didownload terlebih dahulu!");
    
    const btn = document.getElementById('btnDownloadFile');
    const originalHtml = btn.innerHTML;
    
    if(activeTab.id === 'tab-dashboard') {
        if(!window.html2canvas) return alert("Fitur download gambar sedang memuat, silakan coba lagi dalam beberapa detik.");
        btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> MENYIAPKAN GAMBAR...`;
        if(window.lucide) window.lucide.createIcons();
        btn.disabled = true;
        
        try {
            // Sembunyikan header/tombol filter agar hasil screenshot bersih
            const headerFilter = document.getElementById('headerDateFilter');
            const originalFilterDisplay = headerFilter ? headerFilter.style.display : '';
            if(headerFilter) headerFilter.style.display = 'none';
            
            const canvas = await html2canvas(document.getElementById('tab-dashboard'), {
                scale: 2, // High resolution
                backgroundColor: '#f3f4f6', // Tailwind bg-gray-100
                logging: false,
                useCORS: true
            });
            
            if(headerFilter) headerFilter.style.display = originalFilterDisplay;
            
            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `Dashboard_SOS_${new Date().toISOString().slice(0,10)}.png`;
            link.href = imgData;
            link.click();
            
        } catch(err) {
            console.error(err);
            alert("Gagal mendownload gambar dashboard.");
        }
        
        btn.innerHTML = originalHtml;
        btn.disabled = false;
        if(window.lucide) window.lucide.createIcons();
        return;
    }
    
    // Animasi Loading
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> MENYIAPKAN...`;
    if(window.lucide) window.lucide.createIcons();
    btn.disabled = true;
    
    const sheetName = activeTab.id.replace('tab-', '').replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    let actualSheetName = sheetName;
    if(activeTab.id === 'tab-stock-inventory') actualSheetName = 'Inventory';
    
    // Hit API download_csv Google Apps Script untuk menarik 100% data penuh!
    const downloadUrl = `${SCRIPT_URL}?action=download_csv&sheet=${actualSheetName}`;
    
    logActivity('Download CSV', `Download data dari sheet ${actualSheetName}`);
    
    // Buka di tab baru, browser akan otomatis men-download file CSV-nya
    window.open(downloadUrl, '_blank');
    
    setTimeout(() => {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
        if(window.lucide) window.lucide.createIcons();
    }, 2000);
});

// ==========================================
// LOGIC TEMPLATE & UPLOAD BATCH
// ==========================================
const TEMPLATE_HEADERS = {
   'tab-inbond':"Tanggal,Scan,Brand,Barcode,SKU,Description,Colour,Size,Price,Qty,Bin/Box,Inventory Transfer Number,ETP Number,From Location",
   'tab-outbond':"Tanggal,Scan,Brand,Barcode,SKU,Description,Colour,Size,Price,Qty,Bin/Box,Inventory Transfer Number,ETP Number,To Location",
   'tab-return':"Tanggal,Scan,Brand,Barcode,SKU,Description,Colour,Size,Price,Qty,Bin/Box,Inventory Transfer Number,ETP Number,From Location,To Location",
   'tab-pengiriman':"Tanggal,IN / OUT,Nopol,Brand,Tujuan,Qty,Koli,Seal / Resi,Driver",
   'tab-packing-list':"Tanggal,Scan,Brand,Barcode,SKU,Description,Colour,Size,Price,Qty,Bin/Box,Inventory Transfer Number,From Location,To Location"
};

document.getElementById('btnDownloadTemplate')?.addEventListener('click', () => {
    const activeTab = document.querySelector('.tab-content:not(.hidden)');
    if(!activeTab || !TEMPLATE_HEADERS[activeTab.id]) return alert("Template tidak tersedia untuk tab ini.");
    
    const headers = TEMPLATE_HEADERS[activeTab.id];
    let csvContent ="data:text/csv;charset=utf-8," + headers +"\n";
    let encodedUri = encodeURI(csvContent);
    let link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const sheetName = activeTab.id.replace('tab-', '').replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    link.setAttribute("download", `Template_${sheetName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

document.getElementById('btnUploadCsv')?.addEventListener('click', () => {
    document.getElementById('fileUploadCsv').click();
});

document.getElementById('fileUploadCsv')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    
    const pass = prompt("Masukkan password untuk Upload Data:");
    if(pass !=="admin123") {
        if(pass !== null) alert("Password Salah!");
        e.target.value = ''; // Reset
        return;
    }
    
    const activeTab = document.querySelector('.tab-content:not(.hidden)');
    if(!activeTab || !TEMPLATE_HEADERS[activeTab.id]) return alert("Tidak dapat upload ke tab ini.");
    const sheetName = activeTab.id.replace('tab-', '').replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const text = e.target.result;
        const lines = text.split('\n');
        if(lines.length < 2) return alert("File kosong atau tidak ada data.");
        
        const separator = lines[0].includes(';') ? ';' : ',';

        function parseCsvLine(text, sep) {
            let ret = [], val ="", inQuotes = false;
            for (let i = 0; i < text.length; i++) {
                let c = text.charAt(i);
                if (c === '"') {
                    if (inQuotes && text.charAt(i+1) === '"') { val += '"'; i++; } 
                    else { inQuotes = !inQuotes; }
                } else if (c === sep && !inQuotes) {
                    ret.push(val); val ="";
                } else {
                    val += c;
                }
            }
            ret.push(val);
            return ret;
        }

        const headers = parseCsvLine(lines[0], separator).map(h => h.trim().replace(/"/g, '').replace(/^\uFEFF/, ''));
        const payloadArray = [];
        
        for(let i=1; i<lines.length; i++) {
            if(!lines[i].trim()) continue;
            
            const rawVals = parseCsvLine(lines[i], separator);
            
            let obj = {};
            for(let j=0; j<headers.length; j++) {
                obj[headers[j]] = (rawVals[j] ||"").trim();
            }
            const hasBarcode = Object.keys(obj).some(k => k.toLowerCase() === 'barcode' && obj[k] !== '');
            const hasScan = Object.keys(obj).some(k => k.toLowerCase() === 'scan' && obj[k] !== '');
            const hasNopolRow = Object.keys(obj).some(k => k.toLowerCase() === 'nopol' && obj[k] !== '');
            if(hasBarcode || hasScan || hasNopolRow) {
                payloadArray.push(obj);
            }
        }
        
        if(payloadArray.length === 0) return alert("Tidak ada data valid yang ditemukan di file.");
        
        const btn = document.getElementById('btnUploadCsv');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> MENGUPLOAD ${payloadArray.length} BARIS...`;
        if(window.lucide) window.lucide.createIcons();
        btn.disabled = true;
        
        try {
            const resp = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'upload_csv',
                    sheet: sheetName,
                    payload: payloadArray
                })
            });
            const result = await resp.json();
            if(result.status === 'success') {
                logActivity('Upload CSV', `Berhasil upload ${payloadArray.length} baris ke sheet ${sheetName}`);
                alert(result.message ||"Upload Berhasil!");
                tabCache[activeTab.id] = false;
                tabCache['tab-dashboard'] = false;
                tabCache['tab-stock-inventory'] = false;
                loadDataForTab(activeTab.id); // Refresh data
            } else {
                alert("Upload gagal:" + result.message);
            }
        } catch (err) {
            alert("Error:" + err.message);
        } finally {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
            if(window.lucide) window.lucide.createIcons();
            document.getElementById('fileUploadCsv').value = ''; // Reset
        }
    };
    reader.readAsText(file);
});

// ==========================================
// 3. AUTHENTICATION (Bypass Mode)
// ==========================================
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const inputId = document.getElementById('loginId').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value.trim();
  const btn = document.querySelector('#loginForm button[type="submit"]');
  const originalText = btn.innerText;

  try {
      btn.innerText ="Memeriksa...";
      btn.disabled = true;

      // 1. Hardcoded akun master dimatikan agar memprioritaskan Google Sheets
      // Fallback ini hanya akan jalan jika spreadsheet benar-benar tidak bisa diakses
      let fallbackTriggered = false;

      // 2. Cek Dinamis ke Tab "Users" menggunakan Prefetch (Instan)
      let usersData = null;
      if (preloadedUsers) {
          usersData = preloadedUsers;
      } else {
          if(usersFetchPromise) await usersFetchPromise;
          if(preloadedUsers) {
              usersData = preloadedUsers;
          } else {
              const response = await fetch(SCRIPT_URL +"?sheet=Users");
              const text = await response.text();
              if(!text.startsWith('Error:')) usersData = JSON.parse(text);
          }
      }
      
      if(usersData) {
          
          const validUser = usersData.find(u => {
             const values = Object.values(u).map(v => String(v).toLowerCase());
             const hasMatch = values.some(v => v.includes(inputId));
             let pw = u['Password'] || u['password'] || u['PIN'] || u['pin'];
             return hasMatch && String(pw).trim() === password;
          });
          
          if(validUser) {
             let userName = validUser['Nama'] || validUser['Name'] || validUser['ID User'] || inputId;
             localStorage.setItem('currentUser', userName);
             localStorage.setItem('userRole', validUser['Role'] || validUser['role'] || 'Staff');
             localStorage.setItem('userEmail', validUser['Email'] || validUser['email'] || '');
             loginSukses();
             return;
          }
      }

      alert("Gagal Login: ID / Nama / Email atau Password salah.");
  } catch(err) {
      alert("Terjadi kesalahan sistem saat login:" + err.message);
  } finally {
      btn.innerText = originalText;
      btn.disabled = false;
  }
});

function loginSukses() {
    logActivity('Login', 'User masuk ke sistem');
    loginContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    
    // Tampilkan/Sembunyikan Master Data berdasar Role
    const role = localStorage.getItem('userRole');
    const masterNav = document.getElementById('navMasterDataTab');
    if(masterNav) {
        if(role === 'Admin') {
            masterNav.classList.remove('hidden');
            const navU = document.getElementById('navUsersTab');
            if(navU) navU.classList.remove('hidden');
        }
        else masterNav.classList.add('hidden');
    }

    // Set Dashboard as active
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active', 'bg-white/10', 'border-l-4', 'border-yellow-400'));
    const dashNav = document.querySelector('[data-target="tab-dashboard"]');
    if(dashNav) dashNav.classList.add('active', 'bg-white/10', 'border-l-4', 'border-yellow-400');
    
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.getElementById('tab-dashboard').classList.remove('hidden');
    document.getElementById('pageTitle').textContent = 'Dashboard';
    
    // Set Profile Name and Email
    const pName = document.getElementById('profileName');
    const pEmail = document.getElementById('profileEmail');
    if(pName) pName.innerText = localStorage.getItem('currentUser') || 'Nama User';
    if(pEmail) pEmail.innerText = localStorage.getItem('userEmail') || '';
    
    
    loadDataForTab('tab-dashboard'); 
}

document.getElementById('btnLogout').addEventListener('click', () => {
  localStorage.removeItem('currentUser');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userEmail');
  window.location.reload();
});

// ==========================================
// 4. API FETCHING LOGIC (GOOGLE SHEETS)
// ==========================================

function renderInventoryRows(data, tbody) {
    tbody.innerHTML = '';
    data.forEach(d => {
        if(d.Barcode) {
            const scan = d.Scan || '';
            const brand = d.Brand || '';
            const price = d.Price || '';
            tbody.innerHTML += `<tr><td class="p-3 text-xs text-gray-500">${scan}</td><td class="p-3">${brand}</td><td class="p-3">${d.Barcode}</td><td class="p-3">${d.SKU||''}</td><td class="p-3">${d.Description||''}</td><td class="p-3">${d.Colour||''}</td><td class="p-3">${d.Size||''}</td><td class="p-3">${price}</td><td class="p-3 text-green-700 bg-green-50 text-center">${d.Inbond||0}</td><td class="p-3 text-yellow-700 bg-yellow-50 text-center">${d.Outbond||0}</td><td class="p-3 text-orange-700 bg-orange-50 text-center">${d.Return||0}</td><td class="p-3 font-black text-red-700 bg-red-50 text-center">${d.Stock||0}</td></tr>`;
        }
    });
}
async function fetchSheet(sheetName, tbodyId, renderFunc) {
    const tbody = tbodyId ? document.getElementById(tbodyId) : null;
    const cacheKey = 'wms_table_' + sheetName;
    const syncBadge = document.getElementById('syncBadge');
    
    // LIVE SYNCING: Load from LocalStorage first if available
    if(tbody) {
        try {
            const cachedData = localStorage.getItem(cacheKey);
            if(cachedData) {
                const data = JSON.parse(cachedData);
                if(data.length > 0) {
                    tbody.innerHTML = '';
                    if(renderFunc) renderFunc(data, tbody);
                    if(window.lucide) window.lucide.createIcons();
                    if(sheetName === 'Packing List') {
                        populatePackingListDropdown();
                    }
                } else {
                    tbody.innerHTML = `<tr><td colspan="20" class="p-6 text-center text-gray-500">Tidak ada data di tab ${sheetName}</td></tr>`;
                }
            } else {
                tbody.innerHTML = `<tr><td colspan="20" class="p-6 text-center text-blue-600 font-bold"><i data-lucide="loader-2" class="w-6 h-6 animate-spin mx-auto mb-2"></i>Mengambil data dari Google Sheets...</td></tr>`;
                if(window.lucide) window.lucide.createIcons();
            }
        } catch(e) {}
    }
    
    if(syncBadge) syncBadge.classList.remove('hidden');
    
    try {
      let text = '';
      let success = false;
      
      // Auto-retry up to 3 times for Google Apps Script intermittent errors (502 HTML pages)
      for(let i=0; i<3; i++) {
          try {
              const response = await fetch(SCRIPT_URL +"?sheet=" + sheetName);
              text = await response.text();
              if(!text.includes('<!DOCTYPE html>')) {
                  success = true;
                  break;
              }
              // If it's HTML, wait 1 second and retry
              await new Promise(r => setTimeout(r, 1000));
          } catch(err) {
              await new Promise(r => setTimeout(r, 1000));
          }
      }
      
      if(syncBadge) syncBadge.classList.add('hidden');
      
      if(!success || text.includes('<!DOCTYPE html>')) {
          const errHtml = `ERROR: Google memblokir akses atau URL berubah. Pastikan di Apps Script Anda sudah mengatur 'Siapa Saja (Anyone)' pada hak akses, dan JANGAN mengubah SCRIPT_URL.`;
          // Only show alert if we really failed after retries and we don't have cached data
          if(tbody && !localStorage.getItem(cacheKey)) tbody.innerHTML = `<tr><td colspan="20" class="p-6 text-center text-red-600 font-bold">${errHtml}</td></tr>`;
          else if(!localStorage.getItem(cacheKey)) alert(errHtml);
          return [];
      }
      
      if(text.startsWith('Error:')) {
          if(tbody && !localStorage.getItem(cacheKey)) tbody.innerHTML = `<tr><td colspan="20" class="p-6 text-center text-red-600 font-bold">${text}</td></tr>`;
          else alert(`API Error: ${text}`);
          return [];
      }
      
      const data = JSON.parse(text);
      // Save data, but reverse it so the latest is at the top!
      const dataReversed = [...data].reverse();
      try { localStorage.setItem(cacheKey, JSON.stringify(dataReversed)); } catch(e){}
      
      if(tbody) {
          if(dataReversed.length === 0) {
              tbody.innerHTML = `<tr><td colspan="20" class="p-6 text-center text-gray-500">Tidak ada data di tab ${sheetName}</td></tr>`;
          } else {
              tbody.innerHTML = '';
              renderFunc(dataReversed, tbody);
              if(window.lucide) window.lucide.createIcons();
          }
      }
      if(sheetName === 'Packing List') {
          populatePackingListDropdown();
      }
      return dataReversed;
    } catch (e) {
      if(syncBadge) syncBadge.classList.add('hidden');
      console.error(e);
      if(tbody && !localStorage.getItem(cacheKey)) tbody.innerHTML = `<tr><td colspan="20" class="p-6 text-center text-red-600 font-bold">Gagal mengambil data dari ${sheetName}: ${e.message}</td></tr>`;
      return [];
    }
}

async function postData(action, sheetName, payload) {
  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: action, sheet: sheetName, payload: payload })
    });
    return await response.json();
  } catch (error) {
    console.error("Gagal mengirim data", error);
    return {status:"error", message: error.message};
  }
}

async function logActivity(activity, detail) {
    const user = localStorage.getItem('currentUser') || 'Unknown';
    try {
        await postData('log_history', 'Histori', { user, activity, detail });
    } catch(err) {
        console.error("Gagal log histori:", err);
    }
}

// Cache untuk menyimpan data agar tidak perlu fetch berulang-ulang saat pindah tab
const tabCache = {};

// Helper format tanggal DD-MM-YYYY
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    } catch(e) {
        return dateString;
    }
}

// Logic pemuatan data dinamis per tab
async function loadDataForTab(tabId) {
    // Jika data tab ini sudah ada di memori, tidak perlu ambil dari Google lagi (INSTANT)
    if (tabCache[tabId]) return;

    if(tabId === 'tab-dashboard') {
        tabCache[tabId] = true;
        
        // Define function to load dashboard data so it can be re-called by the filter
        window.loadDashboardData = async (startDate, endDate) => {
             let masterData = [];
             try {
                const local = localStorage.getItem('wms_master_data');
                if(local) {
                   masterData = JSON.parse(local);
                   document.getElementById('dash_total_master').textContent = masterData.length +"+";
                }
             } catch(e){}
             
             const renderDashboardWithSummary = (summary) => {
                 if(!summary) return;
                 
                 document.getElementById('dash_inbond').textContent = summary.inbond_sum !== undefined ? summary.inbond_sum : (summary.inbond ||"-");
                 document.getElementById('dash_outbond').textContent = summary.outbond_sum !== undefined ? summary.outbond_sum : (summary.outbond ||"-");
                 document.getElementById('dash_return').textContent = summary.return_sum !== undefined ? summary.return_sum : (summary.return ||"-");
                 document.getElementById('dash_kedatangan').textContent = summary.kedatangan_unit !== undefined ? summary.kedatangan_unit :"-";
                   document.getElementById('dash_pengiriman').textContent = summary.pengiriman_unit !== undefined ? summary.pengiriman_unit : (summary.pengiriman_sum || (summary.pengiriman ||"-"));
                 
                 let totalStock = (summary && summary.inventory_sum !== undefined) ? summary.inventory_sum : (summary ? summary.inventory :"-");
                 document.getElementById('dash_inventory').textContent = totalStock;
                 
                 function renderTrendChart(ctxId, dataArr, labelName, colorHex) {
                       const ctx = document.getElementById(ctxId);
                       if(!ctx || !window.Chart) return;
                       
                       if(window[ctxId + '_instance']) window[ctxId + '_instance'].destroy();
                       
                       const groupMode = document.getElementById('globalChartGroup') ? document.getElementById('globalChartGroup').value : 'day';
                       
                       const groupMap = {};
                       
                       const getMonday = (d) => {
                           const date = new Date(d);
                           const day = date.getDay();
                           const diff = date.getDate() - day + (day === 0 ? -6 : 1);
                           return new Date(date.setDate(diff));
                       };
                       
                       const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                       
                       dataArr.forEach(d => {
                           let t = d.Tanggal || d.Date || d.Waktu || d.Scan;
                           if(t) {
                               let dtStr = formatDate(t);
                               const parts = dtStr.split('-');
                               if(parts.length === 3) {
                                   const dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
                                   let groupKey = dtStr; // default day
                                   
                                   if(groupMode === 'week') {
                                       const mon = getMonday(dateObj);
                                       groupKey = `${('0'+mon.getDate()).slice(-2)} ${monthNames[mon.getMonth()]} ${mon.getFullYear()} (Minggu)`;
                                   } else if (groupMode === 'month') {
                                       groupKey = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
                                   }
                                   
                                   if(!groupMap[groupKey]) {
                                       groupMap[groupKey] = { val: 0, date: dateObj };
                                   }
                                   
                                   let q = parseInt(d.Qty);
                                   if(isNaN(q) || q === 0) q = 1;
                                   groupMap[groupKey].val += q;
                               }
                           }
                       });
                       
                       const labels = Object.keys(groupMap).sort((a,b) => groupMap[a].date - groupMap[b].date);
                       const data = labels.map(l => groupMap[l].val);
                       
                       window[ctxId + '_instance'] = new Chart(ctx, {
                         type: 'line',
                         data: {
                             labels: labels.length ? labels : ['Data Kosong'],
                             datasets: [{
                                 label: labelName,
                                 data: data.length ? data : [0],
                                 borderColor: colorHex,
                                 backgroundColor: colorHex + '20',
                                 borderWidth: 2,
                                 fill: true,
                                 tension: 0.4,
                                 pointBackgroundColor: '#ffffff',
                                 pointBorderColor: colorHex,
                                 pointBorderWidth: 2,
                                 pointRadius: 4,
                                 pointHoverRadius: 6
                             }]
                         },
                         options: { responsive: true, maintainAspectRatio: false }
                     });
                 }
                 
                 const mapTrend = (trendDataMap) => Object.keys(trendDataMap || {}).map(d => ({ Tanggal: d, Qty: trendDataMap[d] }));
                 
                 // Listen to dropdown changes to re-render charts instantly!
                  const chartGroupEl = document.getElementById('globalChartGroup');
                  if(chartGroupEl && !chartGroupEl.dataset.listenerBound) {
                      chartGroupEl.dataset.listenerBound = 'true';
                      chartGroupEl.addEventListener('change', () => {
                          const cachedSummary = localStorage.getItem('wms_dashboard_summary');
                          if(cachedSummary) {
                              renderDashboardWithSummary(JSON.parse(cachedSummary));
                          }
                      });
                  }
                  
                  
                  
                  renderTrendChart('chartInbond', mapTrend(summary ? summary.inbond_trend : {}), 'Inbond (Qty)', '#3b82f6');
                 renderTrendChart('chartOutbond', mapTrend(summary ? summary.outbond_trend : {}), 'Outbond (Qty)', '#eab308');
                 renderTrendChart('chartReturn', mapTrend(summary ? summary.return_trend : {}), 'Return (Qty)', '#f97316');
                 renderTrendChart('chartPengiriman', mapTrend(summary ? summary.pengiriman_trend : {}), 'Pengiriman (Truk)', '#8b5cf6');
                 
                 const ctxKat = document.getElementById('chartKategori');
                 if(ctxKat && window.Chart) {
                     if(window.chartKategori_instance) window.chartKategori_instance.destroy();
                     
                     const brandTotals = (summary && summary.brand_totals) ? summary.brand_totals : {};
                     const labels = Object.keys(brandTotals);
                     const cData = Object.values(brandTotals);
                     
                     const palette = [
                         'rgba(59, 130, 246, 0.8)',
                         'rgba(16, 185, 129, 0.8)',
                         'rgba(245, 158, 11, 0.8)',
                         'rgba(239, 68, 68, 0.8)',
                         'rgba(139, 92, 246, 0.8)',
                         'rgba(236, 72, 153, 0.8)',
                         'rgba(20, 184, 166, 0.8)',
                         'rgba(249, 115, 22, 0.8)'
                     ];
                     const bgColors = labels.map((_, i) => palette[i % palette.length]);
                     
                     window.chartKategori_instance = new Chart(ctxKat, {
                         type: 'bar',
                         data: {
                             labels: labels.length ? labels : ['Data Kosong'],
                             datasets: [{
                                 label: 'Total Qty (Stock)',
                                 data: cData.length ? cData : [0],
                                 backgroundColor: bgColors,
                                 borderRadius: 4
                             }]
                         },
                         options: { 
                             responsive: true, 
                             maintainAspectRatio: false,
                             plugins: { legend: { display: false } },
                             scales: { y: { beginAtZero: true, grid: { borderDash: [2, 4], color: '#e5e7eb' } }, x: { grid: { display: false } } }
                         }
                     });
                 }
             };

             // Coba render dari Cache dulu (LIVE SYNCING)
             try {
                if(!startDate && !endDate) {
                    const cachedSummary = localStorage.getItem('wms_dashboard_summary');
                    if(cachedSummary) {
                        renderDashboardWithSummary(JSON.parse(cachedSummary));
                    }
                }
             } catch(e){}
             
             // Fetch real data in background
             try {
                 let url = `${SCRIPT_URL}?action=summary&sheet=Inbond`;
                 if(startDate) url += `&start_date=${startDate}`;
                 if(endDate) url += `&end_date=${endDate}`;
                 
                 const syncBadge = document.getElementById('syncBadge');
                 if(syncBadge) syncBadge.classList.remove('hidden');
                 
                 const summaryPromise = fetch(url).then(async r => {
                     const text = await r.text();
                     if(text.startsWith('Error')) throw new Error(text);
                     return JSON.parse(text);
                 }).catch(e => {
                     console.error("Gagal load summary:", e);
                     return null;
                 });
                 
                 const summary = await summaryPromise;
                 if(summary) {
                     if(!startDate && !endDate) {
                         try { localStorage.setItem('wms_dashboard_summary', JSON.stringify(summary)); } catch(e){}
                     }
                     renderDashboardWithSummary(summary);
                 }
                 if(syncBadge) syncBadge.classList.add('hidden');
                 return; } catch(err) { console.error(err); }
              };
         
         // Call it initially
         window.loadDashboardData();
         
         // Setup Event Listeners for Filter Buttons (only once)
         if(!window.dashFilterSetupDone) {
             window.dashFilterSetupDone = true;
             
             document.getElementById('btnFilterDashboard')?.addEventListener('click', () => {
                 const sd = document.getElementById('dash_start_date').value;
                 const ed = document.getElementById('dash_end_date').value;
                 // Set UI loading state
                 document.getElementById('dash_inbond').innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>';
                 document.getElementById('dash_outbond').innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>';
                 document.getElementById('dash_return').innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>';
                 document.getElementById('dash_pengiriman').innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>';
                 lucide.createIcons();
                 
                 window.loadDashboardData(sd, ed);
             });
             
             document.getElementById('btnResetDashboard')?.addEventListener('click', () => {
                 document.getElementById('dash_start_date').value = '';
                 document.getElementById('dash_end_date').value = '';
                 
                 document.getElementById('dash_inbond').innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>';
                 document.getElementById('dash_outbond').innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>';
                 document.getElementById('dash_return').innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>';
                 document.getElementById('dash_pengiriman').innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>';
                 lucide.createIcons();
                 
                 window.loadDashboardData();
             });
         }
    }
    else if(tabId === 'tab-master-data') {
        const tMaster = document.getElementById('masterTableBody');
        const syncBadge = document.getElementById('syncBadge');
        
        // 1. Tampilkan dari LocalStorage SECEPAT KILAT (INSTANT LOAD)
        const localData = localStorage.getItem('wms_master_data');
        if (localData) {
            try {
                const parsed = JSON.parse(localData);
                window.globalMasterData = parsed;
                tabCache[tabId] = true;
                tMaster.innerHTML = '';
                parsed.forEach(d => {
                    if(d.Barcode) {
                        const price = d['Base Price'] || d[' Base Price'] || '';
                        tMaster.innerHTML += `<tr><td class="p-3">${d.Barcode}</td><td class="p-3">${d.SKU||''}</td><td class="p-3">${d.Description||''}</td><td class="p-3">${d['SOS - Color']||''}</td><td class="p-3">${d['SOS - Size']||''}</td><td class="p-3">${price}</td><td class="p-3">${d['SOS - Category']||''}</td><td class="p-3">${d.Brand||''}</td><td class="p-3">${d['SOS - Age gender Product']||''}</td><td class="p-3">${d['SOS - Season']||''}</td><td class="p-3 text-center">-</td></tr>`;
                    }
                });
            } catch(e) {}
        }

        // 2. LIVE SYNCING: Tarik data terbaru di background
        if(syncBadge) syncBadge.classList.remove('hidden');
        if(!localData) {
            tMaster.innerHTML = '<tr><td colspan="10" class="p-6 text-center text-blue-600 font-bold"><div class="flex justify-center items-center"><i data-lucide="loader-2" class="w-6 h-6 animate-spin mr-2"></i> Mengambil data dari Google Sheets...</div></td></tr>';
            if(window.lucide) window.lucide.createIcons();
        }
        
        try {
            const response = await fetch(`${SCRIPT_URL}?sheet=Master`);
            const text = await response.text();
            if(!text.startsWith('Error:')) {
                const freshData = JSON.parse(text);
                window.globalMasterData = freshData;
                
                // Simpan ke LocalStorage agar besok loadnya instan
                try { localStorage.setItem('wms_master_data', JSON.stringify(freshData)); } catch(e) {}
                
                tabCache[tabId] = true;
                tMaster.innerHTML = '';
                freshData.forEach(d => {
                    if(d.Barcode) {
                        const price = d['Base Price'] || d[' Base Price'] || '';
                        tMaster.innerHTML += `<tr><td class="p-3">${d.Barcode}</td><td class="p-3">${d.SKU||''}</td><td class="p-3">${d.Description||''}</td><td class="p-3">${d['SOS - Color']||''}</td><td class="p-3">${d['SOS - Size']||''}</td><td class="p-3">${price}</td><td class="p-3">${d['SOS - Category']||''}</td><td class="p-3">${d.Brand||''}</td><td class="p-3">${d['SOS - Age gender Product']||''}</td><td class="p-3">${d['SOS - Season']||''}</td><td class="p-3 text-center">-</td></tr>`;
                    }
                });
            }
        } catch(err) {
            console.error("Sync gagal", err);
            if(!localData) {
                tMaster.innerHTML = `<tr><td colspan="10" class="p-6 text-center text-red-600 font-bold">Gagal mengambil data Master: ${err.message}. Pastikan Google Apps Script sudah di-deploy ke versi terbaru.</td></tr>`;
            }
        }
        
        if(syncBadge) syncBadge.classList.add('hidden');
    }
    
    else if(tabId === 'tab-stock-inventory') {
        const data = await fetchSheet("Inventory","stockTableBody", renderInventoryRows);
        if(data && data.length > 0) tabCache[tabId] = true;
    }
    
    else if(tabId === 'tab-inbond') {
        const data = await fetchSheet("Inbond","inbondTableBody", (d, t) => renderInbondRows(d.slice().reverse(), t));
        if(data && data.length > 0) tabCache[tabId] = true;
    }
    
    else if(tabId === 'tab-outbond') {
        const data = await fetchSheet("Outbond","outbondTableBody", (d, t) => renderOutbondRows(d.slice().reverse(), t));
        if(data && data.length > 0) tabCache[tabId] = true;
    }
    
    else if(tabId === 'tab-return') {
        const data = await fetchSheet("Return","returnTableBody", (d, t) => renderReturnRows(d.slice().reverse(), t));
        if(data && data.length > 0) tabCache[tabId] = true;
    }
    
    
    else if(tabId === 'tab-packing-list') {
        const data = await fetchSheet("Packing List","packingListTbody", (d, t) => renderPackingListRows(d.slice().reverse(), t));
        if(data && data.length > 0) tabCache[tabId] = true;
    }

    else if(tabId === 'tab-pengiriman') {
        const data = await fetchSheet("Pengiriman","pengirimanTableBody", (d, t) => renderPengirimanRows(d.slice().reverse(), t));
        if(data && data.length > 0) tabCache[tabId] = true;
    }
}

// ==========================================
// 4.5 AUTOFILL BARCODE DARI MASTER DATA
// ==========================================
window.globalMasterData = [];
try {
  const localMaster = localStorage.getItem('wms_master_data');
  if (localMaster) window.globalMasterData = JSON.parse(localMaster);
} catch(e) {}

function setupAutofill(prefix) {
    const barcodeInput = document.getElementById(`${prefix}_barcode`);
    if (!barcodeInput) return;

    // Mencegah form tersubmit otomatis saat scanner menekan tombol Enter
    barcodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            barcodeInput.blur(); // Memicu event 'change'
        }
    });

    barcodeInput.addEventListener('change', async (e) => {
        const val = e.target.value.trim();
        if (!val) return;
        
        
        let btnId = '';
        if (prefix === 'in') btnId = 'btnSubmitInbondTemp';
        else if (prefix === 'out') btnId = 'btnSubmitOutbondTemp';
        else if (prefix === 'ret') btnId = 'btnSubmitReturnTemp';
        else if (prefix === 'pack') {
             // For packing list form, we can just trigger submit
             const form = document.getElementById('packingListForm');
             if(form) form.dispatchEvent(new Event('submit', { cancelable: true }));
             return;
        }
        const btn = document.getElementById(btnId);

        const originalText = btn ? btn.innerText : 'Simpan';
        if(btn) { btn.innerText ="Mencari..."; btn.disabled = true; }
        barcodeInput.style.backgroundColor = '#fef08a'; // yellow
        
        let item = window.globalMasterData.find(d => String(d.Barcode||"").trim() === String(val).trim() || String(d.Scan||"").trim() === String(val).trim() || String(d.SKU||"").trim() === String(val).trim());
        
        // Jika tidak ada di cache lokal, cari langsung ke server Google (TextFinder API)
        if (!item) {
            try {
                const response = await fetch(`${SCRIPT_URL}?sheet=Master&action=search&barcode=${val}`);
                const text = await response.text();
                if(!text.startsWith('Error:') && text !== 'null') {
                    item = JSON.parse(text);
                }
            } catch(e) {}
        }
        
        if (item) {
            barcodeInput.style.backgroundColor = '#dcfce7'; // green-100
            barcodeInput.dataset.realBarcode = item.Barcode || item.Scan || '';
            const elBrand = document.getElementById(`${prefix}_brand`);
            const elSku = document.getElementById(`${prefix}_sku`);
            const elDesc = document.getElementById(`${prefix}_desc`);
            const elColor = document.getElementById(`${prefix}_colour`);
            const elSize = document.getElementById(`${prefix}_size`);
            const elPrice = document.getElementById(`${prefix}_price`);
            const elQty = document.getElementById(`${prefix}_qty`);
            
            if (elBrand) elBrand.value = item.Brand || '';
            if (elSku) elSku.value = item.SKU || '';
            if (elDesc) elDesc.value = item.Description || '';
            if (elColor) elColor.value = item['SOS - Color'] || item['Color'] || '';
            if (elSize) elSize.value = item['SOS - Size'] || item['Size'] || '';
            if (elPrice) elPrice.value = item['Base Price'] || item['Price'] || '';
            if (elQty && !elQty.value) elQty.value = 1; // Default qty = 1
        } else {
            barcodeInput.style.backgroundColor = '#fee2e2'; // red-100
            const ids = ['brand', 'sku', 'desc', 'colour', 'size', 'price'];
            ids.forEach(id => {
                const el = document.getElementById(`${prefix}_${id}`);
                if(el) el.value = '';
            });
        }
        
        setTimeout(() => { barcodeInput.style.backgroundColor = ''; }, 2000);
        if(btn) { btn.innerText = originalText; btn.disabled = false; }
        
        // Pindahkan fokus ke input Qty setelah scan
        const elQty = document.getElementById(`${prefix}_qty`);
        if(elQty) elQty.focus();
        
        // Auto-submit jika data ditemukan (delay sedikit agar UI update)
        if (item && btn) {
            setTimeout(() => { btn.click(); }, 150);
        }
    });
}

// Inisialisasi Autofill untuk ketiga form transaksi
setupAutofill('in');
setupAutofill('out');
setupAutofill('ret');

// ==========================================
﻿
// ==========================================
// 5. FORM SUBMISSIONS (BATCH)
// ==========================================

document.getElementById('masterForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {"Barcode": document.getElementById('mst_barcode').value,"SKU": document.getElementById('mst_sku').value,"Description": document.getElementById('mst_desc').value,"SOS - Color": document.getElementById('mst_color').value,"SOS - Size": document.getElementById('mst_size').value,"Base Price": document.getElementById('mst_price').value,"SOS - Category": document.getElementById('mst_category').value,"Brand": document.getElementById('mst_brand').value,"SOS - Age gender Product": document.getElementById('mst_age_gender').value,"SOS - Season": document.getElementById('mst_season').value
  };
  const btn = e.submitter; btn.innerText ="Menyimpan..."; btn.disabled = true;
  await postData('add', 'Master', payload);
  btn.innerText ="Simpan"; btn.disabled = false;
  
  document.getElementById('masterForm').reset();
  toggleModal('modalMaster', false);
  tabCache['tab-master-data'] = false;
  loadDataForTab('tab-master-data');
});

function generateTempId() {
    return Math.random().toString(36).substr(2, 9);
}

let tempInbondList = [];

document.getElementById('btnSubmitInbondTemp')?.addEventListener('click', (e) => {
    const form = document.getElementById('inbondForm');
    if(!form.checkValidity()) { form.reportValidity(); return; }
    e.preventDefault();
    const qty = parseInt(document.getElementById('in_qty').value) || 0;
    const item = {"Tanggal": new Date().toLocaleString('id-ID'),"Scan": document.getElementById('in_barcode').value,"Barcode": document.getElementById('in_barcode').dataset.realBarcode || document.getElementById('in_barcode').value,"Brand": document.getElementById('in_brand').value,"SKU": document.getElementById('in_sku').value,"Description": document.getElementById('in_desc').value,"Colour": document.getElementById('in_colour').value,"Size": document.getElementById('in_size').value,"Price": document.getElementById('in_price').value,"Qty": qty,"Bin/Box": document.getElementById('in_bin').value,"Inventory Transfer Number": document.getElementById('in_tf').value,"ETP Number": (document.getElementById('in_etp') ? document.getElementById('in_etp').value : ''),"From Location": document.getElementById('in_loc').value,"To Location": document.getElementById('in_loc').value,"_id": generateTempId()
    };
    
    const existingIndex = tempInbondList.findIndex(x => String(x.Barcode) === String(item.Barcode));
    if(existingIndex !== -1) {
        tempInbondList[existingIndex].Qty = parseInt(tempInbondList[existingIndex].Qty) + qty;
    } else {
        tempInbondList.push(item);
    }
    renderTempInbondTable();
    
    document.getElementById('inbondForm').reset();
    document.getElementById('in_barcode').style.backgroundColor = '';
    document.getElementById('in_barcode').focus();
});

function renderTempInbondTable() {
    const tbody = document.getElementById('tempInbondTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    tempInbondList.forEach((item, index) => {
        const timeStr = item.Tanggal.split(' ')[1] || item.Tanggal;
        tbody.innerHTML += `<tr><td class="p-2 text-xs">${timeStr}</td><td class="p-2">${item.Brand}</td><td class="p-2">${item.Barcode}</td><td class="p-2">${item.SKU}</td><td class="p-2">${item.Description}</td><td class="p-2">${item.Colour}</td><td class="p-2">${item.Size}</td><td class="p-2">${item.Price}</td><td class="p-2 text-green-700 bg-green-50 text-center">${item.Qty}</td><td class="p-2">${item['Bin/Box']}</td><td class="p-2">${item['Inventory Transfer Number']}</td><td class="p-2">${item['From Location']}</td><td class="p-2 text-center"><button type="button" onclick="editTempInbondTable(${index})" class="text-blue-500 hover:text-blue-700 mr-2"><i data-lucide="edit" class="w-4 h-4"></i></button><button type="button" onclick="removeTempInbond(${index})" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" class="w-4 h-4"></i></button></td></tr>`;
    });
    
    const totalQtyEl = document.getElementById('tempInbondTotalQty');
    if(totalQtyEl) totalQtyEl.innerText = tempInbondList.reduce((sum, item) => sum + (parseInt(item.Qty) || 0), 0);
    
    const btnSimpan = document.getElementById('btnSimpanInbondFinal');
    if(btnSimpan) {
        if(tempInbondList.length > 0) {
            btnSimpan.className ="px-6 py-2 rounded-lg font-bold shadow transition-colors bg-[#0a4d3c] text-white hover:opacity-90";
            btnSimpan.disabled = false;
        } else {
            btnSimpan.className ="px-6 py-2 rounded-lg font-bold shadow transition-colors bg-green-300 text-green-800 opacity-60 cursor-not-allowed";
            btnSimpan.disabled = true;
        }
    }
    if(window.lucide) window.lucide.createIcons();
}

window.removeTempInbond = function(index) {
    tempInbondList.splice(index, 1);
    renderTempInbondTable();
}

const btnSimpanInbondFinal = document.getElementById('btnSimpanInbondFinal');
if(btnSimpanInbondFinal) {
    btnSimpanInbondFinal.addEventListener('click', async () => {
        if(tempInbondList.length === 0) return;
        btnSimpanInbondFinal.disabled = true;
        btnSimpanInbondFinal.innerText = 'Menyimpan ' + tempInbondList.length + ' item...';
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'upload_csv', sheet: 'Inbond', payload: tempInbondList })
            });
            const res = await response.json();
            if(res.status === 'success') {
                alert('Sukses menyimpan ' + tempInbondList.length + ' baris ke Inbond!');
                tabCache['tab-inbond'] = false; tabCache['tab-stock-inventory'] = false; tabCache['tab-dashboard'] = false;
                loadDataForTab('tab-inbond'); window.loadDashboardData();
                tempInbondList = []; renderTempInbondTable();
                autoRecalculateInventory('Inbond');
                document.getElementById('btnToggleForm')?.click();
            } else {
                alert('Error: ' + res.message);
            }
        } catch(err) {
            alert('Gagal menyimpan: ' + err.message);
        }
        btnSimpanInbondFinal.disabled = false; btnSimpanInbondFinal.innerText = 'Simpan Inbond ke Database';
    });
}

let tempOutbondList = [];
document.getElementById('btnSubmitOutbondTemp')?.addEventListener('click', (e) => {
    const form = document.getElementById('outbondForm');
    if(!form.checkValidity()) { form.reportValidity(); return; }
    e.preventDefault();
    const qty = parseInt(document.getElementById('out_qty').value) || 0;
    const item = {"Tanggal": new Date().toLocaleString('id-ID'),"Scan": document.getElementById('out_barcode').value,"Barcode": document.getElementById('out_barcode').dataset.realBarcode || document.getElementById('out_barcode').value,"Brand": document.getElementById('out_brand').value,"SKU": document.getElementById('out_sku').value,"Description": document.getElementById('out_desc').value,"Colour": document.getElementById('out_colour').value,"Size": document.getElementById('out_size').value,"Price": document.getElementById('out_price').value,"Qty": qty,"Bin/Box": document.getElementById('out_bin').value,"Inventory Transfer Number": document.getElementById('out_tf').value,"ETP Number": (document.getElementById('out_etp') ? document.getElementById('out_etp').value : ''),"To Location": document.getElementById('out_loc').value,"_id": generateTempId()
    };
    
    const existingIndex = tempOutbondList.findIndex(x => String(x.Barcode) === String(item.Barcode));
    if(existingIndex !== -1) {
        tempOutbondList[existingIndex].Qty = parseInt(tempOutbondList[existingIndex].Qty) + qty;
    } else {
        tempOutbondList.push(item);
    }
    renderTempOutbondTable();
    document.getElementById('outbondForm').reset();
    document.getElementById('out_barcode').style.backgroundColor = '';
    document.getElementById('out_barcode').focus();
});

function renderTempOutbondTable() {
    const tbody = document.getElementById('tempOutbondTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    tempOutbondList.forEach((item, index) => {
        const timeStr = item.Tanggal.split(' ')[1] || item.Tanggal;
        tbody.innerHTML += `<tr><td class="p-2 text-xs">${timeStr}</td><td class="p-2">${item.Brand}</td><td class="p-2">${item.Barcode}</td><td class="p-2">${item.SKU}</td><td class="p-2">${item.Description}</td><td class="p-2">${item.Colour}</td><td class="p-2">${item.Size}</td><td class="p-2">${item.Price}</td><td class="p-2 text-yellow-700 bg-yellow-50 text-center">${item.Qty}</td><td class="p-2">${item['Bin/Box']}</td><td class="p-2">${item['Inventory Transfer Number']}</td><td class="p-2">${item['To Location']}</td><td class="p-2 text-center"><button type="button" onclick="editTempOutbondTable(${index})" class="text-blue-500 hover:text-blue-700 mr-2"><i data-lucide="edit" class="w-4 h-4"></i></button><button type="button" onclick="removeTempOutbond(${index})" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" class="w-4 h-4"></i></button></td></tr>`;
    });
    
    const totalQtyEl = document.getElementById('tempOutbondTotalQty');
    if(totalQtyEl) totalQtyEl.innerText = tempOutbondList.reduce((sum, item) => sum + (parseInt(item.Qty) || 0), 0);
    
    const btnSimpan = document.getElementById('btnSimpanOutbondFinal');
    if(btnSimpan) {
        if(tempOutbondList.length > 0) {
            btnSimpan.className ="px-6 py-2 rounded-lg font-bold shadow transition-colors bg-[#0a4d3c] text-white hover:opacity-90";
            btnSimpan.disabled = false;
        } else {
            btnSimpan.className ="px-6 py-2 rounded-lg font-bold shadow transition-colors bg-green-300 text-green-800 opacity-60 cursor-not-allowed";
            btnSimpan.disabled = true;
        }
    }
    if(window.lucide) window.lucide.createIcons();
}

window.removeTempOutbond = function(index) {
    tempOutbondList.splice(index, 1);
    renderTempOutbondTable();
}

const btnSimpanOutbondFinal = document.getElementById('btnSimpanOutbondFinal');
if(btnSimpanOutbondFinal) {
    btnSimpanOutbondFinal.addEventListener('click', async () => {
        if(tempOutbondList.length === 0) return;
        btnSimpanOutbondFinal.disabled = true;
        btnSimpanOutbondFinal.innerText = 'Menyimpan ' + tempOutbondList.length + ' item...';
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'upload_csv', sheet: 'Outbond', payload: tempOutbondList })
            });
            const res = await response.json();
            if(res.status === 'success') {
                alert('Sukses menyimpan ' + tempOutbondList.length + ' baris ke Outbond!');
                tabCache['tab-outbond'] = false; tabCache['tab-stock-inventory'] = false; tabCache['tab-dashboard'] = false;
                loadDataForTab('tab-outbond'); window.loadDashboardData();
                tempOutbondList = []; renderTempOutbondTable();
                autoRecalculateInventory('Outbond');
                document.getElementById('btnToggleForm')?.click();
            } else {
                alert('Error: ' + res.message);
            }
        } catch(err) {
            alert('Gagal menyimpan: ' + err.message);
        }
        btnSimpanOutbondFinal.disabled = false; btnSimpanOutbondFinal.innerText = 'Simpan Outbond ke Database';
    });
}

let tempReturnList = [];
document.getElementById('btnSubmitReturnTemp')?.addEventListener('click', (e) => {
    const form = document.getElementById('returnForm');
    if(!form.checkValidity()) { form.reportValidity(); return; }
    e.preventDefault();
    const qty = parseInt(document.getElementById('ret_qty').value) || 0;
    const item = {"Tanggal": new Date().toLocaleString('id-ID'),"Scan": document.getElementById('ret_barcode').value,"Barcode": document.getElementById('ret_barcode').dataset.realBarcode || document.getElementById('ret_barcode').value,"Brand": document.getElementById('ret_brand').value,"SKU": document.getElementById('ret_sku').value,"Description": document.getElementById('ret_desc').value,"Colour": document.getElementById('ret_colour').value,"Size": document.getElementById('ret_size').value,"Price": document.getElementById('ret_price').value,"Qty": qty,"Bin/Box": document.getElementById('ret_bin').value,"Inventory Transfer Number": document.getElementById('ret_tf').value,"From Location": document.getElementById('ret_from').value,"To Location": document.getElementById('ret_to').value,"_id": generateTempId()
    };
    
    const existingIndex = tempReturnList.findIndex(x => String(x.Barcode) === String(item.Barcode));
    if(existingIndex !== -1) {
        tempReturnList[existingIndex].Qty = parseInt(tempReturnList[existingIndex].Qty) + qty;
    } else {
        tempReturnList.push(item);
    }
    renderTempReturnTable();
    document.getElementById('returnForm').reset();
    document.getElementById('ret_barcode').style.backgroundColor = '';
    document.getElementById('ret_barcode').focus();
});

function renderTempReturnTable() {
    const tbody = document.getElementById('tempReturnTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    tempReturnList.forEach((item, index) => {
        const timeStr = item.Tanggal.split(' ')[1] || item.Tanggal;
        tbody.innerHTML += `<tr><td class="p-2 text-xs">${timeStr}</td><td class="p-2">${item.Brand}</td><td class="p-2">${item.Barcode}</td><td class="p-2">${item.SKU}</td><td class="p-2">${item.Description}</td><td class="p-2">${item.Colour}</td><td class="p-2">${item.Size}</td><td class="p-2">${item.Price}</td><td class="p-2 text-orange-700 bg-orange-50 text-center">${item.Qty}</td><td class="p-2">${item['Bin/Box']}</td><td class="p-2">${item['Inventory Transfer Number']}</td><td class="p-2">${item['From Location']}</td><td class="p-2">${item['To Location']}</td><td class="p-2 text-center"><button type="button" onclick="editTempReturnTable(${index})" class="text-blue-500 hover:text-blue-700 mr-2"><i data-lucide="edit" class="w-4 h-4"></i></button><button type="button" onclick="removeTempReturn(${index})" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" class="w-4 h-4"></i></button></td></tr>`;
    });
    
    const totalQtyEl = document.getElementById('tempReturnTotalQty');
    if(totalQtyEl) totalQtyEl.innerText = tempReturnList.reduce((sum, item) => sum + (parseInt(item.Qty) || 0), 0);
    
    const btnSimpan = document.getElementById('btnSimpanReturnFinal');
    if(btnSimpan) {
        if(tempReturnList.length > 0) {
            btnSimpan.className ="px-6 py-2 rounded-lg font-bold shadow transition-colors bg-[#0a4d3c] text-white hover:opacity-90";
            btnSimpan.disabled = false;
        } else {
            btnSimpan.className ="px-6 py-2 rounded-lg font-bold shadow transition-colors bg-green-300 text-green-800 opacity-60 cursor-not-allowed";
            btnSimpan.disabled = true;
        }
    }
    if(window.lucide) window.lucide.createIcons();
}

window.removeTempReturn = function(index) {
    tempReturnList.splice(index, 1);
    renderTempReturnTable();
}

const btnSimpanReturnFinal = document.getElementById('btnSimpanReturnFinal');
if(btnSimpanReturnFinal) {
    btnSimpanReturnFinal.addEventListener('click', async () => {
        if(tempReturnList.length === 0) return;
        btnSimpanReturnFinal.disabled = true;
        btnSimpanReturnFinal.innerText = 'Menyimpan ' + tempReturnList.length + ' item...';
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'upload_csv', sheet: 'Return', payload: tempReturnList })
            });
            const res = await response.json();
            if(res.status === 'success') {
                alert('Sukses menyimpan ' + tempReturnList.length + ' baris ke Return!');
                tabCache['tab-return'] = false; tabCache['tab-stock-inventory'] = false; tabCache['tab-dashboard'] = false;
                loadDataForTab('tab-return'); window.loadDashboardData();
                tempReturnList = []; renderTempReturnTable();
                autoRecalculateInventory('Return');
                document.getElementById('btnToggleForm')?.click();
            } else {
                alert('Error: ' + res.message);
            }
        } catch(err) {
            alert('Gagal menyimpan: ' + err.message);
        }
        btnSimpanReturnFinal.disabled = false; btnSimpanReturnFinal.innerText = 'Simpan Return ke Database';
    });
}

let tempPengirimanList = [];
document.getElementById('btnSubmitPengirimanTemp')?.addEventListener('click', (e) => {
    const form = document.getElementById('pengirimanForm');
    if(!form.checkValidity()) { form.reportValidity(); return; }
    e.preventDefault();
    const qty = parseInt(document.getElementById('pg_qty').value) || 0;
    const koli = parseInt(document.getElementById('pg_koli').value) || 0;
    const item = {"Tanggal": document.getElementById('pg_tanggal').value,"IN / OUT": document.getElementById('pg_inout').value,"Nopol": document.getElementById('pg_nopol').value,"Driver": document.getElementById('pg_driver').value,"Brand": document.getElementById('pg_brand').value,"Tujuan": document.getElementById('pg_tujuan').value,"Qty": qty,"Koli": koli,"Seal / Resi": document.getElementById('pg_seal').value,"_id": generateTempId()
    };
    tempPengirimanList.push(item);
    renderTempPengirimanTable();
    
    document.getElementById('pg_brand').value = '';
    document.getElementById('pg_tujuan').value = '';
    document.getElementById('pg_qty').value = '';
    document.getElementById('pg_koli').value = '';
    document.getElementById('pg_seal').value = '';
    document.getElementById('pg_tujuan').focus();
});

function renderTempPengirimanTable() {
    const tbody = document.getElementById('tempPengirimanTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    tempPengirimanList.forEach((item, index) => {
        tbody.innerHTML += `<tr><td class="p-2">${item.Tanggal}</td><td class="p-2">${item['IN / OUT'] || ''}</td><td class="p-2">${item.Nopol}</td><td class="p-2">${item.Driver}</td><td class="p-2">${item.Brand}</td><td class="p-2">${item.Tujuan}</td><td class="p-2">${item.Qty}</td><td class="p-2">${item.Koli}</td><td class="p-2">${item['Seal / Resi']}</td><td class="p-2 text-center"><button type="button" onclick="removeTempPengiriman(${index})" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" class="w-4 h-4"></i></button></td></tr>`;
    });
    if(window.lucide) window.lucide.createIcons();
}

window.removeTempPengiriman = function(index) {
    tempPengirimanList.splice(index, 1);
    renderTempPengirimanTable();
}

const btnSimpanPengirimanFinal = document.getElementById('btnSimpanPengirimanFinal');
if(btnSimpanPengirimanFinal) {
    btnSimpanPengirimanFinal.addEventListener('click', async () => {
        if(tempPengirimanList.length === 0) return;
        btnSimpanPengirimanFinal.disabled = true;
        btnSimpanPengirimanFinal.innerText = 'Menyimpan ' + tempPengirimanList.length + ' item...';
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'upload_csv', sheet: 'Pengiriman', payload: tempPengirimanList })
            });
            const res = await response.json();
            if(res.status === 'success') {
                alert('Sukses menyimpan ' + tempPengirimanList.length + ' baris ke Pengiriman!');
                tabCache['tab-pengiriman'] = false; tabCache['tab-dashboard'] = false;
                loadDataForTab('tab-pengiriman'); window.loadDashboardData();
                tempPengirimanList = []; renderTempPengirimanTable();
                document.getElementById('btnToggleForm')?.click();
            } else {
                alert('Error: ' + res.message);
            }
        } catch(err) {
            alert('Gagal menyimpan: ' + err.message);
        }
        btnSimpanPengirimanFinal.disabled = false; btnSimpanPengirimanFinal.innerText = 'Catat Pengiriman ke Database';
    });
}

function handleDeleteRow(sheetName, dataStr) {
    const data = JSON.parse(decodeURIComponent(dataStr));
    if(!confirm('Yakin ingin menghapus data ini?\nBaris: ' + data._row_index)) return;
    
    const payload = { action: 'delete_row', sheet: sheetName, row_index: data._row_index };
    fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) })
    .then(r => r.json())
    .then(res => {
        if(res.status === 'success') {
            alert('Data berhasil dihapus');
            tabCache['tab-' + sheetName.toLowerCase()] = false;
            loadDataForTab('tab-' + sheetName.toLowerCase());
        } else alert('Gagal: ' + res.message);
    });
}

let currentEditSheet = '';
let currentEditRowIndex = -1;

function handleEditRow(sheetName, dataStr) {
    const data = JSON.parse(decodeURIComponent(dataStr));
    currentEditSheet = sheetName;
    currentEditRowIndex = data._row_index;
    
    const fields = document.getElementById('editForm');
    if(!fields) return;
    fields.innerHTML = '';
    
    for(const key in data) {
        if(key === '_row_index') continue;
        fields.innerHTML += `<div class="mb-3">
            <label class="block text-xs font-medium text-gray-700 mb-1 dark:text-gray-300">${key}</label>
            <input type="text" id="edit_${key}" value="${data[key]}" class="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-[#151521] dark:text-white">
        </div>`;
    }
    document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
    currentEditSheet = ''; currentEditRowIndex = -1;
}

function saveRowEdit() {
    if(currentEditRowIndex === -1) return;
    
    const inputs = document.querySelectorAll('#editForm input');
    const updatedData = {};
    inputs.forEach(inp => {
        const key = inp.id.replace('edit_', '');
        updatedData[key] = inp.value;
    });
    
    const btn = document.getElementById('btnSaveEdit');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = 'Menyimpan...';
    btn.disabled = true;
    
    const payload = { action: 'edit_row', sheet: currentEditSheet, row_index: currentEditRowIndex, payload: updatedData };
    
    fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) })
    .then(r => r.json())
    .then(res => {
        btn.innerHTML = oldHtml;
        btn.disabled = false;
        if(res.status === 'success') {
            alert('Data berhasil diubah');
            closeEditModal();
            tabCache['tab-' + currentEditSheet.toLowerCase()] = false;
            loadDataForTab('tab-' + currentEditSheet.toLowerCase());
        } else alert('Gagal: ' + res.message);
    });
}

document.getElementById('btnClosedEditModal')?.addEventListener('click', closeEditModal);
document.getElementById('btnCancelEdit')?.addEventListener('click', closeEditModal);
document.getElementById('btnSaveEdit')?.addEventListener('click', saveRowEdit);

function renderPengirimanRows(data, tbody) {
    data.forEach(d => {
        if(d.Tanggal) {
            let formattedDate = formatDate(d.Tanggal);
            let sealResi = d['Seal / Resi'] || d['Seal'] || '';
            let inout = d['IN / OUT'] || d['IN/OUT'] || '';
            tbody.innerHTML += `<tr><td class="p-3">${formattedDate}</td><td class="p-3">${inout}</td><td class="p-3">${d.Nopol||''}</td><td class="p-3">${d.Brand||''}</td><td class="p-3">${d.Tujuan||''}</td><td class="p-3">${d.Qty||''}</td><td class="p-3">${d.Koli||''}</td><td class="p-3">${sealResi}</td><td class="p-3">${d.Driver||''}</td>${getActionCell(d, 'Pengiriman')}</tr>`;
        }
    });
}

window.handleDeleteRow = handleDeleteRow;
window.handleEditRow = handleEditRow;
window.saveRowEdit = saveRowEdit;
window.closeEditModal = closeEditModal;


document.getElementById('btnRecalculateStock')?.addEventListener('click', async () => {
    if(!confirm('Apakah Anda yakin ingin menghitung ulang stok? Ini akan mencocokkan data Inbond, Outbond, dan Return.')) return;
    
    const btn = document.getElementById('btnRecalculateStock');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Menghitung...';
    btn.disabled = true;
    
    try {
        const response = await fetch(SCRIPT_URL + '?action=recalculate_stock');
        const res = await response.json();
        if(res.status === 'success') {
            alert('Sukses menghitung ulang stok!');
            tabCache['tab-stock-inventory'] = false;
            loadDataForTab('tab-stock-inventory');
        } else {
            alert('Error: ' + res.message);
        }
    } catch(e) {
        alert('Gagal menghubungi server.');
    }
    
    btn.innerHTML = oldHtml;
    btn.disabled = false;
    if(window.lucide) window.lucide.createIcons();
});

document.getElementById('btnToggleForm')?.addEventListener('click', () => {
    const activeTab = document.querySelector('.tab-content:not(.hidden)');
    if(!activeTab) return;
    const tabName = activeTab.id.replace('tab-', '').replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    if(tabName === 'Master Data') return;
    
    const panel = document.getElementById('panelForm' + tabName.replace(' ', ''));
    if(panel) {
        panel.classList.toggle('hidden');
        const isHidden = panel.classList.contains('hidden');
        const btn = document.getElementById('btnToggleForm');
        if(isHidden) {
            btn.classList.remove('bg-red-600', 'hover:bg-red-700');
            btn.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
            const lbl = btn.querySelector('span');
            if(lbl) lbl.innerText = `SCAN ${tabName.toUpperCase()}`.replace('SCAN PENGIRIMAN', 'INPUT PENGIRIMAN');
        } else {
            btn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
            btn.classList.add('bg-red-600', 'hover:bg-red-700');
            const lbl = btn.querySelector('span');
            if(lbl) lbl.innerText = 'TUTUP FORM';
            
            const prefix = tabName === 'Inbond' ? 'in' : (tabName === 'Outbond' ? 'out' : (tabName === 'Return' ? 'ret' : 'pg'));
            document.getElementById(prefix + '_barcode')?.focus();
            if(prefix === 'pg') document.getElementById('pg_nopol')?.focus();
        }
    }
});

// ==========================================
// RECALCULATE STOCK LISTENER
// ==========================================
document.getElementById('btnSyncInventory')?.addEventListener('click', async () => {
    if(!confirm('Apakah Anda yakin ingin menghitung ulang seluruh stok? Proses ini akan mencocokkan ulang semua data Inbond, Outbond, dan Return.')) return;
    
    const btn = document.getElementById('btnSyncInventory');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> CALCULATING...';
    btn.disabled = true;
    
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'recalculate', sheet: 'Inventory' })
        });
        const text = await response.text();
        
        if(text.startsWith('Error')) throw new Error(text);
        const res = JSON.parse(text);
        
        if(res.status === 'success') {
            logActivity('Recalculate', 'User melakukan sinkronisasi ulang inventory');
            alert('Sukses menghitung ulang stok!');
            tabCache['tab-stock-inventory'] = false;
            tabCache['tab-dashboard'] = false;
            loadDataForTab('tab-stock-inventory');
        } else {
            alert('Error: ' + res.message);
        }
    } catch(e) {
        alert('Gagal menghubungi server: ' + e.message);
    }
    
    btn.innerHTML = oldHtml;
    btn.disabled = false;
    if(window.lucide) window.lucide.createIcons();
});

// ==========================================
// DOWNLOAD MASTER CSV
// ==========================================
document.getElementById('btnDownloadMasterCsv')?.addEventListener('click', () => {
    window.open(SCRIPT_URL + '?action=download_csv&sheet=Master', '_blank');
});


// Mencegah form reload saat tekan Enter
['inbondForm', 'outbondForm', 'returnForm', 'pengirimanForm'].forEach(id => {
    document.getElementById(id)?.addEventListener('submit', (e) => {
        e.preventDefault();
        // Trigger klik pada tombol submit yang sesuai
        const btnId = 'btnSubmit' + id.replace('Form', 'Temp');
        const btn = document.getElementById(btnId.replace('inbondTemp', 'InbondTemp').replace('outbondTemp', 'OutbondTemp').replace('returnTemp', 'ReturnTemp').replace('pengirimanTemp', 'PengirimanTemp'));
        if(btn) btn.click();
    });
});


// Clear search logic
document.getElementById('btnClearSearch')?.addEventListener('click', () => {
    const input = document.getElementById('globalSearch');
    if(input) {
        input.value = '';
        executeGlobalSearch();
        document.getElementById('btnClearSearch').classList.add('hidden');
    }
});

document.getElementById('globalSearch')?.addEventListener('input', (e) => {
    const btn = document.getElementById('btnClearSearch');
    if(btn) {
        if(e.target.value.length > 0) btn.classList.remove('hidden');
        else btn.classList.add('hidden');
    }
});


// Sidebar Toggle
const btnToggleSidebar = document.getElementById('btnToggleSidebar');
const sidebar = document.getElementById('sidebar');
if (btnToggleSidebar && sidebar) {
    btnToggleSidebar.addEventListener('click', () => {
        if (window.innerWidth >= 1024) {
            sidebar.classList.toggle('lg:ml-0');
        }
        sidebar.classList.toggle('-ml-64');
    });
}


window.editTempInbondTable = function(index) {
    const item = tempInbondList[index];
    document.getElementById('in_barcode').value = item.Scan || item.Barcode || '';
    document.getElementById('in_barcode').dataset.realBarcode = item.Barcode || '';
    document.getElementById('in_brand').value = item.Brand || '';
    document.getElementById('in_sku').value = item.SKU || '';
    document.getElementById('in_desc').value = item.Description || '';
    document.getElementById('in_colour').value = item.Colour || '';
    document.getElementById('in_size').value = item.Size || '';
    document.getElementById('in_price').value = item.Price || '';
    document.getElementById('in_qty').value = item.Qty || '';
    document.getElementById('in_bin').value = item['Bin/Box'] || '';
    document.getElementById('in_tf').value = item['Inventory Transfer Number'] || item['Transfer Number'] || '';
    document.getElementById('in_loc').value = item['From Location'] || item['Location'] || '';
    tempInbondList.splice(index, 1);
    renderTempInbondTable();
}

window.editTempOutbondTable = function(index) {
    const item = tempOutbondList[index];
    document.getElementById('out_barcode').value = item.Scan || item.Barcode || '';
    document.getElementById('out_barcode').dataset.realBarcode = item.Barcode || '';
    document.getElementById('out_brand').value = item.Brand || '';
    document.getElementById('out_sku').value = item.SKU || '';
    document.getElementById('out_desc').value = item.Description || '';
    document.getElementById('out_colour').value = item.Colour || '';
    document.getElementById('out_size').value = item.Size || '';
    document.getElementById('out_price').value = item.Price || '';
    document.getElementById('out_qty').value = item.Qty || '';
    document.getElementById('out_bin').value = item['Bin/Box'] || '';
    document.getElementById('out_tf').value = item['Inventory Transfer Number'] || item['Transfer Number'] || '';
    document.getElementById('out_loc').value = item['To Location'] || item['Location'] || '';
    tempOutbondList.splice(index, 1);
    renderTempOutbondTable();
}

window.editTempReturnTable = function(index) {
    const item = tempReturnList[index];
    document.getElementById('ret_barcode').value = item.Scan || item.Barcode || '';
    document.getElementById('ret_barcode').dataset.realBarcode = item.Barcode || '';
    document.getElementById('ret_brand').value = item.Brand || '';
    document.getElementById('ret_sku').value = item.SKU || '';
    document.getElementById('ret_desc').value = item.Description || '';
    document.getElementById('ret_colour').value = item.Colour || '';
    document.getElementById('ret_size').value = item.Size || '';
    document.getElementById('ret_price').value = item.Price || '';
    document.getElementById('ret_qty').value = item.Qty || '';
    document.getElementById('ret_bin').value = item['Bin/Box'] || '';
    document.getElementById('ret_tf').value = item['Inventory Transfer Number'] || item['Transfer Number'] || '';
    document.getElementById('ret_from').value = item['From Location'] || '';
    document.getElementById('ret_to').value = item['To Location'] || '';
    tempReturnList.splice(index, 1);
    renderTempReturnTable();
}


// Auto sync master data in background
setTimeout(() => {
    fetch(SCRIPT_URL + '?sheet=Master')
        .then(res => res.text())
        .then(text => {
            if(!text.startsWith('Error:')) {
                const parsed = JSON.parse(text);
                localStorage.setItem('wms_master_data', JSON.stringify(parsed));
                window.globalMasterData = parsed;
                console.log("Master data synced in background, length:", parsed.length);
            }
        }).catch(e => console.error(e));
}, 1000);


// ==========================================
// CAMERA BARCODE SCANNER LOGIC (MOBILE ONLY)
// ==========================================
let html5QrCode = null;
let currentBarcodeTarget = null;
const cameraContainer = document.getElementById('cameraContainer');
const btnStopCamera = document.getElementById('btnStopCamera');

try {
    document.querySelectorAll('.btnStartCamera').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetBtn = e.currentTarget;
            currentBarcodeTarget = document.getElementById(targetBtn.getAttribute('data-target'));
            
            if(cameraContainer) cameraContainer.classList.remove('hidden');
            try {
                if(!html5QrCode) {
                    html5QrCode = new Html5Qrcode("reader");
                }
                
                html5QrCode.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 150 } },
                    (decodedText, decodedResult) => {
                        if(currentBarcodeTarget) {
                            currentBarcodeTarget.value = decodedText;
                        }
                        try {
                            const AudioContext = window.AudioContext || window.webkitAudioContext;
                            if (AudioContext) {
                                const ctx = new AudioContext();
                                const oscillator = ctx.createOscillator();
                                const gainNode = ctx.createGain();
                                oscillator.type = 'sine';
                                oscillator.frequency.setValueAtTime(800, ctx.currentTime);
                                gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
                                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                                oscillator.connect(gainNode);
                                gainNode.connect(ctx.destination);
                                oscillator.start(ctx.currentTime);
                                oscillator.stop(ctx.currentTime + 0.1);
                            }
                        } catch(e) {}
                        
                        html5QrCode.stop().then(() => {
                            if(cameraContainer) cameraContainer.classList.add('hidden');
                            if(currentBarcodeTarget) {
                                currentBarcodeTarget.dispatchEvent(new Event('change', { bubbles: true }));
                                currentBarcodeTarget.focus();
                            }
                        });
                    },
                    (errorMessage) => {}
                ).catch((err) => {
                    alert("Gagal mengakses kamera. Pastikan Anda memberikan izin kamera! Error: " + err);
                    if(cameraContainer) cameraContainer.classList.add('hidden');
                });
            } catch(e) {
                alert("Modul kamera sedang dimuat atau gagal diunduh. Tunggu sebentar lalu coba lagi. Error: " + e.message);
                if(cameraContainer) cameraContainer.classList.add('hidden');
            }
        });
    });

    if(btnStopCamera) {
        btnStopCamera.addEventListener('click', () => {
            if(html5QrCode) {
                html5QrCode.stop().then(() => {
                    if(cameraContainer) cameraContainer.classList.add('hidden');
                }).catch(err => {
                    if(cameraContainer) cameraContainer.classList.add('hidden');
                });
            } else {
                if(cameraContainer) cameraContainer.classList.add('hidden');
            }
        });
    }
} catch(e) {
    console.error("Camera init error: ", e);
}


// ==========================================
// PACKING LIST CUSTOM BUTTONS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const btnUploadPack = document.getElementById('btnUploadPackingList');
    const fileUploadPack = document.getElementById('fileUploadPackingList');
    const btnDownloadPack = document.getElementById('btnDownloadPackingList');

    if(btnUploadPack && fileUploadPack) {
        btnUploadPack.addEventListener('click', () => {
            fileUploadPack.click();
        });

        fileUploadPack.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(!file) return;
            
            // Validasi ukuran file (Max 5MB)
            if(file.size > 5 * 1024 * 1024) {
                Swal.fire('Error', 'Ukuran file terlalu besar! Maksimal 5MB.', 'error');
                fileUploadPack.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = async function(evt) {
                const text = evt.target.result;
                if(!text || text.trim() === '') return alert("File CSV kosong atau tidak valid.");

                btnUploadPack.innerHTML = '<i data-lucide="loader-2" class="w-6 h-6 mr-3 animate-spin"></i> Uploading (Super Fast Mode)...';
                
                try {
                    const csvText = text.trim();
                    if(!csvText) {
                        Swal.fire('Error', 'CSV Kosong', 'error');
                        return;
                    }
                    const delimiter = (csvText.indexOf(';') !== -1 && csvText.split('\n')[0].indexOf(',') === -1) ? ';' : ',';
                    
                    function parseCSVLine(line, del) {
                        const row = [];
                        let cur = '';
                        let inQuote = false;
                        for(let i=0; i<line.length; i++) {
                            const c = line[i];
                            if(c === '"') {
                                if(inQuote && line[i+1] === '"') { cur += '"'; i++; }
                                else { inQuote = !inQuote; }
                            } else if(c === del && !inQuote) {
                                row.push(cur); cur = '';
                            } else {
                                cur += c;
                            }
                        }
                        row.push(cur);
                        return row;
                    }
                    
                    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
                    if(lines.length < 2) throw new Error("CSV kurang dari 2 baris");
                    
                    const headers = parseCSVLine(lines[0], delimiter).map(h => h.trim());
                    const allData = [];
                    
                    
                    
                    for(let i=1; i<lines.length; i++) {
                        const row = parseCSVLine(lines[i], delimiter);
                        if(row.length < 2) continue;
                        const obj = {};
                        for(let j=0; j<headers.length; j++) {
                            if(headers[j]) obj[headers[j]] = row[j] !== undefined ? row[j].trim() : '';
                        }
                        
                        allData.push(obj);
                    }
                    
                    if(allData.length === 0) throw new Error("Tidak ada baris data valid");
                    
                    const chunkSize = 500;
                    let successCount = 0;
                    
                    for(let i=0; i < allData.length; i += chunkSize) {
                        const chunk = allData.slice(i, i + chunkSize);
                        let pct = Math.round(((i + chunk.length) / allData.length) * 100);
                        btnUploadPack.innerHTML = `<i data-lucide="loader-2" class="w-6 h-6 mr-3 animate-spin"></i> Uploading ${pct}% (${i+chunk.length} dari ${allData.length}) ...`;
                        
                        const res = await fetch(SCRIPT_URL, {
                            method: 'POST',
                            body: JSON.stringify({
                                action: 'upload_csv',
                                sheet: 'Packing List',
                                payload: chunk
                            })
                        });
                        const out = await res.json();
                        if(out.status === 'success') successCount += chunk.length;
                        else throw new Error(out.message || "Gagal upload chunk");
                    }
                    
                    if(successCount > 0) {
                        Swal.fire('Berhasil', `${successCount} baris berhasil diupload!`, 'success');
                        tabCache['tab-packing-list'] = false;
                        if(typeof loadDataForTab === 'function') loadDataForTab('tab-packing-list');
                        
                        // Reset the button
                        btnUploadPack.innerHTML = '<i data-lucide="upload-cloud" class="w-6 h-6 mr-3"></i> Upload Data Packing List';
                        btnUploadPack.disabled = false;
                        if(window.lucide) window.lucide.createIcons();
                    }
                    
                } catch(err) {
                    Swal.fire('Error', err.message || 'Terjadi kesalahan.', 'error');
                    // Reset the button
                    btnUploadPack.innerHTML = '<i data-lucide="upload-cloud" class="w-6 h-6 mr-3"></i> Upload Data Packing List';
                    btnUploadPack.disabled = false;
                    if(window.lucide) window.lucide.createIcons();
                }
                
                btnUploadPack.innerHTML = '<i data-lucide="upload-cloud" class="w-6 h-6 mr-3"></i> Upload Data Packing List';
                if(window.lucide) window.lucide.createIcons();
                fileUploadPack.value = ''; // reset
            };
            reader.readAsText(file);
        });
    }

    if(btnDownloadPack) {
        btnDownloadPack.addEventListener('click', () => {
            Swal.fire({
                title: 'Download & Auto-Assign Bin/Box',
                text: "Masukkan Inventory Transfer Number (ITN) untuk didownload (Kosongkan jika ingin download semua data di tab ini):",
                input: 'text',
                inputPlaceholder: 'Contoh: PL1',
                icon: 'info',
                showCancelButton: true,
                confirmButtonText: 'Ya, Download',
                cancelButtonText: 'Batal'
            }).then((result) => {
                if (result.isConfirmed) {
                    const itn = result.value ? result.value.trim() : '';
                    const ori = btnDownloadPack.innerHTML;
                    btnDownloadPack.innerHTML = '<i data-lucide="loader-2" class="w-6 h-6 mr-3 animate-spin"></i> Memproses...';
                    btnDownloadPack.disabled = true;
                    
                    const downloadUrl = SCRIPT_URL + "?action=download_packing_list&sheet=Packing List" + (itn ? "&itn=" + encodeURIComponent(itn) : "");
                    
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    
                    setTimeout(() => {
                        btnDownloadPack.innerHTML = ori;
                        btnDownloadPack.disabled = false;
                        if(window.lucide) window.lucide.createIcons();
                        Swal.fire('Selesai', 'File sedang didownload.', 'success');
                    }, 3000);
                }
            });
        });
    }
});

// ==========================================
// FITUR VERIFIKASI PACKING LIST
// ==========================================
let verifikasiData = {}; // format: { "barcode1": { expected: 5, scanned: 0, brand: "...", desc: "..." } }

document.getElementById('btnTarikPackingList')?.addEventListener('click', async () => {
    const itn = document.getElementById('verifikasi_itn').value.trim();
    if(!itn) return alert("Masukkan Nomor Packing List / ITN");
    
    const btn = document.getElementById('btnTarikPackingList');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Menarik Data...`;
    if(window.lucide) window.lucide.createIcons();
    btn.disabled = true;
    
    try {
        const resp = await fetch(SCRIPT_URL + "?action=get_packing_list_json&sheet=Packing%20List&itn=" + encodeURIComponent(itn));
        const data = await resp.json();
        
        if(!Array.isArray(data) || data.length === 0) {
            alert("Data Packing List tidak ditemukan untuk ITN tersebut.");
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }
        
        // Aggregate expected quantities by barcode
        verifikasiData = {};
        data.forEach(row => {
            let barcode = "";
            let brand = "";
            let desc = "";
            let qty = 1;
            
            // Find columns flexibly
            for(let key in row) {
                let k = key.toLowerCase();
                if(k === 'barcode' || k === 'scan') {
                    if(!barcode) barcode = String(row[key]).trim();
                }
                if(k === 'brand') brand = String(row[key]);
                if(k === 'description' || k === 'desc') desc = String(row[key]);
                if(k.includes('qty')) qty = parseInt(row[key]) || 1;
            }
            
            if(barcode) {
                if(!verifikasiData[barcode]) {
                    verifikasiData[barcode] = { expected: 0, scanned: 0, brand: brand, desc: desc, barcode: barcode };
                }
                verifikasiData[barcode].expected += qty;
            }
        });
        
        document.getElementById('verifikasiArea').classList.remove('hidden');
        let toLocation = "";
        if(data.length > 0) {
            for(let key in data[0]) {
                if(key.toLowerCase() === 'to location' || key.toLowerCase() === 'to') {
                    toLocation = data[0][key];
                    break;
                }
            }
        }
        document.getElementById('lblVerifikasiTitle').innerHTML = "Progress Verifikasi: <strong>" + itn + "</strong>" + (toLocation ? " &nbsp;<i data-lucide='arrow-right' class='inline-block w-4 h-4 mx-1'></i>&nbsp; <span class='text-indigo-700 bg-indigo-100 px-2 py-1 rounded-md'>" + toLocation + "</span>" : "");
        if(window.lucide) window.lucide.createIcons();
        
        renderVerifikasiTable();
        
        const scanInput = document.getElementById('verifikasi_scan');
        scanInput.value = "";
        scanInput.focus();
        
        document.getElementById('verifikasi_alert').innerText = "Data siap di-scan!";
        document.getElementById('verifikasi_alert').className = "mt-4 text-lg font-bold h-8 text-indigo-600";
        
    } catch(err) {
        alert("Gagal menarik data: " + err.message);
    } finally {
        btn.innerHTML = originalText;
        if(window.lucide) window.lucide.createIcons();
        btn.disabled = false;
    }
});

function renderVerifikasiTable() {
    const tbody = document.getElementById('verifikasiTableBody');
    if(!tbody) return;
    
    let html = "";
    let totalItems = 0;
    let completedItems = 0;
    
    for(let bc in verifikasiData) {
        let item = verifikasiData[bc];
        totalItems++;
        
        let statusHtml = '<span class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-bold">BELUM</span>';
        let rowClass = "";
        
        if(item.scanned === item.expected && item.expected > 0) {
            statusHtml = '<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">LENGKAP</span>';
            rowClass = "bg-green-50";
            completedItems++;
        } else if(item.scanned > 0) {
            statusHtml = '<span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold">PROSES</span>';
            rowClass = "bg-yellow-50";
        }
        
        html += `
            <tr class="${rowClass}">
                <td class="px-6 py-4">${item.brand}</td>
                <td class="px-6 py-4 font-mono font-bold">${item.barcode}</td>
                <td class="px-6 py-4">${item.desc}</td>
                <td class="px-6 py-4 text-center font-bold text-lg">${item.expected}</td>
                <td class="px-6 py-4 text-center font-bold text-lg ${item.scanned > 0 ? 'text-indigo-600' : ''}">${item.scanned}</td>
                <td class="px-6 py-4 text-center">${statusHtml}</td>
            </tr>
        `;
    }
    
    tbody.innerHTML = html;
    
    const progressEl = document.getElementById('lblVerifikasiProgress');
    if(progressEl) {
        progressEl.innerText = `${completedItems} / ${totalItems} SKU Lengkap`;
        if(completedItems === totalItems && totalItems > 0) {
            progressEl.className = "text-sm font-bold px-3 py-1 bg-green-500 text-white rounded-full border border-green-600";
            document.getElementById('verifikasi_alert').innerText = "✅ SEMUA BARANG SUDAH LENGKAP!";
            document.getElementById('verifikasi_alert').className = "mt-4 text-lg font-bold h-8 text-green-600";
            playBeep('success');
        } else {
            progressEl.className = "text-sm font-bold px-3 py-1 bg-white text-gray-700 rounded-full border border-gray-200";
        }
    }
}

function playBeep(type) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        if (type === 'error') {
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(200, audioCtx.currentTime); // Low pitch beep
            gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.3);
        } else if (type === 'success') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // High pitch beep
            gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
            oscillator.start();
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
            oscillator.stop(audioCtx.currentTime + 0.2);
        } else if (type === 'scan') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.1);
        }
    } catch(e) {}
}

function handleVerifikasiScan(inputEl) {
    const bc = inputEl.value.trim();
    inputEl.value = '';
    
    if(!bc) return;
    
    const alertEl = document.getElementById('verifikasi_alert');
    
    if(verifikasiData[bc]) {
        if(verifikasiData[bc].scanned < verifikasiData[bc].expected) {
            verifikasiData[bc].scanned++;
            playBeep('scan');
            alertEl.innerText = `✓ Scan OK: ${bc}`;
            alertEl.className = "mt-4 text-lg font-bold h-8 text-green-600";
            renderVerifikasiTable();
        } else {
            playBeep('error');
            alertEl.innerText = `⚠️ OVER QTY: ${bc} (Sudah Pas!)`;
            alertEl.className = "mt-4 text-lg font-bold h-8 text-red-600";
        }
    } else {
        playBeep('error');
        alertEl.innerText = `❌ TIDAK DITEMUKAN: ${bc}`;
        alertEl.className = "mt-4 text-lg font-bold h-8 text-red-600";
    }
}

const verifScanEl = document.getElementById('verifikasi_scan');
if(verifScanEl) {
    verifScanEl.addEventListener('keydown', function(e) {
        if(e.key === 'Enter') {
            e.preventDefault();
            handleVerifikasiScan(this);
        }
    });
    verifScanEl.addEventListener('change', function(e) {
        handleVerifikasiScan(this);
    });
}


// ==========================================
// FITUR MANAJEMEN USERS (CRUD) KHUSUS ADMIN
// ==========================================
function renderUsersTable() {
    const tbody = document.querySelector('#tab-users tbody');
    if(!tbody || !preloadedUsers) return;
    
    let html = '';
    preloadedUsers.forEach(u => {
        // Skip header if it's there
        if(u['ID User'] === 'ID User') return;
        
        let roleBadge = u['Role'] === 'Admin' 
            ? '<span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">Admin</span>'
            : '<span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">Staff</span>';
            
        html += `
            <tr class="hover:bg-gray-50 dark:hover:bg-[#2b2b40] transition-colors">
                <td class="px-4 py-4 font-mono">${u['ID User'] || ''}</td>
                <td class="px-4 py-4 font-bold">${u['Nama'] || ''}</td>
                <td class="px-4 py-4 text-gray-500">${u['Email'] || ''}</td>
                <td class="px-4 py-4">${roleBadge}</td>
                <td class="px-4 py-4 text-center">
                    <button onclick="editUser('${u['ID User']}')" class="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 p-1.5 rounded mr-1 transition-colors" title="Edit">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteUser('${u['ID User']}')" class="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors" title="Hapus">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
    if(window.lucide) window.lucide.createIcons();
}

document.getElementById('navUsersTab')?.addEventListener('click', () => {
    renderUsersTable();
});

document.getElementById('btnAddUser')?.addEventListener('click', () => {
    document.getElementById('modalUserTitle').innerText = "Tambah User Baru";
    document.getElementById('user_action_type').value = "add";
    document.getElementById('user_id').readOnly = false;
    document.getElementById('user_id').classList.remove('bg-gray-200');
    document.getElementById('formUser').reset();
    document.getElementById('modalUser').classList.remove('hidden');
    document.getElementById('modalUser').classList.add('flex');
});

document.getElementById('btnCloseModalUser')?.addEventListener('click', () => {
    document.getElementById('modalUser').classList.add('hidden');
    document.getElementById('modalUser').classList.remove('flex');
});

document.getElementById('modalUser')?.addEventListener('click', (e) => {
    if(e.target.id === 'modalUser') {
        document.getElementById('modalUser').classList.add('hidden');
        document.getElementById('modalUser').classList.remove('flex');
    }
});

window.editUser = function(id) {
    const u = preloadedUsers.find(x => x['ID User'] == id);
    if(!u) return;
    
    document.getElementById('modalUserTitle').innerText = "Edit User";
    document.getElementById('user_action_type').value = "update_row";
    document.getElementById('user_id').value = u['ID User'] || '';
    document.getElementById('user_id').readOnly = true;
    document.getElementById('user_id').classList.add('bg-gray-200'); // Cannot change ID
    
    document.getElementById('user_nama').value = u['Nama'] || '';
    document.getElementById('user_email').value = u['Email'] || '';
    document.getElementById('user_jabatan').value = u['Jabatan'] || '';
    document.getElementById('user_role').value = u['Role'] || 'Staff';
    document.getElementById('user_password').value = u['Password'] || '';
    
    document.getElementById('modalUser').classList.remove('hidden');
    document.getElementById('modalUser').classList.add('flex');
};

window.deleteUser = async function(id) {
    if(!confirm('Yakin ingin menghapus user ' + id + '?')) return;
    
    try {
        const payloadStr = JSON.stringify({
            action: 'delete_row',
            sheet: 'Users',
            keyColName: 'ID User',
            keyValue: id
        });
        
        const resp = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: payloadStr
        });
        const res = await resp.json();
        if(res.status === 'success') {
            // Remove locally
            preloadedUsers = preloadedUsers.filter(x => x['ID User'] != id);
            renderUsersTable();
            alert('User berhasil dihapus');
        } else {
            alert('Gagal hapus: ' + res.message);
        }
    } catch(err) {
        alert('Gagal: ' + err.message);
    }
};

document.getElementById('formUser')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const actionType = document.getElementById('user_action_type').value;
    const btn = document.getElementById('btnSaveUser');
    const originalText = btn.innerHTML;
    
    const id = document.getElementById('user_id').value.trim();
    const nama = document.getElementById('user_nama').value.trim();
    const email = document.getElementById('user_email').value.trim();
    const jabatan = document.getElementById('user_jabatan').value.trim();
    const role = document.getElementById('user_role').value;
    const pass = document.getElementById('user_password').value;
    
    if(!id || !nama || !pass) return alert("ID, Nama, dan Password wajib diisi!");
    
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Menyimpan...';
    if(window.lucide) window.lucide.createIcons();
    btn.disabled = true;
    
    const rowData = {
        'ID User': id,
        'Nama': nama,
        'Email': email,
        'Jabatan': jabatan,
        'Password': pass,
        'Role': role
    };
    
    const payloadReq = {
        action: actionType,
        sheet: 'Users',
        payload: rowData
    };
    
    if(actionType === 'update_row') {
        payloadReq.keyColName = 'ID User';
        payloadReq.keyValue = id;
    }
    
    try {
        const resp = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payloadReq)
        });
        const res = await resp.json();
        
        if(res.status === 'success') {
            if(actionType === 'add') {
                preloadedUsers.push(rowData);
            } else {
                let idx = preloadedUsers.findIndex(x => x['ID User'] == id);
                if(idx !== -1) preloadedUsers[idx] = rowData;
            }
            renderUsersTable();
            document.getElementById('btnCloseModalUser').click();
            alert('User berhasil disimpan');
        } else {
            alert('Gagal simpan: ' + res.message);
        }
    } catch(err) {
        alert('Gagal: ' + err.message);
    } finally {
        btn.innerHTML = originalText;
        if(window.lucide) window.lucide.createIcons();
        btn.disabled = false;
    }
});


async function populatePackingListDropdown() {
    const dropdown = document.getElementById('headerPackDropdown');
    const verifDropdown = document.getElementById('verifikasi_itn');
    
    if(dropdown) dropdown.innerHTML = '<option value="">Sedang memuat daftar PL...</option>';
    if(verifDropdown) verifDropdown.innerHTML = '<option value="">Sedang memuat daftar PL...</option>';
    
    try {
        const resp = await fetch(SCRIPT_URL + "?action=get_packing_list_options&sheet=Packing%20List");
        const options = await resp.json();
        
        let html = '<option value="">Pilih PL / Store...</option>';
        if(options && options.length > 0) {
            options.forEach(opt => {
                html += `<option value="${opt.itn}">${opt.itn}${opt.store ? ' - ' + opt.store : ''}</option>`;
            });
        }
        if(dropdown) dropdown.innerHTML = html;
        if(verifDropdown) verifDropdown.innerHTML = html;
    } catch(err) {
        console.error("Gagal load dropdown packing list", err);
        if(dropdown) dropdown.innerHTML = '<option value="">Pilih PL / Store...</option>';
        if(verifDropdown) verifDropdown.innerHTML = '<option value="">Pilih PL / Store...</option>';
    }
}

document.getElementById('headerPackDropdown')?.addEventListener('change', function(e) {
    const val = this.value;
    const searchInput = document.getElementById('globalSearch');
    
    if(searchInput) {
        searchInput.value = val;
        if(typeof executeGlobalSearch === 'function') {
            executeGlobalSearch();
        }
    }
    
    const btnMove = document.getElementById('btnMoveToOutbond');
    const userRole = localStorage.getItem('userRole');
    if(btnMove) {
        if(val && userRole === 'Admin') {
            btnMove.classList.remove('hidden');
            btnMove.classList.add('flex');
        } else {
            btnMove.classList.add('hidden');
            btnMove.classList.remove('flex');
        }
    }
});


// Auto-login check on page load
document.addEventListener('DOMContentLoaded', () => {
    if(localStorage.getItem('currentUser')) {
        const loginContainer = document.getElementById('loginContainer');
        const appContainer = document.getElementById('appContainer');
        if(loginContainer) loginContainer.classList.add('hidden');
        if(appContainer) appContainer.classList.remove('hidden');
        
        const role = localStorage.getItem('userRole');
        const masterNav = document.getElementById('navMasterDataTab');
        if(masterNav) {
            if(role === 'Admin') {
                masterNav.classList.remove('hidden');
                const navU = document.getElementById('navUsersTab');
                if(navU) navU.classList.remove('hidden');
            } else {
                masterNav.classList.add('hidden');
            }
        }

        const pName = document.getElementById('profileName');
        const pEmail = document.getElementById('profileEmail');
        if(pName) pName.innerText = localStorage.getItem('currentUser');
        if(pEmail) pEmail.innerText = localStorage.getItem('userEmail') || '';
        
        loadDataForTab('tab-dashboard');
    }
});


document.getElementById('btnMoveToOutbond')?.addEventListener('click', async () => {
    const dropdown = document.getElementById('headerPackDropdown');
    const itn = dropdown ? dropdown.value : '';
    if(!itn) return alert('Silakan pilih PL terlebih dahulu dari dropdown!');
    
    if(!confirm('Yakin ingin memindahkan seluruh data PL ' + itn + ' ke Outbond? Data di Packing List akan dihapus.')) return;
    
    const btn = document.getElementById('btnMoveToOutbond');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> MEMPROSES...';
    btn.disabled = true;
    if(window.lucide) window.lucide.createIcons();
    
    try {
        const payloadStr = JSON.stringify({
            action: 'move_pl_to_outbond',
            sheet: 'Packing List',
            itn: itn
        });
        
        const resp = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: payloadStr
        });
        const res = await resp.json();
        
        if(res.status === 'success') {
            alert('Berhasil: ' + res.message);
            // Refresh tables
            tabCache['tab-packing-list'] = false;
            tabCache['tab-outbond'] = false;
            loadDataForTab('tab-packing-list');
            autoRecalculateInventory('Outbond');
            
            // Trigger global search to clear
            if(dropdown) {
                dropdown.value = '';
                dropdown.dispatchEvent(new Event('change'));
            }
        } else {
            alert('Gagal: ' + res.message);
        }
    } catch(err) {
        alert('Terjadi kesalahan: ' + err.message);
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        if(window.lucide) window.lucide.createIcons();
    }
});
