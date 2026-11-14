kit.score(function (S, T) {
  // the track: generated for this cut, 84 bpm, starts on its first beat
  S.bed('depth-dock-a.mp3', { at: 0, offset: 0.15, dur: 20, gain: -4, fadeOut: 1.9 });

  // the film's own sound design stays on top of it
  S.fx('pop', 0.94, { vel: 0.5 });
  S.fx('whoosh', 1.24, { dur: 0.75, vel: 0.3 });
  S.fx('tick', 2.02, { vel: 0.42 });
  S.fx('tick', 2.2, { vel: 0.42 });
  S.fx('pop', 3.02, { vel: 0.45 });
  S.fx('tick', 3.62, { vel: 0.38 });
  S.fx('tick', 3.74, { vel: 0.38 });
  S.fx('whoosh', 4.55, { dur: 0.95, vel: 0.34 });
  S.fx('sparkle', 5.12, { vel: 0.4 });
  S.fx('tick', 5.5, { vel: 0.42 });
  S.fx('tick', 5.8, { vel: 0.42 });
  S.fx('tick', 6.4, { vel: 0.42 });
  S.fx('tick', 7.5, { vel: 0.42 });
  S.fx('tick', 8.0, { vel: 0.46 });
  S.fx('click', 5.36, { vel: 0.34 });
  S.fx('click', 5.6, { vel: 0.34 });
  S.fx('click', 5.74, { vel: 0.34 });
  S.fx('pop', 8.7, { vel: 0.44 });
  S.fx('pop', 9.4, { vel: 0.44 });
  S.fx('pop', 9.8, { vel: 0.48 });
  S.fx('ding', 11.05, { vel: 0.34 });
  S.fx('revswell', 14.9, { dur: 1.05, vel: 0.4 });
  S.fx('thud', 15.3, { vel: 0.34 });

  S.master({ gain: -2, fadeOut: 1.6 });
});
