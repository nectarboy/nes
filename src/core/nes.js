import constants from './constants.js';
import Cpu from './cpu/cpu.js';
import Mem from './mem/mem.js';

const NES = function() {
    var nes = this;

    // =============== // Components //
    this.cpu = new Cpu(this);
    this.mem = new Mem(this);

    // =============== // Settings //
    this.fps = 60;
    this.setFPS = function(fps) {
        this.fps = fps;
        this.cpu.cyclesPerFrame = this.cpu.cyclesPerSec / fps;
    };

    this.setPal = function(pal) {
        this.cpu.isPal = pal;
        this.cpu.cyclesPerSec = pal ? constants.clocks_pal : constants.clocks_ntsc;

        this.setFPS(this.fps); // reset clock speeds
    };

    this.canvas = null;
    this.attachCanvas = function(canvas) {
        this.canvas = canvas;
        // this.ppu.ctx = canvas.getContext('2d');
    };

    // Default settings
    this.setPal(false);
    this.setFPS(60);

    // =============== // Emulation Methods //
    this.paused = true;
    this.start = function() {
        if (!paused)
            return;
        paused = false;
    };

    this.stop = function() {

    };

    this.reset = function() {
        this.cpu.reset();
    };

    this.reset();
};

export default NES;