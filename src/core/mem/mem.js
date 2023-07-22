import constants from '../constants.js';
import Cartridge from './cartridge.js';

const Mem = function(nes) {
    var mem = this;

    // =============== // Memory Blocks //
    this.wram = new Uint8Array(0x0800);

    // video
    this.nametable = [
        new Uint8Array(32 * 32), // A
        new Uint8Array(32 * 32), // B
        new Uint8Array(32 * 32), // C
        new Uint8Array(32 * 32)  // D
    ];

    this.nametable4screen = false;
    this.nametable0map = 0;
    this.nametable1map = 0;
    this.nametable2map = 0;
    this.nametable3map = 0;

    this.oam = new Uint8Array(64 * 4);
    this.palleteram = new Uint8Array(0x20);

    // cartridge
    this.rawfilerom = new Uint8Array(0);
    this.rom = new Uint8Array(0);
    this.chr = new Uint8Array(0);
    this.cartram = new Uint8Array(0);

    // =============== // IO Accesses //
    this.readIO = function(addr) {
        switch (addr) {
            case 0x4015: { // APU CHANNEL STATUS
                return (
                    (nes.apu.sq2.lengthplaying << 1) |
                    (nes.apu.sq1.lengthplaying)
                );
                break;
            }
            case 0x4016: { // CONTROLLER 1
                const bit = nes.joypad.pollJoypad();
                nes.joypad.shiftJoypad();
                return bit; // TODO OPENBUS
                break;
            }
            case 0x4017: { // CONTROLLER 2
                //nes.joypad.shiftJoypad(); // why was i polling joy1 when this is joy2
                return 0; // TODO OPENBUS
                break;
            }

            // TODO - figure out what happens when reading unused space
            default: {
                return 0;
            }
        }
    };

    this.writeIO = function(addr, val) {
        switch (addr) {
            // ---- SQUARE CHANNEL 1
            case 0x4000: { // ENVELOPE
                nes.apu.sq1.duty = val >> 6;
                nes.apu.sq1.loopvol = (val & 0x20) !== 0;
                nes.apu.sq1.constantvol = (val & 0x10) !== 0;
                nes.apu.sq1.volreload = val & 0xf;

                // update sq1 volume
                nes.apu.sq1.vol = (nes.apu.sq1.constantvol ? nes.apu.sq1.volreload : nes.apu.sq1.envvol);
                nes.apu.sq1.calcMasterVol();
                break;
            }
            case 0x4001: { // SWEEP
                nes.apu.sq1.sweepenabled = (val & 0x80) !== 0;
                nes.apu.sq1.sweepdivreload = (val >> 4) & 0x7;
                nes.apu.sq1.sweepneg = (val & 0x8) !== 0;
                nes.apu.sq1.sweepshift = val & 0x7;

                nes.apu.sq1.updateSweepTarget();     

                // Set reload flag
                nes.apu.sq1.sweepstart = true;
                break;
            }
            case 0x4002: { // FREQ LO
                nes.apu.sq1.freqreload &= 0x700;
                nes.apu.sq1.freqreload |= val;

                nes.apu.sq1.updateSweepTarget();
                break;
            }
            case 0x4003: { // FREQ HI + LENGTH
                nes.apu.sq1.writeLength(val >> 3);

                nes.apu.sq1.freqreload &= 0xff;
                nes.apu.sq1.freqreload |= (val & 7) << 8;

                nes.apu.sq1.updateSweepTarget();

                // Side effects
                nes.apu.sq1.volstart = true;
                nes.apu.sq1.dutystep = 0;
                break;
            }

            // ---- SQUARE CHANNEL 2
            case 0x4004: { // ENVELOPE
                nes.apu.sq2.duty = val >> 6;
                nes.apu.sq2.loopvol = (val & 0x20) !== 0;
                nes.apu.sq2.constantvol = (val & 0x10) !== 0;
                nes.apu.sq2.volreload = val & 0xf;

                // update sq2 volume
                nes.apu.sq2.vol = (nes.apu.sq2.constantvol ? nes.apu.sq2.volreload : nes.apu.sq2.envvol);
                nes.apu.sq2.calcMasterVol();
                break;
            }
            case 0x4005: { // SWEEP
                nes.apu.sq2.sweepenabled = (val & 0x80) !== 0;
                nes.apu.sq2.sweepdivreload = (val >> 4) & 0x7;
                nes.apu.sq2.sweepneg = (val & 0x8) !== 0;
                nes.apu.sq2.sweepshift = val & 0x7;

                nes.apu.sq2.updateSweepTarget();

                // Set reload flag
                nes.apu.sq2.sweepstart = true;
                break;
            }
            case 0x4006: { // FREQ LO
                nes.apu.sq2.freqreload &= 0x700;
                nes.apu.sq2.freqreload |= val;

                nes.apu.sq2.updateSweepTarget();
                break;
            }
            case 0x4007: { // FREQ HI + LENGTH
                nes.apu.sq2.writeLength(val >> 3);

                nes.apu.sq2.freqreload &= 0xff;
                nes.apu.sq2.freqreload |= (val & 7) << 8;

                nes.apu.sq2.updateSweepTarget();

                // Side effects
                nes.apu.sq2.volstart = true;
                nes.apu.sq2.dutystep = 0;
                break;
            }

            // ---- TRIANGLE CHANNEL
            case 0x4008: { // SETUP
                nes.apu.tri.lengthhalt = (val & 0x80) !== 0;
                nes.apu.tri.linreloadval = val & 0x7f;
                break;
            }
            case 0x400a: { // TIMER LOW
                nes.apu.tri.freqreload &= 0x700;
                nes.apu.tri.freqreload |= val;

                nes.apu.tri.freqplaying = 0|(nes.apu.tri.freqreload >= 2);
                nes.apu.tri.calcMasterVol();
                break;
            }
            case 0x400b: { // TIMER HI + LENGTH
                nes.apu.tri.freqreload &= 0xff;
                nes.apu.tri.freqreload |= (val & 7) << 8;

                nes.apu.tri.freqplaying = 0|(nes.apu.tri.freqreload >= 2);
                nes.apu.tri.calcMasterVol();

                // Length
                nes.apu.tri.writeLength(val >> 3);
                nes.apu.tri.linstart = true;
                break;
            }

            // ---- NOISE CHANNEL
            case 0x400c: { // ENVELOPE
                nes.apu.noi.lengthhalt = (val & 0x20) !== 0;
                nes.apu.noi.constantvol = (val & 0x10) !== 0;
                nes.apu.noi.volreload = val & 0xf;

                nes.apu.noi.vol = (nes.apu.noi.constantvol ? nes.apu.noi.volreload : nes.apu.noi.envvol);
                nes.apu.noi.calcMasterVol(); // i repeated this 3 times i wonder if i should make this a function .... nyeeeeeeeh
                break;
            }
            case 0x400e: { // FREQ
                nes.apu.noi.shiftbit = 1 + 5 * (val >> 7);
                nes.apu.noi.freqreload = nes.apu.noi.freqtable[val & 0xf];
                break;
            }
            case 0x400f: { // LENGTH
                nes.apu.noi.writeLength(val >> 3);
                nes.apu.noi.volstart = true;
                break;
            }

            case 0x4014: { // OAMDMA
                // Hacky DMA ,,, only for now ok u_u
                var cpuAddr = val << 8;
                for (var i = 0; i < 0x100; i++) {
                    this.OAMDATAwrite(nes.cpu.read(cpuAddr));
                    cpuAddr++;
                }
                break;
            }

            case 0x4015: { // APU CHANNEL STATUS
                if ((val & 0x1) === 0) {
                    nes.apu.sq1.silence();
                }
                else
                    nes.apu.sq1.enable();

                if ((val & 0x2) === 0)
                    nes.apu.sq2.silence();
                else
                    nes.apu.sq2.enable();

                if ((val & 0x4) === 0)
                    nes.apu.tri.silence();
                else
                    nes.apu.tri.enable();

                if ((val & 0x8) === 0)
                    nes.apu.noi.silence();
                else
                    nes.apu.noi.enable();
                break;
            }

            case 0x4016: { // CONTROLLER 1
                nes.joypad.strobe = (1&val) !== 0;
                if (nes.joypad.strobe) {
                    nes.joypad.shift = 0;
                }
                break;
            }

            case 0x4017: { // FRAME COUNTER
                nes.apu.fcmode = (val & 0x80) !== 0;
                if ((val & 0x40) !== 0)
                    nes.apu.fcIrqEnabled = false;

                // Reset tick and step
                nes.apu.fctick = 0;
                nes.apu.fcsteptick = 0;

                // Generate half and quarter signal
                if (nes.apu.fcmode)
                    nes.apu.fcgensignal = 2;
                break;
            }
        }
    };

    // =============== // CPU --> PPU Access //
    // TODO - turn the code in the switch statements into functions
    this.ppuLatch = false;
    this.ppuAddrInc = 0;
    this.oamLatch = false;

    this.CPUreadPPU = function(addr) {
        addr &= 7;
        switch (addr) {
            case 0: { // PPUCTR
                return 0; // OPENBUS
                break;
            }
            case 1: { // PPUMASK
                return 0; // OPENBUS
                break;
            }
            case 2: { // PPUSTATUS
                var byte = (
                    // ...
                    (nes.ppu.sprite0Atm << 6)
                    | (nes.ppu.vblankFlag << 7)
                );

                // if (nes.ppu.sprite0Atm)
                //     console.log(nes.ppu.ly);

                nes.ppu.vblankFlag = false;
                this.ppuLatch = false; // Reset latch

                return byte;
                break;
            }
            case 3: { // OAMADDR
                return 0; // OPENBUS
                break;
            }
            case 4: { // OAMDATA
                // When enabled and rendering ...
                if (nes.ppu.enabled && !nes.ppu.vblankAtm) {
                    // ???
                }
                // ... Vblanking (or off)
                else {
                    return this.oam[nes.ppu.oamAddr] & 0xe3; // Mask out the void bits
                }
                break;
            }
            case 5: { // PPUSCROLL
                return 0; // OPENBUS
                break;
            }
            case 6: { // PPUADDR
                return 0; // OPENBUS
                break;
            }
            case 7: { // PPUDATA
                var ppuaddr = nes.ppu.ppuAddr & 0x3fff;

                nes.ppu.ppuAddr += this.ppuAddrInc;
                nes.ppu.ppuAddr &= 0xffff;

                this.mapper.feedAddr(ppuaddr);
                return nes.ppu.readFromCPU(ppuaddr);
                break;
            }

            // TODO: make default return openbus
        }
    };

    this.CPUwritePPU = function(addr, val) {
        addr &= 7;
        switch (addr) {
            case 0: { // PPUCTR
                var preNmiEnabled = nes.ppu.nmiEnabled;

                nes.ppu.tAddr &= 0b0111001111111111;
                nes.ppu.tAddr |= (val & 3) << 10; // Base nametable addr

                this.ppuAddrInc = ((val & 0x04) !== 0) ? 32 : 1;
                nes.ppu.spritePatTable = ((val & 0x08) !== 0) ? 0x1000 : 0;
                nes.ppu.patTable = ((val & 0x10) !== 0) ? 0x1000 : 0;
                nes.ppu.doubleSprites = ((val & 0x20) !== 0);
                nes.ppu.spriteSize = 8 + (8 * nes.ppu.doubleSprites);
                //nes.ppu.spriteSize = ((val & 0x20) !== 0) ? 16 : 8;
                nes.ppu.masterSelect = (val & 0x40) !== 0;
                nes.ppu.nmiEnabled = (val & 0x80) !== 0;

                // when NMI requested
                if (nes.ppu.nmiEnabled && !nes.ppu.considerNmiEnabled) {
                    nes.ppu.considerNmiEnabled = (!preNmiEnabled && nes.ppu.nmiEnabled);
                }
                // when NMI yet to be requested
                else {
                    nes.ppu.considerNmiEnabled = nes.ppu.nmiEnabled;
                }
                break;
            }
            case 1: { // PPUMASK
                nes.ppu.enabled = (val & 0b11000) !== 0;
                // Fill black screen if disabled (THIS IS WRONG)
                // if (!nes.ppu.enabled) {
                //     nes.ppu.rendering.clearImg();
                // }

                nes.ppu.greyscale = (val & 0x01) !== 0;
                nes.ppu.showBgLeft = (val & 0x02) !== 0;
                nes.ppu.showSpritesLeft = (val & 0x04) !== 0;
                nes.ppu.bgEnabled = (val & 0x08) !== 0;
                nes.ppu.spritesEnabled = (val & 0x10) !== 0;
                break;
            }
            case 2: { // PPUSTATUS
                break;
            }
            case 3: { // OAMADDR
                nes.ppu.oamAddr = val;
                break;
            }
            case 4: { // OAMDATA
                this.OAMDATAwrite(val);
                break;
            }
            case 5: { // PPUSCROLL (TODO - ADD SCROLL Y VBLANK BEHAVIOR)
                // Update y scroll
                if (this.ppuLatch) {
                    nes.ppu.tAddr &= 0b0000110000011111;

                    nes.ppu.tAddr |= (val >> 3) << 5; // Coarse y
                    nes.ppu.tAddr |= (val & 7) << 12; // Fine y

                    this.ppuLatch = false;
                }
                // Update x scroll
                else {
                    // Update x scroll
                    nes.ppu.tAddr &= 0b0111111111100000;

                    nes.ppu.tAddr |= (val >> 3);    // Coarse x
                    nes.ppu.fineX = (val & 7);      // Fine x

                    this.ppuLatch = true;
                }
                break;
            }
            case 6: { // PPUADDR
                if (this.ppuLatch) {
                    nes.ppu.tAddr &= 0x3f00;
                    nes.ppu.tAddr |= val;

                    nes.ppu.ppuAddr = nes.ppu.tAddr; // Update ppu addr
                    this.mapper.feedAddr(nes.ppu.ppuAddr);
                }
                else {
                    nes.ppu.tAddr &= 0x00ff;
                    nes.ppu.tAddr |= (val & 0x3f) << 8;
                }

                this.ppuLatch = !this.ppuLatch;
                break;
            }
            case 7: { // PPUDATA
                var addr = nes.ppu.ppuAddr & 0x3fff;
                this.mapper.feedAddr(addr);
                nes.ppu.write(addr, val);

                nes.ppu.ppuAddr += this.ppuAddrInc;
                nes.ppu.ppuAddr &= 0xffff;
                break;
            }
        }
    };

    this.OAMDATAwrite = function(val) {
        if (nes.ppu.enabled && !nes.ppu.vblankAtm) {
            // TODO (?)
        }
        // ... Vblanking (or off)
        else {
            this.oam[nes.ppu.oamAddr] = val;

            nes.ppu.oamAddr++;
            nes.ppu.oamAddr &= 0xff;
        }
    };

    // =============== // Cartridges //
    this.cartridge = new Cartridge(nes, this);

    this.mapper = {};
    this.mapperId = 0;
    this.romSize = 0;
    this.chrSize = 0;
    this.cartramSize = 0;
    this.romSizeMask = 0;
    this.hasChrRam = false;
    this.hasExtraRam = false;
    this.chrSizeMask = 0;
    this.cartramSizeMask = 0;

    // Loading cart
    this.loadRomBuff = function(rombuff) {
        if (typeof rombuff !== 'object') {
            throw 'This is not a ROM!';
            return;
        }

        rombuff = new Uint8Array(rombuff);
        this.loadRomProps(rombuff);
    };

    this.loadSaveBuff = function(savebuff) {
        if (typeof savebuff !== 'object') {
            throw 'This is not a SAVE!';
            return;
        }

        if (!this.hasExtraRam) {
            throw 'This ROM doesn\'t have save files!';
            return false;
        }

        savebuff = new Uint8Array(savebuff);
        var length = Math.min(savebuff.length, this.cartram.length);

        this.cartram.fill(0);
        for (var i = 0; i < length; i++) {
            this.cartram[i] = savebuff[i];
        }

        console.log('Loaded save file');
        return true;
    };

    this.loadRomIntoMem = function(rom) {

        // If no errors have occured in loadRomProps, we should be good to go !
        this.rom = new Uint8Array(this.romSize);
        this.chr = new Uint8Array(this.chrSize);
        this.cartram = new Uint8Array(this.cartramSize);

        // load rom
        for (var i = 0; i < this.romSize; i++) {
            this.rom[i] = rom[i + constants.ines_headersize];
        }

        // load chr
        if (this.hasChrRam)
            return;
        for (var i = 0; i < this.chrSize; i++) {
            this.chr[i] = rom[i + constants.ines_headersize + this.romSize];
        }
    };

    // Loading mappers
    this.loadMapper = function(mapperId) {
        this.mapperId = mapperId;
        this.mapper = this.cartridge.mappers[mapperId];
        // this.readCart = (addr) => this.mapper.read(addr);
        // this.writeCart = (addr, val) => this.mapper.write(addr, val);
        // this.readChr = (addr) => this.mapper.readChr(addr);
        // this.writeChr = (addr, val) => this.mapper.writeChr(addr, val);
    };
    this.loadMapper(0); // by default

    this.loadRomProps = function(rom) {
        // iNES magic bytes
        if (rom[0] !== 0x4e || rom[1] !== 0x45 || rom[2] !== 0x53 || rom[3] !== 0x1a) {
            throw 'Invalid ROM!';
            return;
        }

        // Mappers
        var mapperId = (rom[6] >> 4) | (rom[7] & 0xf0);
        console.log('mapper:', mapperId);
        if (!this.cartridge.mappers[mapperId]) {
            throw `Unsupported ROM (map: ${mapperId})!`;
            return;
        }

        // rom
        this.romSize = 0x4000 * rom[4];
        // chr
        if (rom[5] === 0) {
            this.hasChrRam = true;
            this.chrSize = 0x4000;
        }
        else {
            this.hasChrRam = false;
            this.chrSize = 0x2000 * rom[5];
        }
        // cart ram
        this.cartramSize = rom[8] === 0 ? 0x2000 : 0x2000 * rom[8];
        
        this.romSizeMask = this.romSize - 1;
        this.chrSizeMask = this.chrSize - 1;
        this.cartramSizeMask = this.cartramSize - 1;

        // Nametable mirroring
        this.nametable4screen = (rom[6] & 0x8) !== 0; // 4 screen
        if (rom[6] & 0x1) {
            // vertical
            this.nametable0map = 0;
            this.nametable1map = 1;
            this.nametable2map = 0;
            this.nametable3map = 1;
        }
        else {
            // horizontal
            this.nametable0map = 0;
            this.nametable1map = 0;
            this.nametable2map = 1;
            this.nametable3map = 1;
        }

        this.hasExtraRam = (rom[6] & 0x2) !== 0;

        this.rawfilerom = rom;
        this.loadRomIntoMem(rom);
        this.loadMapper(mapperId);
    };

    // =============== // Reset Function //
    this.reset = function() {
        this.wram.fill(0);

        this.nametable[0].fill(0);
        this.nametable[1].fill(0);
        this.nametable[2].fill(0);
        this.nametable[3].fill(0);

        this.oam.fill(0);
        this.palleteram.fill(0);

        if (this.hasChrRam) {
            this.chr.fill(0);
        }

        // IO regs
        for (var i = 0x4000; i < 0x4020; i++)
            this.writeIO(i, 0);
        // PPU regs
        for (var i = 0; i < 8; i++)
            this.CPUwritePPU(i, 0);

        // reset PPU access stuff
        this.oamLatch = false; // Reset flip-flop
        this.ppuLatch = false; // Reset flip-flop
        this.ppuData = 0;

        // reset cartridge
        this.mapper.reset();
    };

};

export default Mem;