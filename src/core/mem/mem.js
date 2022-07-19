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

    this.nametable0map = 0;
    this.nametable1map = 0;
    this.nametable2map = 0;
    this.nametable3map = 0;

    this.oam = new Uint8Array(64 * 4);
    this.palleteram = new Uint8Array(0x20);

    // cartridge
    this.rom = new Uint8Array(0);
    this.chr = new Uint8Array(0);
    this.cartram = new Uint8Array(0);

    // =============== // IO Accesses //
    this.readIO = function(addr) {
        addr &= 0x1f;
        switch (addr) {
            case 0x16: { // CONTROLLER 1
                const bit = nes.joypad.pollJoypad();
                nes.joypad.shiftJoypad();
                return bit; // TODO OPENBUS
                break;
            }
            case 0x17: { // CONTROLLER 2
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
        addr &= 0x1f;
        switch (addr) {
            case 0x14: { // OAMDMA
                // Hacky DMA ,,, only for now ok u_u
                var cpuAddr = val << 8;
                for (var i = 0; i < 0x100; i++) {
                    this.OAMDATAwrite(nes.cpu.read(cpuAddr));
                    cpuAddr++;
                }
                break;
            }
            case 0x16: { // CONTROLLER 1
                nes.joypad.strobe = (1&val) !== 0;
                if (nes.joypad.strobe) {
                    nes.joypad.shift = 0;
                }
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
                var byte = nes.ppu.readFromCPU(nes.ppu.ppuAddr & 0x3fff);

                nes.ppu.ppuAddr += this.ppuAddrInc;
                nes.ppu.ppuAddr &= 0xffff;

                return byte;
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
                }
                // Update x scroll
                else {
                    // Update x scroll
                    nes.ppu.tAddr &= 0b0111111111100000;

                    nes.ppu.tAddr |= (val >> 3);  // Coarse x
                    nes.ppu.fineX = (val & 7);      // Fine x
                }

                this.ppuLatch = !this.ppuLatch;
                break;
            }
            case 6: { // PPUADDR
                if (this.ppuLatch) {
                    nes.ppu.tAddr &= 0x3f00;
                    nes.ppu.tAddr |= val;

                    nes.ppu.ppuAddr = nes.ppu.tAddr; // Update ppu addr
                }
                else {
                    nes.ppu.tAddr &= 0x00ff;
                    nes.ppu.tAddr |= (val & 0x3f) << 8;
                }

                this.ppuLatch = !this.ppuLatch;
                break;
            }
            case 7: { // PPUDATA
                nes.ppu.write(nes.ppu.ppuAddr & 0x3fff, val);

                nes.ppu.ppuAddr += this.ppuAddrInc;
                nes.ppu.ppuAddr &= 0xffff;
                break;
            }
        }
    };

    this.OAMDATAwrite = function(val) {
        if (nes.ppu.enabled && !nes.ppu.vblankAtm) {
            // ...
        }
        // ... Vblanking (or off)
        else {
            this.oam[nes.ppu.oamAddr] = val;

            nes.ppu.oamAddr++;
            nes.ppu.oamAddr &= 0xff;
        }
    };

    // =============== // Cartridge /Access //
    this.readCart = function(addr) {};
    this.writeCart = function(addr, val) {};
    this.readChr = function(addr) {};
    this.writeChr = function(addr, val) {};

    // =============== // Cartridges //
    this.cartridge = new Cartridge(nes, this);

    this.mapperId = 0;
    this.romSize = 0;
    this.chrSize = 0;
    this.cartramSize = 0;
    this.romSizeMask = 0;
    this.hasChrRam = false;
    this.chrSizeMask = 0;
    this.cartramSizeMask = 0;

    // Loading cart
    this.loadRomBuff = function(romBuff) {
        if (typeof romBuff !== 'object')
            throw 'this is not a rom !';

        var rom = new Uint8Array(romBuff);
        this.loadRomProps(rom);
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
        if (!this.cartridge.mappers[mapperId])
            throw `unsupported rom mapper (${mapperId}) !`;

        this.mapperId = mapperId;
        var mapper = this.cartridge.mappers[mapperId];
        this.readCart = (addr) => mapper.read(addr);
        this.writeCart = (addr, val) => mapper.write(addr, val);
        this.readChr = (addr) => mapper.readChr(addr);
        this.writeChr = (addr, val) => mapper.writeChr(addr, val);
    };

    this.loadRomProps = function(rom) {
        // iNES magic bytes
        if (rom[0] !== 0x4e || rom[1] !== 0x45 || rom[2] !== 0x53 || rom[3] !== 0x1a)
            throw 'unsupported rom !';

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
        if (rom[6] & 1) {
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

        // Mappers
        var mapperId = (rom[6] >> 4) | (rom[7] & 0xf0);
        console.log('mapper:', mapperId);

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
        for (var i = 0; i < 0x20; i++)
            this.writeIO(i, 0);
        // PPU regs
        for (var i = 0; i < 8; i++)
            this.CPUwritePPU(i, 0);

        // reset PPU access stuff
        this.oamLatch = false; // Reset flip-flop
        this.ppuLatch = false; // Reset flip-flop
        this.ppuData = 0;

        // reset cartridge
        this.cartridge.reset();
    };

};

export default Mem;