const macHdWindow = document.getElementById('mac-hd-window');
const theKingWindow = document.getElementById('the-king-window');
const theKingVideo = document.getElementById('the-king-video');
const theKingBlur = document.getElementById('the-king-blur');
const appleDesktop = document.getElementById('apple-desktop');

const state = {
  maxIndex: 1,
};

function bringToFront(windowEl) {
  state.maxIndex += 1;
  windowEl.style.zIndex = String(state.maxIndex);
}

function setupDraggable(windowEl) {
  const bar = windowEl.querySelector('.window-bar');
  if (!bar) {
    return;
  }

  let pointerId;
  let offsetX = 0;
  let offsetY = 0;

  const handlePointerMove = event => {
    if (pointerId !== event.pointerId) {
      return;
    }

    const left = event.pageX - offsetX;
    const top = event.pageY - offsetY;
    windowEl.style.left = `${left}px`;
    windowEl.style.top = `${top}px`;
  };

  const releasePointer = event => {
    if (pointerId !== event.pointerId) {
      return;
    }
    pointerId = undefined;
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', releasePointer);
    windowEl.classList.remove('dragging');
    try {
      bar.releasePointerCapture(event.pointerId);
    } catch (error) {
      // ignore release errors
    }
  };

  bar.addEventListener('pointerdown', event => {
    if (event.button !== 0) {
      return;
    }
    pointerId = event.pointerId;
    const rect = windowEl.getBoundingClientRect();
    offsetX = event.pageX - (rect.left + window.scrollX);
    offsetY = event.pageY - (rect.top + window.scrollY);
    bringToFront(windowEl);
    windowEl.classList.add('dragging');
    bar.setPointerCapture(pointerId);
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', releasePointer);
    event.preventDefault();
  });

  windowEl.addEventListener('pointerdown', () => {
    bringToFront(windowEl);
  });
  windowEl.addEventListener('focus', () => {
    bringToFront(windowEl);
  });
}

function preloadImages(sources) {
  sources.forEach(source => {
    const img = new Image();
    img.src = `/img/${source}`;
  });
}

function flicker(element, interval, duration) {
  if (!element) {
    return;
  }

  element.style.display = 'block';
  let visible = false;
  const ticker = window.setInterval(() => {
    visible = !visible;
    element.style.opacity = visible ? '1' : '0';
  }, interval);

  window.setTimeout(() => {
    window.clearInterval(ticker);
    element.style.opacity = '0';
    element.style.display = 'none';
  }, duration);
}

preloadImages([
  'theKingBlur.jpg',
  'macHDBlur.jpg',
  'macHDFocus.jpg',
]);

if (macHdWindow) {
  setupDraggable(macHdWindow);
}

if (theKingWindow) {
  setupDraggable(theKingWindow);
}

