const sendFileButton = document.querySelector('.buttons.file');
const fileInputArea = document.getElementById('file_input_area');
const fileChooser = document.getElementById('fileChooser');
const sendTextButton = document.querySelector('.buttons.text');
const textInputArea = document.getElementById('text_input_area');
const generateTextBtn = document.getElementById('generateTextQR');
const generateFileBtn = document.getElementById('generateFileQR');
const textInput = document.getElementById('textInput');
const qrContainer = document.getElementById('qr-code-container');

let fileButtonClicked = false;

// --- UI Toggle Logic (Unchanged) ---
sendFileButton.addEventListener('click', function() {
    fileInputArea.classList.remove('hidden');
    fileInputArea.classList.add('visible');
    textInputArea.classList.remove('visible');
    textInputArea.classList.add('hidden');
    fileButtonClicked = true;
});

sendTextButton.addEventListener('click', function() {
    textInputArea.classList.remove('hidden');
    textInputArea.classList.add('visible');
    fileInputArea.classList.remove('visible');
    fileInputArea.classList.add('hidden');
});

// --- Core Logic ---

/**
 * Generates a QR code in the container and returns the Image Data URL as a Promise.
 * This ensures we can generate multiple QRs in sequence without overlap.
 */
function generateQRDataUrl(data) {
    return new Promise((resolve, reject) => {
        // Clear previous QR
        qrContainer.innerHTML = '';

        if(data.length > 2500) {
            reject("Data is too large for a QR code! Please reduce text or choose a smaller file. Maximum file size is 2KB.");
            return;
        }

        // Generate QR in the hidden container
        new QRCode(qrContainer, {
            text: data,
            width: 400,
            height: 400,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.M
        });

        // Wait slightly for the library to render the canvas/img
        setTimeout(() => {
            const qrImg = qrContainer.querySelector('img');
            const canvas = qrContainer.querySelector('canvas');
            
            if (qrImg && qrImg.src) {
                resolve(qrImg.src);
            } else if(canvas) {
                resolve(canvas.toDataURL());
            } else {
                reject("Failed to generate QR code image.");
            }
        }, 100);
    });
}

/**
 * Opens a new tab with the generated HTML content
 */
function openResultWindow(htmlContent) {
    const win = window.open();
    if (win) {
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head><title>Generated QR Code</title></head>
            <body style="display:flex; flex-direction:column; align-items:center; min-height:100vh; margin:0; background:#f0f0f0; padding: 20px;">
                ${htmlContent}
                <div style="margin-top: 40px; text-align: center;">
                    <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">Print / Save PDF</button>
                </div>
            </body>
            </html>
        `);
        win.document.close();
    } else {
        alert('Please allow popups for this website to view the QR codes.');
    }
}

// --- Event Listeners ---

// 1. Text Button: Generates Single QR
generateTextBtn.addEventListener('click', function() {
    const text = textInput.value;
    if (!text) {
        alert("Please enter some text first.");
        return;
    }

    generateQRDataUrl(text).then(imgUrl => {
        const html = `
            <div style="text-align:center;">
                <h2 style="font-family: sans-serif; color: #333;">Text Data</h2>
                <img src="${imgUrl}" style="border: 10px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); max-width: 90%;"/>
            </div>
        `;
        openResultWindow(html);
    }).catch(err => alert(err));
});

// 2. File Button: Generates TWO QRs (Name, then Content)
generateFileBtn.addEventListener('click', function() {
    const file = fileChooser.files[0];
    if (!file) {
        alert("Please select a file first.");
        return;
    }

    const reader = new FileReader();
    
    reader.onload = async function(e) {
        const content = e.target.result;
        const filename = file.name;

        try {
            // 1. Generate Filename QR first
            const nameQrUrl = await generateQRDataUrl(filename);
            
            // 2. Generate Content QR second
            const contentQrUrl = await generateQRDataUrl(content);

            // 3. Construct HTML for both
            const html = `
                <div style="text-align:center; margin-bottom: 50px;">
                    <h2 style="font-family: sans-serif; color: blue;">1. File Name: ${filename}</h2>
                    <img src="${nameQrUrl}" style="border: 10px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); width: 300px; height: 300px;"/>
                    <p style="font-family: sans-serif; color: #666;">Scan this first to get the filename.</p>
                </div>

                <hr style="width: 80%; border: 1px solid #ccc; margin: 20px 0;">

                <div style="text-align:center;">
                    <h2 style="font-family: sans-serif; color: #333;">2. File Content</h2>
                    <img src="${contentQrUrl}" style="border: 10px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); width: 400px; height: 400px;"/>
                    <p style="font-family: sans-serif; color: #666;">Scan this second to get the data.</p>
                </div>
            `;

            openResultWindow(html);

        } catch (error) {
            alert(error);
        }
    };

    reader.onerror = function() {
        alert("Error reading file");
    };

    reader.readAsText(file);
});