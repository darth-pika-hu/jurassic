import { normalizeCommandKeyword } from './commandUtils.js';

const SOUND_SOURCES = {
  beep: [
    { src: '/snd/beep.mp3', type: 'audio/mpeg' },
    { src: '/snd/beep.ogg', type: 'audio/ogg' },
    { src: '/snd/beep.wav', type: 'audio/wav' },
  ],
  lockDown: [
    { src: '/snd/lockDown.mp3', type: 'audio/mpeg' },
    { src: '/snd/lockDown.ogg', type: 'audio/ogg' },
    { src: '/snd/lockDown.wav', type: 'audio/wav' },
  ],
  dennisMusic: [
    { src: '/snd/dennisMusic.mp3', type: 'audio/mpeg' },
    { src: '/snd/dennisMusic.ogg', type: 'audio/ogg' },
    { src: '/snd/dennisMusic.wav', type: 'audio/wav' },
  ],
};

const PRELOAD_IMAGES = [
  'theKingBlur.jpg',
  'theKingFocus.jpg',
  'macHDBlur.jpg',
  'asciiNewman.jpg',
  'zebraGirlWindow.jpg',
];

function createAudioPlayer(sources, { loop = false } = {}) {
  const audio = document.createElement('audio');
  audio.preload = 'auto';
  audio.loop = loop;
  audio.setAttribute('aria-hidden', 'true');
  audio.style.display = 'none';

  for (const source of sources) {
    const sourceNode = document.createElement('source');
    sourceNode.src = source.src;
    if (source.type) {
      sourceNode.type = source.type;
    }
    audio.appendChild(sourceNode);
  }

  document.body.appendChild(audio);

  return {
    play() {
      try {
        audio.currentTime = 0;
      } catch {
        // ignore failures when the media is not ready yet
      }
      const playback = audio.play();
      if (playback instanceof Promise) {
        playback.catch(() => {});
      }
    },
    stop() {
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // ignore reset failures
      }
    },
  };
}

function createSounds() {
  return {
    beep: createAudioPlayer(SOUND_SOURCES.beep),
    lockDown: createAudioPlayer(SOUND_SOURCES.lockDown),
    dennisMusic: createAudioPlayer(SOUND_SOURCES.dennisMusic, { loop: true }),
  };
}

function scrollToBottom(element) {
  if (!element) {
    return;
  }
  element.scrollTop = element.scrollHeight;
}

function fadeOut(element, durationMs) {
  if (!element) {
    return;
  }
  element.style.transition = `opacity ${durationMs}ms ease`;
  element.style.opacity = '0';
  window.setTimeout(() => {
    element.style.display = 'none';
    element.style.transition = '';
    element.style.opacity = '';
  }, durationMs);
}

function preloadImages() {
  for (const imageName of PRELOAD_IMAGES) {
    const image = new Image();
    image.src = `/img/${imageName}`;
  }
}

function blurAllWindows(root = document) {
  root.querySelectorAll('.cursor').forEach((cursor) => {
    cursor.classList.remove('active-cursor');
  });
  root.querySelectorAll('.buffer').forEach((input) => {
    input.blur();
  });
}

