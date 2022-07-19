const Cartridge = function(nes, mem) {
    var cartridge = this;

    // =============== // Mapper Variables //

    // =============== // Mappers //
    this.mappers = {};

    // NROM
    this.mappers[0] = {
        read(addr) {
            if (addr < 0x8000) {
                return 0; // cartram
            }
            else {
                return mem.rom[(addr & 0x7fff) & mem.romSizeMask]; // rom
            }
        },
        write(addr, val) {

        },
        readChr(addr) {
            return mem.chr[addr & mem.chrSizeMask];
        },
        writeChr(addr, val) {
            if (mem.hasChrRam) {
                mem.chr[addr & mem.chrSizeMask] = val; // 16KB CHR RAM
            }
        },

        reset() {

        }
    };

    this.mappers[1] = {
        shiftreg: 0,

        rommode: 0,
        rombank: 0,
        romwhole: false,
        rombank0: 0,
        rombank1: 0,
        rombank0addr: 0,
        rombank1addr: 0,

        chrwhole: false,
        chrbank0: 0,
        chrbank1: 0,
        chrbank0addr: 0,
        chrbank1addr: 0,

        ramenabled: false,
        nametablemirroring: 0,

        read(addr) {
            // CARTRAM
            if (addr < 0x8000) {
                if (this.ramenabled) {
                    return mem.cartram[(addr-0x4020) & mem.cartramSizeMask];
                }
                else {
                    return 0;
                }
            }
            // ROM
            else if (this.romwhole) {
                return mem.rom[((addr & 0x7fff) + this.rombank0addr) & mem.romSizeMask];
            }
            else {
                if (addr < 0xc000) {
                    return mem.rom[((addr & 0x3fff) + this.rombank0addr) & mem.romSizeMask];
                }
                else {
                    return mem.rom[((addr & 0x3fff) + this.rombank1addr) & mem.romSizeMask];
                }
            }
        },
        write(addr, val) {
            if (addr < 0x8000) {
                if (this.ramenabled) {
                    mem.cartram[(addr-0x4020) & mem.cartramSizeMask] = val;
                }
            }
            // bank shifting
            else {
                // reset shiftreg
                if (val & 0x80) {
                    this.shiftreg = 0x10;
                }
                else {
                    // shiftreg is full
                    if (this.shiftreg & 1) {
                        var result = (this.shiftreg >> 1) | ((val&1) << 4);
                        this.shiftreg = 0x10;
                        //console.log(result.toString(2), (addr&0x6000).toString(16))

                        switch (addr & 0x6000) {
                            case 0x0000: { // CONTROL
                                this.chrwhole = (result & 0x10) === 0;
                                this.rommode = (result >> 2) & 3;

                                this.romwhole = (this.rommode < 2);
                                this.fixRomBanks();

                                this.nametablemirroring = result & 3;
                                this.fixMirroring();
                                break;
                            }
                            case 0x2000: { // CHR BANK 0
                                this.chrbank0 = result;

                                if (this.chrwhole) {
                                    this.chrbank0addr = (result & (~1)) * 0x2000;
                                }
                                else {
                                    this.chrbank0addr = result * 0x1000;
                                }
                                break;
                            }
                            case 0x4000: { // CHR BANK 1
                                this.chrbank1 = result;
                                this.chrbank1addr = result * 0x1000;
                                break;
                            }
                            case 0x6000: { // ROM BANK
                                this.rombank = result & 0xf;
                                this.ramenabled = (result & 0x10) === 0;
                                this.fixRomBanks();
                                break;
                            }
                        }

                    }
                    // keep shifting the reg
                    else {
                        this.shiftreg = (this.shiftreg >> 1) | ((val&1) << 4);
                    }
                }
            }
        },
        readChr(addr) {
            if (this.chrwhole) {
                return mem.chr[(addr + this.chrbank0addr) & mem.chrSizeMask];
            }
            else {
                if (addr < 0x1000) {
                    return mem.chr[(addr + this.chrbank0addr) & mem.chrSizeMask];
                }
                else {
                    return mem.chr[((addr&0xfff) + this.chrbank1addr) & mem.chrSizeMask];
                }
            }
        },
        writeChr(addr, val) {
            if (this.chrwhole) {
                mem.chr[(addr + this.chrbank0addr) & mem.chrSizeMask] = val;
            }
            else {
                if (addr < 0x1000) {
                    mem.chr[(addr + this.chrbank0addr) & mem.chrSizeMask] = val;
                }
                else {
                    mem.chr[((addr&0xfff) + this.chrbank1addr) & mem.chrSizeMask] = val;
                }
            }
        },

        // helpers
        fixRomBanks() {
            // (2) $8000 bank fixed, $C000 switchable
            if (this.rommode === 2) {
                this.rombank0 = 0;

                this.rombank1 = this.rombank;
                this.rombank1addr = this.rombank1 * 0x4000;
            }
            // (3 OR < 2) $8000 switchable, $C000 fixed
            else {
                this.rombank0 = this.rombank;

                if (this.romwhole) {
                    this.rombank0addr = (this.rombank0 & (~1)) * 0x8000;
                }
                else {
                    this.rombank0addr = this.rombank0 * 0x4000;

                    this.rombank1 = 0|(mem.romSize / 0x4000) - 1;
                    this.rombank1addr = this.rombank1 * 0x4000;
                }
            }
        },
        fixMirroring() {
            switch (this.nametablemirroring) {
                case 0: { // single screened -- lower
                    mem.nametable0map = 1;
                    mem.nametable1map = 1;
                    mem.nametable2map = 1;
                    mem.nametable3map = 1;
                    break;
                }
                case 1: { // single screened -- higher
                    mem.nametable0map = 0;
                    mem.nametable1map = 0;
                    mem.nametable2map = 0;
                    mem.nametable3map = 0;
                    break;
                }
                case 2: { // vertical mirrored
                    mem.nametable0map = 0;
                    mem.nametable1map = 1;
                    mem.nametable2map = 0;
                    mem.nametable3map = 1;
                    break;
                }
                case 3: { // horizontal mirrored
                    mem.nametable0map = 0;
                    mem.nametable1map = 0;
                    mem.nametable2map = 1;
                    mem.nametable3map = 1;
                    break;
                }
            }
        },

        // reset
        reset() {
            this.shiftreg = 0x10;

            this.rommode = 3;
            this.romwhole = false;
            this.rombank = 0;
            this.fixRomBanks();

            this.ramenabled = true;
            this.chrwhole = false;

            this.nametablemirroring = 0;
            this.fixMirroring();
        }
    };

    this.mappers[4] = {
        bank: new Array(8),
        bankaddr: new Array(8),
        secondlastbankaddr: 0,

        // reg 0
        selectedbank: 0,
        rominverted: false,
        chrinverted: false,

        irqcounter: 0,

        read(addr) {

        },
        write(addr, val) {

        },
        readChr(addr) {

        },
        writeChr(addr, val) {

        },

        reset() {

        }
    };

    // =============== // Reset //
    this.reset = function() {
        this.mappers[mem.mapperId].reset();
    };
};

export default Cartridge;