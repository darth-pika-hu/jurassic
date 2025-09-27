import { isAccessCommand } from './accessCommand.js';

const $ = window.jQuery;

if (!$) {
  throw new Error('Jurassic Systems requires jQuery to be loaded before jurassicSystems.js.');
}

const noop = () => {};

const createSilentSound = () => ({
  play: noop,
  stop: noop,
});

const resetAudio = (audio) => {
  try {
    audio.currentTime = 0;
  } catch (error) {
    // Some browsers throw if currentTime is set before metadata has loaded.
  }
};

const createSound = (sources, { loop = false } = {}) => {
  if (typeof window.Audio === 'undefined') {
    return createSilentSound();
  }

  const audio = document.createElement('audio');
  audio.preload = 'auto';
  audio.loop = loop;

  sources.forEach((src) => {
    const source = document.createElement('source');
    source.src = src;
    audio.appendChild(source);
  });

  const play = () => {
    if (!loop) {
      resetAudio(audio);
    }

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(noop);
    }
  };

  const stop = () => {
    audio.pause();
    resetAudio(audio);
  };

  return { play, stop };
};

const normalizeCommandName = (name) => {
  if (!name) {
    return '';
  }

  if (isAccessCommand(name)) {
    return 'access';
  }

  return name.toLowerCase();
};

const scrollToBottom = ($element) => {
  if (!$element || $element.length === 0) {
    return;
  }

  const node = $element.get(0);
  node.scrollTop = node.scrollHeight;
};

const jpTerminal = (() => {
  const env = {
    accessAttempts: 0,
    active: null,
    commands: {},
    maxIndex: 1,
    musicOn: false,
    sounds: {
      beep: createSilentSound(),
      lockDown: createSilentSound(),
      dennisMusic: createSilentSound(),
    },
  };

  const api = {};

  api.buildCommandLine = (line) => {
    if (!env.active || env.active.length === 0) {
      return;
    }

    const trimmedLine = line.trim();
    const commandName = trimmedLine.split(/\s+/)[0] || '';
    const lookupName = normalizeCommandName(commandName);
    const commandDetails = lookupName ? env.commands[lookupName] : undefined;

    env.active
      .find('.command-history')
      .append($('<div class="entered-command">').text(`> ${line}`));

    if (commandDetails && typeof commandDetails.command === 'function') {
      commandDetails.command(env, line);
    } else if (commandName) {
      env.active
        .find('.command-history')
        .append($('<div>').text(`${commandName}: command not found`));
    }
  };

  api.addCommand = (details) => {
    if (!details || !details.name || typeof details.command !== 'function') {
      return;
    }

    const normalizedName = normalizeCommandName(details.name.trim());

    if (!normalizedName || env.commands[normalizedName]) {
      return;
    }

    env.commands[normalizedName] = {
      ...details,
      name: details.name,
    };
  };

  api.setActive = (active) => {
    const $active = $(active);

    if ($active.length > 0) {
      env.active = $active;
    }
  };

  api.getActive = () => env.active;

  api.nextIndex = () => {
    env.maxIndex += 1;
    return env.maxIndex;
  };

  api.init = () => {
    env.sounds.beep = createSound([
      '/snd/beep.ogg',
      '/snd/beep.mp3',
      '/snd/beep.wav',
    ]);

    env.sounds.lockDown = createSound([
      '/snd/lockDown.ogg',
      '/snd/lockDown.mp3',
      '/snd/lockDown.wav',
    ]);

    env.sounds.dennisMusic = createSound([
      '/snd/dennisMusic.ogg',
      '/snd/dennisMusic.mp3',
      '/snd/dennisMusic.wav',
    ], { loop: true });
  };

  api.scrollActiveToBottom = () => {
    if (!env.active || env.active.length === 0) {
      return;
    }

    const wrap = env.active.find('.inner-wrap');
    scrollToBottom(wrap);
  };

  return api;
})();

