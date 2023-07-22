<p align='center'><img src='https://github.com/nectarboy/nes/blob/main/src/img/pooptendo.png?raw=true'></p>
<h1 align='center'>Pooptendo</h1>

This is Pooptendo, a Nintendo Entertainment System but stuffed inside with horse manure (emulator).
Games may or may not work when you plug them into this Pooptendo.

Pooptendo is mostly complete i think, most games i've tried work with few issues.<br>
[you can try it online :)](https://nectarboy.github.io/nes)

## Features
Pooptendo aims for accuracy but also makes some sacrifices for speed; i want most well known (and the fun) games to work, and the final boss is the froggy game Battle-Toads >:D (it runs! but it is a bit broken)

If your computer is new enough, most games should run at full speed, but stuttering does occur sometimes; if that happens, turn off frame-skip.

The CPU is cycle accurate, but there might be a few timing bugs lying around.<br>
The PPU is emulated to the pixel level, though i sometimes make small sacrifices for speed, and there are still some missing features.<br>
If issues show up though, (or if i manage to make it fast enough), i'll do my best to make it as accurate as i can :)

![super mario :)](https://github.com/nectarboy/nes/blob/main/docs/pics/Super_Mario_Bros/title.png?raw=true)
![red panda :)](https://github.com/nectarboy/nes/blob/main/docs/pics/Homebrew/redpanda.png?raw=true)
![mega man :)](https://github.com/nectarboy/nes/blob/main/docs/pics/Mega_Man_2/title.png?raw=true)

![tetris](https://github.com/nectarboy/nes/blob/main/docs/pics/Tetris/stack.png?raw=true)
![kirby :)](https://github.com/nectarboy/nes/blob/main/docs/pics/Kirbys_Adventure/crane.png?raw=true)
![sushi](https://github.com/nectarboy/nes/blob/main/docs/pics/River_City_Ransom/sushi.png?raw=true)

---

## Functionality
```
POOPTENDO STATUS :: horse manure is clearing out
```

Pooptendo is written in JS atm, however I had plans to remake it in C.
(This probably won't happen, I might start a new emulator in a language like C++)

### how to use
Click <kbd>Choose File</kbd>to insert a ROM.

<kbd>Fullscreen</kbd> toggles fullscreen,
<br><kbd>Frameskip</kbd> toggles frameskip.

```
-- nes joypad
D-PAD   - ARROW KEYS / WASD
B       - X / L
A       - Z / K
START   - ENTER
SELECT  - SHIFT

-- emulator shortcuts
RESET   - R
PAUSE   - P
```

These are the default keybinds, they cannot be changed atm soz lol :3

### compatibility
```
- cpu           (%95) 
- ppu           (%90)
- cartridge     (%25)
- apu           (%80)
- joypad        (%90)
- extra stuff   (%0)
- cool emu shit (%10)
```

Current mappers supported:
- NROM
- MMC1
- MMC2
- MMC3 (WIP)
- UxROM
- AxROM

### importing
if you want to import Pooptendo to your site or something, first of all pls credit me :3, second of all:
```JavaScript
import NES from './core/nes.js'; // Pooptendo is modular

var nes = new NES();
nes.attachCanvas(canvas);
nes.loadRomBuff(romBuff); // A Uint8Array buffer with the ROM data
nes.start();
```
By default, Pooptendo's default settings are:
- NTSC
- Joypad Enabled
- Frameskip Enabled

Refer to `nes.js` in the core to figure out how to set it up to your liking :3

---

### goodbye
having more experience after my Game Boy emulator, this emulator is a little more refined and the codebase is cleaner. i probably won't update it much anymore, but overall it was very fun :)

thanks for checking out Pooptendo !

nectarboy | 2021-2023