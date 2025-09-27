import { matchesAccessCommand } from './commands/access.js';

const SHIFT_DISTANCE = (() => {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--shift-distance')
    .trim();
  const numeric = parseFloat(raw);
  return Number.isFinite(numeric) ? numeric : 3000;
})();

function createAudioController(src, { loop = false } = {}) {
  const audio = new Audio(src);
  audio.preload = 'auto';
  audio.loop = loop;

  return {
    play() {
      try {
        audio.currentTime = 0;
      } catch (_) {
        // Ignore seek errors (e.g. when media not ready).
      }

      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    },
    stop() {
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch (_) {
        // Ignore seek errors.
      }
    },
  };
}

function appendTextLine(target, text, className) {
  const line = document.createElement('div');
  if (className) {
    line.className = className;
  }
  line.textContent = text;
  target.append(line);
  return line;
}

function appendHtml(target, html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  target.append(template.content);
}

function appendPreformatted(target, content) {
  const pre = document.createElement('pre');
  pre.textContent = content;
  target.append(pre);
  return pre;
}

function scrollToBottom(windowElement) {
  const wrap = windowElement.querySelector('.inner-wrap');
  if (wrap) {
    wrap.scrollTop = wrap.scrollHeight;
  }
}

function blurAllWindows() {
  document.querySelectorAll('.cursor').forEach((cursor) => {
    cursor.classList.remove('active-cursor');
  });
  document.querySelectorAll('.buffer').forEach((buffer) => buffer.blur());
}

function flicker(element, interval, duration) {
  let visible = true;
  element.classList.add('visible');
  element.style.opacity = '1';
  const timer = window.setInterval(() => {
    element.style.opacity = visible ? '1' : '0';
    visible = !visible;
  }, interval);

  window.setTimeout(() => {
    clearInterval(timer);
    element.classList.remove('visible');
    element.style.opacity = '0';
  }, duration);
}

const dom = {
  environment: document.getElementById('environment'),
  irixDesktop: document.getElementById('irix-desktop'),
  appleDesktop: document.getElementById('apple-desktop'),
  mainWindow: document.getElementById('main-terminal'),
  chessWindow: document.getElementById('chess-terminal'),
  zebraGirl: document.getElementById('zebra-girl'),
  mainInput: document.getElementById('main-input'),
  mainPrompt: document.getElementById('main-prompt'),
  currMainInput: document.getElementById('curr-main-input'),
  chessHistory: document.querySelector('#chess-terminal .command-history'),
  currChessInput: document.getElementById('curr-chess-input'),
  mainBuffer: document.getElementById('main-buffer'),
  chessBuffer: document.getElementById('chess-buffer'),
  macHdWindow: document.getElementById('mac-hd-window'),
  theKingWindow: document.getElementById('the-king-window'),
  theKingVideo: document.getElementById('the-king-video'),
  theKingBlur: document.getElementById('the-king-blur'),
  irixBoot: document.getElementById('irix-boot'),
};

const sounds = {
  beep: createAudioController('/snd/beep.mp3'),
  lockDown: createAudioController('/snd/lockDown.mp3'),
  dennisMusic: createAudioController('/snd/dennisMusic.mp3', { loop: true }),
};

const state = {
  accessAttempts: 0,
  activeWindow: dom.mainWindow,
  commands: new Map(),
  maxZIndex: 2,
  musicOn: false,
  allowInput: true,
  sounds,
};

function nextZIndex() {
  state.maxZIndex += 1;
  return state.maxZIndex;
}

function registerCommand({ name, summary, manPage, execute, matcher }) {
  if (!name || typeof execute !== 'function') {
    return;
  }

  const key = name.toLowerCase();
  state.commands.set(key, {
    name,
    summary,
    manPage,
    execute,
    matcher:
      typeof matcher === 'function'
        ? matcher
        : (input) => input.toLowerCase() === key,
  });
}

function resolveCommand(rawName) {
  if (!rawName) {
    return null;
  }

  for (const command of state.commands.values()) {
    if (command.matcher(rawName)) {
      return command;
    }
  }

  return null;
}

function buildCommandLine(line) {
  const trimmed = line.trim();
  const [rawCommand = ''] = trimmed ? trimmed.split(/\s+/) : [''];
  const historyTarget = state.activeWindow.querySelector('.command-history');
  appendTextLine(historyTarget, `> ${line || ' '}`, 'entered-command');

  if (!rawCommand) {
    scrollToBottom(state.activeWindow);
    return;
  }

  const command = resolveCommand(rawCommand);
  if (command) {
    command.execute(line);
  } else {
    appendTextLine(historyTarget, `${rawCommand}: command not found`);
  }

  scrollToBottom(state.activeWindow);
}

