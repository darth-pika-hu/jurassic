import { isAccessCommand } from './modules/access.js';

const state = {
  accessAttempts: 0,
  activeWindow: null,
  commands: new Map(),
  highestZ: 1,
  musicOn: false,
  spamInterval: null,
};

const dom = {
  environment: null,
  mainHistory: null,
  mainPrompt: null,
  mainCursor: null,
  mainInner: null,
  mainBuffer: null,
  mainEcho: null,
  chessHistory: null,
  chessBuffer: null,
  chessEcho: null,
  chessInner: null,
};

const sounds = {
  beep: null,
  lockDown: null,
  music: null,
};

const preloadImages = [
  'theKingBlur.jpg',
  'theKingFocus.jpg',
  'macHDBlur.jpg',
  'asciiNewman.jpg',
  'zebraGirlWindow.jpg',
];

const scrollToBottom = (container) => {
  if (!container) {
    return;
  }

  container.scrollTop = container.scrollHeight;
};

const playSound = (audio) => {
  if (!audio) {
    return;
  }

  try {
    audio.currentTime = 0;
    const playPromise = audio.play();

    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  } catch {
    // ignore playback errors triggered by autoplay restrictions
  }
};

const stopSound = (audio) => {
  if (!audio) {
    return;
  }

  audio.pause();
  audio.currentTime = 0;
};

const appendHistoryText = (container, text, options = {}) => {
  if (!container || !text) {
    return null;
  }

  const element = document.createElement(options.inline ? 'span' : 'div');
  if (options.asHtml) {
    element.innerHTML = text;
  } else {
    element.textContent = text;
  }
  if (options.className) {
    element.className = options.className;
  }
  container.append(element);
  scrollToBottom(options.scrollContainer ?? dom.mainInner ?? container.parentElement);
  return element;
};

const appendHistoryElement = (container, element) => {
  if (!container || !element) {
    return;
  }

  container.append(element);
  scrollToBottom(dom.mainInner ?? container.parentElement);
};

const clearActiveWindows = () => {
  document.querySelectorAll('.cursor').forEach((cursor) => {
    cursor.classList.remove('active-cursor');
  });

  document.querySelectorAll('.buffer').forEach((input) => {
    input.blur();
  });
};

const setActiveWindow = (windowElement) => {
  if (!windowElement) {
    return;
  }

  clearActiveWindows();

  state.activeWindow = windowElement;
  state.highestZ += 1;
  windowElement.style.zIndex = String(state.highestZ);

  const cursor = windowElement.querySelector('.cursor');
  if (cursor) {
    cursor.classList.add('active-cursor');
  }

  const buffer = windowElement.querySelector('.buffer');
  if (buffer) {
    buffer.focus();
  }
};

const resolveCommandName = (rawCommand) => {
  if (!rawCommand) {
    return '';
  }

  if (isAccessCommand(rawCommand)) {
    return 'access';
  }

  return rawCommand.trim().toLowerCase();
};

const disableInput = () => {
  document.querySelectorAll('.buffer').forEach((input) => {
    input.setAttribute('disabled', 'true');
  });
};

const runLockdownSequence = () => {
  if (!dom.mainHistory) {
    return;
  }

  disableInput();
  dom.mainPrompt?.classList.add('hide');

  const andMessage = document.createElement('span');
  andMessage.textContent = '...and...';

  window.setTimeout(() => {
    appendHistoryElement(dom.mainHistory, andMessage);
  }, 200);

  window.setTimeout(() => {
    playSound(sounds.lockDown);
  }, 1000);

  window.setTimeout(() => {
    const environment = dom.environment;
    if (!environment) {
      return;
    }

    const animation = environment.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(3000px)' }],
      { duration: 2000, easing: 'ease-out', fill: 'forwards' }
    );

    animation.onfinish = () => {
      window.setTimeout(() => {
        const theKingVideo = document.getElementById('the-king-video');
        const irixDesktop = document.getElementById('irix-desktop');
        const macHdWindow = document.getElementById('mac-hd-window');
        const theKingWindow = document.getElementById('the-king-window');
        const homeKey = document.getElementById('home-key');

        if (state.spamInterval) {
          window.clearInterval(state.spamInterval);
          state.spamInterval = null;
        }

        if (theKingVideo) {
          theKingVideo.play().catch(() => {});
        }
        if (irixDesktop) {
          irixDesktop.style.display = 'none';
        }
        if (macHdWindow) {
          macHdWindow.style.backgroundImage = 'url(/img/macHDBlur.jpg)';
        }
        if (theKingWindow) {
          theKingWindow.hidden = false;
          theKingWindow.style.display = 'block';
        }
        if (homeKey) {
          window.setTimeout(() => {
            homeKey.style.zIndex = '64000';
          }, 10000);
        }
      }, 2000);
    };
  }, 4000);

  window.setTimeout(() => {
    if (!dom.mainHistory) {
      return;
    }

    state.spamInterval = window.setInterval(() => {
      const errorMessage = document.createElement('div');
      errorMessage.textContent = "YOU DIDN'T SAY THE MAGIC WORD!";
      dom.mainHistory.append(errorMessage);
      scrollToBottom(dom.mainInner);
    }, 50);
  }, 1000);
};

