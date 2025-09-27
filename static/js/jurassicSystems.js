import { isAccessCommand } from './modules/accessValidator.js';

const IMAGES_TO_PRELOAD = [
  'theKingBlur.jpg',
  'theKingFocus.jpg',
  'macHDBlur.jpg',
  'macHDFocus.jpg',
  'asciiNewman.jpg',
  'zebraGirlWindow.jpg'
];

const AUDIO_SOURCES = {
  beep: { src: '/snd/beep.mp3' },
  lockDown: { src: '/snd/lockDown.mp3' },
  dennisMusic: { src: '/snd/dennisMusic.mp3', loop: true }
};

function createAudio({ src, loop = false }) {
  const audio = new Audio(src);
  audio.loop = loop;
  audio.preload = 'auto';
  audio.load();
  const play = () => {
    try {
      audio.currentTime = 0;
      const promise = audio.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => {});
      }
    } catch (error) {
      // Ignore playback errors triggered by browser autoplay policies.
    }
  };

  const stop = () => {
    audio.pause();
    audio.currentTime = 0;
  };

  return { element: audio, play, stop };
}

function preloadImages(images) {
  images.forEach((name) => {
    const img = new Image();
    img.src = `/img/${name}`;
  });
}

function scrollHistory(historyElement) {
  const wrap = historyElement.closest('.inner-wrap');
  if (wrap) {
    wrap.scrollTop = wrap.scrollHeight;
  }
}

function replaceNewLinesWithBreaks(value) {
  return value.replace(/\n/g, '<br>');
}

class JurassicTerminal {
  constructor(doc) {
    this.doc = doc;
    this.commands = new Map();
    this.sounds = {};
    this.activeWindow = null;
    this.accessAttempts = 0;
    this.musicOn = false;
    this.lockedDown = false;
    this.errorSpamInterval = null;
    this.draggingWindow = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.maxZIndex = this.computeInitialZIndex();

    this.elements = {
      environment: doc.getElementById('environment'),
      irixDesktop: doc.getElementById('irix-desktop'),
      appleDesktop: doc.getElementById('apple-desktop'),
      mainTerminal: doc.getElementById('main-terminal'),
      chessTerminal: doc.getElementById('chess-terminal'),
      zebraGirl: doc.getElementById('zebra-girl'),
      mainInput: doc.getElementById('main-input'),
      chessHistory: doc.querySelector('#chess-terminal .command-history'),
      mainPrompt: doc.getElementById('main-prompt'),
      mainBuffer: doc.getElementById('main-buffer'),
      chessBuffer: doc.getElementById('chess-buffer'),
      mainPreview: doc.getElementById('curr-main-input'),
      chessPreview: doc.getElementById('curr-chess-input'),
      mainCursor: doc.getElementById('main-cursor'),
      chessCursor: doc.getElementById('chess-cursor'),
      homeKey: doc.getElementById('home-key'),
      theKingWindow: doc.getElementById('the-king-window'),
      theKingVideo: doc.getElementById('the-king-video'),
      theKingBlur: doc.getElementById('the-king-blur'),
      macHdWindow: doc.getElementById('mac-hd-window'),
      irixBoot: doc.getElementById('irix-boot')
    };
  }

  computeInitialZIndex() {
    return Array.from(this.doc.querySelectorAll('.irix-window, .mac-window'))
      .map((el) => parseInt(window.getComputedStyle(el).zIndex || '1', 10))
      .reduce((max, current) => (Number.isFinite(current) ? Math.max(max, current) : max), 1);
  }

  init() {
    this.setupAudio();
    this.registerCommands();
    this.bindEvents();
    preloadImages(IMAGES_TO_PRELOAD);
    this.startBootSequence();
    this.setActiveWindow(this.elements.mainTerminal);
  }

  setupAudio() {
    Object.entries(AUDIO_SOURCES).forEach(([name, details]) => {
      this.sounds[name] = createAudio(details);
    });
  }

