const Mem = function(nes) {
    var mem = this;

    // =============== // Memory Blocks //
    this.wram = new Uint8Array(0x0800);
    this.rom = new Uint8Array(0xbfe0);

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
        addr -= 0x4020;
        return this.rom[addr];
    };

    this.writeCart = function(addr, val) {
        addr -= 0x4020;
    };

    // =============== // Bootstrapping //
    this.reset = function() {
        
    };
};

export default Mem;