const handleAccessCommand = (inputLine) => {
  const tokens = inputLine.trim().split(/ +/);
  const target = tokens[1] || '';
  const magicWord = tokens.length > 2 ? tokens[tokens.length - 1] : '';

  if (!target) {
    appendHistoryText(dom.mainHistory, 'access: must specify target system', {
      inline: true,
    });
    return;
  }

  if (tokens.length > 2 && magicWord.trim().toLowerCase() === 'please') {
    const asciiImage = document.createElement('img');
    asciiImage.id = 'asciiNewman';
    asciiImage.src = '/img/asciiNewman.jpg';
    asciiImage.alt = '';
    asciiImage.addEventListener('load', () => {
      scrollToBottom(dom.mainInner);
    });
    dom.mainHistory.append(asciiImage);
    scrollToBottom(dom.mainInner);
    return;
  }

  appendHistoryText(dom.mainHistory, 'access: PERMISSION DENIED.', { inline: true });
  playSound(sounds.beep);
  state.accessAttempts += 1;

  if (state.accessAttempts >= 3) {
    runLockdownSequence();
  }
};

const registerCommands = () => {
  const addCommand = (name, summary, manPage, handler) => {
    state.commands.set(name, { summary, manPage, handler });
  };

  addCommand(
    'music',
    'turn background music on or off',
    [
      'SYNOPSIS',
      '\tmusic [on|off]',
      '',
      'DESCRIPTION',
      "\tManage the state of the 'Dennis Steals the Embryo' music. Use the 'on' state for",
      '\tincreased epicness.',
      '',
      'AUTHOR',
      '\tWritten by Tully Robinson.',
    ].join('\n'),
    (inputLine) => {
      const [, arg = ''] = inputLine.trim().split(/ +/);
      const normalized = arg.toLowerCase();

      if (!normalized || (normalized !== 'on' && normalized !== 'off')) {
        appendHistoryText(dom.mainHistory, 'music: must specify state [on|off]', {
          inline: true,
        });
        return;
      }

      if (normalized === 'on') {
        if (!state.musicOn) {
          playSound(sounds.music);
        }
        state.musicOn = true;
      } else {
        stopSound(sounds.music);
        state.musicOn = false;
      }
    }
  );

  addCommand(
    'access',
    'access a target environment on the Jurassic Systems grid',
    [
      'SYNOPSIS',
      '\taccess [SYSTEM_NAME] [MAGIC_WORD]',
      '',
      'DESCRIPTION',
      '\tGain read and write access to a specified environment.',
      '',
      'AUTHOR',
      '\tWritten by Dennis Nedry.',
    ].join('\n'),
    handleAccessCommand
  );

  addCommand(
    'system',
    "check a system's current status",
    [
      'SYNOPSIS',
      '\tsystem [SYSTEM_NAME]',
      '',
      'DESCRIPTION',
      "\tCheck the input system and return each sector's current status.",
      '',
      'AUTHOR',
      '\tWritten by Dennis Nedry.',
    ].join('\n'),
    (inputLine) => {
      const [, arg = ''] = inputLine.trim().split(/ +/);

      if (!arg) {
        appendHistoryText(dom.mainHistory, 'system: must specify target system', {
          inline: true,
        });
        return;
      }

      const cleaned = arg.replace(/s$/, '');
      const name = `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`;
      const escaped = name.replace(
        /[&<>]/g,
        (char) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
          })[char]
      );

      dom.mainPrompt?.classList.add('hide');
      appendHistoryText(
        dom.mainHistory,
        `<div>${escaped} containment enclosure....</div>` +
          '<table id="system-output"><tbody>' +
          '<tr><td>Security</td><td>[OK]</td></tr>' +
          '<tr><td>Fence</td><td>[OK]</td></tr>' +
          '<tr><td>Feeding Pavilion</td><td>[OK]</td></tr>' +
          '</tbody></table>',
        { asHtml: true }
      );

      appendHistoryText(dom.mainHistory, 'System Halt!', { inline: false });
      playSound(sounds.beep);

      window.setTimeout(() => {
        playSound(sounds.beep);
        scrollToBottom(dom.mainInner);
        dom.mainPrompt?.classList.remove('hide');
      }, 900);
    }
  );

  addCommand(
    'ls',
    'list files in the current directory',
    [
      'SYNOPSIS',
      '\tls [FILE] ...',
      '',
      'DESCRIPTION',
      '\tList information about the FILEs (the current directory by default).',
      '',
      'AUTHOR',
      '\tWritten by Richard Stallman and David MacKenzie.',
    ].join('\n'),
    () => {
      appendHistoryText(dom.mainHistory, 'zebraGirl.jpg');
    }
  );

  addCommand(
    'display',
    "display image files (hint: use ls to find a 'file')",
    [
      'SYNOPSIS',
      '\tdisplay file ...',
      '',
      'DESCRIPTION',
      '\tDisplay is a machine architecture independent image processing and display program.',
      '\tIt can display an image on any workstation screen running an X server.',
      '',
      'AUTHOR',
      '\tJohn Cristy, ImageMagick Studio.',
    ].join('\n'),
    (inputLine) => {
      const args = inputLine.trim().split(/ +/);
      if (args.length < 2) {
        appendHistoryText(dom.mainHistory, 'display: no file specified', {
          inline: true,
        });
        return;
      }

      if (/zebraGirl\.jpg/i.test(inputLine)) {
        window.setTimeout(() => {
          const zebra = document.getElementById('zebra-girl');
          if (zebra) {
            state.highestZ += 1;
            zebra.style.zIndex = String(state.highestZ);
            zebra.style.display = 'block';
            clearActiveWindows();
          }
        }, 300);
      }
    }
  );

  addCommand(
    'keychecks',
    'display system level command history',
    [
      'SYNOPSIS',
      '\tkeychecks',
      '',
      'DESCRIPTION',
      '\tA system level command log used for accountability purposes. keychecks must be',
      '\tactivated or deactivated via the main board.',
    ].join('\n'),
    () => {
      const output =
        '13,42,121,32,88,77,19,13,44,52,77,90,13,99,13,100,13,109,55,103,144,' +
        '13,99,87,60,13,44,12,09,13,43,63,13,46,57,89,103,122,13,44,52,88,931,' +
        '13,21,13,57,98,100,102,103,13,112,13,146,13,13,13,77,67,88,23,13,13\n' +
        'system\n' +
        'nedry\n' +
        'go to command level\n' +
        'nedry\n' +
        '040/#xy/67&\n' +
        'mr goodbytes\n' +
        'security\n' +
        'keycheck off\n' +
        'safety off\n' +
        'sl off\n' +
        'security\n' +
        'whte_rbt.obj\n';
      appendHistoryText(dom.mainHistory, output);
    }
  );

  addCommand(
    'man',
    'display reference manual for a given command',
    [
      'SYNOPSIS',
      '\tman title ...',
      '',
      'DESCRIPTION',
      '\tman locates and prints the titled entries from the on-line reference manuals.',
    ].join('\n'),
    (inputLine) => {
      const [, arg = ''] = inputLine.trim().split(/ +/);
      if (!arg) {
        appendHistoryText(dom.mainHistory, 'What manual page do you want?', {
          inline: true,
        });
        return;
      }

      const resolved = resolveCommandName(arg);
      if (state.commands.has(resolved)) {
        appendHistoryText(dom.mainHistory, state.commands.get(resolved).manPage);
      } else {
        appendHistoryText(
          dom.mainHistory,
          `No manual entry for ${arg.replace(
            /[&<>]/g,
            (char) =>
              ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
              })[char]
          )}`,
          { inline: true }
        );
      }
    }
  );

  addCommand(
    'help',
    'list available commands',
    [
      'SYNOPSIS',
      '\thelp',
      '',
      'DESCRIPTION',
      '\tDisplay a command summary for Jurassic Systems.',
      '',
      'AUTHOR',
      '\tWritten by Tully Robinson.',
    ].join('\n'),
    () => {
      state.commands.forEach((details, name) => {
        appendHistoryText(dom.mainHistory, `${name} - ${details.summary}`);
      });
    }
  );
};

