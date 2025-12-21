// Production script with ad integration

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

const API_URL = 'https://youtube-converter-backend-bbg4.onrender.com/api';

// Track conversions for analytics
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
    
    // Track conversion attempt
    conversionCount++;
    trackEvent('conversion_started', { format, count: conversionCount });
    
    try {
        await convertVideo(url, format);
    } catch (error) {
        showError(error.message || 'An error occurred during conversion');
        setLoading(false);
        trackEvent('conversion_failed', { error: error.message });
    }
}

function isValidYouTubeUrl(url) {
    const patterns = [
        /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/,
        /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=.+$/,
        /^(https?:\/\/)?(www\.)?youtu\.be\/.+$/
    ];
    return patterns.some(pattern => pattern.test(url));
}

async function convertVideo(url, format) {
    try {
        showStatus('Fetching video information...');
        
        const infoResponse = await fetch(`${API_URL}/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        if (!infoResponse.ok) {
            const error = await infoResponse.json();
            throw new Error(error.error || 'Failed to fetch video information');
        }
        
        const videoInfo = await infoResponse.json();
        displayVideoInfo(videoInfo);
        
        // Show ad during conversion
        showStatus(`Converting to ${format.toUpperCase()}...`);
        showConversionAd();
        
        // Wait a bit to show the ad (3 seconds minimum)
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const downloadResponse = await fetch(`${API_URL}/download/${format}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        if (!downloadResponse.ok) {
            const error = await downloadResponse.json();
            throw new Error(error.error || 'Failed to download file');
        }
        
        const blob = await downloadResponse.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const filename = `${videoInfo.title}.${format}`;
        
        // Hide conversion ad, show pre-download ad
        hideConversionAd();
        showStatus('✅ Conversion complete!');
        showPreDownloadAd();
        
        // Wait 2 seconds before showing download button
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

// Ad display functions
function showConversionAd() {
    conversionAd.classList.remove('hidden');
    // Refresh AdSense ad
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
    // Refresh AdSense ad
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

// Analytics tracking (Google Analytics)
function trackEvent(eventName, params = {}) {
    // For Google Analytics 4
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, params);
    }
    
    // Console log for debugging
    console.log('Event tracked:', eventName, params);
}

// Enter key support
videoUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleConvert();
    }
});

// Page view tracking
window.addEventListener('load', () => {
    trackEvent('page_view', { page: 'converter' });
});