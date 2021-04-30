import constants from '../constants.js';

const Mem = function(nes) {
    var mem = this;

    // =============== // Memory Blocks //
    this.wram = new Uint8Array(0x0800);
    this.rom = new Uint8Array(0xffff - 0x3fff);

    // IO register access
    this.readIO = function(addr) {
        addr -= 0x4000;
        return 0;
    };

    this.writeIO = function(addr, val) {
        addr -= 0x4000;
    };

    // Cartridge memory access
    this.readCart = function(addr) {
        if (addr < 0xbff0) {
            return 0; // ???
        }
        else {
            return this.rom[addr - 0xbff0];
        }
    };

    this.writeCart = function(addr, val) {
        addr -= 0x4020;
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
        // If no errors have occured, we should be good to go !
        this.rom = new Uint8Array(Math.ceil(romBuff.byteLength / constants.rom_block_size * constants.rom_block_size));
        this.loadRomIntoMem(rom);
    };

    this.loadRomIntoMem = function(rom) {
        for (var i = 0; i < this.rom.length; i++) {
            this.rom[i] = rom[i];
        }
    };

    this.loadRomProps = function(rom) {

    };
};

export default Mem;