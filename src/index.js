import NES from './core/nes.js';

window.onload = function() {

// Html
const canvas = document.getElementById('canvas');
const status = document.getElementById('status');
const rominput = document.getElementById('rominput');
const saveinput = document.getElementById('saveinput');

const settingsdiv = document.getElementById('settingsdiv');
const minimize = document.getElementById('minimize');
const fullscreen = document.getElementById('fullscreen');
const frameskip = document.getElementById('frameskip');
const pitchshift = document.getElementById('pitchshift');
const pitchshiftreset = document.getElementById('pitchshiftreset');
const pitchshiftadd = document.getElementById('pitchshiftadd');
const pitchshiftsub = document.getElementById('pitchshiftsub');
// const choppy = document.getElementById('choppy');

// Nes
const nes = new NES(); // Ready to use :3
nes.attachCanvas(canvas);
nes.onkeypause = unpaused => {
    unpaused ? setStatus('Unpaused!', 0) : setStatus('Paused!', 0);
};
nes.onkeyreset = () => setStatus('Reset!', 1);

window.nes = nes; // DEBUG ;)

function startNESWithRomBuff(romBuff) {
    var fail = false;

    // romBuff should be a Uint8Array buffer
    //nes.stop();
    try {
        nes.loadRomBuff(romBuff);
    }
    catch (e) {
        fail = true;
        setStatus(e.toString(), 1);
        throw e;
    }

    if (!fail) {
        nes.start();
        setStatus('Loaded ROM!', 0);
    }
}
function readFile(file, then) {
    if (!file)
        throw 'excuse me .. come back when ur making sense';

    var reader = new FileReader();
    reader.onload = () => {then(reader.result)};

    reader.readAsArrayBuffer(file);
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
        canvas.style.position = 'fixed';
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

// Pitch Shift
pitchshift.oninput = function () {
    pitchshift.blur();
    nes.setPitchShift(-parseFloat(pitchshift.value));
};
pitchshiftreset.onclick = function () {
    nes.setPitchShift(0);
    pitchshift.value = '0';
};
pitchshiftadd.onclick = function () {
    pitchshift.value = parseFloat(pitchshift.value) + 1;
    nes.setPitchShift(-parseFloat(pitchshift.value));
};
pitchshiftsub.onclick = function () {
    pitchshift.value = parseFloat(pitchshift.value) - 1;
    nes.setPitchShift(-parseFloat(pitchshift.value));
};

// Choppy Mode
// choppy.onclick = function() {
//     nes.setFrameskip(false);
//     isframeskip = false;
//     nes.setFPS(10);
//     setStatus('CHOPPY MODE', 0);
// };

// Minimizing Settings
var isminimized = false;
minimize.onclick = function() {
    if (isminimized) {
        isminimized = false;
        minimize.innerHTML = '<';
        settingsdiv.style.display = 'inline';
    }
    else {
        isminimized = true;
        minimize.innerHTML = 'v';
        settingsdiv.style.display = 'none';
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
    readFile(file, function(result) {
        startNESWithRomBuff(result);
    });
};

// Save Input
saveinput.onchange = function(e) {
    var file = e.target.files[0];
    readFile(file, function(result) {
        try {
            nes.loadSaveBuff(result);
        }
        catch (e) {
            setStatus(e.toString(), 1);
            return;
        }

        setStatus('Loaded SAVE!', 1);
    });
};

// Splash screen
const splashindexmax = 4;
function randInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min+1)) + min;
}

const splashimg = new Image();
splashimg.onload = function() {
    canvas.getContext('2d').drawImage(splashimg,0,0,256,256);
};
splashimg.src = `src/img/splash${randInt(0,splashindexmax)}.png`;

// Done :)
setStatus('Its pooptendin\' time', 1);
console.log(nes);

// actually annoying feature
history.scrollRestoration = 'manual';
scrollTo(0,0);

};