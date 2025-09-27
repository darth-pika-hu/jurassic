import { isAccessCommandName } from './commandMatchers.js';

const createAudio = (sources, { loop = false } = {}) => {
  const audio = document.createElement('audio');
  audio.preload = 'auto';
  audio.loop = loop;

  sources.forEach(({ src, type }) => {
    const source = document.createElement('source');
    source.src = src;
    if (type) {
      source.type = type;
    }
    audio.append(source);
  });

  const play = () => {
    try {
      audio.currentTime = 0;
      const result = audio.play();
      if (result && typeof result.catch === 'function') {
        result.catch(() => {});
      }
    } catch (error) {
      // Ignore playback interruptions (e.g., autoplay restrictions)
    }
  };

  const stop = () => {
    audio.pause();
    audio.currentTime = 0;
  };

  return { element: audio, play, stop };
};

const jpTerminal = (() => {
  const env = {
    accessAttempts: 0,
    active: null,
    commands: new Map(),
    maxIndex: 10,
    musicOn: false,
    sounds: {},
  };

  const appendToActive = (value, { html = false } = {}) => {
    const history = env.active?.querySelector('.command-history');
    if (!history) {
      return null;
    }

    if (value instanceof Node) {
      history.append(value);
      scrollActive();
      return value;
    }

    if (html) {
      history.insertAdjacentHTML('beforeend', value);
      scrollActive();
      return history.lastElementChild;
    }

    history.append(value);
    scrollActive();
    return history.lastChild;
  };

  const scrollActive = () => {
    const wrap = env.active?.querySelector('.inner-wrap');
    if (wrap) {
      wrap.scrollTop = wrap.scrollHeight;
    }
  };

  const buildCommandLine = (line) => {
    const trimmed = line.trim();
    const commandNameRaw = trimmed.split(/\s+/)[0] || '';

    const commandEntry = document.createElement('div');
    commandEntry.className = 'entered-command';
    commandEntry.textContent = `> ${line}`;
    appendToActive(commandEntry);

    if (!commandNameRaw) {
      return;
    }

    const lowerName = commandNameRaw.toLowerCase();
    let command = env.commands.get(lowerName);

    if (!command) {
      command = Array.from(env.commands.values()).find((candidate) =>
        typeof candidate.matcher === 'function' && candidate.matcher(commandNameRaw)
      );
    }

    if (command) {
      command.execute(env, line, appendToActive);
    } else {
      const missing = document.createElement('div');
      missing.textContent = `${commandNameRaw}: command not found`;
      appendToActive(missing);
    }
  };

  const addCommand = (details) => {
    if (!details?.name || typeof details.execute !== 'function') {
      return;
    }

    const key = details.name.toLowerCase();
    if (env.commands.has(key)) {
      return;
    }

    env.commands.set(key, details);
  };

  const setActive = (active) => {
    if (!active) {
      return;
    }

    env.active = active;
  };

  const getActive = () => env.active;

  const nextIndex = () => {
    env.maxIndex += 1;
    return env.maxIndex;
  };

  const init = () => {
    env.sounds.beep = createAudio([
      { src: '/snd/beep.ogg', type: 'audio/ogg' },
      { src: '/snd/beep.mp3', type: 'audio/mpeg' },
      { src: '/snd/beep.wav', type: 'audio/wav' },
    ]);

    env.sounds.lockDown = createAudio([
      { src: '/snd/lockDown.ogg', type: 'audio/ogg' },
      { src: '/snd/lockDown.mp3', type: 'audio/mpeg' },
      { src: '/snd/lockDown.wav', type: 'audio/wav' },
    ]);

    env.sounds.dennisMusic = createAudio([
      { src: '/snd/dennisMusic.ogg', type: 'audio/ogg' },
      { src: '/snd/dennisMusic.mp3', type: 'audio/mpeg' },
      { src: '/snd/dennisMusic.wav', type: 'audio/wav' },
    ], { loop: true });
  };

  return {
    addCommand,
    buildCommandLine,
    getActive,
    init,
    nextIndex,
    setActive,
    appendToActive,
    scrollActive,
    env,
  };
})();

const blurAllWindows = () => {
  document.querySelectorAll('.cursor').forEach((cursor) => {
    cursor.classList.remove('active-cursor');
  });
  document.querySelectorAll('.buffer').forEach((buffer) => buffer.blur());
};

const cacheImages = (paths) => {
  paths.forEach((path) => {
    const image = new Image();
    image.src = path;
  });
};

const flicker = (id, interval, duration) => {
  const alt = document.getElementById(id);
  if (!alt) {
    return;
  }

  let visible = true;
  alt.style.opacity = '1';

  const flickering = window.setInterval(() => {
    alt.style.opacity = visible ? '1' : '0';
    visible = !visible;
  }, interval);

  window.setTimeout(() => {
    window.clearInterval(flickering);
    alt.style.opacity = '0';
  }, duration);
};

