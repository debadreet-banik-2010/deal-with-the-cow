const DEFAULT_CONFIG = {
  enabled: true,
  stealthMode: false,
  scrollThreshold: 20,
  stealthTrapLimit: 25,
  totalNukedTabs: 0,
  totalMinutesSaved: 0,
  placeboUiState: 'active'
};

const FAREWELL_BASE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

function getUninstallUrl(minutesSaved) {
  try {
    const url = new URL(FAREWELL_BASE_URL);
    if (url.hostname.includes('youtube.com')) {
      return url.toString();
    }
    url.searchParams.set('saved', String(minutesSaved || 0));
    return url.toString();
  } catch {
    return FAREWELL_BASE_URL;
  }
}

async function updateUninstallUrl(minutesSaved) {
  try {
    const targetUrl = getUninstallUrl(minutesSaved);
    await chrome.runtime.setUninstallURL(targetUrl);
  } catch {}
}

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULT_CONFIG));
  const newConfig = { ...DEFAULT_CONFIG, ...stored };
  
  if (!newConfig.stealthTrapLimit || newConfig.stealthTrapLimit < 20 || newConfig.stealthTrapLimit > 30) {
    newConfig.stealthTrapLimit = Math.floor(Math.random() * 11) + 20;
  }

  newConfig.scrollThreshold = Math.min(20, Math.max(1, newConfig.scrollThreshold || 20));

  await chrome.storage.local.set(newConfig);
  await updateUninstallUrl(newConfig.totalMinutesSaved);
});

chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  if (details.frameId !== 0) return;
  try {
    await chrome.tabs.sendMessage(details.tabId, {
      action: 'HISTORY_STATE_UPDATED',
      url: details.url
    });
  } catch {}
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.action) {
        case 'GET_CONFIG': {
          const config = await chrome.storage.local.get(Object.keys(DEFAULT_CONFIG));
          sendResponse({ success: true, config: { ...DEFAULT_CONFIG, ...config } });
          break;
        }

        case 'TOGGLE_PLACEBO': {
          const { desiredState } = message;
          
          if (desiredState === 'disabled') {
            const randomThreshold = Math.floor(Math.random() * 11) + 20;
            await chrome.storage.local.set({
              placeboUiState: 'disabled',
              enabled: true,
              stealthMode: true,
              stealthTrapLimit: randomThreshold
            });
            sendResponse({ success: true, placeboUiState: 'disabled', stealthMode: true });
          } else {
            await chrome.storage.local.set({
              placeboUiState: 'active',
              enabled: true,
              stealthMode: false
            });
            sendResponse({ success: true, placeboUiState: 'active', stealthMode: false });
          }
          break;
        }

        case 'NUKE_TAB': {
          const targetTabId = sender.tab ? sender.tab.id : null;
          const { reason = 'SCROLL_LIMIT', delay = 0 } = message;

          const data = await chrome.storage.local.get(['totalNukedTabs', 'totalMinutesSaved']);
          const newNukedTabs = (data.totalNukedTabs || 0) + 1;
          const newMinutesSaved = (data.totalMinutesSaved || 0) + 15;
          const nextStealthLimit = Math.floor(Math.random() * 11) + 20;

          await chrome.storage.local.set({
            totalNukedTabs: newNukedTabs,
            totalMinutesSaved: newMinutesSaved,
            lastNukedAt: Date.now(),
            lastNukedReason: reason,
            stealthTrapLimit: nextStealthLimit
          });

          await updateUninstallUrl(newMinutesSaved);

          if (targetTabId) {
            if (delay > 0) {
              setTimeout(async () => {
                try {
                  await chrome.tabs.remove(targetTabId);
                } catch {}
              }, delay);
            } else {
              try {
                await chrome.tabs.remove(targetTabId);
              } catch {}
            }
          }

          sendResponse({ success: true, minutesSaved: newMinutesSaved, totalNukedTabs: newNukedTabs });
          break;
        }

        case 'RESET_STATS': {
          await chrome.storage.local.set({
            totalNukedTabs: 0,
            totalMinutesSaved: 0,
            stealthMode: false,
            placeboUiState: 'active'
          });
          await updateUninstallUrl(0);
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true;
});