function initializeTheKingVideo(video) {
  if (!video) {
    return;
  }

  const activationEvents = ['pointerdown', 'touchstart', 'keydown'];
  const activationHandlers = new Map();
  let activationCallback = null;
  let awaitingAudioUnlock = false;
  let pendingPlay = null;
  let audioRetryTimer = null;
  let audioConsent = false;

  const AUDIO_CONSENT_STORAGE_KEY = 'theKing:audio-consent';

  try {
    audioConsent =
      window.localStorage.getItem(AUDIO_CONSENT_STORAGE_KEY) === 'granted';
  } catch (error) {
    audioConsent = false;
  }

  const persistAudioConsent = granted => {
    audioConsent = granted;
    try {
      if (granted) {
        window.localStorage.setItem(AUDIO_CONSENT_STORAGE_KEY, 'granted');
      } else {
        window.localStorage.removeItem(AUDIO_CONSENT_STORAGE_KEY);
      }
    } catch (error) {
      // Ignore storage errors (private mode, etc.).
    }
  };

  const audioGate = (() => {
    if (!theKingWindow) {
      return null;
    }
    const gate = document.createElement('div');
    gate.id = 'the-king-audio-gate';
    gate.setAttribute('role', 'status');
    gate.setAttribute('aria-live', 'polite');
    gate.hidden = true;

    const srMessage = document.createElement('span');
    srMessage.className = 'sr-only';
    srMessage.textContent = 'Audio locked. Tap, click, or press any key to enable sound.';
    gate.appendChild(srMessage);

    const bezel = document.createElement('div');
    bezel.className = 'audio-gate-shell';
    bezel.setAttribute('aria-hidden', 'true');
    bezel.innerHTML = `
      <div class="audio-gate-header">
        <span class="audio-gate-light"></span>
        <span class="audio-gate-title">Sound Locked</span>
      </div>
      <div class="audio-gate-body">
        <span class="audio-gate-line">Awaiting user input</span>
        <span class="audio-gate-cursor"></span>
      </div>
      <div class="audio-gate-instructions">Tap, click, or press any key to enable sound</div>
    `;
    gate.appendChild(bezel);

    theKingWindow.appendChild(gate);
    return gate;
  })();

  const AudioContextCtor =
    window.AudioContext || window.webkitAudioContext || null;
  let audioContext = null;
  let audioContextAttempted = false;

  const ensureAudioContext = () => {
    if (audioContextAttempted) {
      return audioContext;
    }
    audioContextAttempted = true;
    if (!AudioContextCtor) {
      return null;
    }
    try {
      audioContext = new AudioContextCtor();
    } catch (error) {
      audioContext = null;
    }
    return audioContext;
  };

  const warmupAudioContext = async () => {
    const context = ensureAudioContext();
    if (!context) {
      return;
    }
    if (context.state === 'closed') {
      return;
    }
    if (context.state === 'suspended') {
      try {
        await context.resume();
      } catch (error) {
        return;
      }
    }

    if (context.state === 'running' && typeof context.createBuffer === 'function') {
      try {
        const buffer = context.createBuffer(1, 1, context.sampleRate);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);
        source.stop(0);
        source.disconnect();
      } catch (error) {
        // Ignore warmup errors; some platforms block audio graph changes.
      }
    }
  };

  const showAudioGate = () => {
    if (audioGate) {
      audioGate.hidden = false;
      audioGate.removeAttribute('hidden');
    }
  };

  const hideAudioGate = () => {
    if (audioGate) {
      audioGate.hidden = true;
      if (!audioGate.hasAttribute('hidden')) {
        audioGate.setAttribute('hidden', '');
      }
    }
  };

  const ensureAttributes = () => {
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('autoplay', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
  };

  const configureMuted = () => {
    video.defaultMuted = true;
    video.muted = true;
    if (!video.hasAttribute('muted')) {
      video.setAttribute('muted', '');
    }
  };

  const configureUnmuted = () => {
    video.defaultMuted = false;
    video.muted = false;
    if (video.hasAttribute('muted')) {
      video.removeAttribute('muted');
    }
    if (typeof video.volume === 'number' && video.volume < 1) {
      try {
        video.volume = 1;
      } catch (error) {
        // Ignore platforms that disallow programmatic volume changes.
      }
    }
  };

  const clearActivationHandlers = () => {
    activationHandlers.forEach((handler, eventName) => {
      window.removeEventListener(eventName, handler, { capture: true });
    });
    activationHandlers.clear();
    activationCallback = null;
  };

  const clearAudioRetryTimer = () => {
    if (audioRetryTimer !== null) {
      window.clearTimeout(audioRetryTimer);
      audioRetryTimer = null;
    }
  };

  const requestActivation = callback => {
    if (activationCallback === callback) {
      return;
    }
    clearActivationHandlers();
    activationCallback = callback;
    activationEvents.forEach(eventName => {
      const handler = () => {
        clearActivationHandlers();
        callback();
      };
      activationHandlers.set(eventName, handler);
      window.addEventListener(eventName, handler, {
        capture: true,
        once: true,
        passive: true,
      });
    });
  };

  const handleAudioUnlocked = () => {
    awaitingAudioUnlock = false;
    hideAudioGate();
    clearAudioRetryTimer();
    clearActivationHandlers();
    persistAudioConsent(true);
  };

  const activationPlay = () => {
    playVideo({
      mutedFallbackAllowed: false,
      startMuted: false,
    }).catch(error => {
      if (error && error.name !== 'NotAllowedError') {
        scheduleAudioRecovery();
      }
    });
  };

  const beginAwaitingAudioUnlock = () => {
    if (!awaitingAudioUnlock) {
      awaitingAudioUnlock = true;
      scheduleAudioRecovery();
    }
    showAudioGate();
    requestActivation(activationPlay);
    warmupAudioContext();
  };

  const scheduleAudioRecovery = () => {
    if (!awaitingAudioUnlock) {
      return;
    }
    if (audioRetryTimer !== null) {
      return;
    }
    audioRetryTimer = window.setTimeout(() => {
      audioRetryTimer = null;
      if (!awaitingAudioUnlock) {
        return;
      }
      playVideo({
        mutedFallbackAllowed: false,
        startMuted: false,
      }).catch(error => {
        if (error && error.name !== 'NotAllowedError') {
          scheduleAudioRecovery();
        }
      });
    }, 250);
  };

  const playVideoInternal = async ({
    mutedFallbackAllowed,
    startMuted,
  }) => {
    ensureAttributes();

    if (startMuted) {
      configureMuted();
    } else {
      configureUnmuted();
    }

    try {
      await warmupAudioContext();
      await video.play();
    } catch (error) {
      if (error && error.name === 'NotAllowedError') {
        if (!startMuted && mutedFallbackAllowed) {
          await playVideoInternal({
            mutedFallbackAllowed: false,
            startMuted: true,
          });
          return;
        }

        configureMuted();
        beginAwaitingAudioUnlock();
      }
      throw error;
    }

    if (video.muted) {
      beginAwaitingAudioUnlock();
    } else {
      handleAudioUnlocked();
    }
  };

  const playVideo = (options = {}) => {
    if (pendingPlay) {
      return pendingPlay;
    }

    const mergedOptions = {
      mutedFallbackAllowed: true,
      startMuted: awaitingAudioUnlock || !audioConsent,
      ...options,
    };

    pendingPlay = playVideoInternal(mergedOptions)
      .catch(error => {
        throw error;
      })
      .finally(() => {
        pendingPlay = null;
      });

    return pendingPlay;
  };

  const resumePlayback = () => {
    playVideo().catch(() => {});
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      resumePlayback();
      if (awaitingAudioUnlock) {
        scheduleAudioRecovery();
      }
    }
  };

  const handlePause = () => {
    if (video.ended) {
      return;
    }
    resumePlayback();
  };

  const handleEnded = () => {
    if (!video.loop) {
      video.currentTime = 0;
    }
    resumePlayback();
  };

  const handleStall = () => {
    if (video.paused || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      resumePlayback();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  video.addEventListener('pause', handlePause);
  video.addEventListener('ended', handleEnded);
  video.addEventListener('stalled', handleStall);
  video.addEventListener('suspend', handleStall);
  video.addEventListener('waiting', handleStall);
  video.addEventListener('emptied', handleStall);
  video.addEventListener('playing', () => {
    if (awaitingAudioUnlock) {
      scheduleAudioRecovery();
    }
  });
  video.addEventListener('timeupdate', () => {
    if (awaitingAudioUnlock) {
      scheduleAudioRecovery();
    }
  });
  video.addEventListener('loadeddata', () => {
    if (awaitingAudioUnlock) {
      scheduleAudioRecovery();
    }
  });
  video.addEventListener('volumechange', () => {
    if (!video.muted) {
      handleAudioUnlocked();
    } else if (awaitingAudioUnlock) {
      showAudioGate();
    }
  });

  ensureAttributes();
  resumePlayback();

  if (!audioConsent) {
    window.requestAnimationFrame(() => {
      if (video.muted || video.paused || awaitingAudioUnlock) {
        beginAwaitingAudioUnlock();
      }
    });
  }
}

if (theKingVideo) {
  initializeTheKingVideo(theKingVideo);
}

window.setTimeout(() => {
  if (macHdWindow) {
    macHdWindow.style.backgroundImage = 'url(/img/macHDBlur.jpg)';
  }
  if (theKingWindow) {
    theKingWindow.style.display = 'block';
    bringToFront(theKingWindow);
  }
}, 2500);

if (appleDesktop && theKingBlur) {
  appleDesktop.addEventListener('click', event => {
    if (event.target.closest('#the-king-window')) {
      return;
    }
    flicker(theKingBlur, 50, 450);
  });
}
