// ========== VARIABEL GLOBAL ==========
const video = document.getElementById('camera');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let currentLat = '-', currentLon = '-', currentAddr = 'Lokasi belum tersedia';
const inputNama = document.getElementById('namaProduk');
const suggestBox = document.getElementById('suggestBox');

// ========== 1. AKSES KAMERA (dengan kontrol ON/OFF) ==========
let cameraStream = null;
let kameraAktif = false;

async function nyalakanKamera() {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        video.srcObject = cameraStream;
        kameraAktif = true;
        
        // Update tombol
        const btn = document.getElementById('btnKamera');
        btn.textContent = '🔴 Kamera OFF';
        btn.className = 'btn';
        
        console.log('✅ Kamera dinyalakan');
    } catch (err) {
        alert('Gagal akses kamera: ' + err.message);
    }
}

function matikanKamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
        video.srcObject = null;
    }
    kameraAktif = false;
    
    // Update tombol
    const btn = document.getElementById('btnKamera');
    btn.textContent = '📷 Kamera ON';
    btn.className = 'btn green';
    
    console.log('🛑 Kamera dimatikan');
}

function toggleKamera() {
    if (kameraAktif) {
        matikanKamera();
    } else {
        nyalakanKamera();
    }
}

// Otomatis nyalakan kamera saat aplikasi pertama dibuka
nyalakanKamera();

// ========== 2. TIMESTAMP REAL-TIME ==========
function updateJam() {
    const now = new Date();
    const tgl = now.toLocaleDateString('id-ID', { 
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' 
    });
    const jam = now.toLocaleTimeString('id-ID');
    document.getElementById('overlayTime').textContent = '⏱️ ' + tgl + ' | ' + jam;
}
setInterval(updateJam, 1000);
updateJam();

