(() => {
  'use strict';

  let config = {
    enabled: true,
    stealthMode: false,
    scrollThreshold: 20,
    stealthTrapLimit: 25
  };

  let currentScrollCount = 0;
  let stealthScrollCount = 0;
  let stealthTarget = Math.floor(Math.random() * 11) + 20;
  let isDoomscrollActive = false;
  let isNuking = false;
  let lastScrollTimestamp = 0;
  let lastObservedUrl = window.location.href;
  let touchStartY = 0;
  let dvdAnimationId = null;

  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    const result = originalPushState.apply(this, args);
    window.dispatchEvent(new Event('dealwiththecow:locationchange'));
    return result;
  };

  history.replaceState = function (...args) {
    const result = originalReplaceState.apply(this, args);
    window.dispatchEvent(new Event('dealwiththecow:locationchange'));
    return result;
  };

  function isDoomscrollTarget() {
    const path = window.location.pathname.toLowerCase();
    const hostname = window.location.hostname.toLowerCase();

    if (hostname.includes('instagram.com')) {
      if (
        path.startsWith('/direct/') ||
        path.startsWith('/messages/') ||
        path.startsWith('/accounts/') ||
        (path.startsWith('/p/') && !path.includes('/reel'))
      ) {
        return false;
      }

      if (document.querySelector('div[role="dialog"] [placeholder*="Message"], a[href^="/direct/t/"]')) {
        return false;
      }

      return (
        path.startsWith('/reels/') ||
        path.startsWith('/reel/') ||
        path === '/' ||
        path.startsWith('/explore/')
      );
    }

    if (hostname.includes('youtube.com')) {
      if (
        hostname.startsWith('studio.') ||
        path.startsWith('/watch') ||
        path.startsWith('/feed/subscriptions') ||
        path.startsWith('/playlist') ||
        path.startsWith('/results')
      ) {
        return false;
      }

      return path.startsWith('/shorts/');
    }

    if (hostname.includes('tiktok.com')) {
      if (path.startsWith('/messages') || path.startsWith('/live/creators')) {
        return false;
      }

      return (
        path === '/' ||
        path.startsWith('/foryou') ||
        path.startsWith('/explore') ||
        path.includes('/video/')
      );
    }

    return false;
  }

  function isUserTypingOrInChat() {
    const active = document.activeElement;
    if (!active) return false;

    const tagName = active.tagName.toUpperCase();
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
      return true;
    }

    if (active.isContentEditable || active.getAttribute('contenteditable') === 'true') {
      return true;
    }

    return Boolean(
      active.closest('[role="textbox"]') ||
      active.closest('[role="dialog"]') ||
      active.closest('#comments') ||
      active.closest('ytd-comments') ||
      active.closest('ytd-live-chat-frame') ||
      active.closest('form')
    );
  }

  async function refreshConfig() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'GET_CONFIG' });
      if (response?.config) {
        config = { ...config, ...response.config };
      }
    } catch {}
  }

  function handleLocationUpdate() {
    const currentUrl = window.location.href;
    const targetStatus = isDoomscrollTarget();

    if (targetStatus && !isDoomscrollActive) {
      isDoomscrollActive = true;
      attachScrollListeners();
    } else if (!targetStatus && isDoomscrollActive) {
      isDoomscrollActive = false;
      currentScrollCount = 0;
      stealthScrollCount = 0;
      detachScrollListeners();
    }

    if (isDoomscrollActive && currentUrl !== lastObservedUrl) {
      if (
        (currentUrl.includes('/shorts/') && lastObservedUrl.includes('/shorts/')) ||
        (currentUrl.includes('/reel/') && lastObservedUrl.includes('/reel/')) ||
        (currentUrl.includes('/video/') && lastObservedUrl.includes('/video/'))
      ) {
        registerScrollEvent('URL_TRANSITION');
      }
    }

    lastObservedUrl = currentUrl;
  }

  function registerScrollEvent(source = 'SCROLL') {
    if (!isDoomscrollActive || isNuking || isUserTypingOrInChat()) {
      return;
    }

    const now = Date.now();
    if (now - lastScrollTimestamp < 450 && source !== 'URL_TRANSITION') {
      return;
    }
    lastScrollTimestamp = now;

    if (config.stealthMode) {
      stealthScrollCount++;
      if (stealthScrollCount >= stealthTarget) {
        replaceSingleReelWithCow();
        stealthScrollCount = 0;
        stealthTarget = Math.floor(Math.random() * 11) + 20;
      }
      return;
    }

    currentScrollCount++;
    const limit = Math.min(20, Math.max(1, config.scrollThreshold || 20));

    if (currentScrollCount >= limit) {
      triggerPrimitiveCowSequence();
    }
  }

  function getSingleActiveReelContainer() {
    const hostname = window.location.hostname.toLowerCase();

    if (hostname.includes('youtube.com')) {
      const activeRenderer = document.querySelector('ytd-reel-video-renderer[is-active]');
      if (activeRenderer) {
        return activeRenderer.querySelector('#player-container') || 
               activeRenderer.querySelector('#media-container') || 
               activeRenderer.querySelector('video')?.parentElement || 
               activeRenderer;
      }
    }

    if (hostname.includes('tiktok.com')) {
      const activeItem = document.querySelector('div[data-e2e="feed-active-video"]');
      if (activeItem) {
        return activeItem.querySelector('video')?.parentElement || activeItem;
      }
    }

    const videos = Array.from(document.querySelectorAll('video'));
    let bestContainer = null;
    let closestDist = Infinity;
    const centerY = window.innerHeight / 2;

    for (const vid of videos) {
      const rect = vid.getBoundingClientRect();
      if (rect.height > 100 && rect.top < window.innerHeight && rect.bottom > 0) {
        const vidCenter = rect.top + rect.height / 2;
        const dist = Math.abs(vidCenter - centerY);
        if (dist < closestDist) {
          closestDist = dist;
          bestContainer = vid.closest('article') || vid.closest('div[role="presentation"]') || vid.parentElement || vid;
        }
      }
    }

    return bestContainer;
  }

  function replaceSingleReelWithCow() {
    const container = getSingleActiveReelContainer();
    if (!container || container.querySelector('.cow-primitive-replacement')) return;

    const cowImgUrl = chrome.runtime.getURL('assets/images/polish_cow.gif');
    const vid = container.querySelector('video');
    if (vid) {
      try { vid.pause(); } catch {}
    }

    const wrap = document.createElement('div');
    wrap.className = 'cow-primitive-replacement';
    wrap.innerHTML = `<img src="${cowImgUrl}" alt="Polish Cow" />`;
    
    container.style.position = 'relative';
    container.appendChild(wrap);
  }

  function playCowAudio() {
    try {
      const audioUrl = chrome.runtime.getURL('assets/audio/cow.mp3');
      const audio = new Audio(audioUrl);
      audio.volume = 1.0;
      const p = audio.play();
      if (p !== undefined) {
        p.catch(() => playFallbackSynth());
      }
    } catch {
      playFallbackSynth();
    }
  }

  function playFallbackSynth() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.0);
      osc.frequency.exponentialRampToValueAtTime(165, ctx.currentTime + 3.0);

      gain.gain.setValueAtTime(0.7, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 12.0);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 12.0);
    } catch {}
  }

  function startDvdBounce(img) {
    if (dvdAnimationId) return;

    let posX = Math.max(10, (window.innerWidth - 320) / 2);
    let posY = Math.max(10, (window.innerHeight - 260) / 2);

    let speedX = 2.6;
    let speedY = 2.0;

    if (Math.random() > 0.5) speedX = -speedX;
    if (Math.random() > 0.5) speedY = -speedY;

    function step() {
      const rect = img.getBoundingClientRect();
      const currentWidth = rect.width || 320;
      const currentHeight = rect.height || 260;
      const maxW = window.innerWidth;
      const maxH = window.innerHeight;

      posX += speedX;
      posY += speedY;

      if (posX + currentWidth >= maxW) {
        posX = maxW - currentWidth;
        speedX = -Math.abs(speedX);
      } else if (posX <= 0) {
        posX = 0;
        speedX = Math.abs(speedX);
      }

      if (posY + currentHeight >= maxH) {
        posY = maxH - currentHeight;
        speedY = -Math.abs(speedY);
      } else if (posY <= 0) {
        posY = 0;
        speedY = Math.abs(speedY);
      }

      img.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
      dvdAnimationId = requestAnimationFrame(step);
    }

    dvdAnimationId = requestAnimationFrame(step);
  }

  function stopDvdBounce() {
    if (dvdAnimationId) {
      cancelAnimationFrame(dvdAnimationId);
      dvdAnimationId = null;
    }
  }

  function spawnPrimitiveCow() {
    if (document.getElementById('deal-with-the-cow-primitive-img')) return;

    const img = document.createElement('img');
    img.id = 'deal-with-the-cow-primitive-img';
    img.src = chrome.runtime.getURL('assets/images/polish_cow.gif');
    img.alt = 'Polish Cow';

    (document.body || document.documentElement).appendChild(img);

    img.onload = () => startDvdBounce(img);
    setTimeout(() => {
      if (!dvdAnimationId) startDvdBounce(img);
    }, 40);
  }

  function spawnPrimitiveBlackout() {
    stopDvdBounce();
    const cowEl = document.getElementById('deal-with-the-cow-primitive-img');
    if (cowEl) cowEl.remove();

    if (document.getElementById('deal-with-the-cow-primitive-blackout')) return;

    const blackout = document.createElement('div');
    blackout.id = 'deal-with-the-cow-primitive-blackout';

    const bombImg = document.createElement('img');
    bombImg.id = 'deal-with-the-cow-bomb-img';
    bombImg.src = chrome.runtime.getURL('assets/images/explosion.gif');
    bombImg.alt = 'Atomic Bomb';

    blackout.appendChild(bombImg);
    (document.body || document.documentElement).appendChild(blackout);
  }

  function triggerPrimitiveCowSequence() {
    if (isNuking) return;
    isNuking = true;

    playCowAudio();
    spawnPrimitiveCow();

    setTimeout(() => {
      spawnPrimitiveBlackout();

      setTimeout(() => {
        chrome.runtime.sendMessage({
          action: 'NUKE_TAB',
          reason: 'DOOMSCROLL_LIMIT_REACHED',
          delay: 0
        });
      }, 2500);

    }, 12000);
  }

  function onWheel(e) {
    if (e.deltaY > 25) {
      registerScrollEvent('MOUSE_WHEEL');
    }
  }

  function onKeyDown(e) {
    if (['ArrowDown', 'PageDown', 'Space', 'KeyJ'].includes(e.code)) {
      registerScrollEvent(`KEY_${e.code}`);
    }
  }

  function onTouchStart(e) {
    if (e.touches?.length > 0) {
      touchStartY = e.touches[0].clientY;
    }
  }

  function onTouchEnd(e) {
    if (e.changedTouches?.length > 0) {
      const touchEndY = e.changedTouches[0].clientY;
      if (touchStartY - touchEndY > 50) {
        registerScrollEvent('TOUCH_SWIPE');
      }
    }
  }

  function attachScrollListeners() {
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKeyDown, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
  }

  function detachScrollListeners() {
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchend', onTouchEnd);
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'HISTORY_STATE_UPDATED') {
      handleLocationUpdate();
    }
  });

  window.addEventListener('popstate', handleLocationUpdate);
  window.addEventListener('hashchange', handleLocationUpdate);
  window.addEventListener('dealwiththecow:locationchange', handleLocationUpdate);
  window.addEventListener('yt-navigate-finish', handleLocationUpdate);
  window.addEventListener('yt-page-data-updated', handleLocationUpdate);

  setInterval(() => {
    if (window.location.href !== lastObservedUrl) {
      handleLocationUpdate();
    }
  }, 400);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      if (changes.scrollThreshold) {
        config.scrollThreshold = changes.scrollThreshold.newValue;
      }
      if (changes.stealthMode) {
        config.stealthMode = changes.stealthMode.newValue;
      }
    }
  });

  (async () => {
    await refreshConfig();
    handleLocationUpdate();
  })();

})();
