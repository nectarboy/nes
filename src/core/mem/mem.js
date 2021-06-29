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
    this.ppuAddrInc = 0;

    this.ppuCtr = 0;
    this.ppuAddrShift = 8;

    this.CPUreadPPU = function(addr) {
        addr &= 7;
        switch (addr) {
            case 0: // PPUCTR
                return 0; // OPENBUS
                break;
            case 1: // PPUMASK
                return 0; // OPENBUS
                break;
            case 2: // PPUSTATUS
                var byte = (
                    // ...
                    (nes.ppu.sprite0Atm << 6)
                    | (nes.ppu.vblankFlag << 7)
                );

                nes.ppu.vblankFlag = false;
                return byte;
                break;
            case 3: // OAMADDR_LO
                return 0; // OPENBUS
                break;
            case 4: // OAMDATA
                return 0; // todo :3
                break;
            case 5: // PPUSCROLL
                return 0; // OPENBUS
                break;
            case 6: // PPUADDR
                return 0; // OPENBUS
                break;
            case 7: // PPUDATA
                var ret = nes.ppu.readFromCPU(nes.ppu.ppuAddr & 0x3fff);
                nes.ppu.ppuAddr += this.ppuAddrInc;
                nes.ppu.ppuAddr &= 0xffff;

                return ret;
                break;

            default: throw `??? out of bounds CPU2PPU read ${addr.toString(16)}`;
        }
    };

    this.CPUwritePPU = function(addr, val) {
        addr &= 7;
        switch (addr) {
            case 0: // PPUCTR
                this.ppuCtr = val;

                nes.ppu.baseNametableAddr = 0x2000 | (0x4000 * (val & 3));
                this.ppuAddrInc = ((val & 0x04) !== 0) ? 16 : 1;
                nes.ppu.spriteTable = ((val & 0x08) !== 0) ? 0x1000 : 0;
                nes.ppu.bgTable = ((val & 0x10) !== 0) ? 0x1000 : 0;
                nes.ppu.spriteSize = ((val & 0x20) !== 0) ? 16 : 8;
                nes.ppu.masterSelect = (val & 0x40) !== 0;
                nes.ppu.nmiEnabled = (val & 0x80) !== 0;
                break;
            case 1: // PPUMASK
                var enabledBefore = nes.ppu.enabled;
                nes.ppu.enabled = (val & 0b11000) !== 0;

                if (nes.ppu.enabled !== enabledBefore) nes.ppu.cycles = 0; // MIGHT BE WRONG ??

                nes.ppu.greyscale = (val & 0x01) !== 0;
                nes.ppu.showBgLeft = (val & 0x02) !== 0;
                nes.ppu.showSpritesLeft = (val & 0x04) !== 0;
                nes.ppu.bgEnabled = (val & 0x08) !== 0;
                nes.ppu.spritesEnabled = (val & 0x10) !== 0;
                break;
            case 2: // PPUSTATUS
                break;
            case 3: // OAMADDR_LO
                break;
            case 4: // OAMDATA
                break;
            case 5: // PPUSCROLL
                break;
            case 6: // PPUADDR
                nes.ppu.ppuAddr &= ~(0xff << this.ppuAddrShift);
                nes.ppu.ppuAddr |= (val << this.ppuAddrShift);

                this.ppuAddrShift ^= 8;
                break;
            case 7: // PPUDATA
                nes.ppu.write(nes.ppu.ppuAddr & 0x3fff, val);
                nes.ppu.ppuAddr += this.ppuAddrInc;
                nes.ppu.ppuAddr &= 0xffff;
                break;

            default: throw `??? out of bounds CPU2PPU write ${addr.toString(16)} ${val.toString(16)}`;
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

    // =============== // Bootstrapping //
    this.reset = function() {
        
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

        // we just accepting nrom for now btw
        this.romSize = 0x4000 * rom[4];
        this.chrSize = 0x2000 * rom[5];
        this.loadRomIntoMem(rom);

        // name tables
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
        this.ppuCtr = 0;
        nes.ppu.ppuAddr = 0;
        this.ppuAddrShift = 8;
        this.ppuData = 0;
    };

};

export default Mem;