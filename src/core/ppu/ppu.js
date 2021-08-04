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
        else if (addr < 0x3f00) {
            return this.read(addr - 0x1000); // Mirror of nametables
        }
        else {
            var masked = addr & 0x1f;
            if ((masked & 0x10) === 0x10)
                masked &= 0xf;

            return mem.palleteram[masked];
        }
    };

    this.hasChrRam = false;
    this.write = function(addr, val) {
        if (addr < 0x2000) {
            if (this.hasChrRam)
                mem.chr[addr & 0x3fff] = val; // 16KB CHR RAM
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
        else if (addr < 0x3f00) {
            this.write(addr - 0x1000, val); // Mirror of nametables
        }
        else {
            var masked = addr & 0x1f;
            if ((masked & 0b10011) === 0b10000)
                masked &= 0xf;

            mem.palleteram[masked] = val;
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
        else if (addr < 0x3f00) {
            this.busData = this.read(addr - 0x1000); // Mirror of nametables
        }
        else {
            var masked = addr & 0x1f;
            if ((masked & 0x10) === 0x10)
                masked &= 0xf;

            this.busData = mem.palleteram[masked];
            return this.busData; // Pallete bus doesn't need to reload data :3
        }

        return oldBusData;
    };  

    // =============== // Registers //
    // PPUCTRL
    this.spriteTable = 0;
    this.patTable = 0;
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

    // =============== // Internal Stuff //
    this.enabled = false;

    // Rendering registers
    this.ppuAddr = 0;
    this.tAddr = 0;
    this.fineX = 0;

    this.currData = [0, 0];
    this.preData = [0, 0];
    this.currAttr = 0;
    this.preAttr = 0;

    this.ly = 0;

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

        csVblank++;
        csRender++;
        csPostRender++;

        if (this.mode === 0) {
            // Rendering scanlines

            if (this.cycles === 0) {
                this.cycles++;
                return;
            }

            const lx = this.cycles - 1;
            const preRender = (this.ly === 261);

            // Rendering
            if (this.enabled) {
                // Fetch tile data ahead
                const shouldDraw = (lx < 256);
                if (shouldDraw && (lx & 7) === 0) {
                    this.fetchAhead();
                    this.incCoarseX();
                }

                // Fetch and render curent pixel
                if (!preRender && shouldDraw) {
                    this.rendering.drawPx(lx, this.ly, this.getCyclePixel(lx));
                }
                // Update PPU addr for next scanline
                else if (lx === 256) {
                    this.incAllY();

                    // Copy horizontal scroll
                    this.ppuAddr &= 0b0111101111100000;
                    this.ppuAddr |= this.tAddr & 0b0000010000011111;

                    // This is supposed to happen on cycle 336 but what fuckin ever
                    this.fetchAhead();
                    this.incCoarseX();
                }
            }

            // End of scanline ...
            if (this.cycles === 340) {
                this.cycles = 0;

                // nes.log += `cycles since render ${csRender} (${this.ly}) i: ${nes.cpu.interrupting}\n`;
                // csRender = 0;

                // End of pre-rendering !
                if (preRender) {
                    this.ly = 0;

                    if (this.enabled) // Update ppu addr
                        this.ppuAddr = this.tAddr;
                }
                // End of rendering !
                else if (this.ly === 239)
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
                if (this.cycles === 340) {
                    this.cycles = 0;
                    this.ly++;

                    this.vblankAtm = true;
                    this.vblankFlag = true;

                    // nes.log += `cycles since vblank ${csVblank} i: ${nes.cpu.interrupting}\n`;
                    // csVblank = 0;

                    //this.debugDrawNT(0);
                    this.rendering.renderImg();
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
                if (this.cycles === 340) {
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
        csRender = 0;
        csVblank = 0;
        csPostRender = 0;
        // nes.log += `  newFrame :: LY: ${this.ly}, mode: ${this.mode}, i: ${nes.cpu.interrupting}\n`;

        this.vblankAtm = false;
        this.vblankFlag = false;

        this.cycles = 0;

        this.ly = 261; // Set to pre-render scanline
        this.mode = 0; // Back to rendering !
    };

    this.mixPixel = function(lx, bit, attr) {
        if (bit) {
            const region = 3 & (
                attr >> (
                    (((lx >> 4) & 1) << 1)
                    | (((this.ly >> 4) & 1) << 2)
                )
            );

            const palMemAddr = 0x3f00 | (region << 2);
            return this.read(palMemAddr + bit);
        }
        else {
            return this.read(0x3f00);
        }
    };

    this.getCyclePixel = function(lx) {
        const sum = (lx & 7) + this.fineX;
        const shift = ((lx + this.fineX) & 7) ^ 7;

        var px = 0;
        // Fetching pixel from current tile ...
        if (sum <= 7) {
            const bit = (((this.currData[1] >> shift) & 1) << 1) | ((this.currData[0] >> shift) & 1);
            px = this.mixPixel(lx, bit, this.currAttr);
        }
        // Fetching pixel from next tile ... 
        else {
            const bit = (((this.preData[1] >> shift) & 1) << 1) | ((this.preData[0] >> shift) & 1);
            px = this.mixPixel(lx, bit, this.preAttr);
        }

        return px;
    };

    this.fetchAhead = function() {
        this.currData[0] = this.preData[0];
        this.currData[1] = this.preData[1];
        this.currAttr = this.preAttr;

        // Pattern data
        const nameAddr = this.read(0x2000 | (this.ppuAddr & 0x0fff)); // Nametable address
        const fineY = (this.ppuAddr >> 12);

        const dataAddr = this.patTable + (nameAddr * 16) + fineY;
        this.preData[0] = this.read(dataAddr);
        this.preData[1] = this.read(dataAddr + 8);

        // Attribute data
        const attrAddr = 0x23c0 | (this.ppuAddr & 0x0c00) | ((this.ppuAddr >> 4) & 0x38) | ((this.ppuAddr >> 2) & 7);
        this.preAttr = this.read(attrAddr);

    };

    // PPU addr helpers
    this.incCoarseX = function() {
        // If overflow will occur on increment ...
        if ((this.ppuAddr & 0b11111) === 0b11111) {
            this.ppuAddr &= ~0b11111; // Overflow coarse x to 0
            this.ppuAddr ^= 0b10000000000; // Onto next horizontal nametable
        }
        else this.ppuAddr += 1; // Increment coarse x :D
    };

    this.incAllY = function() {
        // -- FINE Y INC
        // If overflow will occur on increment ...
        if ((this.ppuAddr & 0x7000) === 0x7000) {
            this.ppuAddr &= ~0x7000; // Overflow fine y to 0

            // -- COARSE Y INC
            // If overflow will occur on increment ...
            if ((this.ppuAddr & 0b1111100000) === 0b1111100000) {
                this.ppuAddr &= ~0b1111100000; // Overflow coarse y to 0
                this.ppuAddr ^= 0b0000100000000000; // Onto next vertical nametable
            }
            else this.ppuAddr += 0b100000; // Increment coarse y :D
        }
        else {
            this.ppuAddr += 0x1000;
        }
    };

    // =============== // Reset Function //
    this.reset = function() {
        // Reset registers
        this.ppuAddr = 0;
        this.tAddr = 0;
        this.fineX = 0;

        this.currData.fill(0);
        this.preData.fill(0);
        this.currAttr = 0;
        this.preAttr = 0;

        // Reset internal stuff
        this.enabled = false;

        this.sprite0Atm = false;
        this.vblankAtm = false;
        this.vblankFlag = false;

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
                    var hi = this.read(this.patTable + ind + y + 8);
                    var lo = this.read(this.patTable + ind + y);

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

    this.debugDrawPallete = function() {
        for (var i = 0; i < 4; i++) {
            for (var ii = 0; ii < 16; ii++) {
                this.rendering.drawPx(ii, i, i*16 + ii);
            }
        }

        this.rendering.renderImg();
    };

};

export default Ppu;