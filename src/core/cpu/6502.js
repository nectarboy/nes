const Cpu6502 = function(nes, cpu) {
    var cpu6502 = this;

    // =============== // Shorthands //
    this.check_zn = function(m) {
        cpu.p_z = m === 0;
        cpu.p_n = (m & 0x80) !== 0;
    };

    this.reset_cycles = function() {
        this.opCycle = -1;
    };

    // Micro-ops
    this.add_carry = function(m) {
        var sum = cpu.a + m + cpu.p_c;
        cpu.a = sum & 0xff;

        cpu.p_c = sum > 0xff;
        cpu.p_z = cpu.a === 0;
        var aAnd80 = cpu.a & 0x80;
        cpu.p_v = ((aAnd80 === (m & 0x80)) && (aAnd80 !== (sum & 0x80)));
        cpu.p_n = aAnd80 !== 0;
    };

    this.logic_and = function(m) {
        cpu.a &= m;
        this.check_zn(cpu.a);
    };

    this.arith_shift_left = function(m) {
        var sum = m << 1;

        cpu.p_c = (m & 0x80) !== 0;
        this.check_zn(sum);

        return sum;
    };

    this.bit_test = function(m) {
        var sum = cpu.a & m;

        cpu.p_v = (sum & 0x40) !== 0;
        this.check_zn(sum);
    };

    this.branch = function(offset, cc) {

    };

    this.compare = function(r, m) {
        var sum = (r - m) & 0xff;

        cpu.p_c = r >= m;
        this.check_zn(sum);

        return sum; // Preserve for subtraction ops maybe !
    };

    this.decrement = function(m) {
        var sum = (m - 1) & 0xff;
        this.check_zn(sum);

        return sum;
    };

    this.ex_or = function(m) {
        cpu.a ^= m;
        this.check_zn(cpu.a);
    };

    this.increment = function(m) {
        var sum = (m + 1) & 0xff;
        this.check_zn(sum);

        return sum;
    };

    this.logic_shift_right = function(m) {
        var sum = (m >> 1) & 0xff;

        cpu.p_c = (m & 1) !== 0;
        this.check_zn(sum);

        return sum;
    };

    this.logic_or = function(m) {
        cpu.a |= m;
        this.check_zn(cpu.a);
    };

    this.rotate_left = function(m) {
        var sum = ((m << 1) | cpu.p_c) & 0xff;

        cpu.p_c = (m & 0x80) !== 0;
        this.check_zn(sum);

        return sum;
    };

    this.rotate_right = function(m) {
        var sum = ((m >> 1) | (cpu.p_c << 7)) & 0xff;

        cpu.p_c = (m & 1) !== 0;
        this.check_zn(sum);

        return sum;
    };

    this.branch = function(cc) {
        switch (this.opCycle) {
            case 1:
                oper = this.fetch() << 24 >> 24;
                if (!cc)
                    this.reset_cycles();
                break;
            case 2:
                var pc = cpu.pc; // Save PC for page cross check
                cpu.pc += oper;
                cpu.pc &= 0xffff;

                // We on da same page ?
                if ((cpu.pc & 0xff00) === (pc & 0xff00))
                    this.reset_cycles();
                break;
            case 3:
                this.reset_cycles();
                break;
        }
    };

    // =============== // Addressing Modes //
    this.opCycle = 0;
    this.currOp = 0;
    this.currIns = 0;

    var oper = 0;
    var addr = 0;

    this.immediate = function() {
        oper = this.fetch();
    };

    this.zeropage = function() {
        if (this.opCycle === 1) {
            addr = this.fetch();
        }
        else if (this.opCycle === 2) {
            oper = cpu.read(addr);
        }
    };

    this.zeropage_i = function(i) {
        switch (this.opCycle) {
            case 1:
                addr = this.fetch();
                break;
            case 2:
                addr = (addr + i) & 0xff;
                break;
            case 3:
                oper = cpu.read(addr);
                break;
        }
    };

    this.absolute = function() {
        switch (this.opCycle) {
            case 1:
                addr = this.fetch();
                break;
            case 2:
                addr |= this.fetch() << 8;
                break;
            case 3:
                oper = cpu.read(addr);
                break;
        }
    };

    this.absolute_i = function(i) {
        switch (this.opCycle) {
            case 1:
                addr = this.fetch();
                break;
            case 2:
                addr |= this.fetch() << 8;

                // Page crossing
                var sum = (addr + i) & 0xff;
                this.opCycle += (addr & 0x0f00) === (sum & 0x0f00);

                addr = sum;
                break;
            case 3:
                // Expend a cycle
                break;
            case 4:
                oper = cpu.read(addr);
                break;
        }
    };

    this.indirect = function() {
        switch (this.opCycle) {
            case 1:
                addr = this.fetch();
                break;
            case 2:
                addr |= this.fetch() << 8;
                break;
            case 3:
                // Expend a cycle
                break;
            case 4:
                addr = cpu.read16(addr);
                break;
        }
    };

    this.indirect_x = function() {
        switch (this.opCycle) {
            case 1:
                oper = this.fetch();
                break;
            case 2:
                oper = (oper + cpu.x) & 0xff;
                break;
            case 3:
                addr = cpu.read16(oper);
                break;
            case 4:
                oper = cpu.read(addr);
                break;
        }
    };

    this.indirect_y = function() {
        switch (this.opCycle) {
            case 1:
                oper = this.fetch();
                break;
            case 2:
                addr = cpu.read16(oper);
                break;
            case 3:
                // Page crossing
                var sum = (addr + cpu.y) & 0xff;
                this.opCycle += (addr & 0x0f00) === (sum & 0x0f00);

                addr = sum;
            case 4:
                // Expend a cycle
                break;
            case 5:
                oper = cpu.read(addr);
                break;
        }
    };

    // =============== // Instructions //
    // ----- ADC
    this.adc_imm = function() {
        this.immediate();

        this.add_carry(oper);
        this.reset_cycles();
    };

    this.adc_zp = function() {
        this.zeropage();
        if (this.opCycle === 2) {
            this.add_carry(oper);
            this.reset_cycles();
        }
    };

    this.adc_zp_x = function() {
        this.zeropage_i(cpu.x);
        if (this.opCycle === 3) {
            this.add_carry(oper);
            this.reset_cycles();
        }
    };

    this.adc_abs = function() {
        this.absolute();
        if (this.opCycle === 3) {
            this.add_carry(oper);
            this.reset_cycles();
        }
    };

    this.adc_abs_x = function() {
        this.absolute_i(cpu.x);
        if (this.opCycle === 4) {
            this.add_carry(oper);
            this.reset_cycles();
        }
    };

    this.adc_abs_y = function() {
        this.absolute_i(cpu.y);
        if (this.opCycle === 4) {
            this.add_carry(oper);
            this.reset_cycles();
        }
    };

    this.adc_ind_x = function() {
        this.indirect_x();
        if (this.opCycle === 5) {
            this.add_carry(oper);
            this.reset_cycles();
        }
    };

    this.adc_ind_y = function() {
        this.indirect_y();
        if (this.opCycle === 5) {
            this.add_carry(oper);
            this.reset_cycles();
        }
    };

    // ----- AND
    this.and_imm = function() {
        this.immediate();

        this.logic_and(oper);
        this.reset_cycles();
    };

    this.and_zp = function() {
        this.zeropage();
        if (this.opCycle === 2) {
            this.logic_and(oper);
            this.reset_cycles();
        }
    };

    this.and_imm = function() {
        this.zeropage_i(cpu.x);
        if (this.opCycle === 3) {
            this.logic_and(oper);
            this.reset_cycles();
        }
    };

    this.and_abs = function() {
        this.absolute();
        if (this.opCycle === 3) {
            this.logic_and(oper);
            this.reset_cycles();
        }
    };

    this.and_abs_x = function() {
        this.absolute_i(cpu.x);
        if (this.opCycle === 4) {
            this.logic_and(oper);
            this.reset_cycles();
        }
    };

    this.and_abs_y = function() {
        this.absolute_i(cpu.y);
        if (this.opCycle === 4) {
            this.logic_and(oper);
            this.reset_cycles();
        }
    };

    this.and_ind_x = function() {
        this.indirect_x();
        if (this.opCycle === 5) {
            this.logic_and(oper);
            this.reset_cycles();
        }
    };

    this.and_ind_y = function() {
        this.indirect_y();
        if (this.opCycle === 5) {
            this.logic_and(oper);
            this.reset_cycles();
        }
    };

    // ----- ASL
    this.asl = function() {
        cpu.a = this.arith_shift_left(cpu.a);
        this.reset_cycles();
    };

    this.asl_zp = function() {
        this.zeropage();

        if (this.opCycle === 3) {
            cpu.write(addr, oper);
        }
        else {
            cpu.write(addr, this.arith_shift_left(oper));
            this.reset_cycles();
        }
    };

    this.asl_zp_x = function() {
        this.zeropage_i(cpu.x);

        if (this.opCycle === 4) {
            cpu.write(addr, oper);
        }
        else {
            cpu.write(addr, this.arith_shift_left(oper));
            this.reset_cycles();
        }
    };

    this.asl_abs = function() {
        this.absolute();

        if (this.opCycle === 4) {
            cpu.write(addr, oper);
        }
        else {
            cpu.write(addr, this.arith_shift_left(oper));
            this.reset_cycles();
        }
    };

    this.asl_abs_x = function() {
        this.absolute_i(cpu.x);

        if (this.opCycle === 5) {
            cpu.write(addr, oper);
        }
        else {
            cpu.write(addr, this.arith_shift_left(oper));
            this.reset_cycles();
        }
    };

    // ----- BCC
    this.bcc = function() {
        this.branch(!cpu.p_c);
    };
    // ----- BCS
    this.bcs = function() {
        this.branch(cpu.p_c);
    };
    // ----- BEQ
    this.beq = function() {
        this.branch(cpu.p_z);
    };

    // ----- BIT
    this.bit_zp = function() {
        this.zeropage();
        if (this.opCycle === 2) {
            this.bit_test(oper);
            this.reset_cycles();
        }
    };

    this.bit_abs = function() {
        this.absolute();
        if (this.opCycle === 3) {
            this.bit_test(oper);
            this.reset_cycles();
        }
    };

    // ----- BMI
    this.bmi = function() {
        this.branch(cpu.p_n);
    };
    // ----- BNE
    this.bne = function() {
        this.branch(!cpu.p_z);
    };
    // ----- BPL
    this.bpl = function() {
        this.branch(!cpu.p_n);
    };

    // ----- BRK
    this.brk = function() {
        cpu.p_b = true;
        this.reset_cycles();
    };

    // ----- BVC
    this.bvc = function() {
        this.branch(!cpu.p_v);
    };
    // ----- BVS
    this.bvs = function() {
        this.branch(cpu.p_v);
    };

    // ----- CLC
    this.clc = function() {
        cpu.p_c = false;
        this.reset_cycles();
    };
    // ----- CLD
    this.cld = function() {
        cpu.p_d = false;
        this.reset_cycles();
    };
    // ----- CLI
    this.cli = function() {
        cpu.p_i = false;
        this.reset_cycles();
    };
    // ----- CLV
    this.clv = function() {
        cpu.p_v = false;
        this.reset_cycles();
    }; 

    // ----- CMP / CPX / CPY
    // We can use one function cuz
    // We can pass the register without
    // Having to do anything to alter its value !
    this.cmp_imm = function(r) {
        this.immediate();

        this.compare(r, oper);
        this.reset_cycles();
    };

    this.cmp_zp = function(r) {
        this.zeropage();
        if (this.opCycle === 2) {
            this.compare(r, oper);
            this.reset_cycles();
        }
    };

    this.cmp_zp_x = function(r) {
        this.zeropage_i(cpu.x);
        if (this.opCycle === 3) {
            this.compare(r, oper);
            this.reset_cycles();
        }
    };

    this.cmp_abs = function(r) {
        this.absolute();
        if (this.opCycle === 3) {
            this.compare(r, oper);
            this.reset_cycles();
        }
    };

    this.cmp_abs_x = function(r) {
        this.absolute_i(cpu.x);
        if (this.opCycle === 4) {
            this.compare(r, oper);
            this.reset_cycles();
        }
    };

    this.cmp_abs_y = function(r) {
        this.absolute_i(cpu.y);
        if (this.opCycle === 4) {
            this.compare(r, oper);
            this.reset_cycles();
        }
    };

    this.cmp_ind_x = function(r) {
        this.indirect_x();
        if (this.opCycle === 5) {
            this.compare(r, oper);
            this.reset_cycles();
        }
    };

    this.cmp_ind_y = function(r) {
        this.indirect_y();
        if (this.opCycle === 5) {
            this.compare(r, oper);
            this.reset_cycles();
        }
    };

    // ----- DEC
    this.dec_zp = function() {
        this.zeropage();
        if (this.opCycle === 4) {
            cpu.a = this.decrement(cpu.a);
            this.reset_cycles();
        }
    };

    this.dec_zp_x = function() {
        this.zeropage_i(cpu.x);
        if (this.opCycle === 5) {
            cpu.a = this.decrement(cpu.a);
            this.reset_cycles();
        }
    };

    this.dec_abs = function() {
        this.absolute();
        if (this.opCycle === 5) {
            cpu.a = this.decrement(cpu.a);
            this.reset_cycles();
        }
    };

    this.dec_abs_x = function() {
        this.absolute_i(cpu.x);
        if (this.opCycle === 6) {
            cpu.a = this.decrement(cpu.a);
            this.reset_cycles();
        }
    };

    // ----- DEX
    this.dex = function() {
        cpu.x = this.decrement(cpu.x);
        this.reset_cycles();
    };
    // ----- DEY
    this.dey = function() {
        cpu.y = this.decrement(cpu.y);
        this.reset_cycles();
    };

    // ----- EOR
    this.eor_imm = function() {
        this.immediate();

        this.ex_or(oper);
        this.reset_cycles();
    };

    this.eor_zp = function() {
        this.zeropage();
        if (this.opCycle === 2) {
            this.ex_or(oper);
            this.reset_cycles();
        }
    };

    this.eor_zp_x = function() {
        this.zeropage_i(cpu.x);
        if (this.opCycle === 3) {
            this.ex_or(oper);
            this.reset_cycles();
        }
    };

    this.eor_abs = function() {
        this.absolute();
        if (this.opCycle === 3) {
            this.ex_or(oper);
            this.reset_cycles();
        }
    };

    this.eor_abs_x = function() {
        this.absolute_i(cpu.x);
        if (this.opCycle === 4) {
            this.ex_or(oper);
            this.reset_cycles();
        }
    };

    this.eor_abs_y = function() {
        this.absolute_i(cpu.y);
        if (this.opCycle === 4) {
            this.ex_or(oper);
            this.reset_cycles();
        }
    };

    this.eor_ind_x = function() {
        this.indirect_x();
        if (this.opCycle === 5) {
            this.ex_or(oper);
            this.reset_cycles();
        }
    };

    this.eor_ind_x = function() {
        this.indirect_y();
        if (this.opCycle === 5) {
            this.ex_or(oper);
            this.reset_cycles();
        }
    };

    // ----- INC
    this.inc_zp = function() {
        this.zeropage();
        if (this.opCycle === 4) {
            cpu.a = this.increment(cpu.a);
            this.reset_cycles();
        }
    };

    this.inc_zp_x = function() {
        this.zeropage_i(cpu.x);
        if (this.opCycle === 5) {
            cpu.a = this.increment(cpu.a);
            this.reset_cycles();
        }
    };

    this.inc_abs = function() {
        this.absolute();
        if (this.opCycle === 5) {
            cpu.a = this.increment(cpu.a);
            this.reset_cycles();
        }
    };

    this.inc_abs_x = function() {
        this.absolute_i(cpu.x);
        if (this.opCycle === 6) {
            cpu.a = this.increment(cpu.a);
            this.reset_cycles();
        }
    };

    // ----- INX
    this.inx = function() {
        cpu.x = this.increment(cpu.x);
        this.reset_cycles();
    };
    // ----- INY
    this.iny = function() {
        cpu.y = this.increment(cpu.y);
        this.reset_cycles();
    };

    // ----- JMP
    this.jmp_abs = function() {
        this.absolute();
        if (this.opCycle === 2) {
            cpu.pc = addr;
            this.reset_cycles();
        }
    };

    this.jmp_ind = function() {
        this.indirect();
        if (this.opCycle === 4) {
            cpu.pc = addr;
            this.reset_cycles();
        }
    };

    // ----- JSR
    this.jsr = function() {
        switch (this.opCycle) {
            case 1:
                oper = this.fetch(); // Fetch lower byte
                break;
            case 2:
                // Expend a cycle
                break;
            case 3:
                cpu.push(cpu.pc >> 8);
                break
            case 4:
                cpu.push(cpu.pc & 0xff);
                break;
            case 5:
                cpu.pc = oper | (this.fetch() << 8); // Apply jump
                this.reset_cycles();
                break;
        }
    };

    // ----- LDA
    this.lda_imm = function() {
        this.immediate();

        this.check_zn(cpu.a = oper);
        this.reset_cycles();
    };

    this.lda_zp = function() {
        this.zeropage();
        if (this.opCycle === 2) {
            this.check_zn(cpu.a = oper);
            this.reset_cycles();
        }
    };

    this.lda_zp_x = function() {
        this.zeropage_i(cpu.x);
        if (this.opCycle === 3) {
            this.check_zn(cpu.a = oper);
            this.reset_cycles();
        }
    };

    this.lda_abs = function() {
        this.absolute();
        if (this.opCycle === 3) {
            this.check_zn(cpu.a = oper);
            this.reset_cycles();
        }
    };

    this.lda_abs_x = function() {
        this.absolute_i(cpu.x);
        if (this.opCycle === 4) {
            this.check_zn(cpu.a = oper);
            this.reset_cycles();
        }
    };

    this.lda_abs_y = function() {
        this.absolute_i(cpu.y);
        if (this.opCycle === 4) {
            this.check_zn(cpu.a = oper);
            this.reset_cycles();
        }
    };

    this.lda_ind_x = function() {
        this.indirect_x();
        if (this.opCycle === 4) {
            this.check_zn(cpu.a = oper);
            this.reset_cycles();
        }
    };

    this.lda_ind_y = function() {
        this.indirect_y();
        if (this.opCycle === 4) {
            this.check_zn(cpu.a = oper);
            this.reset_cycles();
        }
    };

    // ----- LDX
    this.ldx_imm = function() {
        this.immediate();

        this.check_zn(cpu.x = oper);
        this.reset_cycles();
    };

    this.ldx_zp = function() {
        this.zeropage();
        if (this.opCycle === 2) {
            this.check_zn(cpu.x = oper);
            this.reset_cycles();
        }
    };

    this.ldx_zp_y = function() {
        this.zeropage_i(cpu.y);
        if (this.opCycle === 3) {
            this.check_zn(cpu.x = oper);
            this.reset_cycles();
        }
    };

    this.ldx_abs = function() {
        this.absolute();
        if (this.opCycle === 3) {
            this.check_zn(cpu.x = oper);
            this.reset_cycles();
        }
    };

    this.ldx_abs_y = function() {
        this.absolute_i(cpu.y);
        if (this.opCycle === 4) {
            this.check_zn(cpu.x = oper);
            this.reset_cycles();
        }
    };

    // ----- LDY
    this.ldy_imm = function() {
        this.immediate();
        
        this.check_zn(cpu.y = oper);
        this.reset_cycles();
    };

    this.ldy_zp = function() {
        this.zeropage();
        if (this.opCycle === 2) {
            this.check_zn(cpu.y = oper);
            this.reset_cycles();
        }
    };

    this.ldy_zp_x = function() {
        this.zeropage_i(cpu.x);
        if (this.opCycle === 3) {
            this.check_zn(cpu.y = oper);
            this.reset_cycles();
        }
    };

    this.ldy_abs = function() {
        this.absolute();
        if (this.opCycle === 3) {
            this.check_zn(cpu.y = oper);
            this.reset_cycles();
        }
    };

    this.ldy_abs_x = function() {
        this.absolute_i(cpu.x);
        if (this.opCycle === 4) {
            this.check_zn(cpu.y = oper);
            this.reset_cycles();
        }
    };

    // ----- LSR
    this.lsr_a = function() {
        cpu.a = this.logic_shift_right(cpu.a);
        this.reset_cycles();
    };

    this.lsr_zp = function() {
        this.zeropage();

        if (cpu.opCycle === 3) {
            cpu.write(addr, oper);
        }
        else {
            cpu.write(addr, this.logic_shift_right(oper));
            this.reset_cycles();
        }
    };

    this.lsr_zp_x = function() {
        this.zeropage_i(cpu.x);

        if (cpu.opCycle === 4) {
            cpu.write(addr, oper);
        }
        else {
            cpu.write(addr, this.logic_shift_right(oper));
            this.reset_cycles();
        }
    };

    this.lsr_abs = function() {
        this.absolute();

        if (cpu.opCycle === 4) {
            cpu.write(addr, oper);
        }
        else {
            cpu.write(addr, this.logic_shift_right(oper));
            this.reset_cycles();
        }
    };

    this.lsr_abs_x = function() {
        this.absolute_i(cpu.x);

        if (cpu.opCycle === 5) {
            cpu.write(addr, oper);
        }
        else {
            cpu.write(addr, this.logic_shift_right(oper));
            this.reset_cycles();
        }
    };

    // ----- NOP
    this.nop = function() {
        this.reset_cycles();
    };

    // ----- ORA
    this.ora_imm = function() {
        this.immediate();

        this.logic_or(oper);
        this.reset_cycles();
    };

    this.ora_zp = function() {
        this.zeropage();
        if (this.opCycle === 2) {
            this.logic_or(oper);
            this.reset_cycles();
        }
    };

    this.ora_imm = function() {
        this.zeropage_i(cpu.x);
        if (this.opCycle === 3) {
            this.logic_or(oper);
            this.reset_cycles();
        }
    };

    this.ora_abs = function() {
        this.absolute();
        if (this.opCycle === 3) {
            this.logic_or(oper);
            this.reset_cycles();
        }
    };

    this.ora_abs_x = function() {
        this.absolute_i(cpu.x);
        if (this.opCycle === 4) {
            this.logic_or(oper);
            this.reset_cycles();
        }
    };

    this.ora_abs_y = function() {
        this.absolute_i(cpu.y);
        if (this.opCycle === 4) {
            this.logic_or(oper);
            this.reset_cycles();
        }
    };

    this.ora_ind_x = function() {
        this.indirect_x();
        if (this.opCycle === 5) {
            this.logic_or(oper);
            this.reset_cycles();
        }
    };

    this.ora_ind_y = function() {
        this.indirect_y();
        if (this.opCycle === 5) {
            this.logic_or(oper);
            this.reset_cycles();
        }
    };

    // ----- PHA
    this.pha = function() {
        if (this.opCycle === 2) {
            cpu.push(cpu.a);
            this.reset_cycles();
        }
    };
    // ----- PHP
    this.php = function() {
        if (this.opCycle === 2) {
            cpu.push(cpu.getP());
            this.reset_cycles();
        }
    };

    // ----- PLA
    this.pla = function() {
        if (this.opCycle === 3) {
            cpu.a = cpu.pop();
            this.reset_cycles();
        }
    };
    // ----- PLP
    this.plp = function() {
        if (this.opCycle === 3) {
            cpu.writeP(cpu.pop());
            this.reset_cycles();
        }
    };

    // ----- ROL
    this.rol_a = function() {
        cpu.a = this.rotate_left(cpu.a);
        this.reset_cycles();
    };

    this.rol_zp = function() {
        this.zeropage();
        if (this.opCycle === 3) {
            cpu.write(addr, oper);
        }
        else {
            cpu.write(addr, this.rotate_left(oper));
            this.reset_cycles();
        }
    };

    this.rol_zp_x = function() {
        this.zeropage_i(cpu.x);
        if (this.opCycle === 4) {
            cpu.write(addr, oper);
        }
        else {
            cpu.write(addr, this.rotate_left(oper));
            this.reset_cycles();
        }
    };

    this.rol_abs = function() {
        this.absolute();
        if (this.opCycle === 4) {
            cpu.write(addr, oper);
        }
        else {
            cpu.write(addr, this.rotate_left(oper));
            this.reset_cycles();
        }
    };

    this.rol_abs_x = function() {
        this.absolute_i(cpu.x);
        if (this.opCycle === 5) {
            cpu.write(addr, oper);
        }
        else {
            cpu.write(addr, this.rotate_left(oper));
            this.reset_cycles();
        }
    };

    // ----- ROR
    this.ror_a = function() {
        cpu.a = this.rotate_right(cpu.a);
        this.reset_cycles();
    };

    this.ror_zp = function() {
        this.zeropage();
        if (this.opCycle === 3) {
            cpu.write(addr, oper);
        }
        else {
            cpu.write(addr, this.rotate_right(oper));
            this.reset_cycles();
        }
    };

    this.ror_zp_x = function() {
        this.zeropage_i(cpu.x);
        if (this.opCycle === 4) {
            cpu.write(addr, oper);
        }
        else {
            cpu.write(addr, this.rotate_right(oper));
            this.reset_cycles();
        }
    };

    this.ror_abs = function() {
        this.absolute();
        if (this.opCycle === 4) {
            cpu.write(addr, oper);
        }
        else {
            cpu.write(addr, this.rotate_right(oper));
            this.reset_cycles();
        }
    };

    this.ror_abs_x = function() {
        this.absolute_i(cpu.x);
        if (this.opCycle === 5) {
            cpu.write(addr, oper);
        }
        else {
            cpu.write(addr, this.rotate_right(oper));
            this.reset_cycles();
        }
    };

    // ----- RTI
    this.rti = function() {
        switch (this.opCycle) {
            case 1:
            case 2:
                // Expend cycle
                break;
            case 3:
                cpu.writeP(cpu.pop());
                break;
            case 4:
                oper = cpu.pop(); // Lower PC byte
                break;
            case 5:
                cpu.pc = oper | (cpu.pop() << 8);
                this.reset_cycles();
                break;
        }
    };

    // ----- RTS
    this.rts = function() {
        switch (this.opCycle) {
            case 1:
            case 2:
                // Expend cycle
                break;
            case 3:
                oper = cpu.pop(); // Lower PC byte
                break;
            case 4:
                cpu.pc = oper | (cpu.pop() << 8);
                break;
            case 5:
                cpu.pc++;
                cpu.pc &= 0xffff;
                this.reset_cycles();
                break;
        }
    };

    // ----- SBC
    this.sbc_imm = function() {
        this.immediate();

        this.add_carry(oper);
        this.reset_cycles();
    };

    this.sbc_zp = function() {
        this.zeropage();
        if (this.opCycle === 2) {
            this.add_carry(~oper);
            this.reset_cycles();
        }
    };

    this.sbc_zp_x = function() {
        this.zeropage_i(cpu.x);
        if (this.opCycle === 3) {
            this.add_carry(~oper);
            this.reset_cycles();
        }
    };

    this.sbc_abs = function() {
        this.absolute();
        if (this.opCycle === 3) {
            this.add_carry(~oper);
            this.reset_cycles();
        }
    };

    this.sbc_abs_x = function() {
        this.absolute_i(cpu.x);
        if (this.opCycle === 4) {
            this.add_carry(~oper);
            this.reset_cycles();
        }
    };

    this.sbc_abs_y = function() {
        this.absolute_i(cpu.y);
        if (this.opCycle === 4) {
            this.add_carry(~oper);
            this.reset_cycles();
        }
    };

    this.sbc_ind_x = function() {
        this.indirect_x();
        if (this.opCycle === 5) {
            this.add_carry(~oper);
            this.reset_cycles();
        }
    };

    this.sbc_ind_y = function() {
        this.indirect_y();
        if (this.opCycle === 5) {
            this.add_carry(~oper);
            this.reset_cycles();
        }
    };

    // ----- SEC
    this.sec = function() {
        cpu.p_c = true;
        this.reset_cycles();
    };
    // ----- SED
    this.sed = function() {
        cpu.p_d = true;
        this.reset_cycles();
    };
    // ----- SEI
    this.sei = function() {
        cpu.p_i = true;
        this.reset_cycles();
    };

    // ----- STA
    this.sta_zp = function() {
        this.zeropage();
        if (this.opCycle === 2) {
            cpu.write(addr, cpu.a);
            this.reset_cycles();
        }
    };

    this.sta_zp_x = function() {
        this.zeropage_i(cpu.x);
        if (this.opCycle === 3) {
            cpu.write(addr, cpu.a);
            this.reset_cycles();
        }
    };

    this.sta_abs = function() {
        this.absolute();
        if (this.opCycle === 3) {
            cpu.write(addr, cpu.a);
            this.reset_cycles();
        }
    };

    this.sta_abs_x = function() {
        this.absolute_i(cpu.x);
        if (this.opCycle === 4) {
            cpu.write(addr, cpu.a);
            this.reset_cycles();
        }
    };

    this.sta_abs_y = function() {
        this.absolute_i(cpu.y);
        if (this.opCycle === 4) {
            cpu.write(addr, cpu.a);
            this.reset_cycles();
        }
    };

    this.sta_ind_x = function() {
        this.indirect_x();
        if (this.opCycle === 5) {
            cpu.write(addr, cpu.a);
            this.reset_cycles();
        }
    };

    this.sta_ind_y = function() {
        this.indirect_y();
        if (this.opCycle === 5) {
            cpu.write(addr, cpu.a);
            this.reset_cycles();
        }
    };

    // ----- STX
    this.stx_zp = function() {
        this.zeropage();
        if (this.opCycle === 2) {
            cpu.write(addr, cpu.x);
            this.reset_cycles();
        }
    };

    this.stx_zp_y = function() {
        this.zeropage_i(cpu.y);
        if (this.opCycle === 3) {
            cpu.write(addr, cpu.x);
            this.reset_cycles();
        }
    };

    this.stx_abs = function() {
        this.absolute();
        if (this.opCycle === 3) {
            cpu.write(addr, cpu.x);
            this.reset_cycles();
        }
    };

    // ----- STY
    this.sty_zp = function() {
        this.zeropage();
        if (this.opCycle === 2) {
            cpu.write(addr, cpu.y);
            this.reset_cycles();
        }
    };

    this.sty_zp_x = function() {
        this.zeropage_i(cpu.x);
        if (this.opCycle === 3) {
            cpu.write(addr, cpu.y);
            this.reset_cycles();
        }
    };

    this.sty_abs = function() {
        this.absolute();
        if (this.opCycle === 3) {
            cpu.write(addr, cpu.y);
            this.reset_cycles();
        }
    };

    // ----- TAX
    this.tax = function() {
        this.check_zn(
            cpu.x = cpu.a
        );
        this.reset_cycles();
    };
    // ----- TXA
    this.txa = function() {
        this.check_zn(
            cpu.a = cpu.x
        );
        this.reset_cycles();
    };

    // ----- TAY
    this.tay = function() {
        this.check_zn(
            cpu.y = cpu.a
        );
        this.reset_cycles();
    };
    // ----- TYA
    this.tya = function() {
        this.check_zn(
            cpu.a = cpu.y
        );
        this.reset_cycles();
    };

    // ----- TSX
    this.tsx = function() {
        this.check_zn(
            cpu.x = cpu.sp
        );
        this.reset_cycles();
    };
    // ----- TXS
    this.txs = function() {
        this.check_zn(
            cpu.sp = cpu.x
        );
        this.reset_cycles();
    };

    // =============== // Fetching and Decoding //
    this.fetch = function() {
        var byte = cpu.read(cpu.pc++);
        cpu.pc &= 0xffff;

        return byte;
    };

    this.decode = function(op) {
        switch(op) {
            // 1
            case 0x10: return this.bpl;
            case 0x18: return this.clc;
            // 2
            case 0x20: return this.jsr;
            case 0x24: return this.bit_zp;
            // 3
            case 0x38: return this.sec;
            // 4
            case 0x4c: return this.jmp_abs;
            // 5
            case 0x50: return this.bvc;
            // 6
            // case 0x60: return this.rts;
            // 7
            case 0x70: return this.bvs;
            // 8
            case 0x85: return this.sta_zp;
            case 0x86: return this.stx_zp;
            // 9
            case 0x90: return this.bcc;
            // A
            case 0xa2: return this.ldx_imm;
            case 0xa9: return this.lda_imm;
            // B
            case 0xb0: return this.bcs;
            // D
            case 0xd0: return this.bne;
            // E
            case 0xea: return this.nop;
            // F
            case 0xf0: return this.beq;

            default:
                this.panic(op);
        }
        return this.adc_imm;
    };

    this.execute = function() {
        // Done with instruction ?..
        if (this.opCycle === -1) {
            log += this.getLogLine();

            this.currIns = this.decode(
                this.currOp = this.fetch()
            );
            this.opCycle++;
        }
        // .. Else continue executing instruction
        else {
            this.opCycle++;
            this.currIns(this.currOp);
        }
    };

    // =============== // Debugging //
    this.getLogLine = function() {
        var hex8 = n => ('0' + n.toString(16)).slice(-2);
        var hex16 = n => ('000' + n.toString(16)).slice(-4);

        return (
            // location
            hex16(cpu.pc) + '  '
            + hex8(cpu.read(cpu.pc)) + ' '
            + hex8(cpu.read(cpu.pc + 1)) + ' '
            + hex8(cpu.read(cpu.pc + 2)) + '    '
            // registers
            + ' A:' + hex8(cpu.a)
            + ' X:' + hex8(cpu.x)
            + ' Y:' + hex8(cpu.y)
            + ' P:' + hex8(cpu.getP())
            + ' SP:' + hex8(cpu.sp)
            // end
            + '\n'
        );
    };

    var log = '';
    this.panic = function(op) {
        var win = window.open("", "Memdump", "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=400,height=400,top="+(screen.height/2)+",left="+(screen.width/2));
        win.document.body.innerHTML = '<pre>' + log + '</pre>';

        throw `invalid op: ${ ('0' + op.toString(16)).slice(-2)}`;
    };
};

export default Cpu6502;