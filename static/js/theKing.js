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

function attemptVideoPlayback(video) {
  if (!video) {
    return;
  }

  let recovered = false;
  let restoreTimer;
  const gestureHandlers = new Map();

  const clearGestureHandlers = () => {
    gestureHandlers.forEach((handler, eventName) => {
      window.removeEventListener(eventName, handler);
    });
    gestureHandlers.clear();
  };

  const markRecovered = () => {
    if (recovered) {
      return;
    }
    recovered = true;
    if (restoreTimer) {
      window.clearInterval(restoreTimer);
      restoreTimer = undefined;
    }
    clearGestureHandlers();
    video.muted = false;
    video.volume = 1;
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    video.removeEventListener('timeupdate', handleProgressAttempt);
    video.removeEventListener('playing', handlePlaying);
  };

  const tryPlay = () => {
    const result = video.play();
    if (!result || typeof result.then !== 'function') {
      return Promise.resolve();
    }
    return result;
  };

  const playUnmuted = () => {
    video.muted = false;
    video.volume = Math.max(video.volume, 1);
    return tryPlay().then(() => {
      if (!video.muted) {
        markRecovered();
      }
    });
  };

  const playMuted = () => {
    video.muted = true;
    return tryPlay();
  };

  const scheduleAutoRestore = () => {
    if (restoreTimer || recovered) {
      return;
    }
    restoreTimer = window.setInterval(() => {
      if (video.paused) {
        return;
      }
      playUnmuted().catch(() => {
        video.muted = true;
      });
    }, 1500);
  };

  const onUserGesture = () => {
    if (recovered) {
      return;
    }
    clearGestureHandlers();
    playUnmuted().catch(() => {
      video.muted = true;
      scheduleAutoRestore();
      bindGestureRecovery();
    });
  };

  function bindGestureRecovery() {
    if (recovered) {
      return;
    }
    ['pointerdown', 'keydown'].forEach(eventName => {
      if (gestureHandlers.has(eventName)) {
        return;
      }
      const handler = () => {
        onUserGesture();
      };
      gestureHandlers.set(eventName, handler);
      window.addEventListener(eventName, handler);
    });
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && !recovered) {
      playUnmuted().catch(() => {
        video.muted = true;
      });
    }
  }

  function handleProgressAttempt() {
    if (!recovered && video.currentTime > 0.25) {
      playUnmuted().catch(() => {
        video.muted = true;
      });
    }
  }

  function handlePlaying() {
    if (!video.muted) {
      markRecovered();
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);
  video.addEventListener('timeupdate', handleProgressAttempt);
  video.addEventListener('playing', handlePlaying);

  playUnmuted()
    .catch(() => {
      playMuted()
        .then(() => {
          scheduleAutoRestore();
          bindGestureRecovery();
        })
        .catch(() => {
          scheduleAutoRestore();
          bindGestureRecovery();
        });
    });
}

window.setTimeout(() => {
  if (macHdWindow) {
    macHdWindow.style.backgroundImage = 'url(/img/macHDBlur.jpg)';
  }
  if (theKingWindow) {
    theKingWindow.style.display = 'block';
    bringToFront(theKingWindow);
  }
  if (theKingVideo) {
    theKingVideo.autoplay = true;
    theKingVideo.setAttribute('autoplay', '');
    attemptVideoPlayback(theKingVideo);
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