// ========== 3. AMBIL LOKASI (GPS) - BigDataCloud ==========
let lastGeocode = 0;
if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        pos => {
            currentLat = pos.coords.latitude.toFixed(6);
            currentLon = pos.coords.longitude.toFixed(6);
            document.getElementById('overlayLoc').textContent = 
                '📍 ' + currentLat + ', ' + currentLon;
            
            // Geocode max 1x per menit
            const now = Date.now();
            if (now - lastGeocode < 60000) return;
            lastGeocode = now;
            
            fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${currentLat}&longitude=${currentLon}&localityLanguage=id`)
                .then(res => res.json())
                .then(data => {
                    const parts = [data.locality, data.city, data.principalSubdivision].filter(x => x);
                    currentAddr = parts.join(', ') || (currentLat + ', ' + currentLon);
                    document.getElementById('overlayLoc').textContent = 
                        '📍 ' + currentAddr.substring(0, 60);
                })
                .catch(() => {
                    currentAddr = currentLat + ', ' + currentLon;
                });
        },
        err => {
            document.getElementById('overlayLoc').textContent = '📍 Lokasi tidak tersedia';
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 }
    );
}

// ========== 4. SIMPAN DATA BS ==========
function simpanBS() {
    // Ambil nilai form
    const nama = document.getElementById('namaProduk').value.trim();
    const jenis = document.getElementById('jenisBarang').value;
    const kategori = document.getElementById('kategori').value;
    const berat = document.getElementById('berat').value;
    const qtyPcs = document.getElementById('qtyPcs').value;
    const qtyPack = document.getElementById('qtyPack').value;
    const catatan = document.getElementById('catatan').value.trim();
    
        // VALIDASI
    if (!kameraAktif) {
        alert('❌ Kamera sedang OFF!\n\nKlik tombol "📷 Kamera ON" dulu di kanan atas.');
        return;
    }
    if (!nama) { alert('❌ Nama produk wajib diisi!'); return; }
    if (!jenis) { alert('❌ Jenis barang wajib dipilih!'); return; }
    if (!kategori) { alert('❌ Kategori BS wajib dipilih!'); return; }
    
    // Validasi sesuai jenis barang
    if (jenis === 'Fresh') {
        if (!berat && !qtyPack) {
            alert('❌ Untuk Fresh, minimal isi Berat (gram) atau Qty PACK!');
            return;
        }
    } else if (jenis === 'Grocery') {
        if (!qtyPcs && !qtyPack) {
            alert('❌ Untuk Grocery, minimal isi Qty PCS atau Qty PACK!');
            return;
        }
    }

    // Ambil gambar dari kamera (pastikan video sudah benar-benar siap)
    if (!video.videoWidth || !video.videoHeight) {
        alert('⏳ Kamera masih menyiapkan gambar, tunggu sebentar lalu coba lagi.');
        return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Tulis overlay timestamp di gambar
    const now = new Date();
    const tglStr = now.toLocaleDateString('id-ID', { 
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' 
    });
    const jamStr = now.toLocaleTimeString('id-ID');
    
    // Background semi transparan di bawah
    const grad = ctx.createLinearGradient(0, canvas.height - 200, 0, canvas.height);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, canvas.height - 200, canvas.width, 200);

        // Teks di gambar
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#e94560';
    ctx.fillText('BS: ' + nama + ' (' + jenis + ')', 20, canvas.height - 150);
    
    ctx.font = '15px Arial';
    ctx.fillStyle = '#4ecca3';
    ctx.fillText('Kategori: ' + kategori, 20, canvas.height - 120);
    
    let qtyText = '';
    if (jenis === 'Fresh') {
        if (berat) qtyText += berat + ' gram';
        if (qtyPack) qtyText += (qtyText ? ' | ' : '') + qtyPack + ' pack';
    } else if (jenis === 'Grocery') {
        if (qtyPcs) qtyText += qtyPcs + ' pcs';
        if (qtyPack) qtyText += (qtyText ? ' | ' : '') + qtyPack + ' pack';
    }
    if (!qtyText) qtyText = 'Qty: -';
    ctx.fillStyle = '#fff';
    ctx.fillText('Qty: ' + qtyText, 20, canvas.height - 95);

    
    ctx.fillStyle = '#fff';
    ctx.fillText(tglStr + ' | ' + jamStr, 20, canvas.height - 65);
    
    ctx.font = '13px Arial';
    ctx.fillStyle = '#4ecca3';
    ctx.fillText('📍 ' + currentAddr.substring(0, 70), 20, canvas.height - 35);

    // Data yang akan disimpan
    const dataBS = {
        id: Date.now(),
        nama: nama,
        jenis: jenis,
        kategori: kategori,
        berat: berat ? Number(berat) : '-',
        qtyPcs: qtyPcs ? Number(qtyPcs) : '-',
        qtyPack: qtyPack ? Number(qtyPack) : '-',
        catatan: catatan || '-',
        tanggal: tglStr,
        jam: jamStr,
        timestamp: now.toISOString(),
        lat: currentLat,
        lon: currentLon,
        alamat: currentAddr,
        gambar: canvas.toDataURL('image/jpeg', 0.7)
    };

    // Simpan ke localStorage
    let history = JSON.parse(localStorage.getItem('bsHistory') || '[]');
    history.push(dataBS);
    localStorage.setItem('bsHistory', JSON.stringify(history));

    // Upload ke Google Drive secara background
    uploadToGoogleDrive(dataBS).then(success => {
        if (success) {
            console.log('📤 Data BS berhasil dikirim ke Google Drive!');
        } else {
            console.warn('⚠️ Gagal upload ke Drive, tapi data tetap tersimpan di lokal.');
        }
    });
    
    
    // Tampilkan preview
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '<img src="' + dataBS.gambar + '" />';
    
    // Reset form
    document.getElementById('namaProduk').value = '';
    document.getElementById('jenisBarang').value = '';
    document.getElementById('kategori').value = '';
    document.getElementById('berat').value = '';
    document.getElementById('qtyPcs').value = '';
    document.getElementById('qtyPack').value = '';
    document.getElementById('catatan').value = '';
    
    aturKolomSesuaiJenis();

    tampilkanHistory();
    alert('✅ Data BS berhasil disimpan!');
}

// ========== 5. TAMPILKAN RIWAYAT ==========
function tampilkanHistory() {
    const history = JSON.parse(localStorage.getItem('bsHistory') || '[]');
    document.getElementById('totalData').textContent = history.length;
    
    const div = document.getElementById('history');
    if (history.length === 0) {
        div.innerHTML = '<p style="text-align:center;color:#666;font-size:13px;">Belum ada data BS</p>';
        return;
    }
    
    div.innerHTML = '';
    // Tampilkan dari yang terbaru
    [...history].reverse().forEach(item => {
        const el = document.createElement('div');
        el.className = 'history-item';
        el.innerHTML = `
            <img src="${item.gambar}">
            <div class="info">
                <b>${item.nama}</b> (${item.jenis} - ${item.kategori})<br>
                Berat: ${item.berat} gr | PCS: ${item.qtyPcs} | Pack: ${item.qtyPack}<br>
                ${item.jam} - ${item.tanggal}<br>
                <span style="color:#4ecca3;font-size:11px;">📍 ${item.alamat.substring(0,50)}${item.alamat.length > 50 ? '...' : ''}</span>
            </div>
            <button class="del" onclick="hapusItem(${item.id})">Hapus</button>
        `;
        div.appendChild(el);
    });
}

// ========== 6. HAPUS ITEM ==========
function hapusItem(id) {
    if (!confirm('Yakin hapus data ini?')) return;
    let history = JSON.parse(localStorage.getItem('bsHistory') || '[]');
    history = history.filter(x => x.id !== id);
    localStorage.setItem('bsHistory', JSON.stringify(history));
    tampilkanHistory();
}

// ========== 7. HAPUS SEMUA ==========
function hapusSemua() {
    if (!confirm('Yakin hapus SEMUA data BS? Tidak bisa dikembalikan!')) return;
    localStorage.removeItem('bsHistory');
    tampilkanHistory();
    document.getElementById('result').innerHTML = '';
}

// ========== 8. EKSPOR PDF (Print) ==========
function exportPDF() {
    const history = JSON.parse(localStorage.getItem('bsHistory') || '[]');
    if (history.length === 0) { alert('Belum ada data untuk diekspor!'); return; }

    const win = window.open('', '_blank');
    win.document.write(`
        <html><head><title>Laporan Broken Stock</title>
        <style>
            body { font-family: Arial; padding: 20px; }
            h1 { color: #c73652; }
            .header { border-bottom: 3px solid #c73652; padding-bottom: 10px; margin-bottom: 20px; }
            .item { 
                page-break-inside: avoid;
                border: 1px solid #ccc; padding: 12px; margin-bottom: 15px;
                border-radius: 8px;
            }
            .item img { max-width: 250px; border-radius: 6px; }
            .item table { margin-top: 8px; font-size: 13px; }
            .item td { padding: 3px 8px 3px 0; }
            .label { color: #666; width: 100px; }
            .footer { text-align: center; font-size: 11px; color: #888; margin-top: 30px; }
        </style></head><body>
        <div class="header">
            <h1>📦 Laporan Broken Stock</h1>
            <p>Tanggal Cetak: ${new Date().toLocaleString('id-ID')}</p>
            <p>Total Data: <b>${history.length}</b></p>
        </div>
    `);

    history.forEach((d, i) => {
        win.document.write(`
            <div class="item">
                <img src="${d.gambar}">
                <table>
                    <tr><td class="label">No</td><td><b>${i+1}</b></td></tr>
                    <tr><td class="label">Produk</td><td><b>${d.nama}</b></td></tr>
                    <tr><td class="label">Jenis</td><td>${d.jenis}</td></tr>
                    <tr><td class="label">Kategori</td><td>${d.kategori}</td></tr>
                    <tr><td class="label">Berat</td><td>${d.berat} gram</td></tr>
                    <tr><td class="label">Qty PCS</td><td>${d.qtyPcs}</td></tr>
                    <tr><td class="label">Qty Pack</td><td>${d.qtyPack}</td></tr>
                    <tr><td class="label">Waktu</td><td>${d.tanggal} - ${d.jam}</td></tr>
                    <tr><td class="label">Lokasi</td><td>${d.alamat}</td></tr>
                    <tr><td class="label">Koordinat</td><td>${d.lat}, ${d.lon}</td></tr>
                    <tr><td class="label">Catatan</td><td>${d.catatan}</td></tr>
                </table>
            </div>
        `);
    });

    win.document.write('<div class="footer">Dibuat dengan BS Timestamp App</div></body></html>');
    win.document.close();
    setTimeout(() => win.print(), 500);
}

// ========== 9. EKSPOR EXCEL (CSV) ==========
function exportExcel() {
    const history = JSON.parse(localStorage.getItem('bsHistory') || '[]');
    if (history.length === 0) { alert('Belum ada data untuk diekspor!'); return; }

    // Header CSV
    let csv = 'No,Nama Produk,Jenis Barang,Kategori,Berat (gram),Qty PCS,Qty Pack,Tanggal,Jam,Latitude,Longitude,Alamat,Catatan\n';
    
    history.forEach((d, i) => {
        csv += `${i+1},`;
        csv += `"${d.nama}",`;
        csv += `"${d.jenis}",`;
        csv += `"${d.kategori}",`;
        csv += `${d.berat},`;
        csv += `${d.qtyPcs},`;
        csv += `${d.qtyPack},`;
        csv += `"${d.tanggal}",`;
        csv += `"${d.jam}",`;
        csv += `${d.lat},`;
        csv += `${d.lon},`;
        csv += `"${d.alamat.replace(/"/g, '""')}",`;
        csv += `"${d.catatan.replace(/"/g, '""')}"\n`;
    });

    // Download
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'laporan_broken_stock_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    alert('✅ File Excel (CSV) berhasil didownload!\n\nTips: Buka pakai Excel, lalu Save As .xlsx biar rapi.');
}

