document.addEventListener('DOMContentLoaded', async () => {
  const placeboToggle = document.getElementById('placebo-toggle');
  const toggleTitle = document.getElementById('toggle-state-title');
  const toggleSub = document.getElementById('toggle-state-sub');
  const placeboBanner = document.getElementById('placebo-banner');
  const thresholdSlider = document.getElementById('threshold-slider');
  const thresholdInput = document.getElementById('threshold-input');
  const thresholdValText = document.getElementById('threshold-val-text');
  const statNuked = document.getElementById('stat-nuked');
  const statTime = document.getElementById('stat-time');
  const btnReset = document.getElementById('btn-reset');

  function formatTime(minutes) {
    if (!minutes || minutes < 60) {
      return `${minutes || 0}m`;
    }
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }

  async function loadState() {
    try {
      const data = await chrome.storage.local.get([
        'totalNukedTabs',
        'totalMinutesSaved',
        'placeboUiState',
        'stealthMode',
        'scrollThreshold'
      ]);

      const nuked = data.totalNukedTabs || 0;
      const minutes = data.totalMinutesSaved || 0;
      const threshold = Math.min(20, Math.max(1, data.scrollThreshold || 20));
      const isOff = data.placeboUiState === 'disabled' || data.stealthMode === true;

      statNuked.textContent = String(nuked);
      statTime.textContent = formatTime(minutes);

      thresholdSlider.value = String(threshold);
      thresholdInput.value = String(threshold);
      thresholdValText.textContent = String(threshold);

      if (isOff) {
        placeboToggle.checked = false;
        toggleTitle.textContent = 'Protection Disabled';
        toggleSub.textContent = 'Inactive';
        placeboBanner.classList.remove('hidden');
      } else {
        placeboToggle.checked = true;
        toggleTitle.textContent = 'Protection Active';
        toggleSub.textContent = `${threshold} Scrolls Limit`;
        placeboBanner.classList.add('hidden');
      }
    } catch {}
  }

  async function updateThreshold(val) {
    const clamped = Math.min(20, Math.max(1, parseInt(val, 10) || 20));
    thresholdSlider.value = String(clamped);
    thresholdInput.value = String(clamped);
    thresholdValText.textContent = String(clamped);
    
    await chrome.storage.local.set({ scrollThreshold: clamped });
    if (placeboToggle.checked) {
      toggleSub.textContent = `${clamped} Scrolls Limit`;
    }
  }

  thresholdSlider.addEventListener('input', (e) => {
    updateThreshold(e.target.value);
  });

  thresholdInput.addEventListener('change', (e) => {
    updateThreshold(e.target.value);
  });

  placeboToggle.addEventListener('change', async () => {
    const isChecked = placeboToggle.checked;
    const desiredState = isChecked ? 'active' : 'disabled';

    try {
      await chrome.runtime.sendMessage({
        action: 'TOGGLE_PLACEBO',
        desiredState: desiredState
      });
      await loadState();
    } catch {}
  });

  btnReset.addEventListener('click', async () => {
    if (confirm('Reset tab counters and time saved?')) {
      try {
        await chrome.runtime.sendMessage({ action: 'RESET_STATS' });
        await loadState();
      } catch {}
    }
  });

  await loadState();
});
