// Production script with improved error handling

const videoUrlInput = document.getElementById('videoUrl');
const clearBtn = document.getElementById('clearBtn');
const convertBtn = document.getElementById('convertBtn');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');
const statusDiv = document.getElementById('status');
const errorDiv = document.getElementById('error');
const videoInfoDiv = document.getElementById('videoInfo');
const downloadSection = document.getElementById('downloadSection');
const conversionAd = document.getElementById('conversionAd');
const preDownloadAd = document.getElementById('preDownloadAd');

// IMPORTANT: Replace with YOUR Render backend URL
const API_URL = 'https://youtube-converter-backend-bbg4.onrender.com/api';

let conversionCount = 0;

// Clear button functionality
videoUrlInput.addEventListener('input', (e) => {
    if (e.target.value.length > 0) {
        clearBtn.classList.add('visible');
    } else {
        clearBtn.classList.remove('visible');
    }
});

clearBtn.addEventListener('click', () => {
    videoUrlInput.value = '';
    clearBtn.classList.remove('visible');
    hideAllMessages();
});

convertBtn.addEventListener('click', handleConvert);

async function handleConvert() {
    const url = videoUrlInput.value.trim();
    const format = document.querySelector('input[name="format"]:checked').value;
    
    if (!url) {
        showError('Please enter a YouTube URL');
        return;
    }
    
    if (!isValidYouTubeUrl(url)) {
        showError('Please enter a valid YouTube URL');
        return;
    }
    
    setLoading(true);
    hideAllMessages();
    
    conversionCount++;
    trackEvent('conversion_started', { format, count: conversionCount });
    
    try {
        await convertVideo(url, format);
    } catch (error) {
        console.error('Conversion error:', error);
        showError(error.message || 'An error occurred during conversion');
        setLoading(false);
        trackEvent('conversion_failed', { error: error.message });
    }
}

function isValidYouTubeUrl(url) {
    // Clean up the URL (remove extra spaces, newlines from mobile paste)
    url = url.trim().replace(/[\r\n]/g, '');
    
    // Extract video ID if it's a YouTube URL
    const videoIdPattern = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(videoIdPattern);
    
    // If we found a video ID, it's valid
    if (match && match[1]) {
        return true;
    }
    
    // Fallback: Check if it looks like a YouTube URL
    return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/.test(url);
}

async function convertVideo(url, format) {
    try {
        // Step 1: Check if backend is awake
        showStatus('Connecting to server...');
        
        let healthCheck;
        try {
            healthCheck = await fetch(`${API_URL}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            throw new Error('Cannot connect to server. Please check your internet connection or try again in a moment.');
        }

        if (!healthCheck.ok) {
            throw new Error('Server is currently unavailable. Please try again in a moment.');
        }
        
        // Step 2: Get video information
        showStatus('Fetching video information...');
        
        const infoResponse = await fetch(`${API_URL}/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        // Check if response is JSON
        const contentType = infoResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error('Server returned non-JSON response:', await infoResponse.text());
            throw new Error('Server error. Backend might be starting up. Please wait 30 seconds and try again.');
        }
        
        if (!infoResponse.ok) {
            const error = await infoResponse.json();
            throw new Error(error.error || 'Failed to fetch video information');
        }
        
        const videoInfo = await infoResponse.json();
        displayVideoInfo(videoInfo);
        
        // Show ad during conversion
        showStatus(`Converting to ${format.toUpperCase()}...`);
        showConversionAd();
        
        // Wait to show ad
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Step 3: Download file
        const downloadResponse = await fetch(`${API_URL}/download/${format}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        if (!downloadResponse.ok) {
            // Try to parse error as JSON, but handle HTML responses too
            let errorMessage = 'Failed to download file';
            try {
                const error = await downloadResponse.json();
                errorMessage = error.error || errorMessage;
            } catch (e) {
                // Response wasn't JSON, use default message
                errorMessage = 'Server error during conversion. Please try again.';
            }
            throw new Error(errorMessage);
        }
        
        const blob = await downloadResponse.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const filename = `${videoInfo.title}.${format}`;
        
        hideConversionAd();
        showStatus('✅ Conversion complete!');
        showPreDownloadAd();
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        hidePreDownloadAd();
        showDownloadButton(downloadUrl, filename);
        
        trackEvent('conversion_success', { format, title: videoInfo.title });
        
    } catch (error) {
        hideConversionAd();
        hidePreDownloadAd();
        throw error;
    }
}

function displayVideoInfo(info) {
    document.getElementById('thumbnail').src = info.thumbnail;
    document.getElementById('videoTitle').textContent = info.title;
    document.getElementById('videoChannel').textContent = `Channel: ${info.channel}`;
    
    const duration = formatDuration(info.duration);
    document.getElementById('videoDuration').textContent = `Duration: ${duration}`;
    
    videoInfoDiv.classList.remove('hidden');
}

function formatDuration(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function showDownloadButton(url, filename) {
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.href = url;
    downloadBtn.download = filename;
    
    downloadBtn.onclick = () => {
        trackEvent('file_downloaded', { filename });
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
        }, 100);
    };
    
    downloadSection.classList.remove('hidden');
    setLoading(false);
}

function showConversionAd() {
    conversionAd.classList.remove('hidden');
    try {
        (adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
        console.log('AdSense not loaded');
    }
}

function hideConversionAd() {
    conversionAd.classList.add('hidden');
}

function showPreDownloadAd() {
    preDownloadAd.classList.remove('hidden');
    try {
        (adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
        console.log('AdSense not loaded');
    }
}

function hidePreDownloadAd() {
    preDownloadAd.classList.add('hidden');
}

function setLoading(isLoading) {
    convertBtn.disabled = isLoading;
    if (isLoading) {
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
    } else {
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
    }
}

function showStatus(message) {
    statusDiv.textContent = message;
    statusDiv.classList.remove('hidden');
    errorDiv.classList.add('hidden');
}

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    statusDiv.classList.add('hidden');
}

function hideAllMessages() {
    statusDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
    videoInfoDiv.classList.add('hidden');
    downloadSection.classList.add('hidden');
    hideConversionAd();
    hidePreDownloadAd();
}

function trackEvent(eventName, params = {}) {
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, params);
    }
    console.log('Event tracked:', eventName, params);
}

videoUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleConvert();
    }
});

// Check backend health on page load
window.addEventListener('load', async () => {
    trackEvent('page_view', { page: 'converter' });
    
    // Check if backend is reachable
    try {
        const response = await fetch(`${API_URL}/health`);
        if (response.ok) {
            console.log('✅ Backend connected successfully');
        } else {
            console.warn('⚠️ Backend responded with error:', response.status);
        }
    } catch (error) {
        console.error('❌ Cannot connect to backend:', error);
        console.log('Backend URL:', API_URL);
        showError('Warning: Backend server is not responding. Please wait a moment and try again.');
    }
});