// ========== 10. LOAD HISTORY SAAT PERTAMA BUKA ==========
tampilkanHistory();

// ==========================================
// LOGIKA OTOMATIS BERDASARKAN JENIS BARANG
// ==========================================
function aturKolomSesuaiJenis() {
    const jenis = document.getElementById('jenisBarang').value;
    const inputBerat = document.getElementById('berat');
    const inputPcs = document.getElementById('qtyPcs');
    const inputPack = document.getElementById('qtyPack');
    
    const labelBerat = inputBerat.closest('.form-group').querySelector('label');
    const labelPcs = inputPcs.closest('.form-group').querySelector('label');
    const labelPack = inputPack.closest('.form-group').querySelector('label');
    
    if (jenis === 'Fresh') {
        // Fresh: Berat + Pack aktif, PCS disable
        inputBerat.disabled = false;
        inputPack.disabled = false;
        inputPcs.disabled = true;
        inputPcs.value = ''; // Kosongkan jika sebelumnya terisi
        
        labelBerat.classList.remove('disabled');
        labelPack.classList.remove('disabled');
        labelPcs.classList.add('disabled');
        
        // Update placeholder biar jelas
        inputBerat.placeholder = 'cth: 500';
        inputPack.placeholder = 'cth: 2';
        inputPcs.placeholder = 'Tidak berlaku untuk Fresh';
        
    } else if (jenis === 'Grocery') {
        // Grocery: PCS + Pack aktif, Berat disable
        inputPcs.disabled = false;
        inputPack.disabled = false;
        inputBerat.disabled = true;
        inputBerat.value = ''; // Kosongkan jika sebelumnya terisi
        
        labelPcs.classList.remove('disabled');
        labelPack.classList.remove('disabled');
        labelBerat.classList.add('disabled');
        
        inputBerat.placeholder = 'Tidak berlaku untuk Grocery';
        inputPcs.placeholder = 'cth: 5';
        inputPack.placeholder = 'cth: 1';
        
    } else {
        // Belum dipilih: semua aktif
        inputBerat.disabled = false;
        inputPcs.disabled = false;
        inputPack.disabled = false;
        
        labelBerat.classList.remove('disabled');
        labelPcs.classList.remove('disabled');
        labelPack.classList.remove('disabled');
        
        inputBerat.placeholder = 'cth: 500';
        inputPcs.placeholder = '0';
        inputPack.placeholder = '0';
    }
}