function setActiveWindow(windowElement) {
  if (!windowElement || state.activeWindow === windowElement) {
    return;
  }

  document
    .querySelectorAll('.cursor')
    .forEach((cursor) => cursor.classList.remove('active-cursor'));

  state.activeWindow = windowElement;
  windowElement.style.zIndex = String(nextZIndex());

  const cursor = windowElement.querySelector('.cursor');
  if (cursor) {
    cursor.classList.add('active-cursor');
  }

  const buffer = windowElement.querySelector('.buffer');
  if (buffer) {
    buffer.focus();
  }
}

function setupDragging() {
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
      host.style.zIndex = String(nextZIndex());
      bar.setPointerCapture(event.pointerId);
    });

    bar.addEventListener('pointerup', (event) => {
      if (bar.hasPointerCapture(event.pointerId)) {
        bar.releasePointerCapture(event.pointerId);
      }
    });
  });
}

function setupWindowActivation() {
  document.querySelectorAll('.irix-window').forEach((windowElement) => {
    windowElement.addEventListener('click', (event) => {
      event.stopPropagation();
      setActiveWindow(windowElement);
    });
    windowElement.addEventListener('focus', () => setActiveWindow(windowElement));
  });

  document.body.addEventListener('click', blurAllWindows);
}

function handleEnter(windowElement, buffer, currentInputEl) {
  const line = buffer.value;
  buffer.value = '';
  currentInputEl.textContent = '';

  if (windowElement.id === 'chess-terminal') {
    appendTextLine(dom.chessHistory, line || ' ');
    scrollToBottom(windowElement);
    return;
  }

  buildCommandLine(line);
}

function setupBuffers() {
  const arrowKeys = new Set(['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft']);

  function handleKeydown(event) {
    if (!state.allowInput) {
      event.preventDefault();
      return;
    }

    if (arrowKeys.has(event.key)) {
      event.preventDefault();
    }

    if (event.key === 'Enter') {
      const windowElement = event.currentTarget.closest('.irix-window');
      const currentInputEl =
        windowElement.id === 'chess-terminal'
          ? dom.currChessInput
          : dom.currMainInput;
      handleEnter(windowElement, event.currentTarget, currentInputEl);
    }
  }

  dom.mainBuffer.addEventListener('input', () => {
    dom.currMainInput.textContent = dom.mainBuffer.value;
  });

  dom.chessBuffer.addEventListener('input', () => {
    dom.currChessInput.textContent = dom.chessBuffer.value;
  });

  dom.mainBuffer.addEventListener('keydown', handleKeydown);
  dom.chessBuffer.addEventListener('keydown', handleKeydown);

  dom.mainBuffer.addEventListener('focus', () => setActiveWindow(dom.mainWindow));
  dom.chessBuffer.addEventListener('focus', () => setActiveWindow(dom.chessWindow));
}

