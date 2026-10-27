(() => {
  const $ = (id) => document.getElementById(id);
  const canvas = $("fx");
  const ctx = canvas.getContext("2d");
  const aurora = $("aurora");
  const bgNeon = $("bgNeon");
  const bgStars = $("bgStars");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const AMBIENT = { fireflies: 36, snow: 70, petals: 26, leaves: 24, rain: 90, bubbles: 20 };
  const CLICK_KINDS = ["stardust", "confetti", "hearts"];
  const BODY_CLASS = { "gold-digits": "fx-gold", "glitch-digits": "fx-glitch", "rainbow-compass": "fx-rainbow" };
  const SPARK_COLORS = ["#ffb547", "#7cf5d0", "#eef0ff", "#ff9bb0"];
  const CONFETTI_COLORS = ["#ffb547", "#7cf5d0", "#ff6b8b", "#9fb0ff", "#f4ff7a", "#c59bff"];
  const LEAF_COLORS = ["#e8833a", "#d9572b", "#f2b544", "#b8562a"];

  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  let W = 0, H = 0, density = 1;
  let active = new Set();
  let parts = [];
  const cometTrail = [];
  const sparkTrail = [];
  let t = 0;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    density = W < 560 ? 0.5 : 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(kind, fresh) {
    const ph = rnd(0, 6.3);
    switch (kind) {
      case "fireflies":
        return { kind, x: rnd(0, W), y: rnd(0, H), vx: rnd(-0.2, 0.2), vy: rnd(-0.2, 0.2), r: rnd(1.2, 2.4), ph };
      case "snow":
        return { kind, x: rnd(0, W), y: fresh ? rnd(0, H) : rnd(-H, 0), vx: rnd(-0.3, 0.3), vy: rnd(0.4, 1.2), r: rnd(1, 2.6), ph };
      case "petals":
        return { kind, x: rnd(0, W), y: fresh ? rnd(0, H) : rnd(-H, 0), vx: rnd(0.3, 1), vy: rnd(0.6, 1.4), rot: rnd(0, 6.3), vr: rnd(-0.03, 0.03), s: rnd(5, 9), ph };
      case "leaves":
        return { kind, x: rnd(0, W), y: fresh ? rnd(0, H) : -20, vx: rnd(-0.5, 0.8), vy: rnd(0.8, 1.6), rot: rnd(0, 6.3), vr: rnd(-0.05, 0.05), s: rnd(6, 10), c: pick(LEAF_COLORS), ph };
      case "rain":
        return { kind, x: rnd(0, W), y: fresh ? rnd(0, H) : rnd(-H, 0), vy: rnd(10, 16), len: rnd(10, 20) };
      case "bubbles":
        return { kind, x: rnd(0, W), y: fresh ? rnd(0, H) : H + 30, vy: -rnd(0.3, 0.8), r: rnd(6, 16), ph };
    }
  }

  function glow(x, y, r, color, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function heart(x, y, s, alpha, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s / 10, s / 10);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.bezierCurveTo(-10, -4, -5, -12, 0, -5);
    ctx.bezierCurveTo(5, -12, 10, -4, 0, 3);
    ctx.fill();
    ctx.restore();
  }

  function burst(kind, x, y) {
    if (kind === "stardust") {
      for (let i = 0; i < 16; i++) {
        const a = (Math.PI * 2 * i) / 16 + rnd(-0.15, 0.15);
        const sp = rnd(0.8, 2.8);
        parts.push({ kind: "spark", x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, c: pick(SPARK_COLORS) });
      }
    } else if (kind === "confetti") {
      for (let i = 0; i < 26; i++) {
        const a = rnd(0, Math.PI * 2);
        const sp = rnd(2, 7);
        parts.push({ kind: "confetti", x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, rot: rnd(0, 6.3), vr: rnd(-0.3, 0.3), w: rnd(5, 9), h: rnd(3, 5), life: 1, c: pick(CONFETTI_COLORS) });
      }
    } else if (kind === "hearts") {
      parts.push({ kind: "heart", x, y, vy: -rnd(1.2, 2), vx: rnd(-0.4, 0.4), s: rnd(10, 16), life: 1, c: pick(["#ff6b8b", "#ff9bb0", "#ffb547"]) });
    }
  }

  function ensureCounts() {
    if (reduceMotion) {
      parts = parts.filter((p) => !AMBIENT[p.kind]);
      return;
    }
    for (const kind of Object.keys(AMBIENT)) {
      if (!active.has(kind)) continue;
      const have = parts.filter((p) => p.kind === kind).length;
      const target = Math.round(AMBIENT[kind] * density);
      for (let i = have; i < target; i++) parts.push(spawn(kind, true));
    }
    parts = parts.filter((p) => !AMBIENT[p.kind] || active.has(p.kind));
  }

  function updateAmbient(p) {
    if (p.kind === "fireflies") {
      p.x += p.vx + Math.sin(t + p.ph) * 0.25;
      p.y += p.vy + Math.cos(t * 0.8 + p.ph) * 0.25;
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
      const a = 0.5 + 0.5 * Math.sin(t * 2 + p.ph);
      glow(p.x, p.y, p.r * 7, "rgba(214, 255, 170, 0.9)", 0.35 * a + 0.1);
      ctx.globalAlpha = 0.5 + 0.5 * a;
      ctx.fillStyle = "#f4ffe0";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (p.kind === "snow") {
      p.x += p.vx + Math.sin(t + p.ph) * 0.3;
      p.y += p.vy;
      if (p.y > H + 10) Object.assign(p, spawn("snow", false));
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (p.kind === "petals" || p.kind === "leaves") {
      p.x += p.vx + Math.sin(t + p.ph) * 0.6;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y > H + 20) Object.assign(p, spawn(p.kind, false));
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = p.kind === "petals" ? "#ffb7c5" : p.c;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    } else if (p.kind === "rain") {
      p.y += p.vy;
      p.x += 1.5;
      if (p.y > H + 20) Object.assign(p, spawn("rain", false));
      ctx.strokeStyle = "rgba(159, 176, 255, 0.45)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 2, p.y - p.len);
      ctx.stroke();
    } else if (p.kind === "bubbles") {
      p.y += p.vy;
      p.x += Math.sin(t + p.ph) * 0.3;
      if (p.y < -30) Object.assign(p, spawn("bubbles", false));
      ctx.fillStyle = "rgba(200, 235, 255, 0.12)";
      ctx.strokeStyle = "rgba(200, 235, 255, 0.5)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  function step() {
    ctx.clearRect(0, 0, W, H);
    t += 0.016;
    ensureCounts();

    for (const p of parts) {
      if (AMBIENT[p.kind]) {
        updateAmbient(p);
      } else if (p.kind === "spark") {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.93;
        p.vy = p.vy * 0.93 + 0.03;
        p.life -= 0.022;
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.8 * p.life + 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (p.kind === "confetti") {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.vx *= 0.98;
        p.rot += p.vr;
        p.life -= 0.012;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        ctx.globalAlpha = 1;
      } else if (p.kind === "heart") {
        p.x += p.vx;
        p.y += p.vy;
        p.vy *= 0.98;
        p.life -= 0.018;
        heart(p.x, p.y, p.s, Math.max(p.life, 0), p.c);
      }
    }
    parts = parts.filter((p) => AMBIENT[p.kind] || p.life > 0);

    if (active.has("comet-trail") && cometTrail.length > 1) {
      for (let i = 1; i < cometTrail.length; i++) {
        const a = cometTrail[i - 1], b = cometTrail[i];
        ctx.strokeStyle = `rgba(159, 216, 255, ${b.life * 0.8})`;
        ctx.lineWidth = 3 * b.life + 0.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    for (let i = cometTrail.length - 1; i >= 0; i--) {
      cometTrail[i].life -= 0.035;
      if (cometTrail[i].life <= 0) cometTrail.splice(i, 1);
    }

    for (const s of sparkTrail) {
      ctx.globalAlpha = Math.max(s.life, 0);
      ctx.fillStyle = s.c;
      ctx.beginPath();
      ctx.arc(s.x, s.y + (1 - s.life) * 8, s.r * s.life + 0.3, 0, Math.PI * 2);
      ctx.fill();
      s.life -= 0.04;
    }
    ctx.globalAlpha = 1;
    for (let i = sparkTrail.length - 1; i >= 0; i--) {
      if (sparkTrail[i].life <= 0) sparkTrail.splice(i, 1);
    }

    requestAnimationFrame(step);
  }

  window.addEventListener("pointerdown", (e) => {
    for (const kind of CLICK_KINDS) {
      if (active.has(kind)) burst(kind, e.clientX, e.clientY);
    }
  });
  window.addEventListener("pointermove", (e) => {
    if (active.has("comet-trail")) {
      cometTrail.push({ x: e.clientX, y: e.clientY, life: 1 });
      if (cometTrail.length > 40) cometTrail.shift();
    }
    if (active.has("sparkle-trail") && Math.random() < 0.6) {
      sparkTrail.push({ x: e.clientX + rnd(-10, 10), y: e.clientY + rnd(-10, 10), life: 1, r: rnd(1.5, 3), c: pick(SPARK_COLORS) });
      if (sparkTrail.length > 120) sparkTrail.shift();
    }
  });
  window.addEventListener("resize", resize);

  resize();
  requestAnimationFrame(step);

  window.LostFx = {
    setActive(ids) {
      active = new Set(ids);
      aurora.hidden = !active.has("aurora");
      bgNeon.hidden = !active.has("neon-grid");
      bgStars.hidden = !active.has("starfield");
      for (const [id, cls] of Object.entries(BODY_CLASS)) {
        document.body.classList.toggle(cls, active.has(id));
      }
      if (!active.has("comet-trail")) cometTrail.length = 0;
    },
  };
})();