function setupWindowDragging(windowElement, nextZIndex) {
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
    windowElement.style.zIndex = String(nextZIndex());
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

function createCommandEnvironment() {
  const env = {
    accessAttempts: 0,
    active: null,
    commands: new Map(),
    maxIndex: 1,
    musicOn: false,
    sounds: createSounds(),
  };

  return env;
}

function registerCommand(env, details) {
  const name = normalizeCommandKeyword(details.name);
  if (!name || env.commands.has(name)) {
    return;
  }

  env.commands.set(name, { ...details, name });
}

function appendEnteredCommand(activeWindow, value) {
  const history = activeWindow?.querySelector('.command-history');
  if (!history) {
    return;
  }

  const line = document.createElement('div');
  line.className = 'entered-command';
  line.textContent = `> ${value}`;
  history.append(line);
}

function appendToMainOutput(fragment) {
  const target = document.getElementById('main-input');
  if (!target) {
    return;
  }

  if (typeof fragment === 'string') {
    target.insertAdjacentHTML('beforeend', fragment);
  } else if (fragment instanceof Node) {
    target.append(fragment);
  }

  const wrap = document.getElementById('main-inner');
  scrollToBottom(wrap);
}

function appendMainText(text, tag = 'span') {
  const node = document.createElement(tag);
  node.textContent = text;
  appendToMainOutput(node);
  return node;
}

function createSystemTable(system) {
  const container = document.createElement('div');
  container.innerHTML = `
    <div>${system} containment enclosure....</div>
    <table id="system-output"><tbody>
      <tr><td>Security</td><td>[OK]</td></tr>
      <tr><td>Fence</td><td>[OK]</td></tr>
      <tr><td>Feeding Pavilion</td><td>[OK]</td></tr>
    </tbody></table>
  `;
  return container;
}

function setupTerminalCommands(env) {
  registerCommand(env, {
    name: 'music',
    summary: 'turn background music on or off',
    manPage: [
      'SYNOPSIS',
      '\tmusic [on|off]',
      '',
      'DESCRIPTION',
      "\tManage the state of the 'Dennis Steals the Embryo' music. Use the 'on' state for",
      '\tincreased epicness.',
      '',
      'AUTHOR',
      '\tWritten by <a href="https://tully.io">Tully Robinson</a>.',
    ].join('\n'),
    execute(envRef, inputLine) {
      const [, arg = ''] = inputLine.trim().split(/ +/);
      if (!arg || !/^(?:on|off)$/i.test(arg)) {
        appendMainText('music: must specify state [on|off]');
        return;
      }

      if (arg.toLowerCase() === 'on') {
        if (!envRef.musicOn) {
          envRef.sounds.dennisMusic.play();
        }
        envRef.musicOn = true;
      } else {
        envRef.sounds.dennisMusic.stop();
        envRef.musicOn = false;
      }
    },
  });

  registerCommand(env, {
    name: 'access',
    summary: 'access a target environment on the Jurassic Systems grid',
    manPage: [
      'SYNOPSIS',
      '\taccess [SYSTEM_NAME] [MAGIC_WORD]',
      '',
      'DESCRIPTION',
      '\tGain read and write access to a specified environment.',
      '',
      'AUTHOR',
      '\tWritten by Dennis Nedry.',
    ].join('\n'),
    execute(envRef, inputLine) {
      const tokens = inputLine.trim().split(/ +/);
      const arg = tokens[1] ?? '';
      const magicWord = tokens.length > 2 ? tokens[tokens.length - 1] : '';

      if (!arg) {
        appendMainText('access: must specify target system');
        return;
      }

      if (tokens.length > 2 && magicWord.toLowerCase() === 'please') {
        const image = document.createElement('img');
        image.id = 'asciiNewman';
        image.src = '/img/asciiNewman.jpg';
        image.alt = 'ASCII art of Dennis Nedry';
        image.loading = 'lazy';
        image.decoding = 'async';
        image.addEventListener('load', () => {
          const wrap = document.querySelector('#main-terminal .inner-wrap');
          scrollToBottom(wrap);
        });
        appendToMainOutput(image);
        return;
      }

      appendMainText('access: PERMISSION DENIED.');
      envRef.sounds.beep.play();
      envRef.accessAttempts += 1;

      if (envRef.accessAttempts < 3) {
        return;
      }

      const prompt = document.getElementById('main-prompt');
      prompt?.classList.add('hide');

      blurAllWindows();

      let errorSpamHandle;
      appendMainText('...and...', 'span');

      window.setTimeout(() => {
        envRef.sounds.lockDown.play();
      }, 1000);

      window.setTimeout(() => {
        const environment = document.getElementById('environment');
        if (!environment) {
          return;
        }

        const initialLeft = parseFloat(window.getComputedStyle(environment).left || '0') || 0;
        const targetLeft = initialLeft + 3000;
        environment.style.transition = 'left 2000ms ease';
        environment.style.left = `${targetLeft}px`;

        const handleTransitionEnd = () => {
          environment.removeEventListener('transitionend', handleTransitionEnd);
          window.setTimeout(() => {
            const theKingVideo = document.getElementById('the-king-video');
            if (theKingVideo) {
              const playPromise = theKingVideo.play();
              if (playPromise instanceof Promise) {
                playPromise.catch(() => {});
              }
            }
            window.clearInterval(errorSpamHandle);
            const irixDesktop = document.getElementById('irix-desktop');
            const macHdWindow = document.getElementById('mac-hd-window');
            const kingWindow = document.getElementById('the-king-window');
            if (irixDesktop) {
              irixDesktop.style.display = 'none';
            }
            if (macHdWindow) {
              macHdWindow.style.backgroundImage = "url('/img/macHDBlur.jpg')";
            }
            if (kingWindow) {
              kingWindow.style.display = 'block';
              kingWindow.setAttribute('aria-hidden', 'false');
            }
            window.setTimeout(() => {
              const homeKey = document.getElementById('home-key');
              if (homeKey) {
                homeKey.style.zIndex = '64000';
              }
            }, 10000);
          }, 2000);
        };

        environment.addEventListener('transitionend', handleTransitionEnd);
      }, 2000);

      window.setTimeout(() => {
        errorSpamHandle = window.setInterval(() => {
          const message = document.createElement('div');
          message.textContent = "YOU DIDN'T SAY THE MAGIC WORD!";
          appendToMainOutput(message);
        }, 50);
      }, 1000);
    },
  });

  registerCommand(env, {
    name: 'system',
    summary: "check a system's current status",
    manPage: [
      'SYNOPSIS',
      '\tsystem [SYSTEM_NAME]',
      '',
      'DESCRIPTION',
      "\tCheck the input system and return each sector's current status.",
      '',
      'AUTHOR',
      '\tWritten by Dennis Nedry.',
    ].join('\n'),
    execute(envRef, inputLine) {
      const tokens = inputLine.trim().split(/ +/);
      const arg = tokens[1] ?? '';

      if (!arg) {
        appendToMainOutput('<span>system: must specify target system</span>');
        return;
      }

      const system = `${arg.replace(/s$/i, '')}`;
      const capitalised = `${system.charAt(0).toUpperCase()}${system.slice(1)}`;
      const safeSystem = capitalised.replace(/[&<>"]+/g, (match) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
      })[match]);

      const table = createSystemTable(safeSystem);
      appendToMainOutput(table);

      const prompt = document.getElementById('main-prompt');
      prompt?.classList.add('hide');

      const wrap = document.querySelector('#main-terminal .inner-wrap');
      envRef.sounds.beep.play();
      window.setTimeout(() => {
        envRef.sounds.beep.play();
        appendMainText('System Halt!', 'div');
        scrollToBottom(wrap);
        prompt?.classList.remove('hide');
      }, 900);
    },
  });

  registerCommand(env, {
    name: 'ls',
    summary: 'list files in the current directory',
    manPage: [
      'SYNOPSIS',
      '\tls [FILE] ...',
      '',
      'DESCRIPTION',
      '\tList information about the FILEs (the current directory by default).',
      '',
      'AUTHOR',
      '\tWritten by Richard Stallman and David MacKenzie.',
    ].join('\n'),
    execute() {
      appendMainText('zebraGirl.jpg', 'div');
    },
  });

  registerCommand(env, {
    name: 'display',
    summary: "display image files (hint: use ls to find a 'file')",
    manPage: [
      'SYNOPSIS',
      '\tdisplay file ...',
      '',
      'DESCRIPTION',
      '\tDisplay is a machine architecture independent image processing and display program. It can display an image on any workstation screen running an X server.',
      '',
      'AUTHOR',
      '\tJohn Cristy, ImageMagick Studio.',
    ].join('\n'),
    execute(envRef, inputLine) {
      const tokens = inputLine.trim().split(/ +/);
      if (tokens.length < 2) {
        appendMainText('display: no file specified');
        return;
      }

      if (/zebraGirl\.jpg/i.test(inputLine)) {
        window.setTimeout(() => {
          const zebra = document.getElementById('zebra-girl');
          if (zebra) {
            zebra.style.zIndex = String(envRef.maxIndex += 1);
            zebra.style.display = 'block';
            zebra.setAttribute('aria-hidden', 'false');
            blurAllWindows();
          }
        }, 300);
      }
    },
  });

  registerCommand(env, {
    name: 'keychecks',
    summary: 'display system level command history',
    manPage: [
      'SYNOPSIS',
      '\tkeychecks',
      '',
      'DESCRIPTION',
      '\tA system level command log used for accountability purposes. keychecks must be activated or deactivated via the main board.',
    ].join('\n'),
    execute() {
      const output = [
        '13,42,121,32,88,77,19,13,44,52,77,90,13,99,13,100,13,109,55,103,144,13,99,87,60,13,44,12,09,13,43,63,13,46,57,89,103,122,13,44,52,88,931,13,21,13,57,98,100,102,103,13,112,13,146,13,13,13,77,67,88,23,13,13',
        'system',
        'nedry',
        'go to command level',
        'nedry',
        '040/#xy/67&',
        'mr goodbytes',
        'security',
        'keycheck off',
        'safety off',
        'sl off',
        'security',
        'whte_rbt.obj',
      ].join('\n');
      appendMainText(output, 'div');
    },
  });

  registerCommand(env, {
    name: 'man',
    summary: 'display reference manual for a given command',
    manPage: [
      'SYNOPSIS',
      '\tman title ...',
      '',
      'DESCRIPTION',
      '\tman locates and prints the titled entries from the on-line reference manuals.',
    ].join('\n'),
    execute(envRef, inputLine) {
      const tokens = inputLine.trim().split(/ +/);
      const arg = tokens[1] ?? '';

      if (!arg) {
        appendMainText('What manual page do you want?');
        return;
      }

      const normalized = normalizeCommandKeyword(arg);
      if (envRef.commands.has(normalized)) {
        appendToMainOutput(envRef.commands.get(normalized).manPage.replace(/\n/g, '<br>'));
      } else {
        const safeArg = arg.replace(/[&<>"]+/g, (match) => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
        })[match]);
        appendMainText(`No manual entry for ${safeArg}`);
      }
    },
  });

  registerCommand(env, {
    name: 'help',
    summary: 'list available commands',
    manPage: [
      'SYNOPSIS',
      '\thelp',
      '',
      'DESCRIPTION',
      '\tDisplay a command summary for Jurassic Systems.',
      '',
      'AUTHOR',
      '\tWritten by <a href="https://tully.io">Tully Robinson</a>.',
    ].join('\n'),
    execute(envRef) {
      for (const [, command] of envRef.commands) {
        const line = document.createElement('div');
        line.textContent = `${command.name} - ${command.summary}`;
        appendToMainOutput(line);
      }
    },
  });
}