const cacheImages = () => {
  preloadImages.forEach((src) => {
    const image = new Image();
    image.src = `/img/${src}`;
  });
};

const handleLineSubmission = (line) => {
  if (!state.activeWindow) {
    return;
  }

  if (state.activeWindow.id === 'chess-terminal') {
    appendHistoryText(dom.chessHistory, line || ' ', {
      className: 'entered-command',
      scrollContainer: dom.chessInner,
    });
    dom.chessEcho.textContent = '';
    return;
  }

  const commandHistory = state.activeWindow.querySelector('.command-history');
  if (!commandHistory) {
    return;
  }

  appendHistoryText(commandHistory, `> ${line}`, {
    className: 'entered-command',
    scrollContainer: dom.mainInner,
  });

  const trimmed = line.trim();
  if (!trimmed) {
    return;
  }

  const [rawCommand] = trimmed.split(/\s+/);
  const resolved = resolveCommandName(rawCommand);
  const command = state.commands.get(resolved);

  if (command) {
    command.handler(line);
  } else {
    appendHistoryText(commandHistory, `${rawCommand}: command not found`, {
      scrollContainer: dom.mainInner,
    });
  }
};

const bindBuffers = () => {
  if (dom.mainBuffer) {
    dom.mainBuffer.addEventListener('input', (event) => {
      if (dom.mainEcho) {
        dom.mainEcho.textContent = event.target.value;
      }
    });

    dom.mainBuffer.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const value = event.target.value;
        event.target.value = '';
        if (dom.mainEcho) {
          dom.mainEcho.textContent = '';
        }
        handleLineSubmission(value);
      }
    });
  }

  if (dom.chessBuffer) {
    dom.chessBuffer.addEventListener('input', (event) => {
      if (dom.chessEcho) {
        dom.chessEcho.textContent = event.target.value;
      }
    });

    dom.chessBuffer.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const value = event.target.value;
        event.target.value = '';
        handleLineSubmission(value);
      }
    });
  }
};

