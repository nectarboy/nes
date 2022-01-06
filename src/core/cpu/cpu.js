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
            (0x30) | (this.p_v << 6) | (this.p_n << 7)
        );
    };

    this.getPFull = function() {
        return (
            (this.p_c) | (this.p_z << 1) | (this.p_i << 2) | (this.p_d << 3) |
            (0x20) | (this.p_b << 5) | (this.p_v << 6) | (this.p_n << 7)
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

    this.cycles = 0; // Unused in cycle accurate mode

    // =============== // Reading and Writing //
    this.hasRom = false;

    this.read = function(addr) {
        // WRAM + mirrors
        if (addr < 0x2000) {
            return nes.mem.wram[addr & 0x7ff];
        }
        // PPU regs + mirrors
        else if (addr < 0x4000) {
            return nes.mem.CPUreadPPU(addr);
        }
        // IO regs
        else if (addr < 0x4018) {
            nes.mem.readIO(addr);
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
            nes.mem.CPUwritePPU(addr, val);
        }
        // IO regs
        else if (addr < 0x4018) {
            nes.mem.writeIO(addr, val);
        }
        // Test mode shit
        else if (addr < 0x4020) {
            // TODO
        }
        // Cartridge
        else {
            nes.mem.writeCart(addr);
        }
    };

    this.read16 = function(addr) {
        return this.read(addr++) | (this.read(addr & 0xffff) << 8);
    };

    // Stack
    this.push = function(val) {
        this.write(0x100 | this.sp, val);
        this.sp--;
        this.sp &= 0xff;
    };

    this.pop = function() {
        this.sp++;
        this.sp &= 0xff;
        return this.read(0x100 | this.sp);
    };

    // =============== // Interrupts //
    this.intCycle = 0;
    this.intVec = 0;
    this.interrupting = false;
    this.inNMI = false;
    this.shouldInterrupt = false;

    this.interrupt = function() {
        this.intCycle++;
        switch (this.intCycle) {
            case 1:
                // Why did i do this ,,,,,,
                // this.pc++;
                // this.pc &= 0xffff;
                break;
            case 2:
                this.push(this.pc >> 8);
                break;
            case 3:
                this.push(this.pc & 0xff);
                break;
            case 4:
                this.push(this.getP());
                break;
            case 5:
                this.pc = this.read(this.intVec);
                break;
            case 6:
                this.pc |= this.read(this.intVec + 1) << 8;

                this.intCycle = 0;
                this.interrupting = false;
                this.shouldInterrupt = false;

                // Clear NMI bit if its an NMI !
                if (this.inNMI) {
                    this.inNMI = false;
                    nes.ppu.nmiEnabled = false;
                }
                break;
        }
    };

    // Interrupt generation
    this.generateNMI = function() {
        if (this.shouldInterrupt)
            return;

        this.shouldInterrupt = true;
        this.inNMI = true;
        this.intVec = 0xfffa;
    };

    // =============== // Execution //
    this.cpu6502 = new Cpu6502(nes, this);
    this.stepNES = function(cycles) {
        for (var i = 0; i < cycles; i++) {

            if (this.interrupting) {
                this.interrupt();
            }
            else {
                // Check for interrupts
                if (this.cpu6502.execute() && this.shouldInterrupt) {
                    this.interrupting = true;
                }
            }

            nes.ppu.execute();

        }
    };

    this.stepFrame = function() {
        this.stepNES(this.cyclesPerFrame);
    };

    // =============== // Loop //
    this.interval = 0;
    this.timeout = null;

    this.preMs = 0;
    this.postMs = 0;

    var lc = 0;
    var lm = 5;
    this.loop = function() {
        this.preMs = performance.now();
        this.stepFrame();
        this.postMs = performance.now();

        // if (++lc === lm) {
        //     nes.popupLog();
        //     this.cpu6502.panic();
        // }

        this.timeout = setTimeout(() => {
            cpu.loop();
        }, this.interval - (this.postMs - this.preMs));
    };

    this.stopLoop = function() {
        clearTimeout(this.timeout);
    };

    // =============== // Bootstrapping //
    this.reset = function() {
        lc = 0;

        // Reset internal regs
        this.sp = 0xfd;
        this.pc = cpu.read16(0xfffc);
        this.writeP(0x24);
        this.a = this.x = this.y = 0;

        this.intCycle = 0;
        this.intVec = 0;
        this.interrupting = false;
        this.inNMI = false;
        this.shouldInterrupt = false;

        // Reset cycles
        this.cpu6502.reset_cycles();

        // Reset 6502
        this.cpu6502.reset();
    };
    
};

export default Cpu;