// Pasang listener ke dropdown jenis barang
document.getElementById('jenisBarang').addEventListener('change', aturKolomSesuaiJenis);
aturKolomSesuaiJenis(); // sinkronkan state kolom saat halaman pertama dibuka

// ==========================================
// KONFIGURASI - GANTI DENGAN URL APPS SCRIPT ANDA
// ==========================================
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyAr2BUj_eOv1CNHgXxEYTso34HlGd9Q1yvNiNFJoFCXRMTdhcOsymwa_Eimxj4MJyRBg/exec';

// Fungsi untuk upload ke Google Drive
async function uploadToGoogleDrive(dataBS) {
  try {
    // Siapkan data yang akan dikirim
    const payload = {
      image: dataBS.gambar,
      filename: `BS_${dataBS.nama.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.jpg`,
      nama: dataBS.nama,
      jenis: dataBS.jenis,
      kategori: dataBS.kategori,
      berat: dataBS.berat,
      qtyPcs: dataBS.qtyPcs,
      qtyPack: dataBS.qtyPack,
      tanggal: dataBS.tanggal,
      jam: dataBS.jam,
      lat: dataBS.lat,
      lon: dataBS.lon,
      alamat: dataBS.alamat,
      catatan: dataBS.catatan
    };
    
    // Kirim ke Google Apps Script
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (result.status === 'success') {
      console.log('✅ Upload ke Drive berhasil!', result.fileUrl);
      return true;
    } else {
      console.error('❌ Upload gagal:', result.message);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error upload:', error);
    return false;
  }
}

// ==========================================
// BARCODE SCANNER + MASTER DATA
// ==========================================
let masterProduk = [];
let html5QrCode = null;
let jenisMapping = JSON.parse(localStorage.getItem('jenisMapping') || '{}');

// Buka scanner
function bukaScanner() {
    document.getElementById('scannerBox').style.display = 'block';
    
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
        { facingMode: "environment" },
        { 
            fps: 10,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.7
        },
        onScanSuccess,
        onScanError
    ).catch(err => {
        alert('❌ Gagal buka kamera: ' + err);
        tutupScanner();
    });
}

