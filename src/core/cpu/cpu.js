import Cpu6502 from './cpu6502.js';

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
            return nes.mem.readIO(addr);
        }
        // Test mode shit
        else if (addr < 0x4020) {
            return 0; // TODO
        }
        // Cartridge
        else {
            return nes.mem.mapper.read(addr);
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
            nes.mem.mapper.write(addr, val);
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
    this.shouldInterrupt = false;
    this.isNMI = false;

    this.interrupt = function() {
        this.intCycle++;
        switch (this.intCycle) {
            case 1:
            case 2:
                //this.cpu6502.fetch(); // useless read ugh
                break;
            case 3:
                this.push(this.pc >> 8);
                break;
            case 4:
                this.push(this.pc & 0xff);
                break;
            case 5:
                this.push(this.getP());
                break;
            case 6:
                this.pc = this.read(this.intVec);
                break;
            case 7:
                this.pc |= this.read(this.intVec + 1) << 8;

                this.interrupting = false;
                this.isNMI = false;
                break;
        }
    };

    // Interrupt generation
    this.requestIrq = function() {
        // if (this.isNMI)
        //     return;

        this.intVec = 0xfffe;
        this.shouldInterrupt = true;
    };

    this.requestNMI = function() {
        this.isNMI = true;
        this.intVec = 0xfffa;
        this.shouldInterrupt = true;
    };

    // =============== // Execution //
    this.cpu6502 = new Cpu6502(nes, this);
    this.stepNES = function(cycles) {
        while (cycles > 0) {

            if (this.interrupting) {
                this.interrupt();
            }
            else {
                // Check for interrupts (if done with inst and flipflop set, next 'inst' will be int)
                if (this.cpu6502.execute() && this.shouldInterrupt) {
                    this.shouldInterrupt = false;
                    this.interrupting = true;
                    this.intCycle = 0;
                }
            }

            nes.ppu.execute();
            nes.apu.execute();

            cycles--;
        }
    };

    this.stepFrame = function() {
        this.framesElapsed++;
        this.stepNES(this.cyclesPerFrame);
    };

    // =============== // Loop //
    // TODO: try to improve looping later on cuz it is pretty experimental
    if (window.requestAnimationFrame) {
        this.reqLoop = function() {this.timeout = requestAnimationFrame(() => {cpu.loop();});};
        this.cancelLoop = function() {cancelAnimationFrame(this.timeout);};
    }
    else {
        var interval = 1000 / 60;
        this.reqLoop = function(excess) {this.timeout = setTimeout(() => {cpu.loop();}, interval-excess);};
        this.cancelLoop = function() {clearTimeout(this.timeout);};
    }

    this.interval = 0;
    this.timeout = null;

    this.preMs = 0;
    this.postMs = 0;
    this.excessMs = 0;
    this.frameskip = false; // Pooptendo will try its best to run at full speed
    this.frameskipcooldown = false; // When this is flagged, will switch frameskip on and off to regulate it
    this.firstFrame = false;
    this.framesElapsed = 0;

    var lc = 0;
    var lm = 5;
    this.loop = function() {
        if (this.frameskip) {
            if (this.firstFrame) {
                this.firstFrame = false;
                this.preMs = performance.now() - this.interval;
            }
            else {
                this.preMs = this.postMs;
            }

            this.postMs = performance.now();
            // this.excessMs += this.postMs - this.preMs;

            // while (this.excessMs >= 0) {
            //     this.excessMs -= this.interval;
            //     this.stepFrame();
            // }

            this.excessMs = this.postMs - this.preMs;
            var ratio = (this.excessMs / this.interval)

            var pre = performance.now();
            this.stepNES(this.cyclesPerFrame * ratio);
            var post = performance.now();

            // if (ratio > 2.5) {
            //     console.log('OVERLOAD; COOLING DOWN', ratio.toFixed(2));
            //     // nes.setFrameskip(false);
            //     // this.frameskipcooldown = true;
            // }

            this.reqLoop(post - pre);
        }
        else {
            this.firstFrame = true;

            var pre = performance.now();
            this.stepFrame();
            var post = performance.now();

            // if (this.frameskipcooldown) {
            //     this.frameskipcooldown = true;
            //     nes.setFrameskip(true);
            // }

            this.reqLoop(post - pre);
        }

        //nes.ppu.rendering.renderImg(); // Choppy ;_;

        // if (++lc === lm) {
        //     nes.popupLog();
        //     this.cpu6502.panic();
        // }
    };

    this.startLoop = function() {
        this.firstFrame = true;
        this.loop();
    }
    this.stopLoop = function() {
        this.firstFrame = false;
        this.cancelLoop();
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

        // Reset 6502 core
        this.cpu6502.reset();
    };

    // =============== // Debugging //
    this.getCurrentPCInCart = function() {
        var addr = this.pc - 0x8000; // TODO -- its not always gonna be 0x8000 teehee
        // returns -1 when outside rom
        if (addr < 0)
            addr = -1;
        return addr.toString(16);
    };
    
};

export default Cpu;
//     _____
//    / 6c  \
//   |(·c·)  |  charles brownington
//  <|  _    |>
//    \_____/
//     /|_|\
//    |     |
//    |   |_|
//    |\/\| |
//    |___|_/
//    |_|__|
//     ||_|
//    [_[__|