  registerCommands() {
    this.addCommand({
      name: 'music',
      summary: 'turn background music on or off',
      manPage: [
        'SYNOPSIS',
        '\tmusic [on|off]',
        '',
        'DESCRIPTION',
        "\tManage the state of the 'Dennis Steals the Embryo' music.",
        '\tUse the \'on\' state for increased epicness.',
        '',
        'AUTHOR',
        '\tWritten by <a href="https://tully.io" rel="noopener" target="_blank">Tully Robinson</a>.'
      ].join('\n'),
      execute: (line) => {
        const [, arg = ''] = line.trim().split(/\s+/);
        if (!arg || !/^(?:on|off)$/i.test(arg)) {
          this.appendTextLine(this.elements.mainInput, 'music: must specify state [on|off]');
          return;
        }

        if (arg.toLowerCase() === 'on') {
          if (!this.musicOn) {
            this.sounds.dennisMusic.play();
          }
          this.musicOn = true;
        } else {
          this.sounds.dennisMusic.stop();
          this.musicOn = false;
        }
      }
    });

    this.addCommand({
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
        '\tWritten by Dennis Nedry.'
      ].join('\n'),
      execute: (line) => {
        const tokens = line.trim().split(/\s+/).filter(Boolean);
        const targetSystem = tokens[1] || '';
        const magicWord = tokens.length > 2 ? tokens[tokens.length - 1] : '';

        if (!targetSystem) {
          this.appendTextLine(this.elements.mainInput, 'access: must specify target system');
          return;
        }

        if (tokens.length > 2 && magicWord.toLowerCase() === 'please') {
          const asciiNewman = this.doc.createElement('img');
          asciiNewman.id = 'asciiNewman';
          asciiNewman.src = '/img/asciiNewman.jpg';
          asciiNewman.alt = 'Dennis Nedry ASCII art';
          asciiNewman.addEventListener('load', () => {
            scrollHistory(this.elements.mainInput);
          });
          this.elements.mainInput.append(asciiNewman);
          return;
        }

        this.appendTextLine(this.elements.mainInput, 'access: PERMISSION DENIED.');
        this.sounds.beep.play();

        if (this.lockedDown) {
          return;
        }

        this.accessAttempts += 1;
        if (this.accessAttempts >= 3) {
          this.triggerLockdown();
        }
      }
    });

