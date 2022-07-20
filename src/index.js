import NES from './core/nes.js';

// Html
const canvas = document.getElementById('canvas');
const rominput = document.getElementById('rominput');
const fullscreen = document.getElementById('fullscreen');
const frameskip = document.getElementById('frameskip');
const status = document.getElementById('status')

// Nes
const nes = new NES(); // Ready to use :3
nes.attachCanvas(canvas);
nes.onkeypause = unpaused => {
    unpaused ? setStatus('Unpaused!', 0) : setStatus('Paused!', 0);
};
nes.onkeyreset = () => setStatus('Reset!', 1);

window.nes = nes; // DEBUG ;)
function startNESWithRomBuff(romBuff) {
    // romBuff should be a Uint8Array buffer
    nes.stop();
    nes.loadRomBuff(romBuff);
    nes.start();
}

// Fullscreen
var isfullscreen = false;
fullscreen.onclick = function() {
    if (isfullscreen) {
        isfullscreen = false;
        canvas.style.width = '';
        canvas.style.height = '';
        canvas.style.position = '';
        canvas.style.top = '';
        canvas.style.left = '';
    }
    else {
        isfullscreen = true;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
    }
};

// Frameskip
var isframeskip = nes.frameskip;
frameskip.onclick = function() {
    if (isframeskip) {
        isframeskip = false;
        nes.setFrameskip(false);
        setStatus('Frameskip Disabled!', 0);
    }
    else {
        isframeskip = true;
        nes.setFrameskip(true);
        setStatus('Frameskip Enabled!', 0);
    }
};

// Status text
var statusTimeout = null;
function setStatus(msg, fadetype) {
    status.innerHTML = msg;

    var fade = [1100, 1700][fadetype];
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(clearStatus, fade);
}
function clearStatus() {
    status.innerHTML = '';
    clearTimeout(statusTimeout);
}

// Rom Input
rominput.onchange = function(e) {
    var file = e.target.files[0];
    readFile(file);
};
function readFile(file) {
    if (!file)
        throw 'excuse me .. come back when ur making sense';

    var reader = new FileReader();
    reader.onload = function() {
        startNESWithRomBuff(reader.result);
        setStatus('Loaded ROM!', 0);
    };

    reader.readAsArrayBuffer(file);
}

// Done :)
setStatus('Its pooptendin\' time', 1);

console.log(nes);