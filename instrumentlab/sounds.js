// Every test sound for the shanks. To add one, add an entry to window.LAB_SOUNDS.
//   play(s) gets: s.ac (AudioContext), s.out (connect here), s.t (start time), s.k (which shank, 1..8), s.v (loudness 0..1),
//   s.p (a pitch factor: a little higher to the right, with a small random change on every hit),
//   and helpers s.tone(type, f0, f1, seconds, level) and s.burst(filter, hz, q, seconds, level).
//   s.egg(hit) plays a sound from egglab/eggsfx.js, e.g. s.egg({ kind: 'snap', v: 1, pitch: 1 }).
//   When a sound plays under Sway: trigger: 'touch' = only when two shank tips actually hit each other (the shanks then collide and push harder);
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
// fixed: the instrument's own sound, if it ignores the Sound list. controls: what the Interaction box shows (settings are kept per sound).
const ECHO = { id: 'echo', type: 'check', label: 'Room echo' };
window.LAB_INSTRUMENTS = [
  { name: 'Sway', note: 'move across the shanks', mode: 'wind', controls: [
      { id: 'trigger', type: 'radio', label: 'Sound plays', options: [['push', 'Once per push'], ['swing', 'Every swing as it dies down'], ['touch', 'Only when shank tips touch']] },
      ECHO,
      { id: 'stiff', type: 'check', label: 'Stiff at the top, whippy at the tip' },
      { id: 'gust', type: 'range', label: 'Push strength', min: 0.5, max: 4, step: 0.1 },
      { id: 'gap', type: 'range', label: 'Touch distance', min: 8, max: 50, step: 1, only: v => v.trigger === 'touch' },
  ] },
  { name: 'Piano', note: 'press and drag', mode: 'keys', controls: [ECHO, { id: 'dip', type: 'range', label: 'Key travel', min: 4, max: 40, step: 1 }],
    fixed: s => s.egg({ kind: 'piano', v: s.v, hz: 261.63 * 2 ** ([0, 2, 4, 5, 7, 9, 11, 12][s.k - 1] / 12) }) },
  { name: 'Theremin', note: 'not built yet', soon: true },
  { name: 'Organ', note: 'not built yet', soon: true },
  { name: 'Drums', note: 'not built yet', soon: true },
];
