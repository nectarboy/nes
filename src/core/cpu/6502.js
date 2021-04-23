const Cpu6502 = function(nes, cpu) {
    var cpu6502 = this;

    // =============== // Shorthands //
    this.check_zn = function(m) {
        cpu.p_z = m === 0;
        cpu.p_n = (m & 0x80) !== 0;
    };

    this.reset_cycles = function() {
        this.opCycle = 0;
    };

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
        var sum = ((m << 1) | (m >> 7)) & 0xff;

        cpu.p_c = (m & 0x80) !== 0;
        this.check_zn(sum);

        return sum;
    };

    this.rotate_right = function(m) {
        var sum = ((m >> 1) | (m << 7)) & 0xff;

        cpu.p_c = (m & 1) !== 0;
        this.check_zn(sum);

        return sum;
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
        else {
            oper = cpu.read(addr);
        }
    };

    this.zeropage_x = function() {
        switch (this.opCycle) {
            case 1:
                addr = this.fetch();
                break;
            case 2:
                addr = (addr + cpu.x) & 0xff;
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
                // Expend cycle
                break;
            case 5:
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
        this.zeropage_x();
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
        this.zeropage_x();
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

        if (cpu.opCycle === 2) {
            cpu.write(addr, oper);
        }
        else {
            cpu.write(addr, this.arith_shift_left(oper));
            this.reset_cycles();
        }
    };

    this.asl_zp_x = function() {
        this.zeropage_x();

        if (cpu.opCycle === 3) {
            cpu.write(addr, oper);
        }
        else {
            cpu.write(addr, this.arith_shift_left(oper));
            this.reset_cycles();
        }
    };

    this.asl_abs = function() {
        this.absolute();

        if (cpu.opCycle === 4) {
            cpu.write(addr, oper);
        }
        else {
            cpu.write(addr, this.arith_shift_left(oper));
            this.reset_cycles();
        }
    };

    this.asl_abs_x = function() {
        this.absolute_i(cpu.x);

        if (cpu.opCycle === 5) {
            cpu.write(addr, oper);
        }
        else {
            cpu.write(addr, this.arith_shift_left(oper));
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

    };

    this.execute = function() {
        // Done with instruction ?..
        if (this.opCycle === 0) {
            this.currIns = this.decode(
                this.currOp = this.fetch()
            );
        }
        // .. Else continue executing instruction
        else {
            this.opCycle++;
            this.currIns(this.currOp);
        }
    };
};

export default Cpu6502;