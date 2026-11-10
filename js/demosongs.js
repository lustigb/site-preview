// Little tunes that play when you change sound with the E letter. One per sound, each in a style that suits it; the drum kits just step through their eight drums.
// Used by the home page and the Instrument Lab, which each pass in the tools below (see demoTools in homeeggs.js and lab.js).
(function () {
  // Strings: strum patterns over chord numbers. The chord numbers are spots on the chord strip, so the tune follows whichever key is selected.
  const strums = (bars, hits) => bars.flatMap(([at, chord]) => hits.map(([beat, dir, v]) => [at + beat, chord, dir, v]));
  const roll = (at, chord, list) => list.map((k, i) => [at + i / 2, chord, [k], i % 4 === 0 ? 0.55 : 0.42]);
  const walk = (at, chord) => [[at, chord, 0, 0.75], [at + 0.75, chord, 7, 0.55], [at + 1, chord, 12, 0.65], [at + 1.5, chord, 10, 0.5]];
  const FORWARD = [3, 4, 5, 1, 3, 5, 1, 5];

  const SONGS = {
    // Keyboards: [beat, scale degree or several at once, length in beats, level]. Degree 0 is the key's home note, 7 an octave up, -7 an octave down.
    Piano: { bpm: 168, gain: 0.7, notes: [[0, [-7, 2], 0.5, 0.55], [0.5, [-3, 4], 0.5, 0.4], [1, [-9, 5], 0.5, 0.55], [1.5, [-5, 4], 0.5, 0.4], [2, [-10, 1], 0.5, 0.55], [2.5, [-6, -1, 1], 0.5, 0.4], [3, [-7, -3, 0, 2, 7], 1.5, 0.48]] },   // a quick ballad turn
    'Electric piano': { bpm: 150, notes: [[0, [-6, 1, 3, 5, 7], 0.5, 0.4], [0.75, [1, 3, 5, 7], 0.25, 0.33], [1.5, [-10, -3, -1, 1, 3], 0.5, 0.4], [2.25, [-3, -1, 1, 3], 0.25, 0.33], [3, [-7, 0, 2, 4, 6], 1.5, 0.42]] },   // smooth, offbeat chords
    'Music box': { bpm: 240, notes: [[0, [0, 7], 1, 0.55], [1, 9, 1, 0.5], [2, 11, 1, 0.5], [3, [3, 10], 1, 0.55], [4, 12, 1, 0.5], [5, [0, 14], 1.5, 0.55]] },   // a scrap of waltz, up high
    'Warm organ': { bpm: 120, notes: [[0, [-7, 0, 2, 4], 0.9, 0.3], [1, [-11, -4, 0, 5], 0.9, 0.3], [2, [-7, -3, 2, 7], 1.6, 0.32]] },   // just the amen

    // Strings: [beat, chord, 'd' (down) or 'u' (up) or a list of strings, level].
    Guitar: { bpm: 150, gap: 12, plucks: [...strums([[0, 0], [1, 1], [2, 2]], [[0, 'd', 0.5], [0.5, 'u', 0.3]]), [3, 0, 'd', 0.55]] },   // campfire strumming
    Banjo: { bpm: 170, gain: 0.9, gap: 10, plucks: [...roll(0, 0, FORWARD.slice(0, 4)), ...roll(2, 2, FORWARD.slice(0, 4)), [4, 0, 'd', 0.55]] },   // a rolling picking pattern
    Ukulele: { bpm: 170, gap: 10, plucks: [...strums([[0, 0], [1, 1], [2, 2]], [[0, 'd', 0.5], [0.33, 'd', 0.4], [0.66, 'u', 0.32]]), [3, 0, 'd', 0.55]] },   // an easy island strum
    Bass: { bpm: 150, gain: 0.8, bass: [[0, 0, 0, 0.75], [0.5, 0, 7, 0.55], [1, 0, 12, 0.65], [1.5, 0, 10, 0.5], [2, 2, 0, 0.7], [2.5, 2, 7, 0.55], [3, 0, 0, 0.8]] },   // a little walking line: [beat, chord, semitones above its root, level]
    Harp: { bpm: 150, gain: 1.4, gap: 50, plucks: [...[1, 2, 3, 4, 5, 6, 7, 8].map((k, i) => [i * 0.12, 0, [k], 0.42]), [1.25, 0, [8], 0.55], [1.5, 0, [6], 0.5], [1.75, 0, [5], 0.5], [2.25, 0, [1, 3, 5, 8], 0.5]] },   // a sweep up and an opening chord

    // Winds: [beat, note of the scale (1 = home), length in beats, 1 if it slides from the note before].
    'Pan pipes': { bpm: 170, breath: 0.6, blow: [[0, 3, 0.5], [0.5, 5, 0.5], [1, 6, 1], [2, 5, 0.5, 1], [2.5, 3, 0.5, 1], [3, 1, 1.25]] },
    Flute: { bpm: 190, breath: 0.6, blow: [[0, 3, 0.25], [0.25, 4, 0.25, 1], [0.5, 5, 0.5], [1, 6, 0.5], [1.5, 8, 1, 1], [2.5, 6, 0.25], [2.75, 5, 0.25, 1], [3, 3, 0.5, 1], [3.5, 1, 1]] },
    Trumpet: { bpm: 170, breath: 0.65, blow: [[0, 1, 0.2], [0.33, 1, 0.2], [0.66, 1, 0.2], [1, 5, 0.5], [1.66, 3, 0.2], [2, 8, 1.25]] },
    'French horn': { bpm: 150, breath: 0.6, blow: [[0, 1, 0.5], [0.5, 5, 1], [1.5, 6, 0.25, 1], [1.75, 5, 0.25, 1], [2, 3, 0.5, 1], [2.5, 1, 1.25]] },
    'Horn section': { bpm: 170, breath: 0.65, blow: [[0, 5, 0.2], [0.5, 5, 0.2], [1, 6, 0.3], [1.5, 5, 0.2], [2, 8, 1]] },
    Saxophone: { bpm: 130, breath: 0.6, blow: [[0, 5, 0.33], [0.33, 6, 0.33, 1], [0.66, 7, 0.66, 1], [1.33, 6, 0.33, 1], [1.66, 4, 0.33], [2, 3, 0.33, 1], [2.33, 1, 1, 1]] },
    Clarinet: { bpm: 170, breath: 0.6, blow: [[0, 1, 0.5], [0.5, 3, 0.5, 1], [1, 5, 0.5, 1], [1.5, 8, 0.5, 1], [2, 7, 0.25, 1], [2.25, 6, 0.25, 1], [2.5, 5, 0.5, 1], [3, 1, 1]] },

    // Theremin: [beat, semitones above A3, height (0 = loudest, 1 = silent)]. It holds each point, then slides to the next.
    Classic: { bpm: 180, glide: [[0, 0, 0.4], [0.75, 7, 0.25], [1.5, 12, 0.2], [2.25, 10, 0.3], [3, 3, 0.3], [4, 0, 0.8]] },   // spooky film swoops
    Warm: { bpm: 150, glide: [[0, 3, 0.4], [0.75, 7, 0.3], [1.5, 10, 0.3], [2.25, 7, 0.4], [3.25, 0, 0.8]] },   // a bit of lullaby
    Reed: { bpm: 180, glide: [[0, -5, 0.45], [0.5, 0, 0.3], [1, 3, 0.25], [1.5, 6, 0.2], [2, 7, 0.2], [3, 3, 0.3], [4, 0, 0.7]] },   // a bluesy wail

    // Fidget sounds are rhythms: [beat, shank, level, pitch if it's tuned].
    'Soft click': { bpm: 240, taps: [[0, 2, 0.7], [1.5, 6, 0.7], [3, 3, 0.7], [4, 5, 0.7], [5, 4, 0.6], [5.5, 7, 0.8]] },   // a clave pattern
    'Bubble wrap': { bpm: 160, taps: [0, 0.6, 1.1, 1.5, 1.8, 2.05, 2.25, 2.4, 2.55, 2.7, 3.6].map((t, i) => [t, ((i * 5) % 8) + 1, 0.7]) },   // popping faster and faster, then one you missed
    'Glass tink': { bpm: 300, taps: [0, 4, 7, 12, 7, 12].map((semi, i) => [i, ((semi % 8) + 8) % 8 + 1, 0.9, 0.7 * 2 ** (semi / 12)]) },   // a tune on tuned glasses
    'Finger snap': { bpm: 180, taps: [[0, 3, 0.6], [1, 5, 0.6], [1.66, 6, 0.4], [2, 3, 0.6], [3, 5, 0.7]] },   // snapping along, swung
    'Key switch': { bpm: 200, taps: [0, 0.25, 0.5, 0.7, 1.05, 1.2, 1.5, 1.7].map((t, i) => [t, ((i * 3) % 8) + 1, 0.55]).concat([[2.8, 4, 1]]) },   // a burst of typing and the return key
  };

  const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10];

  function play(name, mode, c) {
    const song = SONGS[name], wind = c.wind;
    if (mode === 'pads') { [1, 2, 3, 4, 5, 6, 7, 8].forEach((k, n) => c.later(n * 230, () => { wind.showPad(k); c.tone(0, 0.85, k); })); return; }
    if (!song) return;
    const ms = beats => beats * 60000 / song.bpm, gain = song.gain || 1;
    if (song.notes) {                                      // keyboards: the shown key goes down wherever the note falls in this octave
      const seven = c.scale.steps.length === 7 ? c.scale.steps : c.scale.steps.includes(4) ? MAJOR : MINOR;   // pentatonic and blues keys borrow their parent scale, so the harmony still works
      const semi = d => 12 * Math.floor(d / 7) + seven[((d % 7) + 7) % 7];
      const shownKey = s => { for (let k = 1; k <= 13; k += 1) { const off = 12 * Math.log2(c.keyHz(k) / c.scale.root) - s; if (Number.isFinite(off) && Math.abs(off - 12 * Math.round(off / 12)) < 0.2) return k; } return 0; };
      song.notes.forEach(([beat, degrees, len, v]) => c.later(ms(beat), () => [].concat(degrees).forEach(d => {
        const s = semi(d), k = shownKey(s);
        if (k) wind.showPress(k, Math.max(120, ms(len) * 0.8));
        const note = c.tone(c.scale.root * 2 ** (s / 12), v * gain, k || 1);
        if (c.sustained) c.later(ms(len), () => note?.release?.());
      })));
    } else if (song.plucks) {                              // strings: a strum is the strings one after another; down is low to high
      const all = Array.from({ length: c.count }, (_, i) => i + 1);
      song.plucks.forEach(([beat, chord, how, v]) => c.later(ms(beat), () => {
        const list = how === 'd' ? all : how === 'u' ? [...all].reverse() : how;
        list.forEach((k, i) => c.later(i * (song.gap || 16), () => { wind.vibrate(k - 1, 0.6); c.tone(c.chordHz(chord, k), v * gain, k); }));
      }));
    } else if (song.bass) {                                // bass: the chord's root low down, then notes above it
      song.bass.forEach(([beat, chord, up, v]) => c.later(ms(beat), () => {
        let root = Math.min(c.chordHz(chord, 1), c.chordHz(chord, 2));
        if (root > 100) root /= 2;
        const k = up ? 2 : 1;
        wind.vibrate(k - 1, 0.6);
        c.tone(root * 2 ** (up / 12), v * gain, k);
      }));
    } else if (song.blow) {                                // winds: one breath, with notes either tongued or slid into
      const stop = () => { c.stopBlow(); wind.showBlow(0); };
      c.hold(stop);
      song.blow.forEach(([beat, k, len, slur], i) => {
        c.later(ms(beat), () => { wind.showBlow(k, song.breath); if (slur) c.moveBlow(k, song.breath, true); else c.startBlow(k, song.breath); });
        const next = song.blow[i + 1];
        if (!next) c.later(ms(beat + len), () => { stop(); c.hold(null); });
        else if (!next[3]) c.later(ms(beat + len), () => c.stopBlow());
      });
    } else if (song.glide) {                               // theremin: hold each point a little, then slide to the next
      const toX = semi => Math.max(0, Math.min(1, Math.log2(220 * 2 ** (semi / 12) / 130.81) / c.range));
      const pts = song.glide, last = pts[pts.length - 1];
      const at = beat => {
        let i = 0;
        while (i < pts.length - 2 && beat >= pts[i + 1][0]) i += 1;
        const [a, sa, ya] = pts[i], [b, sb, yb] = pts[i + 1], f = Math.max(0, Math.min(1, ((beat - a) / (b - a) - 0.55) / 0.45));
        return [toX(sa + (sb - sa) * f), ya + (yb - ya) * f];
      };
      const stop = () => { c.stopTheremin(); wind.showTarget(toX(last[1]), last[2], false); };
      c.hold(stop);
      c.startTheremin(toX(pts[0][1]), pts[0][2]);
      wind.showTarget(toX(pts[0][1]), pts[0][2], true);
      const end = ms(last[0]);
      for (let t = 40; t < end; t += 40) c.later(t, () => { const [x, y] = at(t * song.bpm / 60000); wind.showTarget(x, y, true); c.moveTheremin(x, y); });
      c.later(end, () => { stop(); c.hold(null); });
    } else if (song.taps) {                                // fidget sounds: the shanks get a nudge on each one
      song.taps.forEach(([beat, k, v, pitch], i) => c.later(ms(beat), () => { wind.showBump(k, i % 2 ? -1 : 1); c.tone(0, v, k, pitch); }));
    }
  }

  window.DemoSongs = { play };
})();
