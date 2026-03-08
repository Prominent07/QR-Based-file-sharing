const startBtn = document.getElementById("startScan");
const stopBtn = document.getElementById("stopScan");
const resultBox = document.getElementById("result");
const statusText = document.getElementById("status-text");
const fileDownloadArea = document.getElementById("file-download-area");
const radioButtons = document.getElementsByName('scanMode');
const fileInstruction = document.getElementById('file-instruction');
const qrReader = document.getElementById("qr-reader");

let qrCodeObj = null; 
let currentMode = 'text'; 
let fileStep = 0; 
let tempFilename = '';
let isScanning = false; 

// Toggle instructions based on mode
radioButtons.forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentMode = e.target.value;
        if(currentMode === 'file') {
            fileInstruction.style.display = 'list-item';
            startBtn.innerText = "Scan File (Part 1)";
        } else {
            fileInstruction.style.display = 'none';
            startBtn.innerText = "Start Scan";
        }
        
        // If user switches modes while scanning, stop the scanner to reset state
        if(isScanning) stopScanner();
    });
});

startBtn.addEventListener("click", () => {
    if (isScanning) return;

    // Reset UI
    resultBox.innerText = "";
    fileDownloadArea.innerHTML = "";
    fileDownloadArea.style.display = 'none';
    qrReader.style.display = "block"; // Show camera container
    
    if (currentMode === 'file') {
        fileStep = 1;
        statusText.innerText = "Step 1: Scan the FILENAME QR code";
        statusText.style.color = "#33c3ff"; // Blueish accent
    } else {
        statusText.innerText = "Scanning for Text...";
        statusText.style.color = "#33c3ff";
    }

    // Toggle buttons
    startBtn.style.display = "none";
    stopBtn.style.display = "flex";
    isScanning = true;

    qrCodeObj = new Html5Qrcode("qr-reader");

    // Dynamically calculate QR box size based on screen width
    const qrboxFunction = function(viewfinderWidth, viewfinderHeight) {
        let minEdgePercentage = 0.7; // 70% of the screen
        let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
        let qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
        return { width: qrboxSize, height: qrboxSize };
    }

    qrCodeObj.start(
        { facingMode: "environment" }, // Prioritize back camera
        {
            fps: 10,
            qrbox: qrboxFunction
        },
        (decodedText) => {
            handleScanSuccess(decodedText);
        },
        (error) => {
            // Background scanning errors are common (e.g., no QR in frame). Ignore them.
        }
    ).catch(err => {
        console.error("Camera access error:", err);
        statusText.innerText = "Camera access failed. Please grant permissions.";
        statusText.style.color = "#ef4444"; // Red
        stopScanner();
    });
});

stopBtn.addEventListener("click", () => {
    statusText.innerText = "Scan Cancelled.";
    statusText.style.color = "var(--muted)";
    stopScanner();
});

function handleScanSuccess(text) {
    if (currentMode === 'text') {
        // --- TEXT MODE ---
        resultBox.innerText = "Scanned: " + text;
        statusText.innerText = "Scan Complete";
        statusText.style.color = "#10b981"; // Green
        triggerHaptic();
        stopScanner();
    } 
    else if (currentMode === 'file') {
        // --- FILE MODE ---
        if (fileStep === 1) {
            // Captured Filename
            tempFilename = text;
            fileStep = 2;
            
            triggerHaptic();
            
            // Replaced blocky alert() with UI update so video stream doesn't freeze
            statusText.innerText = `Step 2: Scan DATA for "${tempFilename}"`;
            statusText.style.color = "#f59e0b"; // Orange/Yellow to indicate change
        } 
        else if (fileStep === 2) {
            // Captured Content
            if (text === tempFilename) {
                // Ignore if the camera is still reading the first QR code
                return; 
            }

            triggerHaptic();
            createFileDownload(tempFilename, text);
            statusText.innerText = "File Reconstructed Successfully!";
            statusText.style.color = "#10b981"; // Green
            stopScanner();
        }
    }
}

function stopScanner() {
    if (qrCodeObj && isScanning) {
        qrCodeObj.stop().then(() => {
            qrCodeObj.clear();
            resetUI();
        }).catch(err => {
            console.error("Failed to stop scanner", err);
            resetUI(); // Force UI reset even if stop fails
        });
    } else {
        resetUI();
    }
}

function resetUI() {
    isScanning = false;
    qrReader.style.display = "none";
    stopBtn.style.display = "none";
    startBtn.style.display = "flex";
    
    if(currentMode === 'file') {
        startBtn.innerText = "Scan File (Part 1)";
    } else {
        startBtn.innerText = "Start Scan";
    }
}

function createFileDownload(filename, content) {
    resultBox.innerText = `File "${filename}" ready for download.`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.innerText = `Download ${filename}`;
    link.className = "download-btn";
    
    fileDownloadArea.innerHTML = "";
    fileDownloadArea.appendChild(link);
    fileDownloadArea.style.display = "block";
}

// Small helper to trigger vibration on mobile devices for better UX
function triggerHaptic() {
    if (navigator.vibrate) {
        navigator.vibrate(200);
    }
}
