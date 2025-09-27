const dom = {
  appleDesktop: document.getElementById('apple-desktop'),
  macHdWindow: document.getElementById('mac-hd-window'),
  theKingWindow: document.getElementById('the-king-window'),
  theKingVideo: document.getElementById('the-king-video'),
  theKingBlur: document.getElementById('the-king-blur'),
};

function createDragController() {
  const dragState = {
    element: null,
    offsetX: 0,
    offsetY: 0,
  };

  function handlePointerMove(event) {
    if (!dragState.element) {
      return;
    }

    event.preventDefault();
    dragState.element.style.left = `${event.clientX - dragState.offsetX}px`;
    dragState.element.style.top = `${event.clientY - dragState.offsetY}px`;
  }

  function endDrag() {
    if (dragState.element) {
      dragState.element.classList.remove('dragging');
    }
    dragState.element = null;
  }

  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  document.querySelectorAll('.window-bar').forEach((bar) => {
    bar.addEventListener('pointerdown', (event) => {
      const host = bar.parentElement;
      dragState.element = host;
      dragState.offsetX = event.clientX - host.offsetLeft;
      dragState.offsetY = event.clientY - host.offsetTop;
      host.classList.add('dragging');
      bar.setPointerCapture(event.pointerId);
    });

    bar.addEventListener('pointerup', (event) => {
      if (bar.hasPointerCapture(event.pointerId)) {
        bar.releasePointerCapture(event.pointerId);
      }
    });
  });
}

function flickerBlur() {
  if (!dom.theKingBlur) {
    return;
  }

  let visible = true;
  dom.theKingBlur.classList.add('visible');
  dom.theKingBlur.style.opacity = '1';

  const timer = window.setInterval(() => {
    dom.theKingBlur.style.opacity = visible ? '1' : '0';
    visible = !visible;
  }, 50);

  window.setTimeout(() => {
    window.clearInterval(timer);
    dom.theKingBlur.classList.remove('visible');
    dom.theKingBlur.style.opacity = '0';
  }, 450);
}

function cacheAssets() {
  ['theKingBlur.jpg', 'macHDBlur.jpg', 'macHDFocus.jpg'].forEach((file) => {
    const img = new Image();
    img.src = `/img/${file}`;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  cacheAssets();
  createDragController();

  window.setTimeout(() => {
    if (dom.macHdWindow) {
      dom.macHdWindow.style.backgroundImage = "url('/img/macHDBlur.jpg')";
    }

    if (dom.theKingWindow) {
      dom.theKingWindow.classList.add('active');
    }

    if (dom.theKingVideo) {
      const playPromise = dom.theKingVideo.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    }
  }, 2500);

  if (dom.appleDesktop) {
    dom.appleDesktop.addEventListener('click', (event) => {
      if (!dom.theKingWindow || !dom.theKingWindow.contains(event.target)) {
        flickerBlur();
      }
    });
  }
});
