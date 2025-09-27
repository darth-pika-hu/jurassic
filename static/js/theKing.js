const cacheImages = (paths) => {
  paths.forEach((path) => {
    const image = new Image();
    image.src = path;
  });
};

const flicker = (id, interval, duration) => {
  const blur = document.getElementById(id);
  if (!blur) {
    return;
  }

  let visible = true;
  blur.style.opacity = '1';

  const intervalId = window.setInterval(() => {
    blur.style.opacity = visible ? '1' : '0';
    visible = !visible;
  }, interval);

  window.setTimeout(() => {
    window.clearInterval(intervalId);
    blur.style.opacity = '0';
  }, duration);
};

const setupDrag = () => {
  let dragging = null;
  let diffX = 0;
  let diffY = 0;

  const beginDrag = (event) => {
    const windowEl = event.currentTarget.parentElement;
    if (!windowEl) {
      return;
    }
    dragging = windowEl;
    dragging.classList.add('dragging');
    diffY = event.pageY - dragging.offsetTop;
    diffX = event.pageX - dragging.offsetLeft;
  };

  const drag = (event) => {
    if (!dragging) {
      return;
    }
    dragging.style.top = `${event.pageY - diffY}px`;
    dragging.style.left = `${event.pageX - diffX}px`;
  };

  const endDrag = () => {
    if (!dragging) {
      return;
    }
    dragging.classList.remove('dragging');
    dragging = null;
  };

  document.querySelectorAll('.window-bar').forEach((bar) => {
    bar.addEventListener('mousedown', beginDrag);
  });

  document.body.addEventListener('mousemove', drag);
  document.body.addEventListener('mouseup', endDrag);
};

const showKingWindow = () => {
  const theKingWindow = document.getElementById('the-king-window');
  const theKingVideo = document.getElementById('the-king-video');
  const macHdWindow = document.getElementById('mac-hd-window');

  window.setTimeout(() => {
    if (macHdWindow) {
      macHdWindow.style.backgroundImage = 'url(/img/macHDBlur.jpg)';
    }

    if (theKingWindow) {
      theKingWindow.hidden = false;
      theKingWindow.style.display = 'block';
    }

    if (theKingVideo) {
      try {
        theKingVideo.play();
      } catch (error) {
        // Autoplay restrictions may block playback; ignore.
      }
    }
  }, 2500);
};

const setupFlicker = () => {
  const appleDesktop = document.getElementById('apple-desktop');
  if (!appleDesktop) {
    return;
  }

  appleDesktop.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    if (!event.target.closest('#the-king-window')) {
      flicker('the-king-blur', 50, 450);
    }
  });
};

const init = () => {
  cacheImages([
    '/img/theKingBlur.jpg',
    '/img/macHDBlur.jpg',
    '/img/macHDFocus.jpg',
  ]);

  setupDrag();
  showKingWindow();
  setupFlicker();
};

document.addEventListener('DOMContentLoaded', init);
