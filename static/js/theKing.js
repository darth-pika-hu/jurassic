const preloadImages = ['theKingBlur.jpg', 'macHDBlur.jpg', 'macHDFocus.jpg'];

const cacheImages = () => {
  preloadImages.forEach((src) => {
    const image = new Image();
    image.src = `/img/${src}`;
  });
};

const initDragging = () => {
  const bars = document.querySelectorAll('.window-bar');
  let dragState = null;

  const startDrag = (event) => {
    const bar = event.currentTarget;
    const windowElement = bar.parentElement;
    if (!windowElement) {
      return;
    }

    const rect = windowElement.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      element: windowElement,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };

    windowElement.classList.add('dragging');
    bar.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    const { element, offsetX, offsetY } = dragState;
    element.style.left = `${event.clientX - offsetX}px`;
    element.style.top = `${event.clientY - offsetY}px`;
  };

  const stopDrag = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    const bar = dragState.element.querySelector('.window-bar');
    if (bar) {
      bar.releasePointerCapture(event.pointerId);
    }
    dragState.element.classList.remove('dragging');
    dragState = null;
  };

  bars.forEach((bar) => {
    bar.addEventListener('pointerdown', startDrag);
  });

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', stopDrag);
  window.addEventListener('pointercancel', stopDrag);
};

const init = () => {
  cacheImages();
  initDragging();

  const macHd = document.getElementById('mac-hd-window');
  const kingWindow = document.getElementById('the-king-window');
  const kingBlur = document.getElementById('the-king-blur');
  const homeKey = document.getElementById('home-key');
  const video = document.getElementById('the-king-video');

  window.setTimeout(() => {
    if (macHd) {
      macHd.style.backgroundImage = "url('/img/macHDBlur.jpg')";
    }
    if (kingWindow) {
      kingWindow.hidden = false;
    }
    if (video) {
      video.play().catch(() => {});
    }

    if (window.innerWidth < 1200 && homeKey) {
      window.setTimeout(() => {
        homeKey.style.zIndex = '64000';
      }, 10000);
    }
  }, 2500);

  document.getElementById('apple-desktop')?.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    if (!event.target.closest('#the-king-window') && kingBlur) {
      kingBlur.style.opacity = '1';
      window.setTimeout(() => {
        kingBlur.style.opacity = '0';
      }, 450);
    }
  });
};

window.addEventListener('DOMContentLoaded', init);