const preventArrowScroll = (event) => {
  if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)) {
    event.preventDefault();
  }
};

const handleWindowKeydown = (event) => {
  const activeTerminal = jpTerminal.getActive();

  if (!activeTerminal) {
    return;
  }

  if (event.key === 'Enter') {
    const buffer = activeTerminal.querySelector('.buffer');
    if (!buffer) {
      return;
    }

    const line = buffer.value;
    buffer.value = '';

    if (activeTerminal.id === 'chess-terminal') {
      const history = activeTerminal.querySelector('.command-history');
      if (history) {
        const entry = document.createElement('div');
        entry.className = 'entered-command';
        entry.textContent = line || ' ';
        history.append(entry);
      }
      const chessInput = document.getElementById('curr-chess-input');
      if (chessInput) {
        chessInput.textContent = '';
      }
    } else {
      const mainInput = document.getElementById('curr-main-input');
      if (mainInput) {
        mainInput.textContent = '';
      }
      jpTerminal.buildCommandLine(line);
    }
  }

  const wrap = activeTerminal.querySelector('.inner-wrap');
  if (wrap) {
    wrap.scrollTop = wrap.scrollHeight;
  }
};

const registerCommands = () => {
  const { addCommand, appendToActive, env, scrollActive } = jpTerminal;

  addCommand({
    name: 'music',
    summary: 'turn background music on or off',
    manPage: 'SYNOPSIS\n' +
      '\tmusic [on|off]\n\n' +
      'DESCRIPTION\n' +
      '\tManage the state of the \'Dennis Steals the Embryo\' music. Use the \'on\' state for\n\tincreased epicness.\n\n' +
      'AUTHOR\n' +
      '\tWritten by <a href="https://tully.io">Tully Robinson</a>.\n',
    execute: (environment, inputLine) => {
      const arg = inputLine.trim().split(/ +/)[1] || '';

      if (!arg || !/^(?:on|off)$/i.test(arg)) {
        const output = document.createElement('span');
        output.textContent = 'music: must specify state [on|off]';
        appendToActive(output);
        return;
      }

      const desiredState = arg.toLowerCase();
      if (desiredState === 'on' && !environment.musicOn) {
        environment.sounds.dennisMusic.play();
        environment.musicOn = true;
      } else if (desiredState === 'off') {
        environment.sounds.dennisMusic.stop();
        environment.musicOn = false;
      }
    },
  });

  addCommand({
    name: 'access',
    matcher: isAccessCommandName,
    summary: 'access a target environment on the Jurassic Systems grid',
    manPage: 'SYNOPSIS\n' +
      '\taccess [SYSTEM_NAME] [MAGIC_WORD]\n\n' +
      'DESCRIPTION\n' +
      '\tGain read and write access to a specified environment.\n\n' +
      'AUTHOR\n' +
      '\tWritten by Dennis Nedry.\n',
    execute: (environment, inputLine) => {
      const arg = inputLine.split(/ +/)[1] || '';
      const magicWord = inputLine.substring(inputLine.trim().lastIndexOf(' ')) || '';

      if (arg === '') {
        const output = document.createElement('span');
        output.textContent = 'access: must specify target system';
        appendToActive(output);
        return;
      }

      if (inputLine.split(' ').length > 2 && magicWord.trim() === 'please') {
        const asciiNewman = document.createElement('img');
        asciiNewman.id = 'asciiNewman';
        asciiNewman.src = '/img/asciiNewman.jpg';
        asciiNewman.alt = 'ASCII Dennis Nedry';
        appendToActive(asciiNewman);
        asciiNewman.addEventListener('load', () => scrollActive());
        return;
      }

      const denial = document.createElement('span');
      denial.textContent = 'access: PERMISSION DENIED.';
      appendToActive(denial);
      environment.sounds.beep.play();

      environment.accessAttempts += 1;
      if (environment.accessAttempts >= 3) {
        const prompt = document.getElementById('main-prompt');
        if (prompt) {
          prompt.classList.add('hide');
        }

        let errorSpam = null;

        window.setTimeout(() => {
          const andMessage = document.createElement('span');
          andMessage.textContent = '...and...';
          appendToActive(andMessage);
        }, 200);

        window.setTimeout(() => {
          environment.sounds.lockDown.play();
        }, 1000);

        window.setTimeout(() => {
          const desktop = document.getElementById('irix-desktop');
          const appleDesktop = document.getElementById('apple-desktop');
          const theKingWindow = document.getElementById('the-king-window');
          const macHdWindow = document.getElementById('mac-hd-window');
          const environmentContainer = document.getElementById('environment');

          if (environmentContainer) {
            const animation = environmentContainer.animate([
              { transform: 'translateX(0)' },
              { transform: 'translateX(3000px)' },
            ], {
              duration: 2000,
              fill: 'forwards',
              easing: 'ease-in-out',
            });

            const onFinish = () => {
              window.setTimeout(() => {
                if (errorSpam) {
                  window.clearInterval(errorSpam);
                }

                const theKingVideo = document.getElementById('the-king-video');
                if (theKingVideo) {
                  try {
                    theKingVideo.play();
                  } catch (error) {
                    // Autoplay restrictions may block playback; ignore.
                  }
                }

                if (desktop) {
                  desktop.style.display = 'none';
                }

                if (macHdWindow) {
                  macHdWindow.style.backgroundImage = 'url(/img/macHDBlur.jpg)';
                }

                if (theKingWindow) {
                  theKingWindow.hidden = false;
                  theKingWindow.style.display = 'block';
                }

                if (appleDesktop) {
                  appleDesktop.style.left = '10px';
                }
              }, 2000);
            };

            if (animation && animation.finished) {
              animation.finished.then(onFinish).catch(() => {});
            } else {
              window.setTimeout(onFinish, 2000);
            }
          }
        }, 4000);

        window.setTimeout(() => {
          errorSpam = window.setInterval(() => {
            const errorMessage = document.createElement('div');
            errorMessage.textContent = "YOU DIDN'T SAY THE MAGIC WORD!";
            appendToActive(errorMessage);
          }, 50);
        }, 1000);

        document.querySelectorAll('.irix-window').forEach((windowEl) => {
          windowEl.removeEventListener('keydown', handleWindowKeydown);
        });
      }
    },
  });

  addCommand({
    name: 'system',
    summary: "check a system's current status",
    manPage: 'SYNOPSIS\n' +
      '\tsystem [SYSTEM_NAME]\n\n' +
      'DESCRIPTION\n' +
      "\tCheck the input system and return each sector's current status.\n\n" +
      'AUTHOR\n' +
      '\tWritten by Dennis Nedry.\n',
    execute: (environment, inputLine) => {
      const arg = inputLine.split(/ +/)[1] || '';
      if (!arg) {
        appendToActive('<span>system: must specify target system</span>', { html: true });
        return;
      }

      let system = arg.replace(/s$/, '');
      system = system.charAt(0).toUpperCase() + system.slice(1);
      const safeSystem = document.createElement('div');
      safeSystem.textContent = system;

      const output = '<div>' + safeSystem.innerHTML + ' containment enclosure....</div>' +
        '<table id="system-output"><tbody>' +
        '<tr><td>Security</td><td>[OK]</td></tr>' +
        '<tr><td>Fence</td><td>[OK]</td></tr>' +
        '<tr><td>Feeding Pavilion</td><td>[OK]</td></tr>' +
        '</tbody></table>';

      const prompt = document.getElementById('main-prompt');
      if (prompt) {
        prompt.classList.add('hide');
      }

      appendToActive(output, { html: true });
      environment.sounds.beep.play();

      window.setTimeout(() => {
        environment.sounds.beep.play();
        appendToActive('<div>System Halt!</div>', { html: true });
        if (prompt) {
          prompt.classList.remove('hide');
        }
      }, 900);
    },
  });

  addCommand({
    name: 'ls',
    summary: 'list files in the current directory',
    manPage: 'SYNOPSIS\n' +
      '\tls [FILE] ...\n\n' +
      'DESCRIPTION\n' +
      '\tList information about the FILEs (the current directory by default).\n\n' +
      'AUTHOR\n' +
      '\tWritten by Richard Stallman and David MacKenzie.\n',
    execute: () => {
      appendToActive('<div>zebraGirl.jpg</div>', { html: true });
    },
  });

  addCommand({
    name: 'display',
    summary: "display image files (hint: use ls to find a 'file')",
    manPage: 'SYNOPSIS\n' +
      '\tdisplay file ...\n\n' +
      'DESCRIPTION\n' +
      '\tDisplay is a machine architecture independent image processing and display\n\tprogram. It can <strong>display</strong> an image on any workstation screen running an X server.\n\n' +
      'AUTHOR\n' +
      '\tJohn Cristy, ImageMagick Studio.\n',
    execute: (environment, inputLine) => {
      const args = inputLine.trim().split(' ');
      if (args.length < 2) {
        appendToActive('<span>display: no file specified</span>', { html: true });
        return;
      }

      if (/zebraGirl\.jpg/i.test(inputLine)) {
        window.setTimeout(() => {
          const zebraGirl = document.getElementById('zebra-girl');
          if (zebraGirl) {
            zebraGirl.style.zIndex = String(jpTerminal.nextIndex());
            zebraGirl.hidden = false;
            zebraGirl.style.display = 'block';
            blurAllWindows();
          }
        }, 300);
      }
    },
  });

  addCommand({
    name: 'keychecks',
    summary: 'display system level command history',
    manPage: 'SYNOPSIS\n' +
      '\tkeychecks\n\n' +
      'DESCRIPTION\n' +
      '\tA system level command log used for accountability purposes. keychecks must be\n\tactivated or deactivated via the main board.\n',
    execute: () => {
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

      appendToActive(output);
    },
  });

  addCommand({
    name: 'man',
    summary: 'display reference manual for a given command',
    manPage: 'SYNOPSIS\n' +
      '\tman title ...\n\n' +
      'DESCRIPTION\n' +
      '\tman locates and prints the titled entries from the on-line reference manuals.\n',
    execute: (environment, inputLine) => {
      const arg = inputLine.trim().split(/ +/)[1] || '';
      let output = 'What manual page do you want?';

      if (environment.commands.has(arg.toLowerCase())) {
        output = environment.commands.get(arg.toLowerCase()).manPage;
        appendToActive(output, { html: true });
        return;
      }

      if (arg) {
        const safeArg = document.createElement('div');
        safeArg.textContent = arg;
        output = 'No manual entry for ' + safeArg.innerHTML;
        appendToActive(output, { html: true });
        return;
      }

      appendToActive(output);
    },
  });

  addCommand({
    name: 'help',
    summary: 'list available commands',
    manPage: 'SYNOPSIS\n' +
      '\thelp\n\n' +
      'DESCRIPTION\n' +
      '\tDisplay a command summary for Jurassic Systems.\n\n' +
      'AUTHOR\n' +
      '\tWritten by <a href="https://tully.io">Tully Robinson</a>.\n',
    execute: (environment) => {
      environment.commands.forEach((details) => {
        const entry = document.createElement('div');
        entry.textContent = `${details.name} - ${details.summary}`;
        appendToActive(entry);
      });
    },
  });
};

