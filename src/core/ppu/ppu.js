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

    this.currPattern = [0,0]; // hi - lo
    this.nextPattern = [0,0]; // hi - lo

    this.mode = 0; // 0 in rendering scanlines, 1: post rendering 
    this.cycles = 0;

    this.oddFrame = 0;

    // =============== // Execution //
    var csVblank = 0;
    var csRender = 0;
    var csPostRender = 0;

    this.execute = function() {
        for (var i = 0; i < 3; i++) {
        // -------------------------------- //

        // csVblank++;
        // csRender++;
        // csPostRender++;

        if (this.mode === 0) {
            // Rendering scanlines

            var preRender = (this.ly === 261);

            // End of scanline ...
            if (this.cycles === 341) {
                this.cycles = 0;

                // nes.log += `cycles since render ${csRender} (${this.ly}) i: ${nes.cpu.interrupting}\n`;
                // csRender = 0;

                if (preRender) // End of pre-rendering !
                    this.ly = 0;
                else if (this.ly === 239) // End of rendering !
                    this.mode = 1;
                else
                    this.ly++;

                return;
            }

        }
        else {
            // Post rendering scanlines

            // Idle scanline ...
            if (!this.vblankAtm) {

                // End of idle scanline ...
                if (this.cycles === 341) {
                    this.cycles = 0;
                    this.ly++;

                    this.vblankAtm = true;
                    this.vblankFlag = true;

                    // nes.log += `cycles since vblank ${csVblank} i: ${nes.cpu.interrupting}\n`;
                    // csVblank = 0;

                    this.debugDrawNT(0);
                    return;
                }

            }

            // Vblank scanlines ...
            else {

                // Vblank NMIs !
                if (this.vblankFlag && this.nmiEnabled) {
                    nes.cpu.generateNMI();
                    // nes.log += `  NMI GENERATED !! i: ${nes.cpu.interrupting}\n`;
                }

                // End of vblank scanline ...
                if (this.cycles === 341) {
                    // nes.log += `cycles since POST ${csPostRender} (${this.ly}) i: ${nes.cpu.interrupting}\n`;
                    // csPostRender = 0;

                    if (this.ly === 260) // End of frame !!!
                        this.newFrame();
                    else {
                        this.cycles = 0;
                        this.ly++;
                    }

                    return;
                }
            }

        }

        // All done ~
        this.cycles++;

        // -------------------------------- //
        }

    };

    // TODO - make more accurate !!!
    this.newFrame = function() {
        // nes.log += `  newFrame :: LY: ${this.ly}, mode: ${this.mode}, i: ${nes.cpu.interrupting}\n`;

        this.vblankAtm = false;
        this.vblankFlag = false;

        this.cycles = 0;

        this.ly = 261; // Set to pre-render scanline
        this.mode = 0; // Back to rendering !
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

        this.currPattern[0] = this.currPattern[1] = 0;
        this.nextPattern[0] = this.nextPattern[1] = 0;

        this.newFrame();
    };

    // =============== // Debug Functions //
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
                    var hi = this.read(this.bgTable + ind + y + 8);
                    var lo = this.read(this.bgTable + ind + y);

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

};

export default Ppu;