// Copied some code over from the gameboy emu
// uwu

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

        const prev = this.shift;
        this.shift++;
        this.shift &= 7;

        return prev;
    };

    this.pollJoypad = function() {
        switch (this.shiftJoypad()) {
            case 0: return 0|this.a;
            case 1: return 0|this.b;
            case 2: return 0|this.select;
            case 3: return 0|this.start;
            case 4: return 0|this.up;
            case 5: return 0|this.down;
            case 6: return 0|this.left;
            case 7: return 0|this.right;
        }
    };

    // =============== // Key Events //
    this.keybinds = {
        up: 'ArrowUp',
        down: 'ArrowDown',
        left: 'ArrowLeft',
        right: 'ArrowRight',

        b: 'KeyX',
        a: 'KeyZ',

        start: 'Enter',
        select: 'ShiftRight'
    };

    this.keyboardAPI = {
        // Key state setter
        setKeyState (code, val) {
            var keybinds = joypad.keybinds;

            switch (code) {
                case keybinds.up:
                    joypad.up = val;
                    break;
                case keybinds.down:
                    joypad.down = val;
                    break;
                case keybinds.left:
                    joypad.left = val;
                    break;
                case keybinds.right:
                    joypad.right = val;
                    break;

                case keybinds.b:
                    joypad.b = val;
                    break;
                case keybinds.a:
                    joypad.a = val;
                    break;

                case keybinds.start:
                    joypad.start = val;
                    break;
                case keybinds.select:
                    joypad.select = val;
                    break;

                default:
                    return false;
            }

            return true;
        },

        // Keypress handlers
        pressed: {},

        onKeyDown (e) {
            // Check if holding down
            if (this.pressed [e.keyCode])
                return e.preventDefault ();
            this.pressed [e.keyCode] = true;

            if (this.setKeyState (e.code, true))
                e.preventDefault ();
        },

        onKeyUp (e) {
            delete this.pressed [e.keyCode]; // Reset pressed keystate

            this.setKeyState (e.code, false);
        },

        // Event listeners
        start () {
            if (!nes.keyboardEnabled)
                return;

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