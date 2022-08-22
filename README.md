<p align='center'><img src='https://github.com/nectarboy/nes/blob/main/src/img/pooptendo.png?raw=true'></p>
<h1 align='center'>Pooptendo</h1>

This is Pooptendo, a Nintendo Entertainment System but stuffed inside with horse manure.
Games may or may not work when you plug them into this Pooptendo.

Its a big WIP as you can prolly tell ... but some games work !<br>
[you can try it online :)](https://nectarboy.github.io/nes)

## what about it ?
Pooptendo kinda aims for cycle accuracy; i want most well known (and the fun) games to work, and the final boss is that difficult-to-emulate froggy game >:D

The CPU is cycle accurate, but there might be a few bugs lying around.<br>
The PPU is emulated to the pixel level, though i sometimes make small sacrifices for speed, and there are still some missing stuff.<br>
If issues show up though, (or if i manage to make it fast enough), i'll do my best to make it as accurate as i can :)

![super fuckin mario](https://github.com/nectarboy/nes/blob/main/docs/pics/Super_Mario_Bros/title.png?raw=true)
![red panda <3](https://github.com/nectarboy/nes/blob/main/docs/pics/Homebrew/redpanda.png?raw=true)
![donkey fuck](https://github.com/nectarboy/nes/blob/main/docs/pics/Mega_Man_2/title.png?raw=true)

![super fuckin mario](https://github.com/nectarboy/nes/blob/main/docs/pics/Tetris/stack.png?raw=true)
![red panda <3](https://github.com/nectarboy/nes/blob/main/docs/pics/Kirbys_Adventure/crane.png?raw=true)
![donkey fuck](https://github.com/nectarboy/nes/blob/main/docs/pics/River_City_Ransom/title.png?raw=true)

---

## functionality
```
POOPTENDO STATUS :: horse manure is beginning to clear out
```

Pooptendo is being written in JS atm, however, i wanna remake it in C sometime !
(i hope i dont give up on that TwT)

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
- cartridge     (%20)
- apu           (%25)
- joypad        (%90)
- extra stuff   (%0)
- cool emu shit (%10)
```

Current mappers supported:
- NROM
- MMC1
- MMC3 (WIP)

### importing
if you want to import Pooptendo to your site or something, first of all pls credit me :3, second of all:
```JavaScript
import NES from './core/nes.js'; // Pooptendo is modular

var nes = new NES();
nes.attachCanvas(canvas);
nes.loadRomBuff(romBuff); // A Uint8Array buffer
nes.start();
```
By default, Pooptendo's default settings are:
- NTSC
- Joypad Enabled
- Frameskip Enabled

Refer to `nes.js` in the core to figure out how to set it up to your liking :3

---

### goodbye
thanks for checking out Pooptendo !

nectarboy | 2021-2022