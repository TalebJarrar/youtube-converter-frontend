const API = 'https://YOUR-BACKEND.onrender.com/api';

async function handleConvert() {
  const url = videoUrlInput.value.trim();
  const format = document.querySelector('input[name="format"]:checked').value;

  if (!url) {
    showError('Please enter a media URL');
    return;
  }

  setLoading(true);
  hideAllMessages();

  try {
    showStatus('Analyzing media…');

    const infoRes = await fetch(`${API}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const info = await infoRes.json();
    if (!infoRes.ok) throw new Error(info.error);

    displayVideoInfo(info);

    showStatus('Preparing file…');

    const fileRes = await fetch(`${API}/download/${format}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!fileRes.ok) {
      const err = await fileRes.json();
      throw new Error(err.error);
    }

    const blob = await fileRes.blob();
    const downloadUrl = URL.createObjectURL(blob);

    showDownloadButton(downloadUrl, `${info.title}.${format}`);
    showStatus('✅ Ready');

  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}
