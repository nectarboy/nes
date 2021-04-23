import NES from './core/nes.js';

// Elements
const HTML_canvas = document.getElementById('canvas');
const HTML_file = document.getElementById('file');

// NES
const nes = new NES();
// default settings
nes.attachCanvas(HTML_canvas);

function startNES(romBuff) {
    // romBuff can be a Uint8Array buffer or any array contaning raw data
    // ...
}

// File Event
HTML_file.onchange = function(e) {
    var file = e.target.files[0];
    readFile(file);
};

function readFile(file) {
    if (!file)
        throw 'excuse me .. come back when ur making sense';

    var reader = new FileReader();
    reader.onload = function() {
        startNES(reader.result);
    };

    reader.readAsArrayBuffer(file);
}

console.log(nes);