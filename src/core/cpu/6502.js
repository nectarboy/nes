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
        var res = sum & 0xff;

        cpu.p_c = sum > 0xff;
        cpu.p_z = res === 0;

        // Signed overflow !
        var aAnd80 = cpu.a & 0x80;
        cpu.p_v = (aAnd80 === (m & 0x80)) && (aAnd80 !== (res & 0x80));
        // We done wit that
        cpu.p_n = (res & 0x80) !== 0;

        cpu.a = res;
    };

    this.logic_and = function(m) {
        cpu.a &= m;
        this.check_zn(cpu.a);
    };

    this.arith_shift_left = function(m) {
        var sum = (m << 1) & 0xff;

        cpu.p_c = (m & 0x80) !== 0;
        this.check_zn(sum);

        return sum;
    };

    this.bit_test = function(m) {
        cpu.p_n = (m & 0x80) !== 0;
        cpu.p_v = (m & 0x40) !== 0;
        cpu.p_z = (cpu.a & m) === 0;
    };

    this.compare = function(r, m) {
        var sum = (r - m) & 0xff;

        cpu.p_c = r >= m;
        this.check_zn(sum);

        // return sum; // Preserve for subtraction ops maybe !
    };

    this.decrement = function(m) {
        m--;
        m &= 0xff;
        this.check_zn(m);

        return m;
    };

    this.ex_or = function(m) {
        cpu.a ^= m;
        this.check_zn(cpu.a);
    };

    this.increment = function(m) {
        m++;
        m &= 0xff;
        this.check_zn(m);

        return m;
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
    var cmpOper = 0;

    /* TODO
     * ------
     * remake these to return a value when its outside
     * the cycles (aka done with addressing), so that
     * in the main instructions (adc rol etc), we don't
     * have to check for values so much ! which will icnrease
     * performance :D this will be useful when u eventually
     * port pooptendo to C / C++. goodday
     */
    this.immediate = function() {
        oper = this.fetch();
    };

    this.zeropage = function(read) {
        if (this.opCycle === 1) {
            addr = this.fetch();
        }
        else if (this.opCycle === 2) {
            if (read)
                oper = cpu.read(addr);
        }
    };

    this.zeropage_i = function(i, read) {
        switch (this.opCycle) {
            case 1:
                addr = this.fetch();
                break;
            case 2:
                addr = (addr + i) & 0xff;
                break;
            case 3:
                if (read)
                    oper = cpu.read(addr);
                break;
        }
    };

    this.absolute = function(read) {
        switch (this.opCycle) {
            case 1:
                addr = this.fetch();
                break;
            case 2:
                addr |= this.fetch() << 8;
                break;
            case 3:
                if (read)
                    oper = cpu.read(addr);
                break;
        }
    };

    this.absolute_i = function(i, read) {
        switch (this.opCycle) {
            case 1:
                addr = this.fetch();
                break;
            case 2:
                addr |= this.fetch() << 8;

                // Page crossing
                var sum = (addr + i) & 0xffff;
                this.opCycle += (addr & 0x0f00) === (sum & 0x0f00);

                addr = sum;
                break;
            case 3:
                // Expend a cycle if page crossed
                break;
            case 4:
                if (read)
                    oper = cpu.read(addr);
                break;
        }
    };

    this.indirect = function(read) {
        switch (this.opCycle) {
            case 1:
                oper = this.fetch(); // addr lo
                break;
            case 2:
                oper |= this.fetch() << 8; // addr hi
                break;
            case 3:
                addr = cpu.read(oper); // lo byte
                break;
            case 4:
                // hi byte
                addr |= cpu.read(
                    (oper++ & 0xff00) | (oper & 0xff) // page boundary stuff !!
                ) << 8;
                break;
        }
    };

    this.indirect_x = function(read) {
        switch (this.opCycle) {
            case 1:
                oper = this.fetch();
                break;
            case 2:
                oper = (oper + cpu.x) & 0xff;
                break;
            case 3:
                addr = cpu.read(oper++); // lo byte
                break;
            case 4:
                addr |= cpu.read(oper & 0xff) << 8; // hi byte
                
                if (read)
                    oper = cpu.read(addr);
                break;
        }
    };

    this.indirect_y = function(read) {
        switch (this.opCycle) {
            case 1:
                oper = this.fetch();
                break;
            case 2:
                addr = cpu.read(oper++); // lo byte
                break;
            case 3:
                addr |= cpu.read(oper & 0xff) << 8; // hi byte

                var sum = (addr + cpu.y) & 0xffff;
                // Page crossing
                this.opCycle += (addr & 0x0f00) === (sum & 0x0f00);
                addr = sum;
            case 4:
                // Expend a cycle if page crossed
                break;
            case 5:
                if (read)
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
        this.zeropage(true);
        if (this.opCycle === 2) {
            this.add_carry(oper);
            this.reset_cycles();
        }
    };

    this.adc_zp_x = function() {
        this.zeropage_i(cpu.x, true);
        if (this.opCycle === 3) {
            this.add_carry(oper);
            this.reset_cycles();
        }
    };

    this.adc_abs = function() {
        this.absolute(true);
        if (this.opCycle === 3) {
            this.add_carry(oper);
            this.reset_cycles();
        }
    };

    this.adc_abs_x = function() {
        this.absolute_i(cpu.x, true);
        if (this.opCycle === 4) {
            this.add_carry(oper);
            this.reset_cycles();
        }
    };

    this.adc_abs_y = function() {
        this.absolute_i(cpu.y, true);
        if (this.opCycle === 4) {
            this.add_carry(oper);
            this.reset_cycles();
        }
    };

    this.adc_ind_x = function() {
        this.indirect_x(true);
        if (this.opCycle === 5) {
            this.add_carry(oper);
            this.reset_cycles();
        }
    };

    this.adc_ind_y = function() {
        this.indirect_y(true);
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
        this.zeropage(true);
        if (this.opCycle === 2) {
            this.logic_and(oper);
            this.reset_cycles();
        }
    };

    this.and_zp_x = function() {
        this.zeropage_i(cpu.x, true);
        if (this.opCycle === 3) {
            this.logic_and(oper);
            this.reset_cycles();
        }
    };

    this.and_abs = function() {
        this.absolute(true);
        if (this.opCycle === 3) {
            this.logic_and(oper);
            this.reset_cycles();
        }
    };

    this.and_abs_x = function() {
        this.absolute_i(cpu.x, true);
        if (this.opCycle === 4) {
            this.logic_and(oper);
            this.reset_cycles();
        }
    };

    this.and_abs_y = function() {
        this.absolute_i(cpu.y, true);
        if (this.opCycle === 4) {
            this.logic_and(oper);
            this.reset_cycles();
        }
    };

    this.and_ind_x = function() {
        this.indirect_x(true);
        if (this.opCycle === 5) {
            this.logic_and(oper);
            this.reset_cycles();
        }
    };

    this.and_ind_y = function() {
        this.indirect_y(true);
        if (this.opCycle === 5) {
            this.logic_and(oper);
            this.reset_cycles();
        }
    };

    // ----- ASL
    this.asl_a = function() {
        cpu.a = this.arith_shift_left(cpu.a);
        this.reset_cycles();
    };

    this.asl_zp = function() {
        this.zeropage(true);

        if (this.opCycle === 3) {
            cpu.write(addr, oper);
        }
        else if (this.opCycle === 4) {
            cpu.write(addr, this.arith_shift_left(oper));
            this.reset_cycles();
        }
    };

    this.asl_zp_x = function() {
        this.zeropage_i(cpu.x, true);

        if (this.opCycle === 4) {
            cpu.write(addr, oper);
        }
        else if (this.opCycle === 5) {
            cpu.write(addr, this.arith_shift_left(oper));
            this.reset_cycles();
        }
    };

    this.asl_abs = function() {
        this.absolute(true);

        if (this.opCycle === 4) {
            cpu.write(addr, oper);
        }
        else if (this.opCycle === 5) {
            cpu.write(addr, this.arith_shift_left(oper));
            this.reset_cycles();
        }
    };

    this.asl_abs_x = function() {
        this.absolute_i(cpu.x, true);

        if (this.opCycle === 5) {
            cpu.write(addr, oper);
        }
        else if (this.opCycle === 6) {
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
        this.zeropage(true);
        if (this.opCycle === 2) {
            this.bit_test(oper);
            this.reset_cycles();
        }
    };

    this.bit_abs = function() {
        this.absolute(true);
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
        switch (this.opCycle) {
            case 1:
                cpu.pc++;
                cpu.pc &= 0xffff;

                cpu.p_b = true;
                break;
            case 2:
                cpu.push(cpu.pc >> 8);
                break;
            case 3:
                cpu.push(cpu.pc & 0xff);
                break;
            case 4:
                cpu.push(cpu.getP());
                break;
            case 5:
                // Expend cycle
                break;
            case 6:
                cpu.pc = cpu.read16(0xfffe);
                this.reset_cycles();
                break;
        }
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
    this.cmp_imm = function() {
        this.immediate();

        this.compare(cmpOper, oper);
        this.reset_cycles();
    };

    this.cmp_zp = function() {
        this.zeropage(true);
        if (this.opCycle === 2) {
            this.compare(cmpOper, oper);
            this.reset_cycles();
        }
    };

    this.cmp_zp_x = function() {
        this.zeropage_i(cpu.x, true);
        if (this.opCycle === 3) {
            this.compare(cmpOper, oper);
            this.reset_cycles();
        }
    };

    this.cmp_abs = function() {
        this.absolute(true);
        if (this.opCycle === 3) {
            this.compare(cmpOper, oper);
            this.reset_cycles();
        }
    };

    this.cmp_abs_x = function() {
        this.absolute_i(cpu.x, true);
        if (this.opCycle === 4) {
            this.compare(cmpOper, oper);
            this.reset_cycles();
        }
    };

    this.cmp_abs_y = function() {
        this.absolute_i(cpu.y, true);
        if (this.opCycle === 4) {
            this.compare(cmpOper, oper);
            this.reset_cycles();
        }
    };

    this.cmp_ind_x = function() {
        this.indirect_x(true);
        if (this.opCycle === 5) {
            this.compare(cmpOper, oper);
            this.reset_cycles();
        }
    };

    this.cmp_ind_y = function() {
        this.indirect_y(true);
        if (this.opCycle === 5) {
            this.compare(cmpOper, oper);
            this.reset_cycles();
        }
    };

    // ----- DEC
    this.dec_zp = function() {
        this.zeropage(true);
        if (this.opCycle === 3) {
            cpu.write(addr, oper);
        }
        if (this.opCycle === 4) {
            cpu.write(addr, this.decrement(oper));
            this.reset_cycles();
        }
    };

    this.dec_zp_x = function() {
        this.zeropage_i(cpu.x, true);
        if (this.opCycle === 4) {
            cpu.write(addr, oper);
        }
        if (this.opCycle === 5) {
            cpu.write(addr, this.decrement(oper));
            this.reset_cycles();
        }
    };

    this.dec_abs = function() {
        this.absolute(true);
        if (this.opCycle === 4) {
            cpu.write(addr, oper);
        }
        if (this.opCycle === 5) {
            cpu.write(addr, this.decrement(oper));
            this.reset_cycles();
        }
    };

    this.dec_abs_x = function() {
        this.absolute_i(cpu.x, true);
        if (this.opCycle === 5) {
            cpu.write(addr, oper);
        }
        if (this.opCycle === 6) {
            cpu.write(addr, this.decrement(oper));
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
        this.zeropage(true);
        if (this.opCycle === 2) {
            this.ex_or(oper);
            this.reset_cycles();
        }
    };

    this.eor_zp_x = function() {
        this.zeropage_i(cpu.x, true);
        if (this.opCycle === 3) {
            this.ex_or(oper);
            this.reset_cycles();
        }
    };

    this.eor_abs = function() {
        this.absolute(true);
        if (this.opCycle === 3) {
            this.ex_or(oper);
            this.reset_cycles();
        }
    };

    this.eor_abs_x = function() {
        this.absolute_i(cpu.x, true);
        if (this.opCycle === 4) {
            this.ex_or(oper);
            this.reset_cycles();
        }
    };

    this.eor_abs_y = function() {
        this.absolute_i(cpu.y, true);
        if (this.opCycle === 4) {
            this.ex_or(oper);
            this.reset_cycles();
        }
    };

    this.eor_ind_x = function() {
        this.indirect_x(true);
        if (this.opCycle === 5) {
            this.ex_or(oper);
            this.reset_cycles();
        }
    };

    this.eor_ind_y = function() {
        this.indirect_y(true);
        if (this.opCycle === 5) {
            this.ex_or(oper);
            this.reset_cycles();
        }
    };

    // ----- INC
    this.inc_zp = function() {
        this.zeropage(true);
        if (this.opCycle === 3) {
            cpu.write(addr, oper);
        }
        if (this.opCycle === 4) {
            cpu.write(addr, this.increment(oper));
            this.reset_cycles();
        }
    };

    this.inc_zp_x = function() {
        this.zeropage_i(cpu.x, true);
        if (this.opCycle === 4) {
            cpu.write(addr, oper);
        }
        if (this.opCycle === 5) {
            cpu.write(addr, this.increment(oper));
            this.reset_cycles();
        }
    };

    this.inc_abs = function() {
        this.absolute(true);
        if (this.opCycle === 4) {
            cpu.write(addr, oper);
        }
        if (this.opCycle === 5) {
            cpu.write(addr, this.increment(oper));
            this.reset_cycles();
        }
    };

    this.inc_abs_x = function() {
        this.absolute_i(cpu.x, true);
        if (this.opCycle === 5) {
            cpu.write(addr, oper);
        }
        if (this.opCycle === 6) {
            cpu.write(addr, this.increment(oper));
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
        this.absolute(true);
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
        this.zeropage(true);
        if (this.opCycle === 2) {
            this.check_zn(cpu.a = oper);
            this.reset_cycles();
        }
    };

    this.lda_zp_x = function() {
        this.zeropage_i(cpu.x, true);
        if (this.opCycle === 3) {
            this.check_zn(cpu.a = oper);
            this.reset_cycles();
        }
    };

    this.lda_abs = function() {
        this.absolute(true);
        if (this.opCycle === 3) {
            this.check_zn(cpu.a = oper);
            this.reset_cycles();
        }
    };

    this.lda_abs_x = function() {
        this.absolute_i(cpu.x, true);
        if (this.opCycle === 4) {
            this.check_zn(cpu.a = oper);
            this.reset_cycles();
        }
    };

    this.lda_abs_y = function() {
        this.absolute_i(cpu.y, true);
        if (this.opCycle === 4) {
            this.check_zn(cpu.a = oper);
            this.reset_cycles();
        }
    };

    this.lda_ind_x = function() {
        this.indirect_x(true);
        if (this.opCycle === 5) {
            this.check_zn(cpu.a = oper);
            this.reset_cycles();
        }
    };

    this.lda_ind_y = function() {
        this.indirect_y(true);
        if (this.opCycle === 5) {
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
        this.zeropage(true);
        if (this.opCycle === 2) {
            this.check_zn(cpu.x = oper);
            this.reset_cycles();
        }
    };

    this.ldx_zp_y = function() {
        this.zeropage_i(cpu.y, true);
        if (this.opCycle === 3) {
            this.check_zn(cpu.x = oper);
            this.reset_cycles();
        }
    };

    this.ldx_abs = function() {
        this.absolute(true);
        if (this.opCycle === 3) {
            this.check_zn(cpu.x = oper);
            this.reset_cycles();
        }
    };

    this.ldx_abs_y = function() {
        this.absolute_i(cpu.y, true);
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
        this.zeropage(true);
        if (this.opCycle === 2) {
            this.check_zn(cpu.y = oper);
            this.reset_cycles();
        }
    };

    this.ldy_zp_x = function() {
        this.zeropage_i(cpu.x, true);
        if (this.opCycle === 3) {
            this.check_zn(cpu.y = oper);
            this.reset_cycles();
        }
    };

    this.ldy_abs = function() {
        this.absolute(true);
        if (this.opCycle === 3) {
            this.check_zn(cpu.y = oper);
            this.reset_cycles();
        }
    };

    this.ldy_abs_x = function() {
        this.absolute_i(cpu.x, true);
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
        this.zeropage(true);

        if (this.opCycle === 3) {
            cpu.write(addr, oper);
        }
        else if (this.opCycle === 4) {
            cpu.write(addr, this.logic_shift_right(oper));
            this.reset_cycles();
        }
    };

    this.lsr_zp_x = function() {
        this.zeropage_i(cpu.x, true);

        if (this.opCycle === 4) {
            cpu.write(addr, oper);
        }
        else if (this.opCycle === 5) {
            cpu.write(addr, this.logic_shift_right(oper));
            this.reset_cycles();
        }
    };

    this.lsr_abs = function() {
        this.absolute(true);

        if (this.opCycle === 4) {
            cpu.write(addr, oper);
        }
        else if (this.opCycle === 5) {
            cpu.write(addr, this.logic_shift_right(oper));
            this.reset_cycles();
        }
    };

    this.lsr_abs_x = function() {
        this.absolute_i(cpu.x, true);

        if (this.opCycle === 5) {
            cpu.write(addr, oper);
        }
        else if (this.opCycle === 6) {
            cpu.write(addr, this.logic_shift_right(oper));
            this.reset_cycles();
        }
    };

    // ----- NOP
    this.nop = function() {
        this.reset_cycles();
    };

    this.nop_imm = function() {
        this.immediate();
        this.reset_cycles();
    };

    // ----- ORA
    this.ora_imm = function() {
        this.immediate();

        this.logic_or(oper);
        this.reset_cycles();
    };

    this.ora_zp = function() {
        this.zeropage(true);
        if (this.opCycle === 2) {
            this.logic_or(oper);
            this.reset_cycles();
        }
    };

    this.ora_zp_x = function() {
        this.zeropage_i(cpu.x, true);
        if (this.opCycle === 3) {
            this.logic_or(oper);
            this.reset_cycles();
        }
    };

    this.ora_abs = function() {
        this.absolute(true);
        if (this.opCycle === 3) {
            this.logic_or(oper);
            this.reset_cycles();
        }
    };

    this.ora_abs_x = function() {
        this.absolute_i(cpu.x, true);
        if (this.opCycle === 4) {
            this.logic_or(oper);
            this.reset_cycles();
        }
    };

    this.ora_abs_y = function() {
        this.absolute_i(cpu.y, true);
        if (this.opCycle === 4) {
            this.logic_or(oper);
            this.reset_cycles();
        }
    };

    this.ora_ind_x = function() {
        this.indirect_x(true);
        if (this.opCycle === 5) {
            this.logic_or(oper);
            this.reset_cycles();
        }
    };

    this.ora_ind_y = function() {
        this.indirect_y(true);
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
            this.check_zn(cpu.a);
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
        this.zeropage(true);
        if (this.opCycle === 3) {
            cpu.write(addr, oper);
        }
        else if (this.opCycle === 4) {
            cpu.write(addr, this.rotate_left(oper));
            this.reset_cycles();
        }
    };

    this.rol_zp_x = function() {
        this.zeropage_i(cpu.x, true);
        if (this.opCycle === 4) {
            cpu.write(addr, oper);
        }
        else if (this.opCycle === 5) {
            cpu.write(addr, this.rotate_left(oper));
            this.reset_cycles();
        }
    };

    this.rol_abs = function() {
        this.absolute(true);
        if (this.opCycle === 4) {
            cpu.write(addr, oper);
        }
        else if (this.opCycle === 5) {
            cpu.write(addr, this.rotate_left(oper));
            this.reset_cycles();
        }
    };

    this.rol_abs_x = function() {
        this.absolute_i(cpu.x, true);
        if (this.opCycle === 5) {
            cpu.write(addr, oper);
        }
        else if (this.opCycle === 6) {
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
        this.zeropage(true);
        if (this.opCycle === 3) {
            cpu.write(addr, oper);
        }
        else if (this.opCycle === 4) {
            cpu.write(addr, this.rotate_right(oper));
            this.reset_cycles();
        }
    };

    this.ror_zp_x = function() {
        this.zeropage_i(cpu.x, true);
        if (this.opCycle === 4) {
            cpu.write(addr, oper);
        }
        else if (this.opCycle === 5) {
            cpu.write(addr, this.rotate_right(oper));
            this.reset_cycles();
        }
    };

    this.ror_abs = function() {
        this.absolute(true);
        if (this.opCycle === 4) {
            cpu.write(addr, oper);
        }
        else if (this.opCycle === 5) {
            cpu.write(addr, this.rotate_right(oper));
            this.reset_cycles();
        }
    };

    this.ror_abs_x = function() {
        this.absolute_i(cpu.x, true);
        if (this.opCycle === 5) {
            cpu.write(addr, oper);
        }
        else if (this.opCycle === 6) {
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

        this.add_carry(oper ^ 0xff);
        this.reset_cycles();
    };

    this.sbc_zp = function() {
        this.zeropage(true);
        if (this.opCycle === 2) {
            this.add_carry(oper ^ 0xff);
            this.reset_cycles();
        }
    };

    this.sbc_zp_x = function() {
        this.zeropage_i(cpu.x, true);
        if (this.opCycle === 3) {
            this.add_carry(oper ^ 0xff);
            this.reset_cycles();
        }
    };

    this.sbc_abs = function() {
        this.absolute(true);
        if (this.opCycle === 3) {
            this.add_carry(oper ^ 0xff);
            this.reset_cycles();
        }
    };

    this.sbc_abs_x = function() {
        this.absolute_i(cpu.x, true);
        if (this.opCycle === 4) {
            this.add_carry(oper ^ 0xff);
            this.reset_cycles();
        }
    };

    this.sbc_abs_y = function() {
        this.absolute_i(cpu.y, true);
        if (this.opCycle === 4) {
            this.add_carry(oper ^ 0xff);
            this.reset_cycles();
        }
    };

    this.sbc_ind_x = function() {
        this.indirect_x(true);
        if (this.opCycle === 5) {
            this.add_carry(oper ^ 0xff);
            this.reset_cycles();
        }
    };

    this.sbc_ind_y = function() {
        this.indirect_y(true);
        if (this.opCycle === 5) {
            this.add_carry(oper ^ 0xff);
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
        this.zeropage(false);
        if (this.opCycle === 2) {
            cpu.write(addr, cpu.a);
            this.reset_cycles();
        }
    };

    this.sta_zp_x = function() {
        this.zeropage_i(cpu.x, false);
        if (this.opCycle === 3) {
            cpu.write(addr, cpu.a);
            this.reset_cycles();
        }
    };

    this.sta_abs = function() {
        this.absolute(false);
        if (this.opCycle === 3) {
            cpu.write(addr, cpu.a);
            this.reset_cycles();
        }
    };

    this.sta_abs_x = function() {
        this.absolute_i(cpu.x, false);
        if (this.opCycle === 4) {
            cpu.write(addr, cpu.a);
            this.reset_cycles();
        }
    };

    this.sta_abs_y = function() {
        this.absolute_i(cpu.y, false);
        if (this.opCycle === 4) {
            cpu.write(addr, cpu.a);
            this.reset_cycles();
        }
    };

    this.sta_ind_x = function() {
        this.indirect_x(false);
        if (this.opCycle === 5) {
            cpu.write(addr, cpu.a);
            this.reset_cycles();
        }
    };

    this.sta_ind_y = function() {
        this.indirect_y(false);
        if (this.opCycle === 5) {
            cpu.write(addr, cpu.a);
            this.reset_cycles();
        }
    };

    // ----- STX
    this.stx_zp = function() {
        this.zeropage(false);
        if (this.opCycle === 2) {
            cpu.write(addr, cpu.x);
            this.reset_cycles();
        }
    };

    this.stx_zp_y = function() {
        this.zeropage_i(cpu.y, false);
        if (this.opCycle === 3) {
            cpu.write(addr, cpu.x);
            this.reset_cycles();
        }
    };

    this.stx_abs = function() {
        this.absolute(false);
        if (this.opCycle === 3) {
            cpu.write(addr, cpu.x);
            this.reset_cycles();
        }
    };

    // ----- STY
    this.sty_zp = function() {
        this.zeropage(false);
        if (this.opCycle === 2) {
            cpu.write(addr, cpu.y);
            this.reset_cycles();
        }
    };

    this.sty_zp_x = function() {
        this.zeropage_i(cpu.x, false);
        if (this.opCycle === 3) {
            cpu.write(addr, cpu.y);
            this.reset_cycles();
        }
    };

    this.sty_abs = function() {
        this.absolute(false);
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
        cpu.sp = cpu.x
        this.reset_cycles();
    };

    // =============== // Illegal Instructions //
    // ----- IGN
    this.ign_imm = function() {
        this.immediate();
        this.reset_cycles();
    };

    this.ign_zp = function() {
        this.zeropage(true);
        if (this.opCycle === 2) {
            this.reset_cycles();
        }
    };

    this.ign_zp_x = function() {
        this.zeropage_i(cpu.x, true);
        if (this.opCycle === 3) {
            this.reset_cycles();
        }
    };

    this.ign_abs = function() {
        this.absolute(true);
        if (this.opCycle === 3) {
            this.reset_cycles();
        }
    };

    this.ign_abs_x = function() {
        this.absolute_i(cpu.x, true);
        if (this.opCycle === 4) {
            this.reset_cycles();
        }
    };

    this.ign_abs_y = function() {
        this.absolute_i(cpu.y, true);
        if (this.opCycle === 4) {
            this.reset_cycles();
        }
    };

    this.ign_ind_x = function() {
        this.indirect_x(true);
        if (this.opCycle === 5) {
            this.reset_cycles();
        }
    };

    this.ign_ind_y = function() {
        this.indirect_y(true);
        if (this.opCycle === 5) {
            this.reset_cycles();
        }
    };

    // =============== // Fetching and Decoding //
    this.fetch = function() {
        var byte = cpu.read(cpu.pc++);
        cpu.pc &= 0xffff;

        return byte;
    };

    this.decode = function(op) {
        switch(op) {
            // 0
            case 0x00: return this.brk;
            case 0x01: return this.ora_ind_x;
            case 0x04: return this.ign_zp;
            case 0x05: return this.ora_zp;
            case 0x06: return this.asl_zp;
            case 0x08: return this.php;
            case 0x09: return this.ora_imm;
            case 0x0a: return this.asl_a;
            case 0x0d: return this.ora_abs;
            case 0x0e: return this.asl_abs;
            // 1
            case 0x10: return this.bpl;
            case 0x11: return this.ora_ind_y;
            case 0x15: return this.ora_zp_x;
            case 0x16: return this.asl_zp_x;
            case 0x18: return this.clc;
            case 0x19: return this.ora_abs_y;
            case 0x1d: return this.ora_abs_x;
            case 0x1e: return this.asl_abs_x;
            // 2
            case 0x20: return this.jsr;
            case 0x21: return this.and_ind_x;
            case 0x24: return this.bit_zp;
            case 0x25: return this.and_zp;
            case 0x26: return this.rol_zp;
            case 0x28: return this.plp;
            case 0x29: return this.and_imm;
            case 0x2a: return this.rol_a;
            case 0x2c: return this.bit_abs;
            case 0x2d: return this.and_abs;
            case 0x2e: return this.rol_abs;
            // 3
            case 0x30: return this.bmi;
            case 0x31: return this.and_ind_y;
            case 0x35: return this.and_zp_x;
            case 0x36: return this.rol_zp_x;
            case 0x38: return this.sec;
            case 0x39: return this.and_abs_y;
            case 0x3d: return this.and_abs_x;
            case 0x3e: return this.rol_abs_x;
            // 4
            case 0x40: return this.rti;
            case 0x41: return this.eor_ind_x;
            case 0x45: return this.eor_zp;
            case 0x44: return this.ign_zp;
            case 0x46: return this.lsr_zp;
            case 0x48: return this.pha;
            case 0x49: return this.eor_imm;
            case 0x4a: return this.lsr_a;
            case 0x4c: return this.jmp_abs;
            case 0x4e: return this.lsr_abs;
            case 0x4d: return this.eor_abs;
            // 5
            case 0x50: return this.bvc;
            case 0x51: return this.eor_ind_y;
            case 0x55: return this.eor_zp_x;
            case 0x56: return this.lsr_zp_x;
            case 0x59: return this.eor_abs_y;
            case 0x5d: return this.eor_abs_x;
            case 0x5e: return this.lsr_abs_x;
            // 6
            case 0x60: return this.rts;
            case 0x61: return this.adc_ind_x;
            case 0x65: return this.adc_zp;
            case 0x64: return this.ign_zp;
            case 0x66: return this.ror_zp;
            case 0x68: return this.pla;
            case 0x69: return this.adc_imm;
            case 0x6a: return this.ror_a;
            case 0x6c: return this.jmp_ind;
            case 0x6d: return this.adc_abs;
            case 0x6e: return this.ror_abs;
            // 7
            case 0x70: return this.bvs;
            case 0x71: return this.adc_ind_y;
            case 0x75: return this.adc_zp_x;
            case 0x76: return this.ror_zp_x;
            case 0x78: return this.sei;
            case 0x79: return this.adc_abs_y;
            case 0x7d: return this.adc_abs_x;
            case 0x7e: return this.ror_abs_x;
            // 8
            //case 0x80: return this.nop_imm;
            case 0x81: return this.sta_ind_x;
            case 0x84: return this.sty_zp;
            case 0x85: return this.sta_zp;
            case 0x86: return this.stx_zp;
            case 0x88: return this.dey;
            case 0x8a: return this.txa;
            case 0x8d: return this.sta_abs;
            case 0x8c: return this.sty_abs;
            case 0x8e: return this.stx_abs;
            // 9
            case 0x90: return this.bcc;
            case 0x91: return this.sta_ind_y;
            case 0x94: return this.sty_zp_x;
            case 0x95: return this.sta_zp_x;
            case 0x96: return this.stx_zp_y;
            case 0x98: return this.tya;
            case 0x99: return this.sta_abs_y;
            case 0x9a: return this.txs;
            case 0x9d: return this.sta_abs_x;
            // A
            case 0xa0: return this.ldy_imm;
            case 0xa1: return this.lda_ind_x;
            case 0xa2: return this.ldx_imm;
            case 0xa4: return this.ldy_zp;
            case 0xa5: return this.lda_zp;
            case 0xa6: return this.ldx_zp;
            case 0xa8: return this.tay;
            case 0xa9: return this.lda_imm;
            case 0xaa: return this.tax;
            case 0xac: return this.ldy_abs;
            case 0xad: return this.lda_abs;
            case 0xae: return this.ldx_abs;
            // B
            case 0xb0: return this.bcs;
            case 0xb1: return this.lda_ind_y;
            case 0xb4: return this.ldy_zp_x;
            case 0xb5: return this.lda_zp_x;
            case 0xb6: return this.ldx_zp_y;
            case 0xb8: return this.clv;
            case 0xb9: return this.lda_abs_y;
            case 0xba: return this.tsx;
            case 0xbc: return this.ldy_abs_x;
            case 0xbd: return this.lda_abs_x;
            case 0xbe: return this.ldx_abs_y;
            // C
            case 0xc0: cmpOper = cpu.y; return this.cmp_imm;
            case 0xc1: cmpOper = cpu.a; return this.cmp_ind_x;
            case 0xc4: cmpOper = cpu.y; return this.cmp_zp;
            case 0xc5: cmpOper = cpu.a; return this.cmp_zp;
            case 0xc6: return this.dec_zp;
            case 0xc8: return this.iny;
            case 0xc9: cmpOper = cpu.a; return this.cmp_imm;
            case 0xca: return this.dex;
            case 0xcc: cmpOper = cpu.y; return this.cmp_abs;
            case 0xcd: cmpOper = cpu.a; return this.cmp_abs;
            case 0xce: return this.dec_abs;
            // D
            case 0xd0: return this.bne;
            case 0xd1: cmpOper = cpu.a; return this.cmp_ind_y;
            case 0xd5: cmpOper = cpu.a; return this.cmp_zp_x;
            case 0xd6: return this.dec_zp_x;
            case 0xd8: return this.cld;
            case 0xd9: cmpOper = cpu.a; return this.cmp_abs_y;
            case 0xdd: cmpOper = cpu.a; return this.cmp_abs_x;
            case 0xde: return this.dec_abs_x;
            // E
            case 0xe0: cmpOper = cpu.x; return this.cmp_imm;
            case 0xe1: return this.sbc_ind_x;
            case 0xe4: cmpOper = cpu.x; return this.cmp_zp;
            case 0xe5: return this.sbc_zp;
            case 0xe6: return this.inc_zp;
            case 0xe8: return this.inx;
            case 0xe9: return this.sbc_imm;
            case 0xea: return this.nop;
            case 0xec: cmpOper = cpu.x; return this.cmp_abs;
            case 0xed: return this.sbc_abs;
            case 0xee: return this.inc_abs;
            // F
            case 0xf0: return this.beq;
            case 0xf1: return this.sbc_ind_y;
            case 0xf5: return this.sbc_zp_x;
            case 0xf6: return this.inc_zp_x;
            case 0xf8: return this.sed;
            case 0xf9: return this.sbc_abs_y;
            case 0xfd: return this.sbc_abs_x;
            case 0xfe: return this.inc_abs_x;

            default:
                this.panic();
        }
    };

    this.execute = function() {
        // Done with instruction ?..
        if (this.opCycle === -1) {
            //log += this.getLogLine(); // DEBUG LOG
            //if (++logC > 8991) this.panic(0);

            this.currIns = this.decode(
                this.currOp = this.fetch()
            );
            this.opCycle++;

            return false;
        }
        // .. Else continue executing instruction
        else {
            this.opCycle++;
            this.currIns(this.currOp);

            return (this.opCycle === -1); // Did we finish an instruction rn ??
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
            + hex8(cpu.read(cpu.pc + 2)) + ' '.repeat(33)
            // registers
            + ' A:' + hex8(cpu.a)
            + ' X:' + hex8(cpu.x)
            + ' Y:' + hex8(cpu.y)
            + ' P:' + hex8(cpu.getPFull())
            + ' SP:' + hex8(cpu.sp)
            // end
            + '\n'
        );
    };

    //var log = '';
    //var logC = 0;
    this.panic = function() {
        nes.stop();
        //nes.popupString(log);

        throw `PANIC !! PC: ${('000' + cpu.pc.toString(16)).slice(-4)} OP: ${('0' + this.currOp.toString(16)).slice(-2)}`;
    };

    // =============== // Reset Function //
    this.reset = function() {
        this.reset_cycles();
    };
    
};

export default Cpu6502;