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
  let awaitingActivation = false;
  let pendingPlay = null;

  const ensureAttributes = () => {
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('autoplay', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
  };

  const ensureSound = () => {
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
  };

  const requestActivation = () => {
    if (awaitingActivation) {
      return;
    }
    awaitingActivation = true;
    activationEvents.forEach(eventName => {
      if (activationHandlers.has(eventName)) {
        return;
      }
      const handler = () => {
        awaitingActivation = false;
        clearActivationHandlers();
        playVideo().catch(() => {
          requestActivation();
        });
      };
      activationHandlers.set(eventName, handler);
      window.addEventListener(eventName, handler, {
        capture: true,
        once: true,
        passive: true,
      });
    });
  };

  const playVideo = () => {
    ensureAttributes();
    ensureSound();

    if (pendingPlay) {
      return pendingPlay;
    }

    const playResult = video.play();
    if (!playResult || typeof playResult.then !== 'function') {
      awaitingActivation = false;
      clearActivationHandlers();
      return Promise.resolve();
    }

    pendingPlay = playResult
      .then(() => {
        pendingPlay = null;
        awaitingActivation = false;
        clearActivationHandlers();
      })
      .catch(error => {
        pendingPlay = null;
        if (error && error.name === 'NotAllowedError') {
          requestActivation();
        }
        throw error;
      });

    return pendingPlay;
  };

  const resumePlayback = () => {
    playVideo().catch(() => {});
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      resumePlayback();
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
  video.addEventListener('playing', ensureSound);

  ensureAttributes();
  ensureSound();
  resumePlayback();
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
