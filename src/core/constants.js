const constants = {
    screen_width: 256,
    screen_height: 240,

    // NES clocks
    clocks_ntsc: 1789773, // TODO: check if accurate ~ // 1786840
    clocks_pal: 1662607, // ~

    ppu_cyclespervblank: 19 * 341,

    // iNES
    ines_headersize: 16,

    // mapper IDs
    mapper_nrom: 0,
};

export default constants;