function createCommands() {
  registerCommand({
    name: 'music',
    summary: 'turn background music on or off',
    manPage:
      'SYNOPSIS\n' +
      '\tmusic [on|off]\n\n' +
      'DESCRIPTION\n' +
      '\tManage the state of the \'Dennis Steals the Embryo\' music. Use the \'on\' state for\n\tincreased epicness.\n\n' +
      'AUTHOR\n' +
      '\tWritten by <a href="https://tully.io">Tully Robinson</a>.\n',
    execute: (inputLine) => {
      const arg = inputLine.trim().split(/ +/)[1] || '';

      if (!arg || !/^(?:on|off)$/i.test(arg)) {
        appendTextLine(dom.mainInput, 'music: must specify state [on|off]');
        return;
      }

      if (/^on$/i.test(arg)) {
        if (!state.musicOn) {
          sounds.dennisMusic.play();
        }
        state.musicOn = true;
      } else {
        sounds.dennisMusic.stop();
        state.musicOn = false;
      }
    },
  });

  registerCommand({
    name: 'access',
    summary: 'access a target environment on the Jurassic Systems grid',
    manPage:
      'SYNOPSIS\n' +
      '\taccess [SYSTEM_NAME] [MAGIC_WORD]\n\n' +
      'DESCRIPTION\n' +
      '\tGain read and write access to a specified environment.\n\n' +
      'AUTHOR\n' +
      '\tWritten by Dennis Nedry.\n',
    matcher: matchesAccessCommand,
    execute: (inputLine) => {
      const parts = inputLine.trim().split(/ +/);
      const target = parts[1] || '';
      const magicWord = parts.length > 2 ? parts[parts.length - 1] : '';

      if (!target) {
        appendTextLine(dom.mainInput, 'access: must specify target system');
        return;
      }

      if (magicWord.toLowerCase() === 'please' && parts.length > 2) {
        const asciiNewman = document.createElement('img');
        asciiNewman.id = 'asciiNewman';
        asciiNewman.src = '/img/asciiNewman.jpg';
        asciiNewman.alt = 'ASCII depiction of Dennis Nedry';
        asciiNewman.addEventListener('load', () => {
          scrollToBottom(dom.mainWindow);
        });
        dom.mainInput.append(asciiNewman);
        return;
      }

      appendTextLine(dom.mainInput, 'access: PERMISSION DENIED.');
      sounds.beep.play();
      state.accessAttempts += 1;

      if (state.accessAttempts < 3) {
        return;
      }

      state.allowInput = false;
      dom.mainPrompt.classList.add('hide');

      const andMessage = document.createElement('span');
      andMessage.textContent = '...and...';

      window.setTimeout(() => {
        dom.mainInput.append(andMessage);
        scrollToBottom(dom.mainWindow);
      }, 200);

      window.setTimeout(() => {
        sounds.lockDown.play();
      }, 1000);

      let errorSpam;

      window.setTimeout(() => {
        errorSpam = window.setInterval(() => {
          const errorMessage = document.createElement('div');
          errorMessage.textContent = "YOU DIDN'T SAY THE MAGIC WORD!";
          dom.mainInput.append(errorMessage);
          scrollToBottom(dom.mainWindow);
        }, 50);
      }, 1000);

      window.setTimeout(() => {
        const animation = dom.environment?.animate(
          [
            { left: `${dom.environment.offsetLeft}px` },
            { left: `${dom.environment.offsetLeft + SHIFT_DISTANCE}px` },
          ],
          { duration: 2000, easing: 'ease-in-out', fill: 'forwards' },
        );

        const finalize = () => {
          window.setTimeout(() => {
            if (errorSpam) {
              window.clearInterval(errorSpam);
              errorSpam = null;
            }

            if (dom.theKingVideo) {
              const playPromise = dom.theKingVideo.play();
              if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {});
              }
            }

            if (dom.irixDesktop) {
              dom.irixDesktop.style.display = 'none';
            }

            if (dom.macHdWindow) {
              dom.macHdWindow.style.backgroundImage = "url('/img/macHDBlur.jpg')";
            }

            if (dom.theKingWindow) {
              dom.theKingWindow.classList.add('active');
            }
          }, 2000);
        };

        if (animation) {
          animation.addEventListener('finish', finalize, { once: true });
        } else {
          dom.environment.style.left = `${SHIFT_DISTANCE}px`;
          finalize();
        }
      }, 4000);
    },
  });

  registerCommand({
    name: 'system',
    summary: "check a system's current status",
    manPage:
      'SYNOPSIS\n' +
      '\tsystem [SYSTEM_NAME]\n\n' +
      'DESCRIPTION\n' +
      '\tCheck the input system and return each sector\'s current status.\n\n' +
      'AUTHOR\n' +
      '\tWritten by Dennis Nedry.\n',
    execute: (inputLine) => {
      const arg = inputLine.trim().split(/ +/)[1] || '';

      if (!arg) {
        appendHtml(dom.mainInput, '<span>system: must specify target system</span>');
        return;
      }

      const formatted = arg.replace(/s$/i, '');
      const system = formatted.charAt(0).toUpperCase() + formatted.slice(1);
      const safeSystem = document.createElement('div');
      safeSystem.textContent = system;

      appendHtml(
        dom.mainInput,
        `<div>${safeSystem.innerHTML} containment enclosure....</div>` +
          '<table id="system-output"><tbody>' +
          '<tr><td>Security</td><td>[OK]</td></tr>' +
          '<tr><td>Fence</td><td>[OK]</td></tr>' +
          '<tr><td>Feeding Pavilion</td><td>[OK]</td></tr>' +
          '</tbody></table>',
      );

      dom.mainPrompt.classList.add('hide');
      sounds.beep.play();

      window.setTimeout(() => {
        sounds.beep.play();
        appendHtml(dom.mainInput, '<div>System Halt!</div>');
        scrollToBottom(dom.mainWindow);
        dom.mainPrompt.classList.remove('hide');
      }, 900);
    },
  });

  registerCommand({
    name: 'ls',
    summary: 'list files in the current directory',
    manPage:
      'SYNOPSIS\n' +
      '\tls [FILE] ...\n\n' +
      'DESCRIPTION\n' +
      '\tList information about the FILEs (the current directory by default).\n\n' +
      'AUTHOR\n' +
      '\tWritten by Richard Stallman and David MacKenzie.\n',
    execute: () => {
      appendTextLine(dom.mainInput, 'zebraGirl.jpg');
    },
  });

  registerCommand({
    name: 'display',
    summary: "display image files (hint: use ls to find a 'file')",
    manPage:
      'SYNOPSIS\n' +
      '\tdisplay file ...\n\n' +
      'DESCRIPTION\n' +
      '\tDisplay is a machine architecture independent image processing and display\n\tprogram. It can <strong>display</strong> an image on any workstation screen running an X server.\n\n' +
      'AUTHOR\n' +
      '\tJohn Cristy, ImageMagick Studio.\n',
    execute: (inputLine) => {
      const args = inputLine.trim().split(/ +/);

      if (args.length < 2) {
        appendHtml(dom.mainInput, '<span>display: no file specified</span>');
        return;
      }

      if (/zebraGirl\.jpg/i.test(inputLine)) {
        window.setTimeout(() => {
          if (dom.zebraGirl) {
            dom.zebraGirl.style.zIndex = String(nextZIndex());
            dom.zebraGirl.style.display = 'block';
            blurAllWindows();
          }
        }, 300);
      }
    },
  });

  registerCommand({
    name: 'keychecks',
    summary: 'display system level command history',
    manPage:
      'SYNOPSIS\n' +
      '\tkeychecks\n\n' +
      'DESCRIPTION\n' +
      '\tA system level command log used for accountability purposes. keychecks must be\n\tactivated or deactivated via the main board.\n',
    execute: () => {
      appendPreformatted(
        dom.mainInput,
        '13,42,121,32,88,77,19,13,44,52,77,90,13,99,13,100,13,109,55,103,144,13,99,87,60,13,44,12,09,13,43,63,13,46,57,89,103,122,13,44,52,88,931,13,21,13,57,98,100,102,103,13,112,13,146,13,13,13,77,67,88,23,13,13\nsystem\nnedry\ngo to command level\nnedry\n040/#xy/67&\nmr goodbytes\nsecurity\nkeycheck off\nsafety off\nsl off\nsecurity\nwhte_rbt.obj\n',
      );
    },
  });

  registerCommand({
    name: 'man',
    summary: 'display reference manual for a given command',
    manPage:
      'SYNOPSIS\n' +
      '\tman title ...\n\n' +
      'DESCRIPTION\n' +
      '\tman locates and prints the titled entries from the on-line reference manuals.\n',
    execute: (inputLine) => {
      const arg = inputLine.trim().split(/ +/)[1] || '';
      let output = 'What manual page do you want?';

      if (arg) {
        const match = resolveCommand(arg);
        if (match) {
          output = match.manPage;
        } else {
          const safeArg = document.createElement('div');
          safeArg.textContent = arg;
          output = `No manual entry for ${safeArg.innerHTML}`;
        }
      }

      appendHtml(dom.mainInput, output);
    },
  });

  registerCommand({
    name: 'help',
    summary: 'list available commands',
    manPage:
      'SYNOPSIS\n' +
      '\thelp\n\n' +
      'DESCRIPTION\n' +
      '\tDisplay a command summary for Jurassic Systems.\n\n' +
      'AUTHOR\n' +
      '\tWritten by <a href="https://tully.io">Tully Robinson</a>.\n',
    execute: () => {
      for (const command of state.commands.values()) {
        appendTextLine(
          state.activeWindow.querySelector('.command-history'),
          `${command.name} - ${command.summary}`,
        );
      }
    },
  });
}

