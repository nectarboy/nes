const Disassembler = function(nes) {
    var disassembler = this;

    // =============== // Instructions //
    this.instructions = [
        // 6502 instructions indexed by opcode
        // format for each instruction: ['name', length, is16bit]
    ];

    // =============== // Disassembling //
    this.pc = 0; // (faux)
    this.generateDisasm = function(start, end) {
        var disasm = [];
        var rom = nes.mem.rom;

        // [...]

        return disasm;
    };

    this.generateFullDisasm = function() {
        return this.generateDisasm(0, nes.mem.rom.length);
    };

    // =============== // Logging / Output //
    this.getDisasmString = function(disasm) {
    };
    this.popupDisasm = function(disasm) {
        var str = this.getDisasmString(disasm);

        // [...]
    };
};

export default Disassembler;