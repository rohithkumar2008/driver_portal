// Configuration
const defaultConfig = {
    app_title: 'Driver Registration Portal',
    tagline: 'Register. Generate. Drive Safe.',
    company_name: 'DriveSecure',
    background_color: '#0f172a',
    surface_color: '#1e293b',
    text_color: '#f1f5f9',
    primary_color: '#22c55e',
    secondary_color: '#3b82f6'
};

let currentDriverData = null;
let driverPhotoDataUrl = null;
let allDrivers = [];

// Data SDK Handler
const dataHandler = {
    onDataChanged(data) {
        allDrivers = data;
        console.log('Drivers data updated:', data.length, 'records');
    }
};

// Initialize SDKs
async function initApp() {
    // Initialize Element SDK
    if (window.elementSdk) {
        window.elementSdk.init({
            defaultConfig,
            onConfigChange: async (config) => {
                document.getElementById('main-title').textContent = config.app_title || defaultConfig.app_title;
                document.getElementById('main-tagline').textContent = config.tagline || defaultConfig.tagline;
                document.getElementById('footer-company').textContent = 'Powered by ' + (config.company_name || defaultConfig.company_name);

                // Apply colors
                document.documentElement.style.setProperty('--bg-color', config.background_color || defaultConfig.background_color);
                document.documentElement.style.setProperty('--surface-color', config.surface_color || defaultConfig.surface_color);
                document.documentElement.style.setProperty('--text-color', config.text_color || defaultConfig.text_color);
                document.documentElement.style.setProperty('--primary-color', config.primary_color || defaultConfig.primary_color);
                document.documentElement.style.setProperty('--secondary-color', config.secondary_color || defaultConfig.secondary_color);
            },
            mapToCapabilities: (config) => ({
                recolorables: [
                    {
                        get: () => config.background_color || defaultConfig.background_color,
                        set: (value) => { config.background_color = value; window.elementSdk.setConfig({ background_color: value }); }
                    },
                    {
                        get: () => config.surface_color || defaultConfig.surface_color,
                        set: (value) => { config.surface_color = value; window.elementSdk.setConfig({ surface_color: value }); }
                    },
                    {
                        get: () => config.text_color || defaultConfig.text_color,
                        set: (value) => { config.text_color = value; window.elementSdk.setConfig({ text_color: value }); }
                    },
                    {
                        get: () => config.primary_color || defaultConfig.primary_color,
                        set: (value) => { config.primary_color = value; window.elementSdk.setConfig({ primary_color: value }); }
                    },
                    {
                        get: () => config.secondary_color || defaultConfig.secondary_color,
                        set: (value) => { config.secondary_color = value; window.elementSdk.setConfig({ secondary_color: value }); }
                    }
                ],
                borderables: [],
                fontEditable: undefined,
                fontSizeable: undefined
            }),
            mapToEditPanelValues: (config) => new Map([
                ['app_title', config.app_title || defaultConfig.app_title],
                ['tagline', config.tagline || defaultConfig.tagline],
                ['company_name', config.company_name || defaultConfig.company_name]
            ])
        });
    }

    // Initialize Data SDK
    if (window.dataSdk) {
        const result = await window.dataSdk.init(dataHandler);
        if (!result.isOk) {
            console.error('Failed to initialize Data SDK');
        }
    }

    // Setup form handler
    document.getElementById('driver-form').addEventListener('submit', handleFormSubmit);
}

// Navigation
function goToPage(pageNum) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(`page-${pageNum}`).classList.add('active');
    window.scrollTo(0, 0);
}

// Photo Upload Handler
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            driverPhotoDataUrl = e.target.result;
            const preview = document.getElementById('photo-preview');
            const placeholder = document.getElementById('photo-placeholder');
            preview.src = driverPhotoDataUrl;
            preview.classList.remove('hidden');
            placeholder.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
}