// Tutup scanner
function tutupScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            html5QrCode = null;
        }).catch(err => console.warn(err));
    }
    document.getElementById('scannerBox').style.display = 'none';
}

// Callback saat barcode terbaca
function onScanSuccess(decodedText) {
    console.log('🔍 Barcode terbaca:', decodedText);
    
    const produk = masterProduk.find(p => p.barcode === decodedText);
    
    if (produk) {
        inputNama.value = produk.descp;
        inputNama.dataset.barcode = produk.barcode;
        inputNama.dataset.plu = produk.plu;
        
        // Auto-learning: kalau pernah di-input
        if (jenisMapping[produk.plu]) {
            document.getElementById('jenisBarang').value = jenisMapping[produk.plu];
            aturKolomSesuaiJenis();
        }
        
        if (navigator.vibrate) navigator.vibrate(150);
        alert('✅ Produk ditemukan:\n' + produk.descp);
    } else {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        alert('⚠️ Barcode tidak terdaftar.\n\nKode: ' + decodedText);
    }
    tutupScanner();
}

// Callback error (diabaikan, karena error sering muncul saat frame belum fokus)
function onScanError(errorMessage) {
    // Silently ignore - ini normal saat kamera belum nemu barcode
}


// ==========================================
// AUTO-OFF KAMERA SAAT TAB TIDAK AKTIF
// ==========================================
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (kameraAktif) {
            console.log('📱 Tab tidak aktif, matikan kamera...');
            matikanKamera();
        }
        if (html5QrCode) {
            console.log('📱 Tab tidak aktif, tutup scanner barcode...');
            tutupScanner();
        }
    }
});