jpTerminal.init();
jpTerminal.setActive('#main-terminal');

jpTerminal.addCommand({
  name: 'music',
  summary: 'turn background music on or off',
  manPage: 'SYNOPSIS\n' +
           '\tmusic [on|off]\n\n' +
           'DESCRIPTION\n' +
           '\tManage the state of the \'Dennis Steals the Embryo\' ' +
           'music. Use the \'on\' state for\n\tincreased epicness.\n\n' +
           'AUTHOR\n' +
           '\tWritten by <a href="https://tully.io">Tully Robinson</a>.\n',
  command: (env, inputLine) => {
    const arg = inputLine.trim().split(/\s+/)[1] || '';
    const output = $('<span/>').text('music: must specify state [on|off]');

    if (!arg || !/^(?:on|off)$/i.test(arg)) {
      $('#main-input').append(output);
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

jpTerminal.addCommand({
  name: 'access',
  summary: 'access a target environment on the Jurassic Systems grid',
  manPage: 'SYNOPSIS\n' +
           '\taccess [SYSTEM_NAME] [MAGIC_WORD]\n\n' +
           'DESCRIPTION\n' +
           '\tGain read and write access to a specified environment.\n\n' +
           'AUTHOR\n' +
           '\tWritten by Dennis Nedry.\n',
  command: (env, inputLine) => {
    const output = $('<span>').text('access: PERMISSION DENIED.');
    const arg = inputLine.split(/ +/)[1] || '';
    const magicWord = inputLine.substring(inputLine.trim().lastIndexOf(' ')) || '';

    if (arg === '') {
      $('#main-input').append($('<span/>')
        .text('access: must specify target system'));
      return;
    }

    if (inputLine.split(' ').length > 2 && magicWord.trim() === 'please') {
      const asciiNewman = $('<img>', {
        id: 'asciiNewman',
        src: '/img/asciiNewman.jpg',
        alt: 'ASCII Dennis Nedry',
      });

      $('#main-input').append(asciiNewman);
      asciiNewman.on('load', () => {
        const wrap = $('.inner-wrap', env.active);
        scrollToBottom(wrap);
      });
      return;
    }

    $('#main-input').append(output);
    env.sounds.beep.play();

    env.accessAttempts += 1;

    if (env.accessAttempts >= 3) {
      const andMessage = $('<span>').text('...and...');
      let errorSpamId = null;

      $('.irix-window').off('keydown');
      $('#main-prompt').addClass('hide');

      window.setTimeout(() => {
        $('#main-input').append(andMessage);
      }, 200);

      window.setTimeout(() => {
        env.sounds.lockDown.play();
      }, 1000);

      window.setTimeout(() => {
        $('#environment').animate(
          { left: '+=3000' },
          2000,
          () => {
            window.setTimeout(() => {
              const theKingVideo = document.getElementById('the-king-video');

              if (errorSpamId !== null) {
                window.clearInterval(errorSpamId);
              }

              if (theKingVideo) {
                theKingVideo.currentTime = 0;
                const playPromise = theKingVideo.play();
                if (playPromise && typeof playPromise.catch === 'function') {
                  playPromise.catch(noop);
                }
              }

              $('#irix-desktop').hide();
              $('#mac-hd-window').css('background-image', 'url(/img/macHDBlur.jpg)');
              $('#the-king-window').show();
            }, 2000);
          },
        );
      }, 4000);

      window.setTimeout(() => {
        errorSpamId = window.setInterval(() => {
          const errorMessage = $('<div>').text("YOU DIDN'T SAY THE MAGIC WORD!");
          $('#main-input').append(errorMessage);
          scrollToBottom($('#main-inner'));
        }, 50);
      }, 1000);
    }
  },
});

jpTerminal.addCommand({
  name: 'system',
  summary: "check a system's current status",
  manPage: 'SYNOPSIS\n' +
           '\tsystem [SYSTEM_NAME]\n\n' +
           'DESCRIPTION\n' +
           "\tCheck the input system and return each sector's " +
           'current status.\n\n' +
           'AUTHOR\n' +
           '\tWritten by Dennis Nedry.\n',
  command: (env, inputLine) => {
    const arg = inputLine.split(/ +/)[1] || '';
    let output = '<span>system: must specify target system</span>';

    if (arg.length > 0) {
      let system = arg.replace(/s$/, '');
      system = system[0].toUpperCase() + system.slice(1);
      system = $('<div/>').text(system).html();
      output = '<div>' + system + ' containment enclosure....</div>' +
               '<table id="system-output"><tbody>' +
               '<tr><td>Security</td><td>[OK]</td></tr>' +
               '<tr><td>Fence</td><td>[OK]</td></tr>' +
               '<tr><td>Feeding Pavilion</td><td>[OK]</td></tr>' +
               '</tbody></table>';

      $('#main-prompt').addClass('hide');
      $('#main-input').append($(output));
      output = '<div>System Halt!</div>';
      env.sounds.beep.play();

      window.setTimeout(() => {
        const wrap = $('.inner-wrap', env.active);
        env.sounds.beep.play();
        $('#main-input').append($(output));
        scrollToBottom(wrap);
        $('#main-prompt').removeClass('hide');
      }, 900);
    } else {
      $('#main-input').append($(output));
    }
  },
});

jpTerminal.addCommand({
  name: 'ls',
  summary: 'list files in the current directory',
  manPage: 'SYNOPSIS\n' +
           '\tls [FILE] ...\n\n' +
           'DESCRIPTION\n' +
           '\tList information about the FILEs ' +
           '(the current directory by default).\n\n' +
           'AUTHOR\n' +
           '\tWritten by Richard Stallman and David MacKenzie.\n',
  command: () => {
    $('#main-input').append($('<div>zebraGirl.jpg</div>'));
  },
});

jpTerminal.addCommand({
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
  command: (env, inputLine) => {
    const args = inputLine.trim().split(/\s+/);

    if (args.length < 2) {
      $('#main-input')
        .append($('<span>display: no file specified</span>'));
      return;
    }

    if (inputLine.match(/zebraGirl\.jpg/)) {
      window.setTimeout(() => {
        $('#zebra-girl').css('z-index', jpTerminal.nextIndex());
        $('#zebra-girl').show();
        blurAllWindows();
      }, 300);
    }
  },
});

jpTerminal.addCommand({
  name: 'keychecks',
  summary: 'display system level command history',
  manPage: 'SYNOPSIS\n' +
           '\tkeychecks\n\n' +
           'DESCRIPTION\n' +
           '\tA system level command log used for accountability ' +
           'purposes. keychecks must be\n\tactivated or deactivated ' +
           'via the main board.\n',
  command: () => {
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
    $('#main-input').append(output);
  },
});

jpTerminal.addCommand({
  name: 'man',
  summary: 'display reference manual for a given command',
  manPage: 'SYNOPSIS\n' +
           '\tman title ...\n\n' +
           'DESCRIPTION\n' +
           '\tman locates and prints the titled entries from the on-line ' +
           'reference manuals.\n',
  command: (env, inputLine) => {
    const arg = inputLine.trim().split(/ +/)[1] || '';
    let output = 'What manual page do you want?';

    const normalizedArg = normalizeCommandName(arg);

    if (normalizedArg && env.commands[normalizedArg]) {
      output = env.commands[normalizedArg].manPage;
    } else if (arg) {
      output = 'No manual entry for ' + $('<div/>').text(arg).html();
    }

    $('#main-input').append(output);
  },
});

jpTerminal.addCommand({
  name: 'help',
  summary: 'list available commands',
  manPage: 'SYNOPSIS\n' +
            '\thelp\n\n' +
            'DESCRIPTION\n' +
            '\tDisplay a command summary for Jurassic Systems.\n\n' +
            'AUTHOR\n' +
            '\tWritten by <a href="https://tully.io">Tully Robinson</a>.\n',
  command: (env) => {
    Object.values(env.commands).forEach((commandDetails) => {
      env.active
        .find('.command-history')
        .append($('<div>')
          .text(`${commandDetails.name} - ${commandDetails.summary}`));
    });
  },
});

const blurAllWindows = () => {
  $('.cursor', '.irix-window').removeClass('active-cursor');
  $('.buffer').blur();
};

$(function initUI() {
  ['theKingBlur.jpg',
    'theKingFocus.jpg',
    'macHDBlur.jpg',
    'asciiNewman.jpg',
    'zebraGirlWindow.jpg',
  ].forEach((image) => {
    const preloadImage = new Image();
    preloadImage.src = `/img/${image}`;
  });

  window.setTimeout(() => {
    $('#irix-boot').remove();
    $('#main-buffer').trigger('focus');
  }, 4500);

  $('body').on('click', blurAllWindows);

  let dragOffsetX = 0;
  let dragOffsetY = 0;

  $('.window-bar').on('mousedown', function startDrag(event) {
    const $window = $(this).parent()
      .css('z-index', jpTerminal.nextIndex())
      .addClass('dragging');

    dragOffsetY = event.pageY - $window.offset().top;
    dragOffsetX = event.pageX - $window.offset().left;
    event.preventDefault();
  });

  $('body').on('mousemove', (event) => {
    const $dragging = $('.dragging');

    if ($dragging.length === 0) {
      return;
    }

    $dragging.offset({
      top: event.pageY - dragOffsetY,
      left: event.pageX - dragOffsetX,
    });
  });

  $('body').on('mouseup', () => {
    $('.dragging').removeClass('dragging');
  });

  $('.irix-window').on('click', function activateWindow(event) {
    event.stopPropagation();
    blurAllWindows();
    jpTerminal.setActive(this);
    $('.buffer', this).trigger('focus');
    $(this).css('z-index', jpTerminal.nextIndex());
    $(this).find('.cursor').addClass('active-cursor');
  });

  $(window).on('keydown', (event) => {
    const arrowKeys = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'];
    if (arrowKeys.includes(event.key)) {
      event.preventDefault();
    }
  });

  $('.irix-window').on('keydown', function handleKeydown(event) {
    const { key } = event;
    const activeTerminal = jpTerminal.getActive();

    if (!activeTerminal || activeTerminal.length === 0) {
      return;
    }

    if (key === 'Enter') {
      const buffer = activeTerminal.find('.buffer');
      const line = buffer.val();
      buffer.val('');

      if (activeTerminal.attr('id') === 'chess-terminal') {
        $('#curr-chess-input').html('');
        activeTerminal.find('.command-history')
          .append($('<div class="entered-command">')
            .text(line || ' '));
      } else {
        $('#curr-main-input').html('');
        jpTerminal.buildCommandLine(line);
      }
    }

    const wrap = activeTerminal.find('.inner-wrap');
    scrollToBottom(wrap);
  });

  $('#main-terminal .buffer').on('input', function syncMainInput() {
    $('#curr-main-input').text($(this).val());
  });

  $('#chess-terminal .buffer').on('input', function syncChessInput() {
    $('#curr-chess-input').text($(this).val());
  });

  $('#apple-desktop').on('click', (event) => {
    if ($(event.target).closest('.mac-window').attr('id') !== 'the-king-window') {
      flicker('the-king-blur', 50, 450);
    }
  });
});

const flicker = (altId, interval, duration) => {
  let visible = true;
  const alt = $(`#${altId}`).show();
  const flickering = window.setInterval(() => {
    alt.css('opacity', visible ? '1' : '0');
    visible = !visible;
  }, interval);

  window.setTimeout(() => {
    window.clearInterval(flickering);
    alt.css('opacity', '0');
    alt.hide();
  }, duration);
};
