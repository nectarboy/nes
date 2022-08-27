import constants from '../constants.js';
//import Mixer from './mixer.js';

function Apu(nes) {
    var apu = this;

    // =============== // Buffering / Mixing //
    // TODO:
    // * make an option later for anti aliasing squares for better sound quality :)

    this.ctx = new (window.AudioContext || window.webkitAudioContext)(); // listening to grouper while doing this harharhar (my will to live is dwindling)

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0.3;
    this.gainNode.connect(this.ctx.destination);

    this._currentTime = 0; // used to keep up ctx.currentTime
    this.currentBuff = 0;
    this.buffNumber = 0;
    this.totalTimesFull = 0;
    this.buffStep = 0; // which buffer sample we on
    this.buffTick = 0; // used to keep track how often we should step buffer
    this.buffInterval = 0;
    this.sampleRate = 0;
    this.buffLength = 0;
    this.buff = {};
    this.buffData = {};
    this.updateBuffInterval = function() {
        this.buffInterval = 0|(nes.cpu.cyclesPerSec / this.sampleRate);
    };
    this.generateBuffer = function(length, sampleRate) {
        const buffNumber = 5;
        this.buffNumber = buffNumber;

        this.buffLength = length;
        this.sampleRate = sampleRate;
        for (i = 0; i < buffNumber; i++) {
            this.buff[i] = this.ctx.createBuffer(1, length, sampleRate);
            this.buffData[i] = this.buff[i].getChannelData(0);
        }

        // this.bufferPlaybackTime = sampleRate / length;
        this.updateBuffInterval();
    };
    this.stepBuffer = function() {
        // generating samples
        var sq1sample = this.sq1.getSample();
        var sq2sample = this.sq2.getSample();
        var trisample = this.tri.getSample();
        var noisample = this.noi.getSample();

        // mix into 1 pcm sample and buffer

        //var mix = (3/7) * (sq1sample + sq2sample)/2 + (4/7) * trisample; // method 1 (legacy)
        //var mix = (sq1sample + sq2sample + trisample + noisample)/4; // method 2 (legacy)
        var mix = (0.00752 * (sq1sample + sq2sample) + 0.00851 * trisample + 0.00494 * noisample) * 2.34 * 2 - 1;

        this.buffData[this.currentBuff][this.buffStep] = mix;
        this.buffStep++;

        // when buffer is filled up, play it and switch
        if (this.buffStep === this.buffLength) {
            this.buffStep = 0;
            this.totalTimesFull++;

            // Method 1 - (very nice UNTIL IT STRAYS TOO FAR AND HELICOPTER NOISES ENSUE)
            var buff = this.currentBuff++;
            if (this.currentBuff === this.buffNumber) {
                this.currentBuff = 0;
            }

            if (this._currentTime <= this.ctx.currentTime - this.buff[buff].duration || this._currentTime >= this.ctx.currentTime + this.buff[buff].duration*3) {
                console.log('Buffer straying too far! Catching up', this._currentTime, this.ctx.currentTime);
                this._currentTime = this.ctx.currentTime; // The buffer is more often than not ahead of ctx.currentTime it seems
            }
            var src = this.ctx.createBufferSource();
            src.buffer = this.buff[buff];
            src.connect(this.gainNode);
            src.start(this._currentTime);
            this._currentTime += this.buff[buff].duration;


            // Method 2 - (stable and satisfactory)
            // var buff = this.currentBuff++;
            // if (this.currentBuff === this.buffNumber) {
            //     this.currentBuff = 0;
            // }

            // if (buff === 0) {
            //     var startTime = this.ctx.currentTime + this.buff[0].duration;

            //     for (var i = 0; i < this.buffNumber; i++) {
            //         var src = this.ctx.createBufferSource();
            //         src.buffer = this.buff[i];
            //         src.connect(this.gainNode);
            //         src.start(startTime);
            //         startTime += this.buff[0].duration;
            //     }
            // }


            // Method 3 - doesnt work lol
            // var buff = this.currentBuff++;
            // if (this.currentBuff === this.buffNumber)
            //     this.currentBuff = 0;

            // if ((this.totalTimesFull & 1) === 0) {
            // var startTime = this.ctx.currentTime + this.buff[0].duration;

            // var src0 = this.ctx.createBufferSource();
            // src0.buffer = this.buff[buff];
            // src0.connect(this.gainNode);
            // src0.start(startTime);

            // var src1 = this.ctx.createBufferSource();
            // src1.buffer = this.buff[this.currentBuff];
            // src1.connect(this.gainNode);
            // src1.start(startTime + this.buff[0].duration);
            // }
        }
    };

    // =============== // Channel Registers //

    this.lengthtable = [
        // (copied from https://www.nesdev.org/wiki/APU_Length_Counter)
        10,254, 20,  2, 40,  4, 80,  6, 160,  8, 60, 10, 14, 12, 26, 14,
        12, 16, 24, 18, 48, 20, 96, 22, 192, 24, 72, 26, 16, 28, 32, 30
    ];

    // Square 1 & 2
    for (var i = 1; i <= 2; i++) {
        this['sq' + i] = // js numero uno xddddddddddddddddd

        {   
            issq1: 0|(i === 1), // used for the sweep hehehe
            enabled: false,

            // duties: {
            //     0: [-1, 1,-1,-1,-1,-1,-1,-1],
            //     1: [-1, 1, 1,-1,-1,-1,-1,-1],
            //     2: [-1, 1, 1, 1, 1,-1,-1,-1],
            //     3: [ 1,-1,-1, 1, 1, 1, 1, 1]
            // },
            duties: {
                0: [0,1,0,0,0,0,0,0],
                1: [0,1,1,0,0,0,0,0],
                2: [0,1,1,1,1,0,0,0],
                3: [1,0,0,1,1,1,1,1],
            },
            duty: 0,
            dutystep: 0,

            sweepenabled: false,
            sweepdivreload: 0,
            sweepdiv: 0,
            sweeptarget: 0,
            sweepneg: false,
            sweepshift: false,
            sweepstart: false, // aka the reload flag ig
            sweepplaying: 0, // FOR MASTER VOL

            freq: 0,
            freqreload: 0,
            freqplaying: 0, // FOR MASTER VOL

            length: 0,
            lengthplaying: 0, // FOR MASTER VOL

            vol: 0,
            constantvol: false, // (also used as lengthhalt)
            loopvol: false,
            envvol: 0,
            volreload: 0,
            volperiod: 0,
            volstart: false, // the reload flag

            mastervol: 0, // vol * freqplaying * lengthplaying * sweepplaying

            updateSweepTarget() {
                var change = this.freqreload >> this.sweepshift;
                if (this.sweepneg) {
                    change = -change - this.issq1;
                }
                this.sweeptarget = this.freqreload + change;
                this.sweepplaying = 0|(this.freqreload >= 8 && this.sweeptarget <= 0x7ff);
                this.calcMasterVol();
            },
            updateSweep() {
                //this.updateSweepTarget();

                // Updating raw frequency
                if (this.sweepdiv === 0) {
                    this.sweepstart = true;

                    this.updateSweepTarget();
                    if (this.sweepenabled && this.sweepplaying === 1 && this.sweepshift !== 0) {
                        this.freqreload = this.sweeptarget;
                        this.updateSweepTarget();
                    }
                }
                
                if (this.sweepstart) {
                    this.sweepstart = false;
                    this.sweepdiv = this.sweepdivreload;
                }
                else {
                    this.sweepdiv--;
                }
    
            },

            writeLength(val) {
                if (!this.enabled)
                    return;

                this.length = apu.lengthtable[val];
                this.lengthplaying = 0|(this.length !== 0);
                this.calcMasterVol();
            },
            updateLength() {
                if (this.loopvol === false && this.length !== 0) {
                    this.length--;
                    this.lengthplaying = 0|(this.length !== 0);
                    this.calcMasterVol();
                }
            },

            updateFreq() {
                this.freq--;
                if (this.freq <= 0) {
                    this.freq = this.freqreload;

                    this.dutystep++;
                    this.dutystep &= 7;
                    this.calcMasterVol();
                }
            },

            updateEnvelope() {
                if (this.volstart) {
                    this.volstart = false;
                    this.envvol = 15;
                    this.volperiod = this.volreload;

                    // If using envelope mode, update vol
                    if (this.constantvol === false) {
                        this.vol = this.envvol;
                        this.calcMasterVol();
                    }
                }
                // Divider
                else if (this.volperiod === 0) {
                    this.volperiod = this.volreload;

                    if (this.envvol !== 0) {
                        this.envvol--;
                    }
                    else if (this.loopvol) {
                        this.envvol = 15;
                    }

                    // If using envelope mode, update vol
                    if (this.constantvol === false) {
                        this.vol = this.envvol;
                        this.calcMasterVol();
                    }
                }
                else {
                    this.volperiod--;
                }
            },

            enable() {
                this.enabled = true;
            },
            silence() {
                this.enabled = false;

                this.length = 0;
                this.lengthplaying = 0;
                this.calcMasterVol();
            },

            calcMasterVol() {
                this.mastervol = this.duties[this.duty][this.dutystep] * this.vol * this.lengthplaying * this.sweepplaying;
            },
            getSample() {
                // this.vol = (this.constantvol||true ? this.volreload : this.envvol);
                // this.calcMasterVol();
                return this.mastervol;
            }
        };

    }

    // Triangle
    this.tri = {
        enabled: false,

        waveform: [
            15, 14, 13, 12, 11, 10,  9,  8,  7,  6,  5,  4,  3,  2,  1,  0,
            0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15
        ],
        step: 0,

        freqreload: 0,
        freq: 0,
        freqplaying: false,

        lengthhalt: false,
        length: 0,
        lengthplaying: 0, // FOR MASTER VOL

        linreloadval: 0,
        lincounter: 0,
        linstart: false,
        linplaying: 0, // FOR MASTER VOL

        mastervol: 0,

        updateFreq() {
            this.freq--;
            if (this.freq <= 0) {
                this.freq = this.freqreload;

                this.step++;
                this.step &= 0x1f;
                this.calcMasterVol();
            }
        },

        writeLength(val) {
            if (!this.enabled)
                return;

            this.length = apu.lengthtable[val];
            this.lengthplaying = 0|(this.length !== 0);
            this.calcMasterVol();
        },
        updateLength() {
            if (this.lengthhalt === false && this.length !== 0) {
                this.length--;
                this.lengthplaying = 0|(this.length !== 0);
                this.calcMasterVol();
            }
        },

        updateLinear() {
            if (this.linstart) {
                this.lincounter = this.linreloadval;
            }
            else if (this.lincounter > 0) {
                this.lincounter--;
            }
            this.linplaying = 0|(this.lincounter !== 0);
            this.calcMasterVol();

            if (this.lengthhalt === false) {
                this.linstart = false;
            }
        },

        enable() {
            this.enabled = true;
        },
        silence() {
            this.enabled = false;

            this.length = 0;
            this.lengthplaying = 0;
            this.calcMasterVol();
        },

        calcMasterVol() {
            this.mastervol = this.waveform[this.step] * this.lengthplaying * this.linplaying * this.freqplaying;
        },
        getSample() {
            return this.mastervol;
        }
    };

    // for (var i = 0; i < this.tri.waveform.length; i++) this.tri.waveform[i] = this.tri.waveform[i]/15 * 2 - 1; // Fix waveform

    // Noise
    this.noi = {
        enabled: false,

        freqtable: [
            4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068 // TODO: PAL table
        ],
        freqreload: 0,
        freq: 0,

        currentbit: 0,
        shiftbit: 0,
        shift: 0,
        shiftplaying: 0, // FOR MASTER VOL

        lengthhalt: 0,
        length: 0,
        lengthplaying: 0, // FOR MASTER VOL

        volstart: false,
        volreload: 0,
        volperiod: 0,
        envvol: 0,
        vol: 0,
        constantvol: false,

        mastervol: 0,

        updateFreq() {
            this.freq--;
            if (this.freq <= 0) {
                this.freq = this.freqreload;

                // Pseudo random shi
                var feedback = (this.shift & 1) ^ (1&(this.shift >> this.shiftbit));
                this.shift = (this.shift >> 1) | (feedback << 14);
                this.currentbit = (this.shift & 1) ^ 1;
                this.calcMasterVol();
            }   
        },

        writeLength(val) {
            if (!this.enabled)
                return;

            this.length = apu.lengthtable[val];
            this.lengthplaying = 0|(this.length !== 0);
            this.calcMasterVol();
        },
        updateLength() {
            if (this.lengthhalt === false && this.length !== 0) {
                this.length--;
                this.lengthplaying = 0|(this.length !== 0);
                this.calcMasterVol();
            }
        },

        updateEnvelope() {
            if (this.volstart) {
                this.volstart = false;
                this.envvol = 15;
                this.volperiod = this.volreload;

                // If using envelope mode, update vol
                if (this.constantvol === false) {
                    this.vol = this.envvol;
                    this.calcMasterVol();
                }
            }
            // Divider
            else if (this.volperiod === 0) {
                this.volperiod = this.volreload;

                if (this.envvol !== 0) {
                    this.envvol--;
                }
                else if (this.loopvol) {
                    this.envvol = 15;
                }

                // If using envelope mode, update vol
                if (this.constantvol === false) {
                    this.vol = this.envvol;
                    this.calcMasterVol();
                }
            }
            else {
                this.volperiod--;
            }
        },

        enable() {
            this.enabled = true;
        },
        silence() {
            this.enabled = false;

            this.length = 0;
            this.lengthplaying = 0;
            this.calcMasterVol();
        },

        calcMasterVol() {
            this.mastervol = this.vol * this.lengthplaying * this.currentbit;
        },
        getSample() {
            return this.mastervol;
        }
    };

    // DMC

    // =============== // General Registers //
    this.othercycle = false;

    // =============== // Frame Counter //

    this.fcmode = false; // false = 4, true = 5
    this.fctick = 0;
    this.fcsteptick = 0;
    this.fcinterval = 0;
    this.fcgensignal = 0;
    this.fcIrqEnabled = false;

    this.quarterFrame = function() {
        this.sq1.updateEnvelope();
        this.sq2.updateEnvelope();
        this.tri.updateLinear();
        this.noi.updateEnvelope();
    };
    this.halfFrame = function() {
        this.sq1.updateSweep();
        this.sq1.updateLength();
        this.sq2.updateSweep();
        this.sq2.updateLength();
        this.tri.updateLength();
        this.noi.updateLength();
    };
    this.updateFc = function() {
        // Step interval
        if (this.fcmode) {
            // 5 steps
            switch (this.fcsteptick++) {
                case 3728: {
                    this.quarterFrame();
                    break;
                }
                case 7456: {
                    this.quarterFrame();
                    this.halfFrame();
                    break;
                }
                case 11185: {
                    this.quarterFrame();
                    //this.halfFrame();
                    break;
                }
                case 18640: {
                    this.quarterFrame();
                    this.halfFrame();
                    break;
                }
                case 18641: {
                    // (set some inhibit flag ?)
                    this.fcsteptick = 0;
                }
            }
        }
        else {
            // 4 steps
            switch (this.fcsteptick++) {
                case 3728: {
                    this.quarterFrame();
                    break;
                }
                case 7456: {
                    this.quarterFrame();
                    this.halfFrame();
                    break;
                }
                case 11185: {
                    this.quarterFrame();
                    break;
                }
                case 14914: {
                    this.quarterFrame();
                    this.halfFrame();
                    break;
                }
                case 14915: {
                    // (set some inhibit flag ?)
                    this.fcsteptick = 0;
                }
            }
        }

        // Generating quarter and half signal after write to 4017 (when mode enabled)
        if (this.fcgensignal !== 0) {
            this.fcgensignal--;
            if (this.fcgensignal === 0) {
                this.quarterFrame();
                this.halfFrame();
            }
        }

        // IRQ interval
        if (this.fctick++ >= this.fcinterval) {
            this.fctick = 0;

            if (this.fcIrqEnabled) {
                //nes.cpu.requestIrq(); // FIXME :|
            }
        }
    };

    this.calcFcIntervals = function() {
        this.fcinterval = 0|(nes.cpu.cyclesPerSec / (nes.pal ? 50 : 60)); // https://tenor.com/view/shocked-wow-omg-ahh-dog-gif-15027818
    };
    
    // =============== // Execution //
    this.execute = function() {
        // Update square, noise, DMC, Frame Counter
        this.othercycle = !this.othercycle;
        if (this.othercycle === true) {
            this.sq1.updateFreq();
            this.sq2.updateFreq();
            this.noi.updateFreq();

            this.updateFc();
        }
        // Update triangle
        this.tri.updateFreq();

        // Buffering
        this.buffTick += 1;
        if (this.buffTick >= this.buffInterval) {
            this.buffTick -= this.buffInterval;
            this.stepBuffer();
        }
    };

    // =============== // Reset //
    this.reset = function() {
        // Buffering
        this.currentBuff = 0;
        this.buffStep = 0; // which buffer sample we on
        this.buffTick = 0; // used to keep track how often we should step buffer
        // this.silenceBufferPlayback()

        // Channels
        this.noi.shift = 0x7ff;
        //this.noi.currentbit =;

        // Registers
        this.othercycle = false;

        // Frame counter
        this.fctick = 0;
        this.fcsteptick = 0;
    };
}

export default Apu;