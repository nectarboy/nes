import rendering from './rendering.js';
import constants from '../constants.js';

const Ppu = function(nes) {
    var ppu = this;
    var mem = nes.mem;

    // =============== // Canvas //
    this.rendering = rendering;

    // =============== // Reading and Writing //
    this.read = function(addr) {
        if (addr < 0x2000) {
            return mem.chr[addr & (mem.chrSize-1)]; // chr
        }
        else if (addr < 0x2400) {
            return mem.nametable[mem.nametable0map][addr - 0x2000]; // nametable map 0
        }
        else if (addr < 0x2800) {
            return mem.nametable[mem.nametable1map][addr - 0x2400]; // nametable map 1
        }
        else if (addr < 0x2c00) {
            return mem.nametable[mem.nametable2map][addr - 0x2800]; // nametable map 2
        }
        else if (addr < 0x3000) {
            return mem.nametable[mem.nametable3map][addr - 0x2c00]; // nametable map 3
        }
        else {
            return mem.palleteram[addr & 0x1f];
        }
    };

    // =============== // Registers //
    // PPUCTRL
    this.baseNametableAddr = 0;
    this.vramAddrInc = 0;
    this.spriteTable = 0;
    this.bgTable = 0;
    this.spriteSize = 0;
    this.masterSelect = false;
    this.nmiEnabled = false;

    // PPUSTATUS
    this.sprite0Atm = false;
    this.vblankAtm = false;

    // =============== // Execution //
    this.execute = function() {
        
    };

    this.debugDrawChr = function() {
        for (var i = 0; i < mem.chr.length; i += 16) {

            for (var y = 0; y < 8; y++) {
                var yy = (0|(i/constants.screen_width))*8 + y;

                var hi = mem.chr[i + 8 + y];
                var lo = mem.chr[i + y];

                for (var x = 0; x < 8; x++) {
                    var bit = (((hi >> (x^7)) & 1) << 1) | ((lo >> (x^7)) & 1);

                    var xx = (i & 0xff)/2 + x;
                    this.rendering.drawPx(xx, yy, bit);
                }
            }

        }
    };

    // =============== // Reset Function //
    this.reset = function() {

    };

};

export default Ppu;