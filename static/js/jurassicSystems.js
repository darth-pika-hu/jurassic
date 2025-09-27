import { matchesAccessCommandName } from './commands/access.js';

const mainTerminal = document.getElementById('main-terminal');
const mainBuffer = document.getElementById('main-buffer');
const mainInner = document.getElementById('main-inner');
const mainOutput = document.getElementById('main-input');
const mainPrompt = document.getElementById('main-prompt');
const currMainInput = document.getElementById('curr-main-input');
const chessBuffer = document.getElementById('chess-buffer');
const chessInner = document.getElementById('chess-inner');
const chessHistory = chessInner?.querySelector('.command-history');
const currChessInput = document.getElementById('curr-chess-input');

const zebraGirl = document.getElementById('zebra-girl');
const environmentEl = document.getElementById('environment');
const irixDesktop = document.getElementById('irix-desktop');
const appleDesktop = document.getElementById('apple-desktop');
const macHdWindow = document.getElementById('mac-hd-window');
const theKingWindow = document.getElementById('the-king-window');
const theKingVideo = document.getElementById('the-king-video');
const theKingBlur = document.getElementById('the-king-blur');
const bootOverlay = document.getElementById('irix-boot');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const env = {
  accessAttempts: 0,
  active: null,
  commands: [],
  lockedDown: false,
  maxIndex: 1,
  musicOn: false,
  sounds: null,
};

let errorSpamInterval = null;

const buffers = [mainBuffer, chessBuffer].filter(Boolean);

function createAudio(url, { loop = false } = {}) {
  const audio = new Audio(url);
  audio.preload = 'auto';
  audio.loop = loop;

  return {
    element: audio,
    play() {
      audio.currentTime = 0;
      const playResult = audio.play();
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(() => {});
      }
    },
    stop() {
      audio.pause();
      audio.currentTime = 0;
    },
  };
}

