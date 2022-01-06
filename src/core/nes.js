import constants from './constants.js';
import Cpu from './cpu/cpu.js';
import Ppu from './ppu/ppu.js';
import Mem from './mem/mem.js';
import Joypad from './Joypad/joypad.js';

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
        this.fps = fps;
        this.cpu.cyclesPerFrame = (this.cpu.cyclesPerSec) / fps;
        this.cpu.interval = 1000 / fps;
    };

    this.setPal = function(pal) {
        this.cpu.isPal = pal;
        this.cpu.cyclesPerSec = pal ? constants.clocks_pal : constants.clocks_ntsc;

        this.setFPS(this.fps); // reset clock speeds
    };

    this.canvas = null;
    this.attachCanvas = function(canvas) {
        this.canvas = canvas;
        this.ppu.rendering.initCtx(canvas);
    };

    this.keyboardEnabled = false;

    // Default settings
    this.setPal(false);
    this.setFPS(60);
    this.keyboardEnabled = true;

    // =============== // Emulation Methods //
    this.paused = true;
    this.start = function() {
        if (!this.paused)
            return;
        this.paused = false;

        // Start components
        this.cpu.loop();
        this.joypad.keyboardAPI.start();
    };

    this.stop = function() {
        this.paused = true;

        // Stop components
        this.cpu.stopLoop();
        this.joypad.keyboardAPI.stop();
    };

    // Reset Function
    this.reset = function() {
        this.cpu.reset();
        this.ppu.reset();
        this.mem.reset();
        this.joypad.reset();

        // Clear screen
        this.ppu.rendering.clearImg();
        this.ppu.rendering.renderImg();
    };

    this.loadRomBuff = function(rom) {
        this.mem.loadRomBuff(rom);
    };

    // =============== // Debug Methods //
    this.getMaxFps = function() {
        return 1000 / (this.cpu.postMs - this.cpu.preMs);
    };

    this.popupString = function(str) {
        var win = window.open("", "Log", "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=700,height=400,top="+(screen.height/2)+",left="+(screen.width/2));
        win.document.body.innerHTML = '<pre>' + str + '</pre>';
    };

    // Logging
    this.log = '';
    this.popupLog = function() {
        this.popupString(this.log);
    };
    
};

export default NES;