const initDragging = () => {
  const bars = document.querySelectorAll('.window-bar');
  let dragState = null;

  const onPointerDown = (event) => {
    const bar = event.currentTarget;
    const windowElement = bar.parentElement;
    if (!windowElement) {
      return;
    }

    const rect = windowElement.getBoundingClientRect();
    dragState = {
      windowElement,
      pointerId: event.pointerId,
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

    const { windowElement, offsetX, offsetY } = dragState;
    windowElement.style.left = `${event.clientX - offsetX}px`;
    windowElement.style.top = `${event.clientY - offsetY}px`;
  };

  const stopDragging = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    dragState.windowElement.classList.remove('dragging');
    const bar = dragState.windowElement.querySelector('.window-bar');
    if (bar) {
      bar.releasePointerCapture(dragState.pointerId);
    }
    dragState = null;
  };

  bars.forEach((bar) => {
    bar.addEventListener('pointerdown', onPointerDown);
  });

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', stopDragging);
  window.addEventListener('pointercancel', stopDragging);
};

const bindWindowActivation = () => {
  document.querySelectorAll('.irix-window').forEach((windowElement) => {
    windowElement.addEventListener('click', (event) => {
      event.stopPropagation();
      setActiveWindow(windowElement);
    });
  });

  document.body.addEventListener('click', clearActiveWindows);
};

const preventArrowScroll = () => {
  window.addEventListener('keydown', (event) => {
    if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
    }
  });
};

const initSounds = () => {
  sounds.beep = new Audio('/snd/beep.mp3');
  sounds.beep.preload = 'auto';

  sounds.lockDown = new Audio('/snd/lockDown.mp3');
  sounds.lockDown.preload = 'auto';

  sounds.music = new Audio('/snd/dennisMusic.mp3');
  sounds.music.preload = 'auto';
  sounds.music.loop = true;
};

const init = () => {
  dom.environment = document.getElementById('environment');
  dom.mainHistory = document.getElementById('main-input');
  dom.mainPrompt = document.getElementById('main-prompt');
  dom.mainCursor = document.getElementById('main-cursor');
  dom.mainInner = document.getElementById('main-inner');
  dom.mainBuffer = document.getElementById('main-buffer');
  dom.mainEcho = document.getElementById('curr-main-input');
  dom.chessHistory = document.querySelector('#chess-terminal .command-history');
  dom.chessBuffer = document.getElementById('chess-buffer');
  dom.chessEcho = document.getElementById('curr-chess-input');
  dom.chessInner = document.getElementById('chess-inner');

  document.querySelectorAll('.irix-window, .mac-window').forEach((windowElement) => {
    const zIndex = parseInt(window.getComputedStyle(windowElement).zIndex || '0', 10);
    if (!Number.isNaN(zIndex) && zIndex > state.highestZ) {
      state.highestZ = zIndex;
    }
  });

  cacheImages();
  initSounds();
  registerCommands();
  bindBuffers();
  initDragging();
  bindWindowActivation();
  preventArrowScroll();

  setActiveWindow(document.getElementById('main-terminal'));

  window.setTimeout(() => {
    const boot = document.getElementById('irix-boot');
    if (boot) {
      boot.remove();
    }
    dom.mainBuffer?.focus();
  }, 4500);

  document.getElementById('apple-desktop')?.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    if (!event.target.closest('#the-king-window')) {
      const blurLayer = document.getElementById('the-king-blur');
      if (blurLayer) {
        blurLayer.style.opacity = '1';
        window.setTimeout(() => {
          blurLayer.style.opacity = '0';
        }, 450);
      }
    }
  });
};

window.addEventListener('DOMContentLoaded', init);
