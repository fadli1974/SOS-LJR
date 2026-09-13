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
            
            cameraContainer.classList.remove('hidden');
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
                            const audio = new Audio('https://www.soundjay.com/buttons/beep-07a.mp3');
                            audio.play();
                        } catch(e) {}
                        
                        html5QrCode.stop().then(() => {
                            cameraContainer.classList.add('hidden');
                            if(currentBarcodeTarget) {
                                currentBarcodeTarget.dispatchEvent(new Event('input', { bubbles: true }));
                                currentBarcodeTarget.focus();
                            }
                        });
                    },
                    (errorMessage) => {}
                ).catch((err) => {
                    alert("Gagal mengakses kamera. Pastikan Anda memberikan izin kamera! Error: " + err);
                    cameraContainer.classList.add('hidden');
                });
            } catch(e) {
                alert("Modul kamera sedang dimuat atau gagal diunduh. Tunggu sebentar lalu coba lagi. Error: " + e.message);
                cameraContainer.classList.add('hidden');
            }
        });
    });

    if(btnStopCamera) {
        btnStopCamera.addEventListener('click', () => {
            if(html5QrCode) {
                html5QrCode.stop().then(() => {
                    cameraContainer.classList.add('hidden');
                }).catch(err => {
                    cameraContainer.classList.add('hidden');
                });
            }
        });
    }
} catch(e) {
    console.error("Camera init error: ", e);
}