// Form Submit Handler
async function handleFormSubmit(event) {
    event.preventDefault();

    const submitBtn = document.getElementById('submit-btn');
    const submitText = document.getElementById('submit-text');

    // Get form values
    const driverName = document.getElementById('driver-name').value.trim();
    const driverAge = parseInt(document.getElementById('driver-age').value);
    const mobileNumber = document.getElementById('mobile-number').value.trim();
    const licenseNumber = document.getElementById('license-number').value.trim();
    const vehicleNumber = document.getElementById('vehicle-number').value.trim();
    const vehicleType = document.getElementById('vehicle-type').value;
    const vehicleModel = document.getElementById('vehicle-model').value.trim();

    // Validate
    if (!driverName || !driverAge || !mobileNumber || !licenseNumber || !vehicleNumber || !vehicleType) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    if (driverAge < 18) {
        showToast('Driver must be at least 18 years old', 'error');
        return;
    }

    // Check data limit
    if (allDrivers.length >= 999) {
        showToast('Maximum limit of 999 drivers reached. Please contact support.', 'error');
        return;
    }

    // Show loading state
    submitBtn.disabled = true;
    submitText.innerHTML = '<span class="spinner"></span>Generating...';

    // Prepare driver data
    currentDriverData = {
        driver_name: driverName,
        driver_age: driverAge,
        mobile_number: mobileNumber,
        license_number: licenseNumber,
        vehicle_number: vehicleNumber,
        vehicle_type: vehicleType,
        vehicle_model: vehicleModel || 'Not specified',
        photo: driverPhotoDataUrl || null,   // ← Save photo as Base64
        created_at: new Date().toISOString()
    };

    try {
        // ✅ STEP 1: Save to MongoDB backend first
        const apiUrl = window.location.protocol === 'file:' ? 'http://localhost:5000/api/drivers' : '/api/drivers';
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentDriverData)
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'Failed to save driver');
        }

        console.log("✅ Saved to Database, acquired ID:", result.data._id);

        // ✅ STEP 2: Generate Verification QR Code
        await generateQRCode(result.data._id);

        // Update summary card
        document.getElementById('summary-name').textContent = driverName;
        document.getElementById('summary-vehicle').textContent = `${vehicleType} - ${vehicleNumber}`;

        // Update summary photo if available
        const summaryPhoto = document.getElementById('summary-photo');
        if (driverPhotoDataUrl) {
            summaryPhoto.innerHTML = `<img src="${driverPhotoDataUrl}" alt="Driver" class="w-full h-full object-cover rounded-full">`;
        }

        // Navigate to success page
        goToPage(3);
        showToast('Secure QR Code generated successfully!', 'success');

    } catch (error) {
        showToast('Failed to generate verification code. Ensure server is running.', 'error');
        console.error('Registration Error:', error);
    } finally {
        submitBtn.disabled = false;
        submitText.textContent = 'Generate QR Code';
    }
}

// Generate QR Code containing Driver Details and Verification URL
async function generateQRCode(driverId) {
    // Construct the data string for the QR code
    const qrData = `OFFICIAL DRIVER ID
-----------------
Driver: ${currentDriverData.driver_name}
License: ${currentDriverData.license_number}
Vehicle: ${currentDriverData.vehicle_type} (${currentDriverData.vehicle_number})
Model: ${currentDriverData.vehicle_model}
-----------------
Verification URL:
${window.location.protocol === 'file:' ? 'http://localhost:5000' : window.location.origin}/verify.html?id=${driverId}`;

    // Clear any existing QR code in the container
    const qrContainerId = document.getElementById('qr-code-container');
    qrContainerId.innerHTML = '';

    try {
        // Create new QR Code directly in the container using the library
        new QRCode(qrContainerId, {
            text: qrData,
            width: 320,
            height: 320,
            colorDark: "#0f172a", // Match background
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.Q // High error correction for density
        });

    } catch (error) {
        console.error('QR generation error:', error);
        throw error;
    }
}

// Download QR Code
function downloadQRCode() {
    // Find the canvas generated by qrcode.js
    const container = document.getElementById('qr-code-container');
    const canvas = container.querySelector('canvas');

    // If library used an image instead of canvas (fallback), find the image
    const img = container.querySelector('img');

    const link = document.createElement('a');
    link.download = `driver-qr-${currentDriverData.vehicle_number.replace(/\s/g, '-')}.png`;

    // If we have a valid canvas, convert it to data url
    if (canvas) {
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('QR Code downloaded successfully!', 'success');
    }
    // If the library fell back to an img tag using data url
    else if (img && img.src) {
        link.href = img.src;
        link.click();
        showToast('QR Code downloaded successfully!', 'success');
    }
    else {
        showToast('Error: QR Code not ready for download. Try again.', 'error');
    }
}

// Register New Driver
function registerNew() {
    // Reset form
    document.getElementById('driver-form').reset();
    document.getElementById('photo-preview').classList.add('hidden');
    document.getElementById('photo-placeholder').classList.remove('hidden');
    driverPhotoDataUrl = null;
    currentDriverData = null;

    // Clear QR Code
    document.getElementById('qr-code-container').innerHTML = '';

    // Go back to form
    goToPage(2);
}

// Toast Notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initialize on load
initApp();
