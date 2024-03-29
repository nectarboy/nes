// Copied some code over from the gameboy emu
// uwu
// TODO: eliminate ghost input :)

import constants from '../constants.js';

const Joypad = function(nes) {
    const joypad = this;

    // =============== // Polling Logic //
    this.up = false;
    this.down = false;
    this.left = false;
    this.right = false;
    this.b = false;
    this.a = false;
    this.start = false;
    this.select = false;

    this.shift = 0;
    this.strobe = false;

    this.shiftJoypad = function() {
        if (this.strobe) {
            this.shift = 0;
        }
        else if (this.shift !== 8) {
            this.shift++;
        }   
    };

    this.pollJoypad = function() {
        switch (this.shift) {
            case 0: return 0|this.a;
            case 1: return 0|this.b;
            case 2: return 0|this.select;
            case 3: return 0|this.start;
            case 4: return 0|this.up;
            case 5: return 0|this.down;
            case 6: return 0|this.left;
            case 7: return 0|this.right;
            case 8: return 1;
        }
    };

    // =============== // Key Events //
    // maybe later =w=
    this.keybinds = {
        up: 'KeyW', // 'ArrowUp',
        down: 'KeyS', // 'ArrowDown',
        left: 'KeyA', // 'ArrowLeft',
        right: 'KeyD', // 'ArrowRight',
        b: 'KeyL', // 'KeyX',
        a: 'KeyK', // 'KeyZ',
        start: 'Enter',
        select: 'ShiftRight',

        debug_reset: 'KeyR',
        debug_pause: 'KeyP'
    };

    this.keyboardAPI = {
        // Key state handlers
        setKeyState (keycode, val) {
            switch (keycode) {
                case 87: case 38:
                    joypad.up = val;
                    break;
                case 83: case 40:
                    joypad.down = val;
                    break;
                case 65: case 37:
                    joypad.left = val;
                    break;
                case 68: case 39:
                    joypad.right = val;
                    break;
                case 88: case 76:
                    joypad.b = val;
                    break;
                case 90: case 75:
                    joypad.a = val;
                    break;
                case 13:
                    joypad.start = val;
                    break;
                case 16:
                    joypad.select = val;
                    break;

                default:
                    return false;
            }

            return true;
        },

        checkDebugKey(code) {
            switch (code) {
                case joypad.keybinds.debug_reset:
                    nes.reset();
                    nes.onkeyreset();
                    break;
                case joypad.keybinds.debug_pause:
                    nes.onkeypause(nes.togglePause());
                    break;
            }
        },

        // Keypress handlers
        pressed: new Uint8Array(256),

        onKeyDown (e) {
            // Check if holding down
            if (this.pressed[e.keyCode] === 1) {
                e.preventDefault();
                return;
            }
            this.pressed[e.keyCode] = 1;

            if (this.setKeyState(e.keyCode, true)) {
                e.preventDefault();
            }
            else {
                this.checkDebugKey(e.code);
            }
        },

        onKeyUp (e) {
            this.pressed[e.keyCode] = 0;
            this.setKeyState(e.keyCode, false);
        },

        // Event listeners
        start () {
            document.addEventListener ('keydown', keydownlisten);
            document.addEventListener ('keyup', keyuplisten);
        },

        stop () {
            document.removeEventListener ('keydown', keydownlisten);
            document.removeEventListener ('keyup', keyuplisten);

            joypad.reset ();
        }

    };

    // Because event listeners redefine 'this', we use an external function
    function keydownlisten (e) {
        joypad.keyboardAPI.onKeyDown (e);
    }
    function keyuplisten (e) {
        joypad.keyboardAPI.onKeyUp (e);
    }

    // =============== // Reset Function //
    this.reset = function() {
        this.up = false;
        this.down = false;
        this.left = false;
        this.right = false;
        this.b = false;
        this.a = false;
        this.start = false;
        this.select = false;

        this.shift = 0;
        this.strobe = false;
    };

};

export default Joypad;