function createSounds() {
  return {
    beep: createAudio('/snd/beep.mp3'),
    lockDown: createAudio('/snd/lockDown.mp3'),
    dennisMusic: createAudio('/snd/dennisMusic.mp3', { loop: true }),
  };
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function appendElementToMain(element) {
  mainOutput.append(element);
  scrollMain();
  return element;
}

function appendTextLine(text) {
  const line = document.createElement('div');
  line.textContent = text;
  return appendElementToMain(line);
}

function appendSpan(text) {
  const span = document.createElement('span');
  span.textContent = text;
  return appendElementToMain(span);
}

function appendHtml(html, tag = 'div') {
  const container = document.createElement(tag);
  container.innerHTML = html;
  return appendElementToMain(container);
}

function appendManual(text) {
  const html = text
    .replace(/\n/g, '<br>')
    .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
  return appendHtml(html);
}

function scrollMain() {
  if (mainInner) {
    mainInner.scrollTop = mainInner.scrollHeight;
  }
}

function scrollActive() {
  if (!env.active) {
    return;
  }
  const wrap = env.active.querySelector('.inner-wrap');
  if (wrap) {
    wrap.scrollTop = wrap.scrollHeight;
  }
}

function addCommand({ name, summary, manPage, execute, matcher, aliases = [] }) {
  const primary = name.trim().toLowerCase();
  const aliasList = aliases.map(alias => alias.trim().toLowerCase());
  const matches = matcher || (candidate => {
    const normalized = candidate.trim().toLowerCase();
    return normalized === primary || aliasList.includes(normalized);
  });

  env.commands.push({
    name,
    summary,
    manPage,
    execute,
    matches,
    primary,
    aliases: aliasList,
  });
}

function findCommand(name) {
  if (!name) {
    return undefined;
  }
  return env.commands.find(command => command.matches(name));
}

function createCommandContext(line) {
  return {
    appendHtml,
    appendManual,
    appendSpan,
    appendTextLine,
    appendElementToMain,
    env,
    line,
    scrollActive,
    scrollMain,
    startLockdown,
  };
}

function appendEnteredCommand(line) {
  if (!env.active) {
    return;
  }
  const history = env.active.querySelector('.command-history');
  if (!history) {
    return;
  }
  const entered = document.createElement('div');
  entered.className = 'entered-command';
  entered.textContent = `> ${line}`;
  history.append(entered);
}

function buildCommandLine(line) {
  appendEnteredCommand(line);

  const trimmed = line.trim();
  const commandName = trimmed.split(/\s+/)[0] || '';
  const command = findCommand(commandName);

  if (command) {
    command.execute(createCommandContext(line));
  } else if (commandName) {
    appendTextLine(`${commandName}: command not found`);
  }

  scrollMain();
  scrollActive();
}

function blurAllWindows() {
  document.querySelectorAll('.cursor').forEach(cursor => {
    cursor.classList.remove('active-cursor');
  });
  buffers.forEach(buffer => buffer && buffer.blur());
  env.active = null;
}

function bringToFront(windowEl) {
  env.maxIndex += 1;
  windowEl.style.zIndex = String(env.maxIndex);
}

function setActiveWindow(windowEl) {
  if (!windowEl) {
    return;
  }

  if (env.active && env.active !== windowEl) {
    env.active.querySelectorAll('.cursor').forEach(cursor => {
      cursor.classList.remove('active-cursor');
    });
  }

  env.active = windowEl;
  bringToFront(windowEl);

  const cursor = windowEl.querySelector('.cursor');
  if (cursor) {
    cursor.classList.add('active-cursor');
  }

  const buffer = windowEl.querySelector('.buffer');
  if (buffer) {
    buffer.focus({ preventScroll: true });
    const valueLength = buffer.value.length;
    buffer.setSelectionRange(valueLength, valueLength);
  }
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
    setActiveWindow(windowEl);
    windowEl.classList.add('dragging');
    bringToFront(windowEl);
    bar.setPointerCapture(pointerId);
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', releasePointer);
    event.preventDefault();
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
  let visible = false;
  element.style.opacity = '0';
  element.style.display = 'block';
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

function clearMagicWordSpam() {
  if (errorSpamInterval !== null) {
    window.clearInterval(errorSpamInterval);
    errorSpamInterval = null;
  }
}

function finalizeLockdownView() {
  clearMagicWordSpam();
  if (irixDesktop) {
    irixDesktop.style.display = 'none';
  }
  if (macHdWindow) {
    macHdWindow.style.backgroundImage = 'url(/img/macHDBlur.jpg)';
  }
  if (theKingWindow) {
    theKingWindow.style.display = 'block';
    bringToFront(theKingWindow);
  }
  if (theKingVideo) {
    const playResult = theKingVideo.play();
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch(() => {
        theKingVideo.muted = true;
        theKingVideo.play().catch(() => {});
      });
    }
  }
}

function startLockdown() {
  if (env.lockedDown) {
    return;
  }

  env.lockedDown = true;
  buffers.forEach(buffer => {
    buffer.disabled = true;
    buffer.blur();
  });
  mainPrompt?.classList.add('hide');

  window.setTimeout(() => {
    appendSpan('...and...');
  }, 200);

  window.setTimeout(() => {
    env.sounds.lockDown.play();
  }, 1000);

  window.setTimeout(() => {
    errorSpamInterval = window.setInterval(() => {
      appendTextLine("YOU DIDN'T SAY THE MAGIC WORD!");
    }, 50);
  }, 1000);

  const shiftEnvironment = () => {
    if (!environmentEl) {
      finalizeLockdownView();
      return;
    }

    if (prefersReducedMotion || typeof environmentEl.animate !== 'function') {
      environmentEl.style.transform = 'translateX(3000px)';
      window.setTimeout(finalizeLockdownView, 2000);
      return;
    }

    const animation = environmentEl.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(3000px)' },
      ],
      {
        duration: 2000,
        easing: 'ease-in-out',
        fill: 'forwards',
      },
    );

    animation.addEventListener('finish', () => {
      window.setTimeout(finalizeLockdownView, 2000);
    });
    animation.addEventListener('cancel', () => {
      window.setTimeout(finalizeLockdownView, 2000);
    });
  };

  window.setTimeout(shiftEnvironment, 4000);
}

