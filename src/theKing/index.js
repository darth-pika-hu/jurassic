const PRELOAD_IMAGES = ['theKingBlur.jpg', 'macHDBlur.jpg', 'macHDFocus.jpg'];

function preloadImages() {
  for (const imageName of PRELOAD_IMAGES) {
    const image = new Image();
    image.src = `/img/${imageName}`;
  }
}

function setupWindowDragging(windowElement) {
  const bar = windowElement.querySelector('.window-bar');
  if (!bar) {
    return;
  }

  let offsetX = 0;
  let offsetY = 0;

  const handlePointerMove = (event) => {
    windowElement.style.left = `${event.clientX - offsetX}px`;
    windowElement.style.top = `${event.clientY - offsetY}px`;
  };

  const handlePointerUp = (event) => {
    windowElement.classList.remove('dragging');
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    if (event.pointerId !== undefined) {
      bar.releasePointerCapture(event.pointerId);
    }
  };

  bar.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 && event.pointerType !== 'touch') {
      return;
    }

    const rect = windowElement.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    windowElement.classList.add('dragging');
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    if (event.pointerId !== undefined) {
      bar.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
  });
}

function flicker(elementId, intervalMs, durationMs) {
  const element = document.getElementById(elementId);
  if (!element) {
    return;
  }

  element.style.opacity = '1';
  element.style.display = 'block';
  let visible = true;
  const toggler = window.setInterval(() => {
    element.style.opacity = visible ? '1' : '0';
    visible = !visible;
  }, intervalMs);

  window.setTimeout(() => {
    window.clearInterval(toggler);
    element.style.opacity = '0';
    element.style.display = '';
  }, durationMs);
}

function initialise() {
  preloadImages();

  const kingWindow = document.getElementById('the-king-window');
  if (kingWindow) {
    setupWindowDragging(kingWindow);
  }

  window.setTimeout(() => {
    const macHdWindow = document.getElementById('mac-hd-window');
    if (macHdWindow) {
      macHdWindow.style.backgroundImage = "url('/img/macHDBlur.jpg')";
    }
    if (kingWindow) {
      kingWindow.style.display = 'block';
      kingWindow.setAttribute('aria-hidden', 'false');
    }

    if (window.innerWidth < 1200) {
      window.setTimeout(() => {
        const homeKey = document.getElementById('home-key');
        if (homeKey) {
          homeKey.style.zIndex = '64000';
        }
      }, 10000);
    }
  }, 2500);

  const appleDesktop = document.getElementById('apple-desktop');
  appleDesktop?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const isKingWindow = target.closest('#the-king-window');
    if (!isKingWindow) {
      flicker('the-king-blur', 50, 450);
    }
  });
}

document.addEventListener('DOMContentLoaded', initialise);
