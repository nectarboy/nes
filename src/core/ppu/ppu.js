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
            return mem.chr[addr & (mem.chrSize-1)]; // CHR
        }
        else if (addr < 0x2400) {
            return mem.nametable[mem.nametable0map][addr - 0x2000]; // Nametable map 0
        }
        else if (addr < 0x2800) {
            return mem.nametable[mem.nametable1map][addr - 0x2400]; // Nametable map 1
        }
        else if (addr < 0x2c00) {
            return mem.nametable[mem.nametable2map][addr - 0x2800]; // Nametable map 2
        }
        else if (addr < 0x3000) {
            return mem.nametable[mem.nametable3map][addr - 0x2c00]; // Nametable map 3
        }
        else {
            return mem.palleteram[addr & 0x1f];
        }
    };

    this.write = function(addr, val) {
        if (addr < 0x2000) {
            // CHR - TODO RAM !!
        }
        else if (addr < 0x2400) {
            mem.nametable[mem.nametable0map][addr - 0x2000] = val; // Nametable map 0
        }
        else if (addr < 0x2800) {
            mem.nametable[mem.nametable1map][addr - 0x2400] = val; // Nametable map 1
        }
        else if (addr < 0x2c00) {
            mem.nametable[mem.nametable2map][addr - 0x2800] = val; // Nametable map 2
        }
        else if (addr < 0x3000) {
            mem.nametable[mem.nametable3map][addr - 0x2c00] = val; // Nametable map 3
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
            this.busData = mem.chr[addr & (mem.chrSize-1)]; // CHR
        }
        else if (addr < 0x2400) {
            this.busData = mem.nametable[mem.nametable0map][addr - 0x2000]; // Nametable map 0
        }
        else if (addr < 0x2800) {
            this.busData = mem.nametable[mem.nametable1map][addr - 0x2400]; // Nametable map 1
        }
        else if (addr < 0x2c00) {
            this.busData = mem.nametable[mem.nametable2map][addr - 0x2800]; // Nametable map 2
        }
        else if (addr < 0x3000) {
            this.busData = mem.nametable[mem.nametable3map][addr - 0x2c00]; // Nametable map 3
        }
        else {
            this.busData = mem.palleteram[addr & 0x1f];
            return this.busData; // Pallete bus doesn't need to reload data :3
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

    this.fineX = 0;
    this.coarseX = 0;
    this.fineY = 0;
    this.coarseY = 0;

    this.ly = 0;
    this.lx = 0;

    this.currPattern = [0,0]; // hi - lo
    this.nextPattern = [0,0]; // hi - lo

    this.mode = 0; // 0 in rendering scanlines, 1: post rendering 
    this.cycles = 0;

    this.oddFrame = 0;

    // =============== // Execution //
    this.execute = function() {
        // When disabled --

        // When enabled --
        for (var i = 0; i < 3; i++) {
        // -------------------------------- //

        var pre_cycles = this.cycles;
        this.cycles++;

        if (this.mode === 0) {
            // Rendering scanlines

            var preRender = this.ly === 261;

            // End of scanline ...
            if (pre_cycles === 340) {
                this.cycles = 0;
                this.ly++;

                if (preRender) // End of pre-rendering !
                    this.ly = 0;
                else if (this.ly === 241) // End of rendering !
                    this.mode = 1;
            }

        }
        else {
            // Post rendering scanlines

            // Idle scanline ...
            if (!this.vblankAtm) {

                // End of idle scanline ...
                if (pre_cycles === 340) {
                    this.cycles = 0;
                    this.ly++;

                    this.vblankAtm = true;

                    this.debugDrawNT(0);
                }
            }

            // Vblank scanlines ...
            else {
                if (!this.vblankFlag) // Set vblank flag + NMI !
                    this.vblankFlag = true;

                nes.cpu.shouldInterrupt = this.nmiEnabled;
                nes.cpu.intVec = 0xfffa;

                // End of frame ...
                if (pre_cycles === 340) {
                    this.cycles = 0;
                    this.ly++;

                    if (this.ly === 261) {// End of frame !
                        this.newFrame();
                    }
                }
            }

        }

        // -------------------------------- //
        }

        // All done ~
    };

    this.newFrame = function() {
        this.vblankAtm = false;
        this.vblankFlag = false;
        nes.cpu.shouldInterrupt = false;

        this.ppuAddr = this.baseNametableAddr;

        this.cycles = 0;

        this.ly = 261; // Set to pre-render scanline
        this.mode = 0; // Back to rendering !
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

                        this.rendering.drawPx(ii*8 + x, i*8 + y, pxData);
                    }
                }
                // -------------------------------- //
               
            }
        }

        this.rendering.renderImg();
    };

    // =============== // Reset Function //
    this.reset = function() {
        // Reset registers
        this.sprite0Atm = false;
        this.vblankAtm = false;
        this.vblankFlag = false;

        this.fineX = 0;
        this.coarseX = 0;
        this.fineY = 0;
        this.coarseY = 0;

        // Reset internal stuff
        this.enabled = false;
        this.ly = 261;
        this.lx = 0;

        this.currPattern[0] = this.currPattern[1] = 0;
        this.nextPattern[0] = this.nextPattern[1] = 0;

        this.mode = 0;
        this.cycles = 0;
        this.oddFrame = 0;

        this.newFrame();
    };

};

export default Ppu;