function setupMainTerminalCommands() {
  addCommand({
    name: 'music',
    summary: 'turn background music on or off',
    manPage: 'SYNOPSIS\n' +
      '\tmusic [on|off]\n\n' +
      'DESCRIPTION\n' +
      '\tManage the state of the \'Dennis Steals the Embryo\' ' +
      'music. Use the \'on\' state for\n\tincreased epicness.\n\n' +
      'AUTHOR\n' +
      '\tWritten by <a href="https://tully.io">Tully Robinson</a>.\n',
    execute: ({ env, line, appendTextLine }) => {
      const arg = line.trim().split(/ +/)[1] || '';
      if (!arg || !/^(?:on|off)$/i.test(arg)) {
        appendTextLine('music: must specify state [on|off]');
        return;
      }

      if (arg.toLowerCase() === 'on') {
        if (!env.musicOn) {
          env.sounds.dennisMusic.play();
        }
        env.musicOn = true;
      } else {
        env.sounds.dennisMusic.stop();
        env.musicOn = false;
      }
    },
  });

  addCommand({
    name: 'access',
    summary: 'access a target environment on the Jurassic Systems grid',
    manPage: 'SYNOPSIS\n' +
      '\taccess [SYSTEM_NAME] [MAGIC_WORD]\n\n' +
      'DESCRIPTION\n' +
      '\tGain read and write access to a specified environment.\n\n' +
      'AUTHOR\n' +
      '\tWritten by Dennis Nedry.\n',
    matcher: matchesAccessCommandName,
    execute: ({ env, line, appendSpan, appendTextLine, appendElementToMain }) => {
      const tokens = line.trim().split(/ +/);
      const arg = tokens[1] || '';
      if (!arg) {
        appendTextLine('access: must specify target system');
        return;
      }

      const magicWord = tokens.length > 2 ? tokens[tokens.length - 1] : '';
      if (tokens.length > 2 && magicWord.toLowerCase() === 'please') {
        const ascii = document.createElement('img');
        ascii.id = 'asciiNewman';
        ascii.src = '/img/asciiNewman.jpg';
        ascii.alt = 'Dennis Nedry ASCII art';
        ascii.addEventListener('load', scrollMain);
        appendElementToMain(ascii);
        return;
      }

      appendSpan('access: PERMISSION DENIED.');
      env.sounds.beep.play();
      env.accessAttempts += 1;
      if (env.accessAttempts >= 3) {
        startLockdown();
      }
    },
  });

  addCommand({
    name: 'system',
    summary: "check a system's current status",
    manPage: 'SYNOPSIS\n' +
      '\tsystem [SYSTEM_NAME]\n\n' +
      'DESCRIPTION\n' +
      "\tCheck the input system and return each sector's " +
      'current status.\n\n' +
      'AUTHOR\n' +
      '\tWritten by Dennis Nedry.\n',
    execute: ({ line, appendHtml, appendTextLine, scrollMain, scrollActive }) => {
      const arg = line.split(/ +/)[1] || '';
      if (!arg) {
        appendHtml('<span>system: must specify target system</span>');
        return;
      }

      let system = arg.replace(/s$/, '');
      system = system.charAt(0).toUpperCase() + system.slice(1);
      const safeSystem = escapeHtml(system);
      const tableHtml = '<div>' + safeSystem + ' containment enclosure....</div>' +
        '<table id="system-output"><tbody>' +
        '<tr><td>Security</td><td>[OK]</td></tr>' +
        '<tr><td>Fence</td><td>[OK]</td></tr>' +
        '<tr><td>Feeding Pavilion</td><td>[OK]</td></tr>' +
        '</tbody></table>';

      mainPrompt?.classList.add('hide');
      appendHtml(tableHtml);
      env.sounds.beep.play();

      window.setTimeout(() => {
        env.sounds.beep.play();
        appendHtml('<div>System Halt!</div>');
        mainPrompt?.classList.remove('hide');
        scrollMain();
        scrollActive();
      }, 900);
    },
  });

  addCommand({
    name: 'ls',
    summary: 'list files in the current directory',
    manPage: 'SYNOPSIS\n' +
      '\tls [FILE] ...\n\n' +
      'DESCRIPTION\n' +
      '\tList information about the FILEs ' +
      '(the current directory by default).\n\n' +
      'AUTHOR\n' +
      '\tWritten by Richard Stallman and David MacKenzie.\n',
    execute: ({ appendTextLine }) => {
      appendTextLine('zebraGirl.jpg');
    },
  });

  addCommand({
    name: 'display',
    summary: "display image files (hint: use ls to find a 'file')",
    manPage: 'SYNOPSIS\n' +
      '\tdisplay file ...\n\n' +
      'DESCRIPTION\n' +
      '\tDisplay is a machine architecture independent image ' +
      'processing and display\n\tprogram. It can ' +
      '<strong>display</strong> an image on any workstation screen ' +
      'running an X server.\n\n' +
      'AUTHOR\n' +
      '\tJohn Cristy, ImageMagick Studio.\n',
    execute: ({ line, appendTextLine }) => {
      const args = line.trim().split(' ');
      if (args.length < 2) {
        appendTextLine('display: no file specified');
        return;
      }

      if (/zebraGirl\.jpg/i.test(line) && zebraGirl) {
        window.setTimeout(() => {
          zebraGirl.style.zIndex = String(++env.maxIndex);
          zebraGirl.style.display = 'block';
          blurAllWindows();
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
      '\tA system level command log used for accountability ' +
      'purposes. keychecks must be\n\tactivated or deactivated ' +
      'via the main board.\n',
    execute: ({ appendTextLine }) => {
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
      appendTextLine(output);
    },
  });

  addCommand({
    name: 'man',
    summary: 'display reference manual for a given command',
    manPage: 'SYNOPSIS\n' +
      '\tman title ...\n\n' +
      'DESCRIPTION\n' +
      '\tman locates and prints the titled entries from the on-line ' +
      'reference manuals.\n',
    execute: ({ line, appendManual, appendTextLine }) => {
      const arg = line.trim().split(/ +/)[1] || '';
      if (!arg) {
        appendTextLine('What manual page do you want?');
        return;
      }

      const command = findCommand(arg);
      if (command) {
        appendManual(command.manPage);
      } else {
        appendTextLine(`No manual entry for ${arg}`);
      }
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
    execute: ({ appendTextLine }) => {
      env.commands.forEach(command => {
        appendTextLine(`${command.name} - ${command.summary}`);
      });
    },
  });
}

function setupEventHandlers() {
  document.body.addEventListener('click', blurAllWindows);

  [...document.querySelectorAll('.irix-window, .mac-window')].forEach(windowEl => {
    windowEl.addEventListener('click', event => {
      event.stopPropagation();
      setActiveWindow(windowEl);
    });
    windowEl.addEventListener('pointerdown', () => setActiveWindow(windowEl));
    windowEl.addEventListener('focus', () => setActiveWindow(windowEl));
    setupDraggable(windowEl);
  });

  if (mainBuffer) {
    mainBuffer.addEventListener('input', () => {
      currMainInput.textContent = mainBuffer.value;
    });

    mainBuffer.addEventListener('keydown', event => {
      if (env.lockedDown) {
        event.preventDefault();
        return;
      }

      if (event.key === 'Enter') {
        const line = mainBuffer.value;
        mainBuffer.value = '';
        currMainInput.textContent = '';
        buildCommandLine(line);
      }
    });
  }

  if (chessBuffer && chessHistory) {
    chessBuffer.addEventListener('input', () => {
      currChessInput.textContent = chessBuffer.value;
    });

    chessBuffer.addEventListener('keydown', event => {
      if (env.lockedDown) {
        event.preventDefault();
        return;
      }

      if (event.key === 'Enter') {
        const line = chessBuffer.value;
        chessBuffer.value = '';
        currChessInput.textContent = '';
        const entry = document.createElement('div');
        entry.className = 'entered-command';
        entry.textContent = line || ' ';
        chessHistory.append(entry);
        if (chessInner) {
          chessInner.scrollTop = chessInner.scrollHeight;
        }
      }
    });
  }

  window.addEventListener('keydown', event => {
    const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (arrowKeys.includes(event.key)) {
      event.preventDefault();
    }
  }, { passive: false });

  if (appleDesktop && theKingBlur) {
    appleDesktop.addEventListener('click', event => {
      if (event.target.closest('#the-king-window')) {
        return;
      }
      flicker(theKingBlur, 50, 450);
    });
  }
}

function init() {
  env.sounds = createSounds();
  setupMainTerminalCommands();
  setupEventHandlers();
  setActiveWindow(mainTerminal);
  preloadImages([
    'theKingBlur.jpg',
    'theKingFocus.jpg',
    'macHDBlur.jpg',
    'asciiNewman.jpg',
    'zebraGirlWindow.jpg',
  ]);

  window.setTimeout(() => {
    bootOverlay?.remove();
    mainBuffer?.focus({ preventScroll: true });
  }, 4500);
}

init();
