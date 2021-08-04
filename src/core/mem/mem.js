import constants from '../constants.js';

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

    // =============== // Memory Bus (Reads And Writes) //
    // IO register access
    this.readIO = function(addr) {
        addr -= 0x4000;
        return 0;
    };

    this.writeIO = function(addr, val) {
        addr -= 0x4000;
    };

    // CPU to PPU register access
    this.ppuLatch = false;
    this.ppuAddrInc = 0;

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
            case 3: { // OAMADDR_LO
                return 0; // OPENBUS
                break;
            }
            case 4: { // OAMDATA
                return 0; // todo :3
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
                nes.ppu.tAddr &= 0b0111001111111111;
                nes.ppu.tAddr |= (val & 3) << 10; // Base nametable addr

                this.ppuAddrInc = ((val & 0x04) !== 0) ? 32 : 1;
                nes.ppu.spriteTable = ((val & 0x08) !== 0) ? 0x1000 : 0;
                nes.ppu.patTable = ((val & 0x10) !== 0) ? 0x1000 : 0;
                nes.ppu.spriteSize = ((val & 0x20) !== 0) ? 16 : 8;
                nes.ppu.masterSelect = (val & 0x40) !== 0;
                nes.ppu.nmiEnabled = (val & 0x80) !== 0;
                break;
            }
            case 1: { // PPUMASK
                nes.ppu.enabled = (val & 0b11000) !== 0;

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
            case 3: { // OAMADDR_LO
                break;
            }
            case 4: { // OAMDATA
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

    // Cartridge memory access
    this.readCart = function(addr) {
        // NROM
        if (addr < 0x8000) {
            return 0; // cartram
        }
        else {
            return this.rom[addr & (this.romSize-1)]; // rom
        }
    };

    this.writeCart = function(addr, val) {
    };

    // =============== // Cartridges //
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
        for (var i = 0; i < this.chrSize; i++) {
            this.chr[i] = rom[i + constants.ines_headersize + this.romSize];
        }
    };

    this.romSize = 0;
    this.chrSize = 0;
    this.cartramSize = 0;
    this.loadRomProps = function(rom) {
        // iNES magic bytes
        if (rom[0] !== 0x4e || rom[1] !== 0x45 || rom[2] !== 0x53 || rom[3] !== 0x1a)
            throw 'unsupported rom !';

        // We just accepting nrom for now btw
        this.romSize = 0x4000 * rom[4];
        this.chrSize = 0x2000 * rom[5];
            nes.ppu.hasChrRam = (rom[5] === 0);
        this.loadRomIntoMem(rom);

        // Nametables
        if (rom[6] & 1) {
            this.nametable0map = 0;
            this.nametable1map = 1;
            this.nametable2map = 0;
            this.nametable3map = 1;
        }
        else {
            this.nametable0map = 0;
            this.nametable1map = 0;
            this.nametable2map = 1;
            this.nametable3map = 1;
        }
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

        // IO regs
        // PPU regs
        for (var i = 0; i < 8; i++)
            this.CPUwritePPU(i, 0);

        // reset properties
        nes.ppu.ppuAddr = 0;
        this.ppuLatch = false; // Reset flip-flop
        this.ppuData = 0;
    };

};

export default Mem;