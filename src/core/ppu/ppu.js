import rendering from './rendering.js';
import constants from '../constants.js';

const Ppu = function(nes) {
    var ppu = this;
    var mem = nes.mem;

    // =============== // Canvas //
    this.rendering = rendering;

    // =============== // Reading and Writing //
    this.read = function(addr) {
        if (addr < 0x2000) {
            return mem.chr[addr & (mem.chrSize-1)]; // chr
        }
        else if (addr < 0x2400) {
            return mem.nametable[mem.nametable0map][addr - 0x2000]; // nametable map 0
        }
        else if (addr < 0x2800) {
            return mem.nametable[mem.nametable1map][addr - 0x2400]; // nametable map 1
        }
        else if (addr < 0x2c00) {
            return mem.nametable[mem.nametable2map][addr - 0x2800]; // nametable map 2
        }
        else if (addr < 0x3000) {
            return mem.nametable[mem.nametable3map][addr - 0x2c00]; // nametable map 3
        }
        else {
            return mem.palleteram[addr & 0x1f];
        }
    };

    this.write = function(addr, val) {
        if (addr >= 0x2000 && addr < 0x2400) {
            mem.nametable[mem.nametable0map][addr - 0x2000] = val; // nametable map 0
        }
        else if (addr < 0x2800) {
            mem.nametable[mem.nametable1map][addr - 0x2400] = val; // nametable map 1
        }
        else if (addr < 0x2c00) {
            mem.nametable[mem.nametable2map][addr - 0x2800] = val; // nametable map 2
        }
        else if (addr < 0x3000) {
            mem.nametable[mem.nametable3map][addr - 0x2c00] = val; // nametable map 3
        }
        else {
            mem.palleteram[addr & 0x1f] = val;
        }
    };

    // CPU reading from PPU bus
    this.busData = 0;
    this.readFromCPU = function(addr) {
        var oldBusData = this.busData;

        if (addr < 0x2000) {
            this.busData = mem.chr[addr & (mem.chrSize-1)]; // chr
        }
        else if (addr < 0x2400) {
            this.busData = mem.nametable[mem.nametable0map][addr - 0x2000]; // nametable map 0
        }
        else if (addr < 0x2800) {
            this.busData = mem.nametable[mem.nametable1map][addr - 0x2400]; // nametable map 1
        }
        else if (addr < 0x2c00) {
            this.busData = mem.nametable[mem.nametable2map][addr - 0x2800]; // nametable map 2
        }
        else if (addr < 0x3000) {
            this.busData = mem.nametable[mem.nametable3map][addr - 0x2c00]; // nametable map 3
        }
        else {
            return mem.palleteram[addr & 0x1f]; // Pallete bus doesn't need to reload data :3
        }

        return oldBusData;
    };  

    // =============== // Registers //
    // PPUCTRL
    this.baseNametableAddr = 0;
    this.spriteTable = 0;
    this.bgTable = 0;
    this.spriteSize = 0;
    this.masterSelect = false;
    this.nmiEnabled = false;

    // PPUMASK
    this.greyscale = false;
    this.showBgLeft = false;
    this.showSpritesLeft = false;
    this.bgEnabled = false;
    this.spritesEnabled = false;

    // PPUSTATUS
    this.sprite0Atm = false;
    this.vblankAtm = false; // actual vblank
    this.vblankFlag = false; // PPUSTAT

    // PPUADDR
    this.ppuAddr = 0;

    // =============== // Internal Stuff //
    this.enabled = false;

    this.ly = 0;
    this.lx = 0;

    this.cycles = 0;

    this.oddFrame = 0;
    this.cyclesPerFrame = constants.ppu_cyclesperframe - this.oddFrame;

    // =============== // Execution //
    this.execute = function() {
        for (var i = 0; i < 3; i++) {
        // -------------------------------- //

        var frameEnded = this.cycles === this.cyclesPerFrame;

        // When disabled --
        if (!this.enabled) {
            this.cycles++;
            if (frameEnded) {
                this.oddFrame ^= 1;
                this.cyclesPerFrame = constants.ppu_cyclesperframe - this.oddFrame;
                this.cycles = 0;
            }

            return;
        }

        // When enabled --

        // All done ~
        this.cycles++;

        // -------------------------------- //
        }

    };

    this.debugDrawChr = function() {
        for (var i = 0; i < mem.chr.length; i += 16) {

            for (var y = 0; y < 8; y++) {
                var yy = (0|(i/constants.screen_width))*8 + y;

                var hi = mem.chr[i + 8 + y];
                var lo = mem.chr[i + y];

                for (var x = 0; x < 8; x++) {
                    var bit = (((hi >> (x^7)) & 1) << 1) | ((lo >> (x^7)) & 1);

                    var xx = (i & 0xff)/2 + x;
                    this.rendering.drawPx(xx, yy, bit);
                }
            }

        }

        this.rendering.renderImg();
    };

    this.debugDrawNT = function(nt) {
        var table = mem.nametable[nt];

        for (var i = 0; i < 30; i++) {
            for (var ii = 0; ii < 32; ii++) {
                 var ind = table[i * 32 + ii] * 16;

                // -------------------------------- //
                for (var y = 0; y < 8; y++) {
                    var hi = mem.chr[ind + y + 8];
                    var lo = mem.chr[ind + y];

                    for (var x = 0; x < 8; x++) {
                        var pxData = (((hi >> (x^7)) & 1) << 1) | ((lo >> (x^7)) & 1);

                        this.rendering.drawPx(ii*8 + x, i*8 + y, pxData + 16);
                    }
                }
                // -------------------------------- //
               
            }
        }

        this.rendering.renderImg();
    };

    // =============== // Reset Function //
    this.reset = function() {
        // reset registers
        this.sprite0Atm = false;
        this.vblankAtm = false;

        // reset internal stuff
        this.enabled = false;
        this.ly = 0;
        this.lx = 0;
        this.oddFrame = 0;
    };

};

export default Ppu;