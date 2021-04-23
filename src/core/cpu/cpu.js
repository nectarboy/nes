import Cpu6502 from './6502.js';

const Cpu = function(nes) {
    var cpu = this;

    // =============== // Internal registers //
    this.pc = 0x0000;
    this.sp = 0x0000;

    // P reg
    this.p_n = false;
    this.p_v = false;
    this.p_b = false;
    this.p_d = false;
    this.p_i = false;
    this.p_z = false;
    this.p_c = false;
    this.getP = function() {
        return (
            (this.p_c) | (this.p_z << 1) | (this.p_i << 2) | (this.p_d << 3) |
            (0x20) | (this.p_b << 4) | (this.p_v << 6) | (this.p_n << 7)
        );
    };

    this.writeP = function(val) {
        this.p_c = (val & 0x01) !== 0;
        this.p_z = (val & 0x02) !== 0;
        this.p_i = (val & 0x04) !== 0;
        this.p_d = (val & 0x08) !== 0;
        this.p_b = (val & 0x10) !== 0;
        this.p_v = (val & 0x40) !== 0;
        this.p_n = (val & 0x80) !== 0;
    };

    this.a = 0;
    this.x = 0;
    this.y = 0;

    // =============== // CPU Clocking //
    this.isPal = false;

    this.cyclesPerSec = 0;
    this.cyclesPerFrame = 0;

    this.cycles = 0;

    // =============== // Reading and Writing //
    this.hasRom = false;
    this.testMode = false;

    this.read = function(addr) {
        // WRAM + mirrors
        if (addr < 0x2000) {
            return nes.mem.wram[addr & 0x7ff];
        }
        // PPU regs + mirrors
        else if (addr < 0x4000) {
            return 0; // TODO
        }
        // IO regs
        else if (addr < 0x4018) {
            return 0; // TODO
        }
        // Test mode shit
        else if (addr < 0x4020) {
            return 0; // TODO
        }
        // Cartridge
        else {
            return nes.mem.readCart(addr);
        }
    };

    this.write = function(addr, val) {
        // WRAM + mirrors
        if (addr < 0x2000) {
            nes.mem.wram[addr & 0x7ff] = val;
        }
        // PPU regs + mirrors
        else if (addr < 0x4000) {
            // TODO
        }
        // IO regs
        else if (addr < 0x4018) {
            // TODO
        }
        // Test mode shit
        else if (addr < 0x4020) {
            // TODO
        }
        // Cartridge
        else {
            return nes.mem.readCart(addr);
        }
    };

    this.read16 = function(addr) {
        return this.read(addr++) | (this.read(addr & 0xffff) << 8);
    };

    // Stack
    this.push = function(val) {
        this.write(0x100 | this.sp--, val);
        this.sp &= 0xff;
    };

    this.pop = function() {
        var val = this.read(0x100 | this.sp++, val);
        this.sp &= 0xff;

        return val;
    };

    // =============== // Execution //
    this.cpu6502 = new Cpu6502(nes, this);
    this.opCycle = 0;
    this.currOp = 0;
    this.currIns = 0;

    this.stepCpu = function() {

    };

    // =============== // Bootstrapping //
    this.reset = function() {
        // Reset internal regs
        this.sp = 0xfd;
        this.pc = this.read16(0xfffc);
        this.writeP(0x34);
        this.a = this.x = this.y = 0;

        // Reset cycles
        this.cycles = 0;

        this.opCycle = 0;
        this.currOp = 0;
        this.currIns = 0;
    };
};

export default Cpu;