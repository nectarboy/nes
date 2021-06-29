const constants = {
    screen_width: 256,
    screen_height: 240,

    // NES clocks
    clocks_ntsc: 21441960,
    clocks_pal: 0, // ???
    ppuclocks_per_cpuclocks: 3,

    ppu_cyclesperframe: 89342,

    // iNES
    ines_headersize: 16,

    // mapper IDs
    mapper_nrom: 0,
};

export default constants;