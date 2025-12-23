const API = "https://youtube-converter-backend-bbg4.onrender.comapi";

// =====================
// DOM ELEMENTS
// =====================
const videoUrlInput = document.getElementById("videoUrl");
const convertBtn = document.getElementById("convertBtn");
const btnText = document.getElementById("btnText");
const btnLoader = document.getElementById("btnLoader");

const statusBox = document.getElementById("status");
const errorBox = document.getElementById("error");

const videoInfoBox = document.getElementById("videoInfo");
const thumbnailEl = document.getElementById("thumbnail");
const titleEl = document.getElementById("videoTitle");
const channelEl = document.getElementById("videoChannel");
const durationEl = document.getElementById("videoDuration");

const downloadSection = document.getElementById("downloadSection");
const downloadBtn = document.getElementById("downloadBtn");

const conversionAd = document.getElementById("conversionAd");
const preDownloadAd = document.getElementById("preDownloadAd");

// =====================
// HELPERS
// =====================
function show(el) {
  el.classList.remove("hidden");
}
function hide(el) {
  el.classList.add("hidden");
}
function setLoading(state) {
  if (state) {
    btnText.textContent = "Processing...";
    hide(btnText);
    show(btnLoader);
    convertBtn.disabled = true;
  } else {
    show(btnText);
    hide(btnLoader);
    convertBtn.disabled = false;
  }
}
function showStatus(msg) {
  statusBox.textContent = msg;
  show(statusBox);
}
function showError(msg) {
  errorBox.textContent = msg;
  show(errorBox);
}
function resetUI() {
  hide(statusBox);
  hide(errorBox);
  hide(videoInfoBox);
  hide(downloadSection);
  hide(conversionAd);
  hide(preDownloadAd);
}

// =====================
// MAIN ACTION
// =====================
convertBtn.addEventListener("click", async () => {
  const url = videoUrlInput.value.trim();
  const format = document.querySelector('input[name="format"]:checked').value;

  resetUI();

  if (!url) {
    showError("Please paste a valid media URL.");
    return;
  }

  setLoading(true);

  try {
    showStatus("Analyzing media…");

    // ---- FETCH INFO
    const infoRes = await fetch(`${API}/info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });

    const info = await infoRes.json();
    if (!infoRes.ok) throw new Error(info.error || "Failed to analyze media");

    thumbnailEl.src = info.thumbnail;
    titleEl.textContent = info.title;
    channelEl.textContent = info.channel;
    durationEl.textContent = `Duration: ${info.duration}s`;

    show(videoInfoBox);
    show(conversionAd);

    showStatus("Preparing your file…");

    // ---- FETCH FILE
    const fileRes = await fetch(`${API}/download/${format}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });

    if (!fileRes.ok) {
      const err = await fileRes.json();
      throw new Error(err.error || "Processing failed");
    }

    show(preDownloadAd);

    const blob = await fileRes.blob();
    const fileUrl = URL.createObjectURL(blob);

    downloadBtn.href = fileUrl;
    downloadBtn.download = `${info.title}.${format}`;

    show(downloadSection);
    showStatus("✅ Ready to download");

  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
});
