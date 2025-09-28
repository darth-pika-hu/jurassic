const AUDIO_CONSENT_STORAGE_KEY = 'theKing:audio-consent';

const defaultActivationEvents = [
  'pointerdown',
  'pointerup',
  'touchstart',
  'touchend',
  'keydown',
  'click',
];

function createAudioGate({ gateContainer, gateId, gateMessage }) {
  if (!gateContainer) {
    return null;
  }

  let gate = gateContainer.querySelector(`#${gateId}`);
  if (!gate) {
    gate = document.createElement('div');
    gate.id = gateId;
    gate.className = 'mac-audio-indicator';
    gate.setAttribute('role', 'status');
    gate.setAttribute('aria-live', 'polite');
    gate.hidden = true;
    gate.textContent = gateMessage;
    gateContainer.appendChild(gate);
  }

  return gate;
}

export function initializeTheKingVideo(video, options = {}) {
  if (!video) {
    return null;
  }

  if (video.dataset.theKingInitialized === 'true') {
    return video._theKingController || null;
  }

  const {
    gateContainer = video.closest('#the-king-window') || video.parentElement,
    gateMessage = 'SOUND LOCKED · TAP TO ENABLE',
    gateId = 'the-king-audio-gate',
    activationEvents = defaultActivationEvents,
    storageKey = AUDIO_CONSENT_STORAGE_KEY,
  } = options;

  const audioGate = createAudioGate({ gateContainer, gateId, gateMessage });
  const activationHandlers = new Map();
  let activationCallback = null;
  let awaitingAudioUnlock = false;
  let pendingPlay = null;
  let audioRetryTimer = null;
  let audioConsent = false;

  try {
    audioConsent = window.localStorage.getItem(storageKey) === 'granted';
  } catch (error) {
    audioConsent = false;
  }

  const persistAudioConsent = granted => {
    audioConsent = granted;
    try {
      if (granted) {
        window.localStorage.setItem(storageKey, 'granted');
      } else {
        window.localStorage.removeItem(storageKey);
      }
    } catch (error) {
      // Ignore storage errors (private mode, etc.).
    }
  };

  const showAudioGate = () => {
    if (audioGate && audioGate.hidden) {
      audioGate.hidden = false;
    }
  };

  const hideAudioGate = () => {
    if (audioGate && !audioGate.hidden) {
      audioGate.hidden = true;
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

  const controller = {
    resume: resumePlayback,
    showGate: showAudioGate,
    hideGate: hideAudioGate,
    get awaitingAudioUnlock() {
      return awaitingAudioUnlock;
    },
  };

  video.dataset.theKingInitialized = 'true';
  video._theKingController = controller;

  return controller;
}
