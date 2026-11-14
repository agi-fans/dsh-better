const { seg, lerp, eio, eo, clamp01 } = kit;

const PLACEHOLDER = '描述你想要构建的内容，/ 调用指令，@ 文件或对话';
const DRAFT = '/better 还有哪些功能可以优化？';
const L1 = '在 src/client/index.ts、prompts/brief.md 里找可优化的点，';
const L2 = '每条给出证据与验收条件。';
const PREVIEW = '我想知道这个仓库里的 @agi-fans/dsh-better 插件还有哪些功能可以优化。';
const STAGES = ['探索', '浮现', '深化', '打磨'];

// stage-space geometry
const COMP = { x: 135, y: 700, w: 1650, h: 210 };
const SLAB = { x: 190, w: 420, h: 74, ys: [400, 486, 572] };
const PLATE = { x: 1000, y: 420, w: 740, h: 260 };
const DOCK = { x: 156, y: 505, w: 1608, h: 177 };

kit.scene('film', {
  init(kit) {
    kit.css(kit.module('ui.css'));
    kit.css(kit.module('film.css'));
    const arrow = '<svg width="22" height="22" viewBox="0 0 20 20"><path d="M4 3l11 8-4.7.9L8.7 17z" fill="var(--second)" stroke="var(--ground)" stroke-width="1.3" stroke-linejoin="round"/></svg>';
    const send = '<svg width="30" height="30" viewBox="0 0 20 20"><path d="M10 16V5M10 5l-5 5M10 5l5 5" fill="none" stroke="var(--ground)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const g1 = ['read', 'grep', 'glob'].map((s) => '<span class="fm-tool"><i></i>' + s + '</span>').join('') +
      '<span class="fm-tool off"><i></i>write</span><span class="fm-tool off"><i></i>bash</span>';
    const g2 = ['glob **/*', 'grep tools.guard', 'read docs/DETAIL.md', 'read src/host/index.ts', 'read prompts/brief.md']
      .map((s) => '<span class="fm-tool"><i></i>' + s + '</span>').join('');
    const cells = Array.from({ length: 6 }, () => '<i class="fm-cell"></i>').join('');
    const stages = STAGES.map((s) => '<span class="fm-stage">' + s + '</span>').join('');

    kit.stage.append(kit.h('<div class="fm-root">' + W.desk(kit) +
      '<div class="fm-cam">' +
        '<div class="ui">' +
          '<div class="composer" style="top:600px">' +
            '<div class="comp-body fm-body"><div class="comp-ph fm-ph">' + PLACEHOLDER + '</div>' +
              '<div class="comp-line fm-typed" style="opacity:0"><span class="fm-typed-txt">' + DRAFT + '</span>' +
              '<span class="caret fm-caret"></span></div>' +
              '<div class="fm-pl"><div class="fm-l1"></div><div class="fm-l2"></div></div></div>' +
            '<div class="comp-bar"><span class="plus">+</span>' +
              '<span class="mode"><i class="ws"></i>工作区内修改<i class="chev"></i></span>' +
              '<span class="fm-run">' +
                '<span class="pill pill-run fm-pill" style="opacity:0"><i class="pill-dot"></i>深化 <span class="fm-pillclock">0:31</span></span>' +
                '<span class="pill fm-restore" style="opacity:0">还原原稿</span>' +
              '</span>' +
              '<span class="model">DeepSeek-V4.1-Flash</span>' +
              '<span class="send fm-send">' + send + '</span>' +
            '</div></div>' +
          '<div class="toast fm-toast" style="opacity:0"><i></i>提示词已深化并填入下方输入框，审阅后按 Enter 发送。</div>' +
          '<div class="fm-cur">' + arrow + '</div>' +
          '<div class="fm-ring"></div>' +
        '</div>' +

        '<div class="fm-diagram"><svg class="fm-art" viewBox="0 0 1920 1080">' +
          '<path class="fm-feed" d="M610 437 H790" pathLength="1" style="fill:none;stroke:color-mix(in srgb,var(--main) 62%,transparent);stroke-width:2"/>' +
          '<path class="fm-dash" d="M790 437 L790 402 Q790 378 816 378 H1700" style="fill:none;stroke:color-mix(in srgb,var(--second) 30%,transparent);stroke-width:1.6;stroke-dasharray:7 10"/>' +
          '<path class="fm-branch" d="M790 437 L790 470 Q790 500 825 500 H986" pathLength="1" style="fill:none;stroke:var(--main);stroke-width:2.4"/>' +
          '<path class="fm-arrow" d="M972 490 L990 500 L972 510" pathLength="1" style="fill:none;stroke:var(--main);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round"/>' +
        '</svg>' +
        '<div class="fm-lab fm-lab-a">已完成轮次</div>' +
        '<div class="fm-lab fm-lab-b">主对话照常</div>' +

        '<div class="fm-slab" style="top:400px"><div class="fm-bar" style="top:16px;width:68%"></div><div class="fm-bar" style="top:32px;width:44%"></div><span class="fm-tag">turn/end</span></div>' +
        '<div class="fm-slab fm-s2" style="top:486px"><div class="fm-bar" style="top:16px;width:74%"></div><div class="fm-bar" style="top:32px;width:52%"></div></div>' +
        '<div class="fm-slab fm-s3" style="top:572px"><div class="fm-bar" style="top:16px;width:58%"></div><div class="fm-bar" style="top:32px;width:38%"></div></div></div>' +

        '<div class="fm-lift">' + DRAFT + '</div>' +

        '<div class="fm-plate">' +
          '<div class="fm-plate-c">' +
            '<div class="fm-lock"></div><div class="fm-ptitle">只读助手</div><div class="fm-psub">fork · completed turns</div>' +
            '<div class="fm-kv"><span>KV 缓存复用</span><span class="fm-tick"></span><span class="fm-tick"></span><span class="fm-tick"></span>' +
              '<span class="fm-kvnote">工具声明不变</span></div>' +
            '<div class="fm-back"><span>回填到输入框</span><span class="fm-backarrow">→</span></div>' +
          '</div>' +
          '<div class="fm-dock-c">' +
            '<div class="fm-drow"><span class="fm-badge"><span class="fm-spin"></span>/better</span>' +
              '<span class="fm-meter">' + cells + '</span><span class="fm-stages">' + stages + '</span></div>' +
            '<div class="fm-dright"><span class="fm-mchip">deepseek-account/deepseek-flash</span><span class="fm-esc">设置</span>' +
              '<span class="fm-clock">0:12</span><span class="fm-esc">Esc · 取消</span></div>' +
            '<div class="fm-draft">正在深化：“还有哪些功能可以优化？”</div>' +
            '<div class="fm-gen"></div>' +
            '<div class="fm-prev"></div>' +
          '</div>' +
          '<div class="fm-tools"><div class="fm-g1">' + g1 + '</div><div class="fm-g2">' + g2 + '</div></div>' +
        '</div>' +
      '</div>' +

      '<div class="words fm-w1"><h1 class="title">先有一句草稿</h1><p class="sub">问题有了，依据还没有</p></div>' +
      '<div class="words fm-w2"><h1 class="title">后台叉出一位只读助手</h1><p class="sub">不动文件，不动历史，缓存照用</p></div>' +
      '<div class="words fm-w3"><h1 class="title">四步深化</h1><p class="sub">每一步都踩在真实代码上</p></div>' +
      '<div class="words fm-w4"><h1 class="title">回填草稿</h1><p class="sub">有文件，有验收，可还原</p></div>' +

      '<div class="fm-ec"><div style="height:352px"></div>' +
        '<svg class="fm-mark" width="92" height="92" viewBox="0 0 36 36" fill="none">' +
          '<rect x="2" y="2" width="32" height="32" rx="9" fill="#1E293B"/>' +
          '<rect x="2.75" y="2.75" width="30.5" height="30.5" rx="8.25" stroke="#475569" stroke-width="1.5"/>' +
          '<path class="fm-dia" d="M18 7L27 12L18 17L9 12L18 7Z" fill="#60A5FA"/>' +
          '<path class="fm-c1" d="M9 16.5L18 21.5L27 16.5" pathLength="1" stroke="#93C5FD" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<path class="fm-c2" d="M9 21.5L18 26.5L27 21.5" pathLength="1" stroke="#38BDF8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<circle class="fm-dot" cx="27.5" cy="9.5" r="2.5" fill="#34D399"/>' +
        '</svg>' +
        '<div class="fm-name">dsh-better</div><div class="fm-line">让草稿踩在真实代码上</div>' +
        '<div class="fm-by">agi-fans · DeepSeek Harness 插件</div>' +
      '</div>' +
      '</div>'));
    const q = (s) => kit.stage.querySelector(s);
    const qa = (s) => kit.stage.querySelectorAll(s);
    Object.assign(this, {
      cam: q('.fm-cam'), ui: q('.fm-cam > .ui'), diag: q('.fm-diagram'), typed: q('.fm-typed'), caret: q('.fm-caret'), ph: q('.fm-ph'),
      pl: q('.fm-pl'), l1: q('.fm-l1'), l2: q('.fm-l2'), send: q('.fm-send'), cur: q('.fm-cur'), ring: q('.fm-ring'),
      restore: q('.fm-restore'), pill: q('.fm-pill'), pclock: q('.fm-pillclock'), toast: q('.fm-toast'),
      lift: q('.fm-lift'), slabs: qa('.fm-slab'), s2: q('.fm-s2'), s3: q('.fm-s3'),
      feed: q('.fm-feed'), dash: q('.fm-dash'), branch: q('.fm-branch'), arw: q('.fm-arrow'),
      laba: q('.fm-lab-a'), labb: q('.fm-lab-b'),
      plate: q('.fm-plate'), platec: q('.fm-plate-c'), dockc: q('.fm-dock-c'),
      ptitle: q('.fm-ptitle'), psub: q('.fm-psub'), kv: q('.fm-kv'), back: q('.fm-back'), lock: q('.fm-lock'),
      tools: q('.fm-tools'), g1: q('.fm-g1'), g2: q('.fm-g2'), struck: qa('.fm-tool.off'),
      badge: q('.fm-badge'), spin: q('.fm-spin'), cells: qa('.fm-cell'), stages: qa('.fm-stage'),
      dright: q('.fm-dright'), draft: q('.fm-draft'), prev: q('.fm-prev'), gen: q('.fm-gen'), clock: q('.fm-clock'),
      w1: q('.fm-w1'), w2: q('.fm-w2'), w3: q('.fm-w3'), w4: q('.fm-w4'),
      ec: q('.fm-ec'), dia: q('.fm-dia'), c1: q('.fm-c1'), c2: q('.fm-c2'), dot: q('.fm-dot'),
    });
  },

  render(t) {
    const cam = (z, cx, cy) => W.cam(this.cam, cx, cy, z);
    const rect = (el, x, y, w, h) => {
      el.style.left = x.toFixed(1) + 'px'; el.style.top = y.toFixed(1) + 'px';
      el.style.width = w.toFixed(1) + 'px'; el.style.height = h.toFixed(1) + 'px';
    };

    /* ---------- camera: one continuous move, never a cut ---------- */
    const K = [
      { t: 0, z: 1.0, cx: 960, cy: 620 },
      { t: 2.4, z: 1.02, cx: 960, cy: 580 },
      { t: 4.2, z: 1.05, cx: 960, cy: 545 },
      { t: 5.4, z: 1.08, cx: 960, cy: 558 },
      { t: 6.35, z: 1.1, cx: 952, cy: 562 },
      { t: 7.25, z: 1.45, cx: 520, cy: 585 },
      { t: 8.1, z: 1.5, cx: 520, cy: 600 },
      { t: 9.0, z: 1.14, cx: 930, cy: 655 },
      { t: 10.2, z: 1.02, cx: 960, cy: 720 },
      { t: 14.2, z: 1.0, cx: 960, cy: 735 },
      { t: 15.6, z: 0.955, cx: 960, cy: 655 },
      { t: 17.2, z: 0.94, cx: 960, cy: 710 },
      { t: 20, z: 0.95, cx: 960, cy: 688 },
    ];
    let i = 0;
    while (i < K.length - 2 && t > K[i + 1].t) i++;
    const a = K[i], b = K[i + 1], k = eio(seg(t, a.t, b.t));
    cam(lerp(a.z, b.z, k), lerp(a.cx, b.cx, k), lerp(a.cy, b.cy, k));

    /* ---------- A. the draft, then it lifts out (0 – 2.6) ---------- */
    this.typed.style.opacity = t < 1.12 ? 1 : Math.max(0, 1 - eo(seg(t, 1.12, 1.3)));
    this.caret.style.opacity = t < 1.1 ? (Math.floor(t / 0.53) % 2 ? 0.12 : 1) : 0;
    this.cur.style.opacity = t < 1.4 ? 1 : 0;
    this.cur.style.transform = 'translate(' + lerp(-140, -18, eio(seg(t, 0.35, 0.92))).toFixed(1) + 'px,' +
      lerp(-90, -10, eio(seg(t, 0.35, 0.92))).toFixed(1) + 'px)';
    const dip = 1 - 0.08 * Math.sin(Math.PI * seg(t, 0.94, 1.2));
    this.send.style.transform = 'scale(' + dip.toFixed(3) + ')';
    const rk = seg(t, 0.94, 1.46);
    this.ring.style.opacity = rk > 0 && rk < 1 ? (1 - rk) * 0.85 : 0;
    this.ring.style.transform = 'scale(' + lerp(0.35, 1.5, eio(rk)).toFixed(3) + ')';

    // the line leaves the composer and settles as the first finished turn
    const lift = eio(seg(t, 1.2, 2.1));
    this.lift.style.opacity = t < 1.16 ? 0 : (1 - eo(seg(t, 1.88, 2.04))).toFixed(3);
    this.lift.style.left = lerp(COMP.x + 33, SLAB.x, lift).toFixed(1) + 'px';
    this.lift.style.top = lerp(COMP.y + 30, SLAB.ys[0] + 20, lift).toFixed(1) + 'px';
    this.lift.style.fontSize = lerp(27, 20, lift).toFixed(1) + 'px';
    this.lift.style.letterSpacing = lerp(0, 0.02, lift).toFixed(3) + 'em';

    const s1k = eio(seg(t, 1.98, 2.2));
    this.slabs[0].style.opacity = s1k.toFixed(3);
    this.s2.style.opacity = eio(seg(t, 2.16, 2.5)).toFixed(3);
    this.s3.style.opacity = eio(seg(t, 2.3, 2.64)).toFixed(3);
    this.s2.style.transform = 'translateY(' + lerp(20, 0, eio(seg(t, 2.16, 2.56))).toFixed(1) + 'px)';
    this.s3.style.transform = 'translateY(' + lerp(20, 0, eio(seg(t, 2.3, 2.7))).toFixed(1) + 'px)';
    this.laba.style.opacity = eo(seg(t, 2.5, 2.9)).toFixed(3);

    /* ---------- B. the fork, then the helper plate (2.3 – 4.8) ---------- */
    this.feed.style.strokeDasharray = '1 1';
    this.feed.style.strokeDashoffset = (1 - eio(seg(t, 2.46, 2.76))).toFixed(4);
    this.dash.style.opacity = (0.85 * eo(seg(t, 2.6, 3.2))).toFixed(3);
    this.branch.style.strokeDasharray = '1 1';
    this.branch.style.strokeDashoffset = (1 - eio(seg(t, 2.66, 3.06))).toFixed(4);
    this.arw.style.strokeDasharray = '1 1';
    this.arw.style.strokeDashoffset = (1 - eio(seg(t, 3.0, 3.16))).toFixed(4);
    this.labb.style.opacity = eo(seg(t, 3.1, 3.5)).toFixed(3);

    // the panel is born a helper: read-only, cached, and closed
    const pk = eio(seg(t, 2.98, 3.42));
    rect(this.plate, PLATE.x, PLATE.y, PLATE.w, PLATE.h);
    this.plate.style.borderRadius = '14px';
    const plateC = eo(seg(t, 3.02, 3.3)) * (1 - eo(seg(t, 4.58, 4.92)));
    this.platec.style.opacity = plateC.toFixed(3);
    this.lock.style.transform = 'scale(' + eio(seg(t, 3.06, 3.4)).toFixed(3) + ')';
    this.kv.style.opacity = (eio(seg(t, 3.18, 3.62)) * (1 - eo(seg(t, 4.58, 4.92)))).toFixed(3);
    this.kv.style.transform = 'translateX(' + lerp(-50, 0, eio(seg(t, 3.18, 3.62))).toFixed(1) + 'px)';
    this.back.style.opacity = (eo(seg(t, 3.5, 3.84)) * (1 - eo(seg(t, 4.58, 4.92)))).toFixed(3);

    this.tools.style.left = '24px';
    this.tools.style.top = '128px';
    this.g1.style.opacity = eo(seg(t, 3.16, 3.44)).toFixed(3);
    this.struck.forEach((el) => { el.style.opacity = (0.42 * eo(seg(t, 3.56, 3.86))).toFixed(3); });

    /* ---------- the drawing gives way to the panel ---------- */
    this.diag.style.opacity = (1 - eo(seg(t, 4.55, 5.0))).toFixed(3);

    /* ---------- C. the plate becomes the Depth dock (4.5 – 5.6) ---------- */
    const m = eio(seg(t, 4.5, 5.5));
    const x = lerp(PLATE.x, DOCK.x, m), y = lerp(PLATE.y, DOCK.y, m);
    const w = lerp(PLATE.w, DOCK.w, m), h = lerp(PLATE.h, DOCK.h, m);
    rect(this.plate, x, y, w, h);
    this.lock.style.opacity = (1 - eo(seg(t, 4.58, 4.9))).toFixed(3);
    // the dock's rows come in while the helper's are still leaving: the panel is never empty
    this.dockc.style.opacity = eo(seg(t, 4.62, 5.0)).toFixed(3);
    this.tools.style.left = lerp(24, 18, m).toFixed(1) + 'px';
    this.tools.style.top = lerp(128, 78, m).toFixed(1) + 'px';
    this.g1.style.opacity = (eo(seg(t, 3.16, 3.44)) * (1 - eo(seg(t, 4.5, 4.76)))).toFixed(3);
    this.g2.style.opacity = eo(seg(t, 4.72, 5.04)).toFixed(3);
    this.struck.forEach((el) => {
      el.style.opacity = (0.42 * eo(seg(t, 3.56, 3.86)) * (1 - eo(seg(t, 4.5, 4.72)))).toFixed(3);
    });
    this.badge.style.opacity = eo(seg(t, 4.7, 4.98)).toFixed(3);
    this.dright.style.opacity = eo(seg(t, 4.76, 5.06)).toFixed(3);
    this.draft.style.opacity = eo(seg(t, 4.82, 5.12)).toFixed(3);
    this.spin.style.transform = 'rotate(' + (t * 320) % 360 + 'deg)';

    /* ---------- the dock runs (5.6 – 8.6) ---------- */
    const filled = (t >= 5.5 ? 1 : 0) + (t >= 5.8 ? 1 : 0) + (t >= 6.4 ? 1 : 0) + (t >= 7.0 ? 1 : 0) + (t >= 7.5 ? 1 : 0) + (t >= 8.0 ? 1 : 0);
    this.cells.forEach((c, n) => {
      c.className = 'fm-cell' + (n < filled ? (t >= 8.4 ? ' done' : ' on') : '');
    });
    const act = t >= 8.0 ? 3 : t >= 7.5 ? 2 : t >= 6.4 ? 1 : t >= 5.5 ? 0 : -1;
    this.stages.forEach((el, n) => {
      el.className = 'fm-stage' + (n === act ? ' on' : n < act ? ' past' : '');
    });
    this.gen.textContent = '正在生成深化内容（' + Math.round(1240 * clamp01((t - 5.7) / 2.1) + 40) + ' 字）';
    this.gen.style.opacity = eo(seg(t, 5.66, 6.0)).toFixed(3);
    const chars = Math.floor(PREVIEW.length * clamp01((t - 5.9) / 1.7));
    this.prev.textContent = PREVIEW.slice(0, chars);
    this.prev.style.opacity = eo(seg(t, 5.86, 6.2)).toFixed(3);
    this.prev.style.borderColor = t > 8.3 ? 'color-mix(in srgb, var(--accent) 45%, transparent)' : 'transparent';
    const sec = t > 9.55 ? 31 : Math.min(31, Math.round(12 + Math.max(0, t - 5) * 3.4));
    const stamp = '0:' + (sec < 10 ? '0' + sec : sec);
    if (this.clock.textContent !== stamp) { this.clock.textContent = stamp; this.pclock.textContent = stamp; }

    /* ---------- D. the dock folds into the pill (8.6 – 9.6) ---------- */
    const fold = eio(seg(t, 8.6, 9.55));
    this.plate.style.opacity = (pk * (1 - eo(seg(t, 8.75, 9.35)))).toFixed(3);
    this.plate.style.transform = 'translate(' + (270 * fold).toFixed(1) + 'px,' +
      (lerp(26, 0, pk) + 352 * fold).toFixed(1) + 'px) scale(' + lerp(1, 0.07, fold).toFixed(4) + ')';
    this.plate.style.transformOrigin = '0 0';
    this.pill.style.opacity = (eo(seg(t, 9.32, 9.7)) * (1 - eo(seg(t, 11.02, 11.22)))).toFixed(3);
    this.pill.style.transform = 'translateY(' + lerp(8, 0, eio(seg(t, 9.32, 9.75))).toFixed(1) + 'px)';

    /* ---------- E. the grounded prompt lands (9.6 – 14.4) ---------- */
    const total = L1.length + L2.length;
    const n = Math.floor(total * clamp01((t - 9.72) / 1.25));
    this.l1.textContent = L1.slice(0, Math.min(n, L1.length));
    this.l2.textContent = L2.slice(0, Math.max(0, n - L1.length));
    this.pl.style.opacity = t > 9.68 ? 1 : 0;
    this.ph.style.opacity = (eo(seg(t, 1.2, 1.5)) * (1 - eo(seg(t, 9.68, 9.9)))).toFixed(3);
    this.restore.style.opacity = eo(seg(t, 11.08, 11.34)).toFixed(3);
    this.restore.style.transform = 'translateY(-50%) scale(' + lerp(0.9, 1, eio(seg(t, 11.08, 11.42))).toFixed(3) + ')';
    this.toast.style.opacity = (eo(seg(t, 11.4, 11.8)) * (1 - eo(seg(t, 13.4, 13.8)))).toFixed(3);

    /* ---------- F. the room dims and the film signs off (15 – 20) ---------- */
    this.ui.style.opacity = (1 - eio(seg(t, 14.9, 16.2))).toFixed(3);
    const ec = eio(seg(t, 15.2, 15.95));
    this.ec.style.opacity = ec.toFixed(3);
    this.ec.style.transform = 'translateY(' + lerp(18, 0, ec).toFixed(1) + 'px)';
    this.dia.style.opacity = eo(seg(t, 15.34, 15.7)).toFixed(3);
    this.c1.style.strokeDasharray = '1 1';
    this.c1.style.strokeDashoffset = (1 - eio(seg(t, 15.5, 15.9))).toFixed(3);
    this.c2.style.strokeDasharray = '1 1';
    this.c2.style.strokeDashoffset = (1 - eio(seg(t, 15.64, 16.04))).toFixed(3);
    const dk = eio(seg(t, 15.78, 16.14));
    this.dot.style.transform = 'scale(' + dk.toFixed(3) + ')';
    this.dot.style.transformOrigin = '27.5px 9.5px';

    /* ---------- the four titles ---------- */
    const title = (el, tin, tout) => {
      el.style.opacity = (eo(seg(t, tin, tin + 0.5)) * (1 - eo(seg(t, tout, tout + 0.4)))).toFixed(3);
      el.style.transform = 'translateY(' + lerp(20, 0, eio(seg(t, tin, tin + 0.7))).toFixed(1) + 'px)';
    };
    title(this.w1, 0.35, 2.5);
    title(this.w2, 2.75, 4.5);
    title(this.w3, 5.1, 7.1);
    title(this.w4, 9.85, 12.1);
  },
});