function setupTerminal(env) {
  const windows = document.querySelectorAll('.irix-window');

  windows.forEach((windowElement) => {
    setupWindowDragging(windowElement, () => {
      env.maxIndex += 1;
      return env.maxIndex;
    });

    windowElement.addEventListener('click', (event) => {
      event.stopPropagation();
      blurAllWindows();
      env.active = windowElement;
      const buffer = windowElement.querySelector('.buffer');
      buffer?.focus();
      windowElement.style.zIndex = String(env.maxIndex += 1);
      windowElement.querySelectorAll('.cursor').forEach((cursor) => {
        cursor.classList.add('active-cursor');
      });
    });
  });

  const buffers = document.querySelectorAll('.irix-window .buffer');
  buffers.forEach((input) => {
    input.addEventListener('keydown', (event) => {
      const windowElement = input.closest('.irix-window');
      if (!windowElement) {
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const line = input.value;
        input.value = '';
        appendEnteredCommand(windowElement, line || ' ');

        if (windowElement.id === 'chess-terminal') {
          const chessInput = document.getElementById('curr-chess-input');
          if (chessInput) {
            chessInput.textContent = '';
          }
        } else {
          const currentInput = document.getElementById('curr-main-input');
          if (currentInput) {
            currentInput.textContent = '';
          }

          const commandName = normalizeCommandKeyword(line.trim().split(/ +/)[0] ?? '');
          const command = env.commands.get(commandName);

          if (command && typeof command.execute === 'function') {
            command.execute(env, line);
          } else if (commandName) {
            appendMainText(`${line.trim().split(/ +/)[0]}: command not found`, 'div');
          }
        }
      }

      const wrap = windowElement.querySelector('.inner-wrap');
      scrollToBottom(wrap);
    });

    input.addEventListener('input', () => {
      const windowElement = input.closest('.irix-window');
      if (!windowElement) {
        return;
      }

      if (windowElement.id === 'chess-terminal') {
        const chessInput = document.getElementById('curr-chess-input');
        if (chessInput) {
          chessInput.textContent = input.value;
        }
      } else {
        const currentInput = document.getElementById('curr-main-input');
        if (currentInput) {
          currentInput.textContent = input.value;
        }
      }
    });
  });

  const mainTerminal = document.getElementById('main-terminal');
  if (mainTerminal) {
    env.active = mainTerminal;
    mainTerminal.querySelectorAll('.cursor').forEach((cursor) => {
      cursor.classList.add('active-cursor');
    });
  }
}