function setupAppleDesktop() {
  if (!dom.appleDesktop) {
    return;
  }

  if (!dom.theKingBlur) {
    return;
  }

  dom.appleDesktop.addEventListener('click', (event) => {
    if (!dom.theKingWindow || !dom.theKingWindow.contains(event.target)) {
      flicker(dom.theKingBlur, 50, 450);
    }
  });
}

function cacheAssets() {
  [
    'theKingBlur.jpg',
    'theKingFocus.jpg',
    'macHDBlur.jpg',
    'asciiNewman.jpg',
    'zebraGirlWindow.jpg',
  ].forEach((file) => {
    const img = new Image();
    img.src = `/img/${file}`;
  });
}

function removeBootScreen() {
  window.setTimeout(() => {
    if (dom.irixBoot && dom.irixBoot.parentElement) {
      dom.irixBoot.parentElement.removeChild(dom.irixBoot);
    }
    dom.mainBuffer.focus();
  }, 4500);
}

function initialiseZIndex() {
  const windows = Array.from(document.querySelectorAll('.irix-window, .mac-window'));
  const zIndices = windows
    .map((element) => parseInt(window.getComputedStyle(element).zIndex || '0', 10))
    .filter((value) => Number.isFinite(value));
  state.maxZIndex = Math.max(2, ...zIndices);
}

document.addEventListener('DOMContentLoaded', () => {
  cacheAssets();
  initialiseZIndex();
  setupDragging();
  setupWindowActivation();
  setupBuffers();
  createCommands();
  setupAppleDesktop();
  removeBootScreen();
  setActiveWindow(dom.mainWindow);
});
