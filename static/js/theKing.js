const IMAGES_TO_PRELOAD = ['theKingBlur.jpg', 'macHDBlur.jpg', 'macHDFocus.jpg'];

function preloadImages() {
  IMAGES_TO_PRELOAD.forEach((name) => {
    const img = new Image();
    img.src = `/img/${name}`;
  });
}

function enableDragging(windowBars) {
  let activeWindow = null;
  let offsetX = 0;
  let offsetY = 0;

  windowBars.forEach((bar) => {
    bar.addEventListener('pointerdown', (event) => {
      const parent = bar.parentElement;
      if (!parent) {
        return;
      }
      activeWindow = parent;
      const rect = parent.getBoundingClientRect();
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;
      parent.classList.add('dragging');
      bar.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    bar.addEventListener('pointermove', (event) => {
      if (!activeWindow || !bar.hasPointerCapture(event.pointerId)) {
        return;
      }
      activeWindow.style.left = `${event.pageX - offsetX}px`;
      activeWindow.style.top = `${event.pageY - offsetY}px`;
    });

    const clear = (event) => {
      if (activeWindow) {
        activeWindow.classList.remove('dragging');
      }
      if (bar.hasPointerCapture(event.pointerId)) {
        bar.releasePointerCapture(event.pointerId);
      }
      activeWindow = null;
    };

    bar.addEventListener('pointerup', clear);
    bar.addEventListener('pointercancel', clear);
  });
}

function flicker(element, interval, duration) {
  if (!element) {
    return;
  }

  element.style.display = 'block';
  let visible = true;
  element.style.opacity = '1';

  const flickerInterval = window.setInterval(() => {
    visible = !visible;
    element.style.opacity = visible ? '1' : '0';
  }, interval);

  window.setTimeout(() => {
    window.clearInterval(flickerInterval);
    element.style.opacity = '0';
    element.style.display = 'none';
  }, duration);
}

function initialize() {
  const appleDesktop = document.getElementById('apple-desktop');
  const kingWindow = document.getElementById('the-king-window');
  const kingBlur = document.getElementById('the-king-blur');
  const macHdWindow = document.getElementById('mac-hd-window');
  const homeKey = document.getElementById('home-key');
  const video = document.getElementById('the-king-video');

  preloadImages();
  enableDragging(Array.from(document.querySelectorAll('.window-bar')));

  setTimeout(() => {
    if (macHdWindow) {
      macHdWindow.style.backgroundImage = "url('/img/macHDBlur.jpg')";
    }
    if (kingWindow) {
      kingWindow.style.display = 'block';
      kingWindow.setAttribute('aria-hidden', 'false');
      kingWindow.focus();
    }
    if (video) {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    }
    if (window.innerWidth < 1200 && homeKey) {
      setTimeout(() => {
        homeKey.style.zIndex = '64000';
      }, 10000);
    }
  }, 2500);

  if (appleDesktop && kingBlur) {
    appleDesktop.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('#the-king-window')) {
        return;
      }
      flicker(kingBlur, 50, 450);
    });
  }
}

document.addEventListener('DOMContentLoaded', initialize);
