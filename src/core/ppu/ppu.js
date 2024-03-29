import rendering from './rendering.js';
import constants from '../constants.js';

const Ppu = function(nes) {
    var ppu = this;
    var mem = nes.mem;

    // =============== // Canvas //
    this.rendering = rendering;

    // =============== // Reading and Writing //
    // Functions for the PPU to use during execution, for optimisation :)
    this.readPallete = function(addr) {
        var masked = addr & 0x1f;
        if ((masked & 0b10011) === 0b10000)
            masked &= 0xf;

        return mem.palleteram[masked];
    };
    this.readNametables = function(addr) {
        if (addr < 0x2400) {
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
            return this.readNametables(addr - 0x1000); // Mirror of nametables
        }
    };
    this.writeNametables = function(addr, val) {
        if (addr < 0x2400) {
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
            this.writeNametables(addr - 0x1000, val); // Mirror of nametables
        }
    };

    this.read = function(addr) {
        if (addr < 0x2000) {
            return mem.mapper.readChr(addr); // 8KB addressable CHR
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
            return this.readNametables(addr - 0x1000); // Mirror of nametables
        }
        else { // Pallete
            var masked = addr & 0x1f;
            if ((masked & 0b10011) === 0b10000)
                masked &= 0xf;

            return mem.palleteram[masked];
        }
    };

    this.write = function(addr, val) {
        if (addr < 0x2000) {
            mem.mapper.writeChr(addr, val); // 8KB addressable CHR
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
            this.writeNametables(addr - 0x1000, val); // Mirror of nametables
        }
        else { // Pallete
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
            this.busData = mem.mapper.readChr(addr); // CHR
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
            this.busData = this.readNametables(addr - 0x1000); // Mirror of nametables
        }
        else {
            var masked = addr & 0x1f;
            if ((masked & 0b10011) === 0b10000)
                masked &= 0xf;

            this.busData = mem.palleteram[masked];
            return this.busData; // Pallete bus doesn't need to reload data :3
        }

        return oldBusData;
    };  

    // =============== // Registers //
    // PPUCTRL
    this.spritePatTable = 0;
    this.patTable = 0;
    this.spriteSize = 0;
    this.doubleSprites = false;
    this.masterSelect = false;
    this.nmiEnabled = false;

    // PPUMASK
    this.greyscale = false;
    this.showBgLeft = false;
    this.showSpritesLeft = false;
    this.bgEnabled = false;
    this.spritesEnabled = false;

    // PPUSTATUS
    this.sprite0Happened = false;
    this.vblankFlag = false; // PPUSTAT

    // =============== // Internal Stuff //
    this.sprite0Atm = false;
    this.vblankAtm = false; // actual vblank
    this.enabled = false;

    this.considerNmiEnabled = false;
    this.framesElapsed = 0;

    // Rendering registers
    this.ppuAddr = 0;
    this.tAddr = 0;
    this.fineX = 0;

    // Background registers
    this.currData = new Uint8Array(2);
    this.preData = new Uint8Array(2);
    this.currAttr = 0;
    this.preAttr = 0;

    // Sprite registers
    this.oamAddr = 0;
    this.spritesThisLine = 0;
    this.sOam = new Uint8Array(8 * 4);
    this.sData = new Uint8Array(8 * 2);
    this.sAttr = [];
    this.sX = new Uint8Array(8);
    this.sNums = new Uint8Array(8);

    this.bgMap = new Uint8Array(constants.screen_width * constants.screen_height);

    this.resetSAttr = function() {
        for (var i = 0; i < 8; i++) {
            this.sAttr[i] = {
                pallete: 0,
                priority: false,
                xflip: false,
                yflip: false
            };
        }
    };

    // Internal stuff
    this.ly = 0;

    this.mode = 0; // 0 in rendering scanlines, 1: post rendering 
    this.cycles = 0;
    this.preRender = false;

    this.oddFrame = 0;

    // =============== // Execution //

    this.execute = function() {
        for (var i = 0; i < 3; i++) {
        // -------------------------------- //

        // Rendering scanlines
        if (this.mode === 0) {

            // Idle cycle
            if (this.cycles === 0) {
                this.cycles++;
                return;
            }
            else if (this.vblankFlag && this.preRender && this.cycles === 1) {
                this.vblankFlag = false;
            }

            var lx = this.cycles - 1;
            var shouldDraw = (lx < 256);

            // Rendering
            if (this.enabled) {
                // Fetch tile data ahead
                if (shouldDraw && (lx & 7) === 0) {
                    this.fetchBgAhead();
                    this.incCoarseX();
                    //this.fetchSpriteAhead();
                }

                // Update PPU addr for next scanline
                else if (lx === 259) { // 256, (259 is a hack)
                    this.incAllY();
                    nes.mem.mapper.feedAddr(this.ppuAddr);

                    // Copy horizontal scroll
                    this.ppuAddr &= 0b0111101111100000;
                    this.ppuAddr |= this.tAddr & 0b0000010000011111;               

                    // This is supposed to happen on cycle 304 but what fuckin ever
                    if (this.preRender) {
                        // Copy vertical scroll
                        this.ppuAddr &= 0b0000010000011111;
                        this.ppuAddr |= this.tAddr & 0b0111101111100000;
                    }

                    // Sprite evaluation finishes on cycle 256 but whatveer
                    this.quickSpriteEval(); // At least i think we still eval on prerender scanline ?

                    // This is supposed to happen until cycle 320 but what. fuckin. ever
                    this.fetchSpriteAhead();

                    // This is supposed to happen on cycle 320 to 340 but what fuckin ever
                    this.fetchBgAhead();
                    this.incCoarseX();
                }
            }

            // Fetch and render current pixel
            if (shouldDraw && !this.preRender) {
                //this.spriteEval(); // An accurate method (???)

                var px = this.getBgPixel(lx);
                if (this.spritesEnabled)
                    px = this.getSpritePixel(lx, px);

                this.rendering.drawPx(lx, this.ly, px);
            }

            // End of scanline ...
            if (this.cycles === 340) {
                this.cycles = 0;

                // End of pre-rendering !
                if (this.preRender) {
                    this.ly = 0;
                    this.preRender = false;
                }
                // End of rendering !
                else if (this.ly === 239) {
                    this.mode = 1;
                    this.ly++;
                }
                // Next scanline !
                else {
                    this.ly++;
                }

                return;
            }

        }
        // Post rendering scanlines
        else {

            // First idle scanline (240)
            if (!this.vblankAtm) {

                // End of idle scanline ...
                if (this.cycles === 340) {
                    this.cycles = 0;
                    this.ly++;

                    this.vblankAtm = true; // Actual status
                    //this.vblankFlag = true; // Read / Used for NMI

                    //this.debugDrawNT(0);
                    this.rendering.renderImg(); // Render ^_^
                    //this.debugDrawChr();
                    return;
                }

            }

            // Vblank scanlines (241 - 260)
            else {

                if (this.ly === 241 && this.cycles === 0) {
                    this.vblankFlag = true; // Read / Used for NMI``
                }

                // Vblank NMIs !
                if (this.considerNmiEnabled && this.vblankFlag) {
                    //this.vblankFlag = false;
                    this.considerNmiEnabled = false;
                    nes.cpu.requestNMI();
                }

                // End of vblank scanline ...
                if (this.cycles === 340) {
                    // End of frame ! ! !
                    if (this.ly === 260) {
                        this.newFrame();
                    }
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
        this.framesElapsed++;

        this.considerNmiEnabled = this.nmiEnabled;
        this.sprite0Atm = false;
        this.sprite0Happened = false;
        this.vblankAtm = false;
        //this.vblankFlag = false;

        this.cycles = 0;
        this.preRender = true;

        this.ly = -1; // Set to pre-render scanline
        this.mode = 0; // Back to rendering !
    };

    // Background rendering
    this.mixBgPixel = function(lx, bit, attr) {
        var coarseX = this.ppuAddr - (lx >> 3) + 2; // The +2 is bullshit lmao

        var x = lx + (((coarseX & 1) << 3) | this.fineX);
        var y = this.ly +
            (((this.ppuAddr >> 5) - (this.ly >> 3) & 3) << 3) // Combine coarse y ...
            | (this.ppuAddr >> 12); // ... with fine y !

        // If in middle of current attribute byte, do some magic ...
        x -= (coarseX & 0b10) << 3; // If bit set, sub region-check x by 16

        if (bit) {
            var region = 3 & (
                attr >> (
                    (((x >> 4) & 1) << 1)
                    | (((y >> 4) & 1) << 2)
                )
            );

            var palMemAddr = 0x3f00 | (region << 2) | bit;
            //nes.mem.mapper.feedAddr(palMemAddr);
            return this.readPallete(palMemAddr);
        }
        else {
            //nes.mem.mapper.feedAddr(0x3f00);
            return this.readPallete(0x3f00);
        }
    };

    this.getBgPixel = function(lx) {
        if (this.bgEnabled === false) {
            //nes.mem.mapper.feedAddr(0x3f00);
            return this.readPallete(0x3f00);
        }

        var sum = (lx & 7) + this.fineX;
        var shift = ((lx + this.fineX) & 7) ^ 7;

        var px = 0;
        var bit = 0;
        // Fetching pixel from current tile ...
        if (sum <= 7) {
            bit = (((this.currData[1] >> shift) & 1) << 1) | ((this.currData[0] >> shift) & 1);
            px = this.mixBgPixel(lx, bit, this.currAttr);
        }
        // Fetching pixel from next tile ... 
        else {
            bit = (((this.preData[1] >> shift) & 1) << 1) | ((this.preData[0] >> shift) & 1);
            px = this.mixBgPixel(lx, bit, this.preAttr);
        }

        this.bgMap[this.ly * 256 + lx] = bit;
        return px;
    };

    // Sprite rendering
    this.getSpritePixel = function(lx, px) {
        var lyMul256 = this.ly << 8;
        for (var i = 0; i < this.spritesThisLine; i++) {
            const oami = i << 2;

            if (lx >= this.sX[i] && lx < this.sX[i] + 8) {
                var sdatai = i << 1;

                var xpx = lx - this.sX[i];
                var ypx = this.ly - this.sOam[oami];

                var shift = this.sAttr[i].xflip
                    ? xpx & 7
                    : (xpx & 7) ^ 7;

                var bit = (((this.sData[sdatai+1] >> shift) & 1) << 1) | ((this.sData[sdatai] >> shift) & 1);

                if (bit) {
                    var bgBitOpaque = this.bgMap[lyMul256 + lx] !== 0;

                    // Sprite 0 check
                    if (!this.sprite0Atm && this.sNums[i] === 0) {
                        this.sprite0Atm = true;
                        this.sprite0Happened = true;
                    }

                    // Priority check
                    if (this.sAttr[i].priority && bgBitOpaque)
                        return px;

                    var palMemAddr = 0x3f10 | (this.sAttr[i].pallete << 2) | bit;

                    //nes.mem.mapper.feedAddr(palMemAddr);
                    return this.readPallete(palMemAddr);
                }
            }
        }

        return px;
    };

    // Sprite evaluation (WIP)
    this.spriteEval = function() {

    };

    this.quickSpriteEval = function() {
        this.spritesThisLine = 0;

        for (var i = 0; i < 64; i++) {
            var oami = (i*4 + this.oamAddr) & 0xff;

            if (
                this.ly >= mem.oam[oami] && 
                this.ly < mem.oam[oami] + this.spriteSize
            ) {
                // ... if all conditions met
                var soami = this.spritesThisLine << 2;

                this.sOam[soami]   = mem.oam[oami];
                this.sOam[soami+1] = mem.oam[oami+1];
                this.sOam[soami+2] = mem.oam[oami+2];
                this.sOam[soami+3] = mem.oam[oami+3];
                this.sNums[this.spritesThisLine] = i;

                // Fix attribute data
                const attrByte = this.sOam[soami + 2];
                this.sAttr[this.spritesThisLine].pallete = attrByte & 3;
                this.sAttr[this.spritesThisLine].priority = (1&(attrByte >> 5)) !== 0;
                this.sAttr[this.spritesThisLine].xflip = (1&(attrByte >> 6)) !== 0;
                this.sAttr[this.spritesThisLine].yflip = (1&(attrByte >> 7)) !== 0;

                this.spritesThisLine++;
                if (this.spritesThisLine === 8)
                    return; // [sprite overflow bug ~later~ never]
            }
        }

        var i = this.spritesThisLine << 2;
        while (i < 8) {
            this.sOam[i++] = 0xff;
            this.sOam[i++] = 0xff;
            this.sOam[i++] = 0xff;
            this.sOam[i++] = 0xff;
        }
    };

    // Data fetching
    this.fetchSpriteAhead = function() {
        this.oamAddr = 0;

        for (var i = 0; i < 8; i++) {
            // If no more sprites, we done
            // if (i === this.spritesThisLine)
            //     return;

            var oami = i << 2;
            var datai = i << 1;

            // Attribute data (NOTE :: should this be done every fetch ?? cant we just do this once on eval)
            // const attrByte = this.sOam[oami + 2];
            // this.sAttr[i].pallete = attrByte & 3;
            // this.sAttr[i].priority = (1&(attrByte >> 5)) !== 0;
            // this.sAttr[i].xflip = (1&(attrByte >> 6)) !== 0;
            // this.sAttr[i].yflip = (1&(attrByte >> 7)) !== 0;

            // X data
            this.sX[i] = this.sOam[oami + 3];

            // Pattern data
            var sy = this.ly - this.sOam[oami];
            var tileind = this.sOam[oami + 1]
            var pattable = this.spritePatTable;

            if (this.doubleSprites) {
                pattable = (tileind & 1) << 12;
                if (this.sAttr[i].yflip) {
                    tileind = (tileind | 1) - (sy >= 8);
                    sy = (sy & 7) ^ 7;
                }
                else {
                    tileind = (tileind & 0xfe) + (sy >= 8);
                    sy &= 7;
                }
            }
            else if (this.sAttr[i].yflip) {
                sy ^= 7;
            }

            var dataAddr = pattable + (tileind * 16) + sy;

            this.sData[datai]     = mem.mapper.readChr(dataAddr);
            nes.mem.mapper.feedAddr(dataAddr);
            dataAddr += 8;
            this.sData[datai + 1] = mem.mapper.readChr(dataAddr);
            nes.mem.mapper.feedAddr(dataAddr);
        }
    };

    this.fetchBgAhead = function() {
        this.currData[0] = this.preData[0];
        this.currData[1] = this.preData[1];
        this.currAttr = this.preAttr;

        // Pattern data
        var nameAddr = 0x2000 | (this.ppuAddr & 0x0fff);
        nes.mem.mapper.feedAddr(nameAddr);
        var nameByte = this.readNametables(nameAddr); // Nametable address
        var fineY = (this.ppuAddr >> 12);

        var dataAddr = this.patTable + (nameByte * 16) + fineY;
        this.preData[0] = mem.mapper.readChr(dataAddr);
        this.preData[1] = mem.mapper.readChr(dataAddr + 8);

        // Attribute data
        var attrAddr = 0x23c0 | (this.ppuAddr & 0x0c00) | ((this.ppuAddr >> 4) & 0x38) | ((this.ppuAddr >> 2) & 7);
        nes.mem.mapper.feedAddr(attrAddr);
        this.preAttr = this.readNametables(attrAddr);

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
            const coarseY = (this.ppuAddr >> 5) & 0b11111;

            // If reached bottom of resolution ...
            if (coarseY === 29) {
                this.ppuAddr &= ~0b1111100000; // Overflow coarse y to 0
                this.ppuAddr ^= 0b0000100000000000; // Onto next vertical nametable
            }
            // If overflow will occur on increment ...
            else if (coarseY === 31) {
                this.ppuAddr &= ~0b1111100000; // Overflow coarse y to 0
            }
            else {
                this.ppuAddr += 0b100000; // Increment coarse y :D
            }
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

        this.oamAddr = 0;
        this.spritesThisLine = 0;
        this.sOam.fill(0);
        this.sData.fill(0);
        this.resetSAttr();
        this.sX.fill(0);
        this.sNums.fill(0);

        // Reset internal stuff
        this.enabled = false;

        this.sprite0Atm = false;
        this.sprite0Happened = false;
        this.reqNmiThisFrame = false;
        this.framesElapsed = 0;
        this.vblankAtm = false;
        this.vblankFlag = false;

        this.newFrame();
        this.ly = 0; // No prerender scanline on first frame
    };

    // =============== // Debug Functions //
    this.debugDrawChr = function(bank=0) {
        var i = 0;
        var start = bank * 0x2000;
        var end = bank + 0x2000;
        while (i < 0x2000) {

            for (var y = 0; y < 8; y++) {
                var yy = (0|(i/constants.screen_width))*8 + y;

                var hi = mem.chr[start + 8 + y];
                var lo = mem.chr[start + y];

                for (var x = 0; x < 8; x++) {
                    var bit = (((hi >> (x^7)) & 1) << 1) | ((lo >> (x^7)) & 1);

                    var xx = (i & 0xff)/2 + x;
                    this.rendering.drawPx(xx, yy, bit);
                }
            }

            i += 16;
            start += 16;
        }

        this.rendering.renderImg();
    };

    this.debugDrawNT = function(nt=0) {
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

    this.debugDrawBgMap = function(nt=0) {
        for (var x = 0; x < 256; x++) {
            for (var y = 0; y < 240; y++) {
                var px = this.bgMap[y * 256 + x];
                this.rendering.drawPx(x, y, 0|(px > 0));
            }
        }

        this.rendering.renderImg();
    };

};

export default Ppu;