function setupIntro() {
  window.setTimeout(() => {
    const boot = document.getElementById('irix-boot');
    boot?.remove();

    const mainBuffer = document.getElementById('main-buffer');
    mainBuffer?.focus();

    if (!window.location.pathname.includes('system')) {
      mainBuffer?.blur();
      const intro = document.getElementById('intro');
      if (intro) {
        intro.style.display = 'block';
        intro.setAttribute('aria-hidden', 'false');
        const continueButton = document.getElementById('continue-button');
        const introScene = document.getElementById('intro-scene');

        const dismiss = () => {
          if (introScene instanceof HTMLIFrameElement) {
            introScene.src = '';
          }
          fadeOut(intro, 1000);
          intro.setAttribute('aria-hidden', 'true');
        };

        intro.addEventListener('click', dismiss, { once: true });
        if (continueButton) {
          continueButton.setAttribute('role', 'button');
          continueButton.setAttribute('tabindex', '0');
          continueButton.setAttribute('aria-label', 'Continue to console');
          continueButton.addEventListener('click', (event) => {
            event.stopPropagation();
            dismiss();
          });
          continueButton.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              dismiss();
            }
          });
        }
      }
    }
  }, 4500);
}

function setupGlobalListeners() {
  document.body.addEventListener('click', () => {
    blurAllWindows();
  });

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
    }
  });

  const appleDesktop = document.getElementById('apple-desktop');
  appleDesktop?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const kingWindow = target.closest('.mac-window');
    if (!kingWindow || kingWindow.id !== 'the-king-window') {
      flicker('the-king-blur', 50, 450);
    }
  });
}

function initialise() {
  preloadImages();
  const env = createCommandEnvironment();
  setupTerminalCommands(env);
  setupTerminal(env);
  setupIntro();
  setupGlobalListeners();
}

document.addEventListener('DOMContentLoaded', initialise);
