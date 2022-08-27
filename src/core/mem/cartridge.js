const Cartridge = function(nes, mem) {
    var cartridge = this;

    // =============== // Mapper Variables //

    // =============== // Mappers //
    this.mappers = {};

    // NROM
    this.mappers[0] = {
        read(addr) {
            if (addr < 0x8000) {
                return 0; // cartram (OPENBUS)
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

        feedAddr(addr) {},

        reset() {

        }
    };

    // MMC1
    // TODO: optimize reads n shit
    // idk how just do it
    this.mappers[1] = {
        shiftreg: 0,

        rommode: 0,
        rombank: 0,
        romwhole: false,

        rombanks: new Array(2),
        rombankaddr: new Array(2),
        romaddrmask: 0,
        rombankmask: 0,

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
                if (this.ramenabled && addr >= 0x6000) {
                    return mem.cartram[(addr-0x6000) & mem.cartramSizeMask];
                }
                else {
                    return 0; // TODO: openbus
                }
            }
            // ROM
            else {
                return mem.rom[((addr & this.romaddrmask) + this.rombankaddr[(addr & this.rombankmask) >> 14]) & mem.romSizeMask];
            }
            // else if (this.romwhole) {
            //     return mem.rom[((addr & 0x7fff) + this.rombankaddr[0]) & mem.romSizeMask];
            // }
            // else {
            //     if (addr < 0xc000) {
            //         return mem.rom[((addr & 0x3fff) + this.rombankaddr[0]) & mem.romSizeMask];
            //     }
            //     else {
            //         return mem.rom[((addr & 0x3fff) + this.rombankaddr[1]) & mem.romSizeMask];
            //     }
            // }
        },
        write(addr, val) {
            if (addr < 0x8000) {
                if (this.ramenabled && addr >= 0x6000) {
                    mem.cartram[(addr-0x6000) & mem.cartramSizeMask] = val;
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
            if (mem.hasChrRam === false)
                return;

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
                this.rombanks[0] = 0;

                this.rombanks[1] = this.rombank;
                this.rombankaddr[1] = this.rombanks[1] * 0x4000;

                this.romaddrmask = 0x3fff;
                this.rombankmask = 0x7fff;
            }
            // (3 OR < 2) $8000 switchable, $C000 fixed
            else {
                this.rombanks[0] = this.rombank;

                if (this.romwhole) {
                    this.rombankaddr[0] = (this.rombanks[0] & (~1)) * 0x8000;

                    this.romaddrmask = 0x7fff;
                    this.rombankmask = 0x3fff;
                }
                else {
                    this.rombankaddr[0] = this.rombanks[0] * 0x4000;

                    this.rombanks[1] = 0|(mem.romSize / 0x4000) - 1;
                    this.rombankaddr[1] = this.rombanks[1] * 0x4000;

                    this.romaddrmask = 0x3fff;
                    this.rombankmask = 0x7fff;
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

        feedAddr(addr) {},

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

    // MMC3
    this.mappers[4] = {
        bankselected: 0,
        banks: new Array(8),

        cpubankaddr: new Array(4),
        cpuinvert: false,

        ppubankaddr: new Array(6),
        ppuinvert: false,

        ramenabled: false,
        ramwriteallow: false,

        a12: 0,
        irqcounter: 0,
        irqreloadval: false,
        irqstart: false,
        irqenabled: false,

        fixCpuAddr() {
            if (this.cpuinvert) {
                this.cpubankaddr[0] = mem.romSize - 0x4000;
                this.cpubankaddr[2] = 0x2000 * this.banks[6];
            }
            else {
                this.cpubankaddr[0] = 0x2000 * this.banks[6];
                this.cpubankaddr[2] = mem.romSize - 0x4000;
            }

            // Applies for both cases
            this.cpubankaddr[1] = 0x2000 * this.banks[7];
            this.cpubankaddr[3] = mem.romSize - 0x2000;
        },
        fixPpuAddr() {
            this.ppubankaddr[0] = (this.banks[0] & 0xfe) * 0x400;
            this.ppubankaddr[1] = (this.banks[1] & 0xfe) * 0x400;

            this.ppubankaddr[2] = this.banks[2] * 0x400;
            this.ppubankaddr[3] = this.banks[3] * 0x400;
            this.ppubankaddr[4] = this.banks[4] * 0x400;
            this.ppubankaddr[5] = this.banks[5] * 0x400;
        },
        fixMirroring(val) {
            if (mem.nametable4screen) {
                mem.nametable0map = 0;
                mem.nametable1map = 1;
                mem.nametable2map = 2;
                mem.nametable3map = 3;
            }
            else if (val & 1) {
                // horizontal
                mem.nametable0map = 0;
                mem.nametable1map = 0;
                mem.nametable2map = 1;
                mem.nametable3map = 1;
            }
            else {
                // vertical
                mem.nametable0map = 0;
                mem.nametable1map = 1;
                mem.nametable2map = 0;
                mem.nametable3map = 1;
            }
        },

        read(addr) { // TODO: SWITCH STATEMENT PLSSSSSS
            // Cart Ram
            if (addr < 0x8000) {
                if (this.ramenabled && addr >= 0x6000) {
                    return mem.cartram[(addr-0x6000) & mem.cartramSizeMask];
                }
                else {
                    return 0; // OPENBUS
                }
            }

            // PRG
            else if (addr < 0xa000) {
                return mem.rom[((addr-0x8000) + this.cpubankaddr[0]) & mem.romSizeMask];
            }
            else if (addr < 0xc000) {
                return mem.rom[((addr-0xa000) + this.cpubankaddr[1]) & mem.romSizeMask];
            }
            else if (addr < 0xe000) {
                return mem.rom[((addr-0xc000) + this.cpubankaddr[2]) & mem.romSizeMask];
            }
            else {
                return mem.rom[((addr-0xe000) + this.cpubankaddr[3]) & mem.romSizeMask];
            }
        },
        write(addr, val) {
            // Cartram
            if (addr < 0x8000) {
                if (this.ramwriteallow && addr >= 0x6000) {
                    mem.cartram[(addr-0x6000) & mem.cartramSizeMask] = val;
                }
            }
            // Registers
            else {
                switch (addr >> 13) {
                    case 0x4: {
                        // Bank data (odd)
                        if (addr & 1) {
                            this.banks[this.bankselected] = val;

                            if (this.bankselected < 0b110)
                                this.fixPpuAddr();
                            else
                                this.fixCpuAddr();
                        }
                        // Bank Select (even)
                        else {
                            this.bankselected = val & 7;

                            this.cpuinvert = (val & 0x40) !== 0;
                            this.ppuinvert = (val & 0x80) !== 0;
                            this.fixCpuAddr();
                            this.fixPpuAddr();
                        }
                        break;
                    }
                    case 0x5: {
                        if (addr & 1) {
                            // PRG RAM Protect (odd)
                            this.ramenabled = (val & 0x80) !== 0;
                            this.ramwriteallow = (val & 0x40) === 0;
                        }
                        else {
                            // Mirroring (even)
                            this.fixMirroring(val);
                        }
                        break;
                    }
                    case 0x6: {
                        if (addr & 1) {
                            // IRQ Reload (odd)
                            this.irqstart = true; // reload it on next clock
                        }
                        else {
                            // IRQ Latch Value (even)
                            this.irqreloadval = val;
                        }
                        break;
                    }
                    case 0x7: {
                        if (addr & 1) {
                            // IRQ Enable (odd)
                            this.irqenabled = true;
                        }
                        else {
                            // IRQ Disable (even)
                            this.irqenabled = false;
                            // (Acknowledge pending interrupt)
                        }
                        break;
                    }
                }
            }
        },

        readChr(addr) {
            if (this.ppuinvert) {
                // 1kb banks
                if (addr < 0x0400) {
                    return mem.chr[((addr & 0x3ff) + this.ppubankaddr[2]) & mem.chrSizeMask]; 
                }
                else if (addr < 0x0800) {
                    return mem.chr[((addr & 0x3ff) + this.ppubankaddr[3]) & mem.chrSizeMask]; 
                }
                else if (addr < 0x0c00) {
                    return mem.chr[((addr & 0x3ff) + this.ppubankaddr[4]) & mem.chrSizeMask]; 
                }
                else if (addr < 0x1000) {
                    return mem.chr[((addr & 0x3ff) + this.ppubankaddr[5]) & mem.chrSizeMask];
                }
                // 2kb banks
                else if (addr < 0x1800) {
                    return mem.chr[((addr & 0x7ff) + this.ppubankaddr[0]) & mem.chrSizeMask]; 
                }
                else {
                    return mem.chr[((addr & 0x7ff) + this.ppubankaddr[1]) & mem.chrSizeMask];     
                }
            }
            else {
                // 2kb banks
                if (addr < 0x0800) {
                    return mem.chr[((addr & 0x7ff) + this.ppubankaddr[0]) & mem.chrSizeMask]; 
                }
                else if (addr < 0x1000) {
                    return mem.chr[((addr & 0x7ff) + this.ppubankaddr[1]) & mem.chrSizeMask];     
                }
                // 1kb banks
                else if (addr < 0x1400) {
                    return mem.chr[((addr & 0x3ff) + this.ppubankaddr[2]) & mem.chrSizeMask]; 
                }
                else if (addr < 0x1800) {
                    return mem.chr[((addr & 0x3ff) + this.ppubankaddr[3]) & mem.chrSizeMask]; 
                }
                else if (addr < 0x1c00) {
                    return mem.chr[((addr & 0x3ff) + this.ppubankaddr[4]) & mem.chrSizeMask]; 
                }
                else {
                    return mem.chr[((addr & 0x3ff) + this.ppubankaddr[5]) & mem.chrSizeMask];
                }
            }
        },
        writeChr(addr, val) {
            if (mem.hasChrRam) {
                mem.chr[addr & mem.chrSizeMask] = val; // 16KB CHR RAM
            }
        },

        feedAddr(addr) {
            var lasta12 = this.a12;
            this.a12 = addr & 0x2000;

            // When rising edge happens on PPU ADDR BUS ...
            if (!lasta12 && this.a12) {
                // if (this.irqstart) {
                //     this.irqstart = false;
                //     this.irqcounter = this.irqreloadval;
                // }
                // else if (this.irqcounter === 0) {
                //     this.irqcounter = this.irqreloadval;

                //     // if (this.irqenabled) {
                //     //     nes.cpu.requestIrq();
                //     // }
                // }
                // else {
                //     this.irqcounter--;

                //     if (this.irqcounter == 0 && this.irqenabled)
                //         nes.cpu.requestIrq();
                // }

                var counter = this.irqcounter;
                if (this.irqcounter === 0 || this.irqstart) {
                    this.irqcounter = this.irqreloadval;
                }
                else {
                    this.irqcounter--;
                }

                if ((counter > 0 || this.irqstart) && this.irqcounter == 0 && this.irqenabled) {
                    nes.cpu.requestIrq();
                }

                this.irqstart = false;
            }
        },

        reset() {
            this.ramenabled = false;
            this.ramwriteallow = false;

            this.bankselected = 0;
            this.banks.fill(0);
            this.cpubankaddr.fill(0);
            this.ppubankaddr.fill(0);
            this.cpuinvert = false;
            this.ppuinvert = false;
            this.fixCpuAddr();
            this.fixPpuAddr();
            this.fixMirroring(0);

            this.a12 = 0;
            this.irqcounter = 0;
            this.irqreloadval = false;
            this.irqstart = false;
            this.irqenabled = false;
        }
    };

    //this.mappers[4] = this.mappers[0]; // debug hehe

    // AxROM
    this.mappers[7] = {
        romoffset: 0,

        read(addr) {
            if (addr < 0x8000) {
                return 0; // (OPENBUS)
            }
            else {
                return mem.rom[((addr & 0x7fff) + this.romoffset) & mem.romSizeMask]; // rom
            }
        },
        write(addr, val) {
            if (addr < 0x8000) {
                return 0; // (OPENBUS)
            }
            else {
                this.romoffset = (val & 7) << 15;

                var nametable = (val & 0x10) >> 4;
                mem.nametable0map = nametable;
                mem.nametable1map = nametable;
                mem.nametable2map = nametable;
                mem.nametable3map = nametable;
            }
        },
        readChr(addr) {
            return mem.chr[addr & mem.chrSizeMask];
        },
        writeChr(addr, val) {
            if (mem.hasChrRam) {
                mem.chr[addr & mem.chrSizeMask] = val; // 16KB CHR RAM
            }
        },

        feedAddr(addr) {},

        reset() {
            this.write(0x8000, 0);
        }
    };
};

export default Cartridge;