    this.addCommand({
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
        '\tWritten by Dennis Nedry.'
      ].join('\n'),
      execute: (line) => {
        const [, arg = ''] = line.trim().split(/\s+/);
        if (!arg) {
          this.appendHTML(this.elements.mainInput, '<span>system: must specify target system</span>');
          return;
        }

        const systemName = `${arg.replace(/s$/, '')}`;
        const sanitizedName = this.doc.createElement('div');
        sanitizedName.textContent = systemName.charAt(0).toUpperCase() + systemName.slice(1);

        const statusHtml = [
          `<div>${sanitizedName.textContent} containment enclosure....</div>`,
          '<table id="system-output"><tbody>',
          '<tr><td>Security</td><td>[OK]</td></tr>',
          '<tr><td>Fence</td><td>[OK]</td></tr>',
          '<tr><td>Feeding Pavilion</td><td>[OK]</td></tr>',
          '</tbody></table>'
        ].join('');

        this.elements.mainPrompt.classList.add('hide');
        this.appendHTML(this.elements.mainInput, statusHtml);
        this.sounds.beep.play();

        setTimeout(() => {
          this.appendHTML(this.elements.mainInput, '<div>System Halt!</div>');
          scrollHistory(this.elements.mainInput);
          this.elements.mainPrompt.classList.remove('hide');
          this.sounds.beep.play();
        }, 900);
      }
    });

    this.addCommand({
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
        '\tWritten by Richard Stallman and David MacKenzie.'
      ].join('\n'),
      execute: () => {
        this.appendTextLine(this.elements.mainInput, 'zebraGirl.jpg');
      }
    });

    this.addCommand({
      name: 'display',
      summary: "display image files (hint: use ls to find a 'file')",
      manPage: [
        'SYNOPSIS',
        '\tdisplay file ...',
        '',
        'DESCRIPTION',
        '\tDisplay is a machine architecture independent image processing and display program.',
        '\tIt can <strong>display</strong> an image on any workstation screen running an X server.',
        '',
        'AUTHOR',
        '\tJohn Cristy, ImageMagick Studio.'
      ].join('\n'),
      execute: (line) => {
        const args = line.trim().split(/\s+/);
        if (args.length < 2) {
          this.appendTextLine(this.elements.mainInput, 'display: no file specified');
          return;
        }

        if (/zebraGirl\.jpg/i.test(line)) {
          setTimeout(() => {
            const zebra = this.elements.zebraGirl;
            if (!zebra) {
              return;
            }
            zebra.style.display = 'block';
            zebra.setAttribute('aria-hidden', 'false');
            zebra.style.zIndex = String(this.nextZIndex());
            this.blurAllWindows();
          }, 300);
        }
      }
    });

    this.addCommand({
      name: 'keychecks',
      summary: 'display system level command history',
      manPage: [
        'SYNOPSIS',
        '\tkeychecks',
        '',
        'DESCRIPTION',
        '\tA system level command log used for accountability purposes. keychecks must be activated',
        '\tor deactivated via the main board.'
      ].join('\n'),
      execute: () => {
        const log = [
          '13,42,121,32,88,77,19,13,44,52,77,90,13,99,13,100,13,109,55,103,144,',
          '13,99,87,60,13,44,12,09,13,43,63,13,46,57,89,103,122,13,44,52,88,931,',
          '13,21,13,57,98,100,102,103,13,112,13,146,13,13,13,77,67,88,23,13,13\n',
          'system\n',
          'nedry\n',
          'go to command level\n',
          'nedry\n',
          '040/#xy/67&\n',
          'mr goodbytes\n',
          'security\n',
          'keycheck off\n',
          'safety off\n',
          'sl off\n',
          'security\n',
          'whte_rbt.obj\n'
        ].join('');
        this.appendTextLine(this.elements.mainInput, log);
      }
    });

    this.addCommand({
      name: 'man',
      summary: 'display reference manual for a given command',
      manPage: [
        'SYNOPSIS',
        '\tman title ...',
        '',
        'DESCRIPTION',
        '\tman locates and prints the titled entries from the on-line reference manuals.'
      ].join('\n'),
      execute: (line) => {
        const [, arg = ''] = line.trim().split(/\s+/);
        if (!arg) {
          this.appendTextLine(this.elements.mainInput, 'What manual page do you want?');
          return;
        }

        const command = this.commands.get(arg);
        if (command) {
          this.appendHTML(this.elements.mainInput, `<div>${replaceNewLinesWithBreaks(command.manPage)}</div>`);
        } else if (isAccessCommand(arg)) {
          const accessCommand = this.commands.get('access');
          if (accessCommand) {
            this.appendHTML(this.elements.mainInput, `<div>${replaceNewLinesWithBreaks(accessCommand.manPage)}</div>`);
          }
        } else {
          const safeArg = this.doc.createElement('div');
          safeArg.textContent = arg;
          this.appendTextLine(this.elements.mainInput, `No manual entry for ${safeArg.textContent}`);
        }
      }
    });

    this.addCommand({
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
        '\tWritten by <a href="https://tully.io" rel="noopener" target="_blank">Tully Robinson</a>.'
      ].join('\n'),
      execute: () => {
        this.commands.forEach((command) => {
          this.appendTextLine(
            this.elements.mainInput,
            `${command.name} - ${command.summary}`
          );
        });
      }
    });
  }

  addCommand(command) {
    if (!command.name || typeof command.execute !== 'function') {
      return;
    }
    this.commands.set(command.name, command);
  }

  appendTextLine(container, text, className) {
    if (!container) {
      return null;
    }
    const line = this.doc.createElement('div');
    if (className) {
      line.className = className;
    }
    line.textContent = text;
    container.append(line);
    scrollHistory(container);
    return line;
  }

  appendHTML(container, html) {
    if (!container) {
      return null;
    }
    const wrapper = this.doc.createElement('div');
    wrapper.innerHTML = html;
    container.append(wrapper);
    scrollHistory(container);
    return wrapper;
  }

  executeCommandLine(line) {
    if (!this.activeWindow) {
      return;
    }

    const history = this.activeWindow.querySelector('.command-history');
    if (!history) {
      return;
    }

    this.appendTextLine(history, `> ${line}`, 'entered-command');

    const commandName = line.trim().split(/\s+/)[0] || '';
    let command = this.commands.get(commandName);
    if (!command && isAccessCommand(commandName)) {
      command = this.commands.get('access');
    }

    if (command) {
      command.execute(line);
    } else if (commandName) {
      this.appendTextLine(history, `${commandName}: command not found`);
    }
  }

  nextZIndex() {
    this.maxZIndex += 1;
    return this.maxZIndex;
  }

  setActiveWindow(windowElement) {
    if (!windowElement) {
      return;
    }

    this.activeWindow = windowElement;

    this.doc.querySelectorAll('.cursor').forEach((cursor) => {
      cursor.classList.remove('active-cursor');
    });

    const cursor = windowElement.querySelector('.cursor');
    if (cursor) {
      cursor.classList.add('active-cursor');
    }

    const buffer = windowElement.querySelector('.buffer');
    if (buffer) {
      buffer.focus();
    }
  }

  blurAllWindows() {
    this.doc.querySelectorAll('.cursor').forEach((cursor) => {
      cursor.classList.remove('active-cursor');
    });
    this.doc.querySelectorAll('.buffer').forEach((buffer) => {
      buffer.blur();
    });
    this.activeWindow = null;
  }

  bindEvents() {
    this.doc.body.addEventListener('click', () => {
      this.blurAllWindows();
    });

    this.doc.querySelectorAll('.irix-window, .mac-window').forEach((windowEl) => {
      windowEl.addEventListener('click', (event) => {
        event.stopPropagation();
        this.setActiveWindow(windowEl);
        windowEl.style.zIndex = String(this.nextZIndex());
      });
    });

    this.doc.querySelectorAll('.window-bar').forEach((bar) => {
      bar.addEventListener('pointerdown', (event) => {
        const parentWindow = bar.parentElement;
        if (!parentWindow) {
          return;
        }
        this.draggingWindow = parentWindow;
        const rect = parentWindow.getBoundingClientRect();
        this.dragOffsetX = event.clientX - rect.left;
        this.dragOffsetY = event.clientY - rect.top;
        parentWindow.classList.add('dragging');
        parentWindow.style.zIndex = String(this.nextZIndex());
        bar.setPointerCapture(event.pointerId);
        event.preventDefault();
      });

      bar.addEventListener('pointermove', (event) => {
        if (!this.draggingWindow || !bar.hasPointerCapture(event.pointerId)) {
          return;
        }
        this.draggingWindow.style.left = `${event.pageX - this.dragOffsetX}px`;
        this.draggingWindow.style.top = `${event.pageY - this.dragOffsetY}px`;
      });

      bar.addEventListener('pointerup', (event) => {
        if (this.draggingWindow) {
          this.draggingWindow.classList.remove('dragging');
        }
        if (bar.hasPointerCapture(event.pointerId)) {
          bar.releasePointerCapture(event.pointerId);
        }
        this.draggingWindow = null;
      });

      bar.addEventListener('pointercancel', (event) => {
        if (this.draggingWindow) {
          this.draggingWindow.classList.remove('dragging');
        }
        if (bar.hasPointerCapture(event.pointerId)) {
          bar.releasePointerCapture(event.pointerId);
        }
        this.draggingWindow = null;
      });
    });

    window.addEventListener('keydown', (event) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
      }
    });

    if (this.elements.mainBuffer) {
      this.elements.mainBuffer.addEventListener('input', () => {
        if (this.elements.mainPreview) {
          this.elements.mainPreview.textContent = this.elements.mainBuffer.value;
        }
      });
      this.elements.mainBuffer.addEventListener('keydown', (event) => {
        this.handleBufferKeydown(event, 'main');
      });
    }

    if (this.elements.chessBuffer) {
      this.elements.chessBuffer.addEventListener('input', () => {
        if (this.elements.chessPreview) {
          this.elements.chessPreview.textContent = this.elements.chessBuffer.value;
        }
      });
      this.elements.chessBuffer.addEventListener('keydown', (event) => {
        this.handleBufferKeydown(event, 'chess');
      });
    }

    const appleDesktop = this.elements.appleDesktop;
    if (appleDesktop && this.elements.theKingBlur) {
      appleDesktop.addEventListener('click', (event) => {
        if (event.target instanceof Element && event.target.closest('#the-king-window')) {
          return;
        }
        this.flicker('the-king-blur', 50, 450);
      });
    }
  }

  handleBufferKeydown(event, terminal) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
    }

    if (this.lockedDown) {
      event.preventDefault();
      return;
    }

    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      const value = event.target.value;
      event.target.value = '';

      if (terminal === 'chess') {
        if (this.elements.chessPreview) {
          this.elements.chessPreview.textContent = '';
        }
        if (this.elements.chessHistory) {
          const line = value || ' ';
          const entry = this.doc.createElement('div');
          entry.className = 'entered-command';
          entry.textContent = line;
          this.elements.chessHistory.append(entry);
          scrollHistory(this.elements.chessHistory);
        }
      } else {
        if (this.elements.mainPreview) {
          this.elements.mainPreview.textContent = '';
        }
        this.executeCommandLine(value);
        scrollHistory(this.elements.mainInput);
      }
    }
  }

  startBootSequence() {
    if (this.elements.irixBoot) {
      setTimeout(() => {
        this.elements.irixBoot?.remove();
        this.elements.mainBuffer?.focus();
      }, 4500);
    }
  }

  flicker(elementId, interval, duration) {
    const target = this.doc.getElementById(elementId);
    if (!target) {
      return;
    }

    target.style.display = 'block';
    let visible = true;
    target.style.opacity = '1';

    const flickerInterval = setInterval(() => {
      visible = !visible;
      target.style.opacity = visible ? '1' : '0';
    }, interval);

    setTimeout(() => {
      clearInterval(flickerInterval);
      target.style.opacity = '0';
      target.style.display = 'none';
    }, duration);
  }

  triggerLockdown() {
    this.lockedDown = true;
    if (this.elements.mainPrompt) {
      this.elements.mainPrompt.classList.add('hide');
    }

    setTimeout(() => {
      this.appendTextLine(this.elements.mainInput, '...and...');
    }, 200);

    setTimeout(() => {
      this.sounds.lockDown.play();
    }, 1000);

    setTimeout(() => {
      this.errorSpamInterval = window.setInterval(() => {
        this.appendTextLine(this.elements.mainInput, "YOU DIDN'T SAY THE MAGIC WORD!");
      }, 50);
    }, 1000);

    setTimeout(() => {
      this.slideEnvironment().then(() => {
        setTimeout(() => {
          if (this.errorSpamInterval) {
            window.clearInterval(this.errorSpamInterval);
            this.errorSpamInterval = null;
          }

          if (this.elements.theKingVideo) {
            const playPromise = this.elements.theKingVideo.play();
            if (playPromise && typeof playPromise.catch === 'function') {
              playPromise.catch(() => {});
            }
          }

          if (this.elements.irixDesktop) {
            this.elements.irixDesktop.style.display = 'none';
          }

          if (this.elements.macHdWindow) {
            this.elements.macHdWindow.style.backgroundImage = "url('/img/macHDBlur.jpg')";
          }

          if (this.elements.theKingWindow) {
            this.elements.theKingWindow.style.display = 'block';
            this.elements.theKingWindow.setAttribute('aria-hidden', 'false');
          }

          setTimeout(() => {
            if (this.elements.homeKey) {
              this.elements.homeKey.style.zIndex = '64000';
            }
          }, 10000);
        }, 2000);
      });
    }, 4000);
  }

  slideEnvironment() {
    return new Promise((resolve) => {
      const environment = this.elements.environment;
      if (!environment) {
        resolve();
        return;
      }

      environment.style.transition = 'transform 2s ease-in-out';
      environment.style.transform = 'translateX(3000px)';

      const cleanup = () => {
        environment.removeEventListener('transitionend', handleTransitionEnd);
        environment.style.transition = '';
        resolve();
      };

      const fallback = window.setTimeout(cleanup, 2200);

      const handleTransitionEnd = () => {
        window.clearTimeout(fallback);
        cleanup();
      };

      environment.addEventListener('transitionend', handleTransitionEnd, { once: true });
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new JurassicTerminal(document);
  app.init();
});
