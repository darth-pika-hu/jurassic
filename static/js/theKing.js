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

  const tryPlay = () => {
    const result = video.play();
    if (!result || typeof result.then !== 'function') {
      return Promise.resolve();
    }
    return result;
  };
  let recovered = false;
  const gestureHandlers = new Map();

  video.muted = false;

  const onUserGesture = () => {
    if (recovered) {
      return;
    }
    gestureHandlers.forEach((handler, eventName) => {
      window.removeEventListener(eventName, handler);
    });
    gestureHandlers.clear();
    video.muted = false;
    tryPlay()
      .then(() => {
        recovered = true;
      })
      .catch(() => {
        video.muted = true;
        bindGestureRecovery();
      });
  };

  const bindGestureRecovery = () => {
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
  };

  tryPlay()
    .then(() => {
      if (video.muted) {
        video.muted = false;
        tryPlay().catch(() => {
          video.muted = true;
          bindGestureRecovery();
        });
      }
    })
    .catch(() => {
      video.muted = true;
      tryPlay()
        .then(() => {
          bindGestureRecovery();
        })
        .catch(() => {
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
