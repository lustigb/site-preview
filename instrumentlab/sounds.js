// Every test sound for the shanks. To add one, add an entry to window.LAB_SOUNDS.
//   play(s) gets: s.ac (AudioContext), s.out (connect here), s.t (start time), s.k (which shank, 1..8), s.v (loudness 0..1),
//   s.p (a pitch factor: a little higher to the right, with a small random change on every hit),
//   and helpers s.tone(type, f0, f1, seconds, level) and s.burst(filter, hz, q, seconds, level).
//   s.egg(hit) plays a sound from egglab/eggsfx.js, e.g. s.egg({ kind: 'snap', v: 1, pitch: 1 }).
//   When a sound plays under Fidget: trigger: 'touch' = only when two shank tips actually hit each other (the shanks then collide and push harder);
//   trail: true = on every swing as a shank dies down; neither = once per push.
window.LAB_SOUNDS = [
  { group: 'Fidget', name: 'Soft click', trigger: 'touch', play: s => {
      s.burst('bandpass', 2600 * s.p, 1.5, 0.008, 0.6 * s.v);
      s.tone('sine', 900 * s.p, 500 * s.p, 0.012, 0.14 * s.v);
  } },
  { group: 'Fidget', name: 'Bubble wrap', trigger: 'touch', play: s => {
      s.burst('bandpass', 1400 * s.p, 1, 0.012, 0.8 * s.v);
      s.tone('sine', 380 * s.p, 180 * s.p, 0.03, 0.3 * s.v);
  } },
  { group: 'Fidget', name: 'Glass tink', trigger: 'touch', play: s => {
      s.tone('sine', 3200 * s.p, 3190 * s.p, 0.09, 0.14 * s.v);
      s.tone('sine', 8100 * s.p, 8080 * s.p, 0.04, 0.04 * s.v);
  } },
  { group: 'Fidget', name: 'Finger snap', trigger: 'touch', play: s => {
      s.burst('bandpass', 2200 * s.p, 2, 0.03, 0.9 * s.v);
      s.burst('highpass', 5000, 0.7, 0.012, 0.35 * s.v);
  } },
  { group: 'Fidget', name: 'Key switch', trigger: 'touch', play: s => {
      s.burst('highpass', 3000, 0.7, 0.006, 0.5 * s.v);
      s.tone('triangle', 250 * s.p, 120 * s.p, 0.025, 0.28 * s.v);
      s.burst('highpass', 3600, 0.7, 0.005, 0.2 * s.v, 0.04);   // and the little release
  } },
  { group: 'Tones', name: 'Chimes', trail: true, play: s => s.egg({ kind: 'chime', v: 0.25 * s.v, ring: 1.6, hz: [1047, 1175, 1319, 1568, 1760, 2093, 2349, 2637][s.k - 1] }) },
  { group: 'Tones', name: 'Harp', trail: true, play: s => s.egg({ kind: 'harp', v: 0.8 * s.v, hz: 523.25 * 2 ** ([0, 2, 4, 5, 7, 9, 11, 12][s.k - 1] / 12) }) },
  { group: 'Tones', name: 'Blips', trail: true, play: s => s.egg({ kind: 'blip', v: s.v, pitch: 2 ** ([0, 2, 4, 5, 7, 9, 11, 12][s.k - 1] / 12) }) },
];

