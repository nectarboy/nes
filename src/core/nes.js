import constants from './constants.js';
import Cpu from './cpu/cpu.js';
import Ppu from './ppu/ppu.js';
import Mem from './mem/mem.js';

const NES = function() {
    var nes = this;

    // =============== // Components //
    this.mem = new Mem(this);
    this.cpu = new Cpu(this);
    this.ppu = new Ppu(this);

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

    // Default settings
    this.setPal(false);
    this.setFPS(60);

    // =============== // Emulation Methods //
    this.paused = true;
    this.start = function() {
        if (!this.paused)
            return;
        this.paused = false;

        // Start loop
        this.cpu.loop();
    };

    this.stop = function() {
        this.paused = true;

        // Stop loop
        this.cpu.stopLoop();
    };

    // Reset Function
    this.reset = function() {
        this.cpu.reset();
        this.ppu.reset();
        this.mem.reset();
    };

    this.loadRomBuff = function(rom) {
        this.mem.loadRomBuff(rom);
    };

    // =============== // Debug Methods //
    this.getMaxFps = function() {
        return 1000 / (this.cpu.postMs - this.cpu.preMs);
    };
    
};

export default NES;