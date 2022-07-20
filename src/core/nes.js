import constants from './constants.js';
import Cpu from './cpu/cpu.js';
import Ppu from './ppu/ppu.js';
import Mem from './mem/mem.js';
import Joypad from './joypad/joypad.js';

const NES = function() {
    var nes = this;

    // =============== // Components //
    this.mem = new Mem(this);
    this.cpu = new Cpu(this);
    this.ppu = new Ppu(this);
    this.joypad = new Joypad(this);

    // =============== // Settings //
    this.fps = 60;
    this.setFPS = function(fps) {
        if (fps > 1000) {
            fps = 1000;
        }
        this.fps = fps;

        if (this.frameskip) {
            this.cpu.cyclesPerFrame = (this.cpu.cyclesPerSec) / 1000;
            this.cpu.interval = 1;
        }
        else {
            this.cpu.cyclesPerFrame = (this.cpu.cyclesPerSec) / fps;
            this.cpu.interval = 1000 / fps;
        }
    };

    this.setPal = function(pal) {
        this.cpu.isPal = pal;
        this.cpu.cyclesPerSec = pal ? constants.clocks_pal : constants.clocks_ntsc;

        this.setFPS(this.fps); // reset clock speeds
    };

    this.frameskip = false;
    this.setFrameskip = function(frameskip) {
        if (frameskip) {
            if (this.frameskip)
                return;
            this.frameskip = true;

            this.cpu.frameskip = true;
            // Set FPS to 1000, but not actually; this makes it run smoother idek why
            this.cpu.cyclesPerFrame = (this.cpu.cyclesPerSec) / 1000;
            this.cpu.interval = 1;
        }
        else {
            if (!this.frameskip)
                return;
            this.frameskip = false;
            this.cpu.frameskip = false;

            this.setFPS(this.fps); // Set FPS back to normal
        }
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
    document.addEventListener('visibilitychange', e => {
        if (document.visibilityState === 'visible') {
            this.start();
        }
        else {
            this.stop();
        }
    });
    window.addEventListener('blur', e => {
        this.stop();
    });
    window.addEventListener('focus', e => {
        this.start();
    });

    // Reset Function
    this.reset = function() {
        this.mem.reset();
        this.cpu.reset();
        this.ppu.reset();
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
    this.setFPS(60);
    this.setFrameskip(true);
    this.joypad.keyboardAPI.start();
    this.reset();
};

export default NES;