// The ways to play. mode: how shankwind.js takes input ('wind' = sway with the mouse, 'keys' = press and drag across).
// sounds: its own list for the Sound box (otherwise LAB_SOUNDS). keys: a keyboard, so it uses the musical key (s.hz is the note for that shank). controls: what the Interaction box shows (settings are kept per sound).
const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10];
window.LAB_KEYS = [                                       // the same list as the home page (site/js/homeeggs.js)
  { name: 'C major', root: 261.63, steps: MAJOR }, { name: 'G major', root: 196.0, steps: MAJOR }, { name: 'F major', root: 174.61, steps: MAJOR }, { name: 'D major', root: 293.66, steps: MAJOR },
  { name: 'A minor', root: 220.0, steps: MINOR }, { name: 'E minor', root: 164.81, steps: MINOR },
  { name: 'C pentatonic', root: 261.63, steps: [0, 2, 4, 7, 9] }, { name: 'A minor pentatonic', root: 220.0, steps: [0, 3, 5, 7, 10] }, { name: 'A blues', root: 220.0, steps: [0, 3, 5, 6, 7, 10] },
];
// Chord sets for the strip, one per key. Same spot, same job in every major key: top row I IV V vi, bottom row ii iii, then two popular borrowed chords (the flat VII, and the major III).
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const parseChord = text => { const [, letter, accidental, minor] = text.match(/^([A-G])([#b]?)(m?)$/); return { name: text.replace('#', '♯').replace(/([A-G])b/, '$1♭'), root: (PC[letter] + (accidental === '#' ? 1 : accidental === 'b' ? 11 : 0)) % 12, minor: !!minor }; };
window.LAB_CHORD_SETS = [
  ['Key of C', 'C F G Am Dm Em Bb E'], ['Key of G', 'G C D Em Am Bm F B'], ['Key of D', 'D G A Bm Em F#m C F#'], ['Key of A', 'A D E F#m Bm C#m G C#'],
  ['Key of E', 'E A B C#m F#m G#m D G#'], ['Key of F', 'F Bb C Dm Gm Am Eb A'], ['A minor', 'Am Dm Em F C G E D'], ['E minor', 'Em Am Bm C G D B A'],
].map(([name, list]) => ({ name, chords: list.split(' ').map(parseChord) }));
const ECHO = { id: 'echo', type: 'check', label: 'Room echo' };
window.LAB_INSTRUMENTS = [
  { name: 'Fidget', note: 'move across the shanks', mode: 'wind', controls: [
      { id: 'trigger', type: 'radio', label: 'Sound plays', options: [['push', 'Once per push'], ['swing', 'Every swing as it dies down'], ['touch', 'Only when shank tips touch']] },
      ECHO,
      { id: 'stiff', type: 'check', label: 'Stiff at the top, whippy at the tip' },
      { id: 'gust', type: 'range', label: 'Push strength', min: 0.5, max: 4, step: 0.1 },
      { id: 'gap', type: 'range', label: 'Touch distance', min: 8, max: 50, step: 1, only: v => v.trigger === 'touch' },
  ] },
  { name: 'Piano', note: 'press and drag', mode: 'keys', keys: true, controls: [{ id: 'shape', type: 'check', label: 'Piano keyboard shape' }, { id: 'real', type: 'check', label: 'Real piano: move to the key', only: v => v.shape }, { id: 'dots', type: 'check', label: 'Dots on the notes in the key', only: v => v.shape && v.real }, ECHO, { id: 'dip', type: 'range', label: 'Key travel', min: 4, max: 40, step: 1 }], sounds: [
      { name: 'Piano', play: s => s.egg({ kind: 'piano', v: s.v, hz: s.hz }) },
      { name: 'Electric piano', play: s => s.egg({ kind: 'epiano', v: s.v, hz: s.hz }) },
      { name: 'Music box', play: s => s.egg({ kind: 'musicBox', v: s.v, hz: s.hz }) },
      { name: 'Warm organ', hold: true, play: s => s.egg({ kind: 'organ', v: s.v, hz: s.hz }) },   // hold: sounds until the key is let go
  ] },
  { name: 'Strings', note: 'pluck or strum', mode: 'strings', keys: true, controls: [
      { id: 'chords', type: 'check', label: 'Chord strip', only: v => v.canChord },
      { id: 'hover', type: 'check', label: 'Strum by moving the mouse' }, ECHO,
  ], sounds: [                                            // count: strings, in order low to high from the left; ring: how long they visibly shake; tunings: pressed through with C
      { name: 'Guitar', chords: true, count: 6, ring: 0.75, decay: 0.994, soft: 1, dur: 1.5, tunings: [
        { name: 'Standard', notes: [82.41, 110, 146.83, 196, 246.94, 329.63] }, { name: 'Drop D', notes: [73.42, 110, 146.83, 196, 246.94, 329.63] },
        { name: 'Open G', notes: [73.42, 98, 146.83, 196, 246.94, 293.66] }, { name: 'DADGAD', notes: [73.42, 110, 146.83, 196, 220, 293.66] },
      ] },
      { name: 'Bass', chords: true, rootOnly: true, count: 4, ring: 1.4, decay: 0.996, soft: 8, dur: 1.8, lp: 750, sub: 1.5, tunings: [
        { name: 'Standard', notes: [41.2, 55, 73.42, 98] }, { name: 'Drop D', notes: [36.71, 55, 73.42, 98] },
      ] },
      { name: 'Banjo', chords: true, drone: true, count: 5, ring: 0.5, decay: 0.985, soft: 0, dur: 1, tunings: [
        { name: 'Open G', notes: [392, 146.83, 196, 246.94, 293.66] }, { name: 'Double C', notes: [392, 130.81, 196, 261.63, 293.66] },
      ] },
      { name: 'Ukulele', chords: true, count: 4, ring: 0.7, decay: 0.992, soft: 1, dur: 1.2, tunings: [
        { name: 'Standard', notes: [392, 261.63, 329.63, 440] }, { name: 'Low G', notes: [196, 261.63, 329.63, 440] }, { name: 'D tuning', notes: [440, 293.66, 369.99, 493.88] },
      ] },
      { name: 'Harp', count: 8, ring: 1.6, decay: 0.998, soft: 3, dur: 2.4, tunings: window.LAB_KEYS.map(key => ({ name: key.name, notes: Array.from({ length: 8 }, (_, i) => key.root * 2 ** ((12 * Math.floor(i / key.steps.length) + key.steps[i % key.steps.length]) / 12)) })) },
  ].map(x => ({ ...x, play: s => s.egg({ kind: 'pluck', v: s.v, hz: s.hz, decay: x.decay, soft: x.soft, dur: x.dur, lp: x.lp, sub: x.sub }) })) },
  { name: 'Winds', note: 'press, hold and slide', mode: 'blow', keys: true, controls: [
      { id: 'vib', type: 'range', label: 'Vibrato', min: 0, max: 40, step: 1 }, ECHO,
  ], sounds: [                                            // parts: [wave, harmonic, level]; breath: how airy; bright: filter cutoff as a multiple of the note, opened by blowing harder; attack: seconds; octave: above or below the key
      { name: 'Pan pipes', key: 'A minor pentatonic', style: 'pipes', octave: 1, attack: 0.09, breath: 0.34, bright: 5, parts: [['sine', 1, 1], ['sine', 2, 0.12]] },
      { name: 'Flute', key: 'C pentatonic', style: 'tube', thick: 80, octave: 1, attack: 0.07, breath: 0.16, bright: 8, parts: [['sine', 1, 1], ['sine', 2, 0.22], ['sine', 3, 0.06]] },
      { name: 'Trumpet', key: 'C major', style: 'tube', thick: 100, valves: true, octave: 0, attack: 0.05, breath: 0.02, bright: 9, parts: [['sawtooth', 1, 0.6]] },
      { name: 'French horn', key: 'C major', style: 'tube', thick: 150, valves: true, octave: -1, attack: 0.1, breath: 0.01, bright: 3.5, parts: [['sawtooth', 1, 0.75], ['sine', 1, 0.4]] },
      { name: 'Horn section', key: 'C major', style: 'tube', thick: 130, valves: true, octave: 0, attack: 0.05, breath: 0.02, bright: 7, section: [0, 2, 4], parts: [['sawtooth', 1, 0.36]] },   // section: extra players, in scale steps above the melody
      { name: 'Saxophone', key: 'A blues', style: 'tube', thick: 170, octave: 0, attack: 0.05, breath: 0.05, bright: 6, parts: [['sawtooth', 1, 0.45], ['square', 1, 0.15]] },
      { name: 'Clarinet', key: 'A minor', style: 'tube', thick: 110, octave: 0, attack: 0.05, breath: 0.03, bright: 6, parts: [['square', 1, 0.55]] },
  ] },
  { name: 'Theremin', note: 'press and move on the grid', mode: 'pad', keys: true, controls: [
      { id: 'snap', type: 'check', label: 'Snap to the notes of the key', only: v => v.keyed },
      { id: 'guides', type: 'check', label: 'Show the note guide', only: v => v.keyed }, ECHO,
      { id: 'range', type: 'range', label: 'Range (octaves)', min: 1, max: 4, step: 0.5 },
      { id: 'vib', type: 'range', label: 'Vibrato', min: 0, max: 40, step: 1 },
  ], sounds: [
      { name: 'Classic', voice: [['sine', 1, 1], ['sine', 2, 0.15]] },
      { name: 'Warm', filter: 1100, voice: [['triangle', 1, 1], ['sine', 0.5, 0.25]] },
      { name: 'Reed', filter: 1900, voice: [['sawtooth', 1, 0.45], ['square', 2, 0.08]] },
  ] },
  { name: 'Drums', note: 'tap the pads', mode: 'pads', controls: [{ id: 'click', type: 'check', label: 'Metronome while looping' }, { id: 'bpm', type: 'range', label: 'Tempo (BPM)', min: 50, max: 220, step: 1 }, ECHO], sounds: ['Acoustic:acoustic', 'Rock:rock', 'Jazz brushes:jazz', 'Tight funk:funk', '808:808', 'Trap:trap', 'Disco:disco', 'Lo-fi:lofi', 'Hand drums:hand', 'Junkyard:junk', 'Chiptune:chip', 'Beatbox:beatbox'].map(text => {
      const [name, kit] = text.split(':');
      return { name, kit, play: s => s.egg({ kind: 'drum', v: s.v, kit, drum: ['kick', 'snare', 'hat', 'open', 'clap', 'tom', 'low', 'crash'][s.k - 1] }) };
  }) },
];
