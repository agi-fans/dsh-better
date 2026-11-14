// The desk the window sits on, and the one camera. Scenes stage both; none redraws them.
window.W = {
  // The room: one cool light from above, the dark closing at the edges, hand-drawn measure ticks up the left edge.
  desk(kit) {
    return '<div class="ground"></div><div class="desk-light"></div><div class="desk-ticks"></div><div class="desk-vig"></div>';
  },
  // The camera: put the stage point (cx, cy) at the frame's centre, scaled by z.
  cam(el, cx, cy, z) {
    el.style.transform = 'translate(' + (960 - cx * z).toFixed(2) + 'px,' + (540 - cy * z).toFixed(2) + 'px) scale(' + z.toFixed(4) + ')';
  },
  // A hairline that draws itself on from a to b, in stage px.
  rule(t, t0, dur, x1, y1, x2, y2, cls) {
    const k = kit.clamp01((t - t0) / dur), x = x1 + (x2 - x1) * k, y = y1 + (y2 - y1) * k;
    return '<line class="' + cls + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>';
  },
};
