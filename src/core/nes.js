import constants from './constants.js';
import Cpu from './cpu/cpu.js';
import Ppu from './ppu/ppu.js';
import Apu from './apu/apu.js';
import Mem from './mem/mem.js';
import Joypad from './joypad/joypad.js';

const NES = function() {
    var nes = this;

    // =============== // Components //
    this.mem = new Mem(this);
    this.cpu = new Cpu(this);
    this.ppu = new Ppu(this);
    this.apu = new Apu(this);
    this.joypad = new Joypad(this);

    // =============== // Settings //
    this.resetFPS = function() {
        const fps = 60;

        this.cpu.cyclesPerFrame = (this.cpu.cyclesPerSec) / fps;
        this.cpu.interval = 1000 / fps;
        // if (this.frameskip) {
        //     this.cpu.cyclesPerFrame = (this.cpu.cyclesPerSec) / 1000;
        //     this.cpu.interval = 1;
        // }
        // else {
        //     this.cpu.cyclesPerFrame = (this.cpu.cyclesPerSec) / fps;
        //     this.cpu.interval = 1000 / fps;
        // }

        this.apu.calcFcIntervals(); // frame counter
    };

    this.setPal = function(pal) {
        this.cpu.isPal = pal;
        this.cpu.cyclesPerSec = pal ? constants.clocks_pal : constants.clocks_ntsc;

        this.resetFPS(); // reset clock speeds
        this.apu.updateBuffInterval();
        this.apu.calcFcIntervals(); // frame counter
    };

    this.frameskip = false;
    this.setFrameskip = function(frameskip) {
        if (frameskip) {
            if (this.frameskip)
                return;
            this.frameskip = true;

            this.cpu.frameskip = true;
            // Set FPS to 1000, but not actually; this makes it run smoother idek why
            // this.cpu.cyclesPerFrame = (this.cpu.cyclesPerSec) / 1000;
            // this.cpu.interval = 1;
        }
        else {
            if (!this.frameskip)
                return;
            this.frameskip = false;
            this.cpu.frameskip = false;

            // this.setFPS(this.fps); // Set FPS back to normal
        }
    };

    this.setPitchShift = function(semitones) {
        this.apu.pitchshift = Math.pow(2, (semitones/24));
    };

    this.canvas = null;
    this.attachCanvas = function(canvas) {
        this.canvas = canvas;
        this.ppu.rendering.initCtx(canvas);
    };

    // =============== // Emulation Methods //
    this.paused = true;
    this.start = function() {
        if (!this.paused)
            return;
        this.paused = false;

        // Start components
        this.cpu.startLoop();
    };

    this.stop = function() {
        if (this.paused)
            return;
        this.paused = true;

        // Stop components
        this.cpu.stopLoop();
    };

    this.togglePause = function() {
        if (this.paused) {
            this.start();
            return true;
        }
        else {
            this.stop();
            return false;
        }
    };

    // dont run when out of browser or unfocused
    var browservisibilitypaused = true;
    document.addEventListener('visibilitychange', e => {
        if (document.visibilityState === 'visible') {
            if (!browservisibilitypaused)
                this.start();
            //console.log('unhidden', browservisibilitypaused); // THIS IS SO ANNOYING WHY DID I KEEP THIS SO LONG
        }
        else {
            browservisibilitypaused = this.paused;
            this.stop();
            //console.log('hidden', browservisibilitypaused);
        }
    });

    // Reset Function
    this.reset = function() {
        this.mem.reset();
        this.cpu.reset();
        this.ppu.reset();
        this.apu.reset();
        this.joypad.reset();

        // Clear screen
        if (this.canvas !== null) {
            this.ppu.rendering.clearImg();
            this.ppu.rendering.renderImg();
        }
    };

    this.loadRomBuff = function(rom) {
        this.mem.loadRomBuff(rom);
        this.reset();
    };

    this.loadSaveBuff = function(save) {
        if (this.mem.loadSaveBuff(save)) { // If successful
            this.reset();
        }
    };

    // =============== // Event Latches //
    this.onkeypause = () => {};
    this.onkeyreset = () => {};

    // =============== // Debug Methods //
    this.getMaxFps = function() {
        return 1000 / (this.cpu.postMs - this.cpu.preMs);
    };

    this.popupString = function(str) {
        var win = window.open("", "Log", "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=700,height=400,top="+(screen.height/2)+",left="+(screen.width/2));
        win.document.body.innerHTML = '<pre>' + str + '</pre>';
    };

    this.log = '';
    this.popupLog = function() {
        this.popupString(this.log);
    };

    // Done :) Apply default settings
    this.setPal(false);
    this.resetFPS();
    this.setFrameskip(true);
    this.apu.generateBuffer(4096, 48000);
    this.setPitchShift(0);
    this.joypad.keyboardAPI.start();
    this.reset();
};

export default NES;