// ==========================================
// AUTOCOMPLETE NAMA PRODUK (dari master JSON)
// ==========================================


// Muat master data (gabung dengan fungsi muatMasterData yang sudah ada)
async function muatMasterDataLengkap() {
    try {
        const response = await fetch('master-produk.json');
        const rawData = await response.json();
        
        // Dukung 2 format:
        // 1) Array polos di level atas -> [ {...}, {...} ]
        // 2) Object berisi beberapa array (chunk) -> { "chunk1": [...], "chunk2": [...] }
        if (Array.isArray(rawData)) {
            masterProduk = rawData;
        } else {
            masterProduk = [];
            for (const key in rawData) {
                if (Array.isArray(rawData[key])) {
                    masterProduk = masterProduk.concat(rawData[key]);
                }
            }
        }
        
        console.log('✅ Master data dimuat:', masterProduk.length, 'produk');
    } catch (err) {
        console.warn('⚠️ Master data belum tersedia:', err);
        masterProduk = [];
        // Kasih tahu user di UI, bukan cuma di console — sering kejadian karena
        // file HTML dibuka langsung dari File Explorer, bukan lewat server/hosting.
        inputNama.placeholder = '⚠️ Master produk gagal dimuat (buka lewat server, bukan file lokal)';
    }
}
muatMasterDataLengkap();

// Setup autocomplete

inputNama.addEventListener('input', function() {
    const query = this.value.trim().toLowerCase();
    if (query.length < 2) { suggestBox.style.display = 'none'; return; }
    
    const matches = masterProduk.filter(p => 
        (p.descp && p.descp.toLowerCase().includes(query)) ||
        (p.barcode && p.barcode.includes(query)) ||
        (p.plu && p.plu.includes(query))
    ).slice(0, 10);
    
    if (matches.length === 0) { suggestBox.style.display = 'none'; return; }
    
    suggestBox.innerHTML = '';
    matches.forEach(p => {
        const div = document.createElement('div');
        div.style.cssText = 'padding:10px; border-bottom:1px solid #1a4d8f; cursor:pointer; font-size:13px;';
        div.innerHTML = `<b>${p.descp}</b><br>
            <span style="font-size:11px; color:#aaa;">PLU: ${p.plu} | ${p.barcode || 'tanpa barcode'}</span>`;
        div.onmouseover = () => div.style.background = '#1a4d8f';
        div.onmouseout = () => div.style.background = '';
        div.onclick = () => pilihProduk(p);
        suggestBox.appendChild(div);
    });
    suggestBox.style.display = 'block';
});

// Hide saat klik di luar
document.addEventListener('click', (e) => {
    if (!inputNama.contains(e.target) && !suggestBox.contains(e.target)) {
        suggestBox.style.display = 'none';
    }
});

// Pilih produk dari dropdown
function pilihProduk(p) {
    inputNama.value = p.descp;
    inputNama.dataset.barcode = p.barcode || '';
    inputNama.dataset.plu = p.plu || '';
    suggestBox.style.display = 'none';
    
    // Auto-isi jenis kalau pernah di-input sebelumnya
    if (jenisMapping[p.plu]) {
        document.getElementById('jenisBarang').value = jenisMapping[p.plu];
        aturKolomSesuaiJenis();
        console.log('🎓 Auto-learning: jenis =', jenisMapping[p.plu]);
    }
}

// Simpan jenis ke memory saat user ubah
document.getElementById('jenisBarang').addEventListener('change', function() {
    const plu = inputNama.dataset.plu;
    if (plu && this.value) {
        jenisMapping[plu] = this.value;
        localStorage.setItem('jenisMapping', JSON.stringify(jenisMapping));
    }
});