const setupInteractions = () => {
  const mainBuffer = document.getElementById('main-buffer');
  const chessBuffer = document.getElementById('chess-buffer');
  const mainInput = document.getElementById('curr-main-input');
  const chessInput = document.getElementById('curr-chess-input');
  const mainTerminal = document.getElementById('main-terminal');
  const windows = Array.from(document.querySelectorAll('.irix-window'));

  if (mainBuffer) {
    mainBuffer.addEventListener('input', () => {
      if (mainInput) {
        mainInput.textContent = mainBuffer.value;
      }
    });
  }

  if (chessBuffer) {
    chessBuffer.addEventListener('input', () => {
      if (chessInput) {
        chessInput.textContent = chessBuffer.value;
      }
    });
  }

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
    dragging.style.zIndex = String(jpTerminal.nextIndex());
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

  windows.forEach((windowEl) => {
    windowEl.addEventListener('click', (event) => {
      event.stopPropagation();
      blurAllWindows();
      jpTerminal.setActive(windowEl);
      windowEl.style.zIndex = String(jpTerminal.nextIndex());
      const cursor = windowEl.querySelector('.cursor');
      if (cursor) {
        cursor.classList.add('active-cursor');
      }
      const buffer = windowEl.querySelector('.buffer');
      if (buffer) {
        buffer.focus();
      }
    });

    windowEl.addEventListener('keydown', handleWindowKeydown);
  });

  document.addEventListener('click', blurAllWindows);
  window.addEventListener('keydown', preventArrowScroll);

  if (mainTerminal) {
    jpTerminal.setActive(mainTerminal);
    const cursor = mainTerminal.querySelector('.cursor');
    if (cursor) {
      cursor.classList.add('active-cursor');
    }
    if (mainBuffer) {
      mainBuffer.focus();
    }
  }
};

const setupAppleDesktop = () => {
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

const removeBootScreen = () => {
  window.setTimeout(() => {
    const boot = document.getElementById('irix-boot');
    if (boot) {
      boot.remove();
    }
    const mainBuffer = document.getElementById('main-buffer');
    if (mainBuffer) {
      mainBuffer.focus();
    }
  }, 4500);
};

const init = () => {
  cacheImages([
    '/img/theKingBlur.jpg',
    '/img/theKingFocus.jpg',
    '/img/macHDBlur.jpg',
    '/img/asciiNewman.jpg',
    '/img/zebraGirlWindow.jpg',
  ]);

  jpTerminal.init();
  registerCommands();
  setupInteractions();
  setupAppleDesktop();
  removeBootScreen();
};

document.addEventListener('DOMContentLoaded', init);
