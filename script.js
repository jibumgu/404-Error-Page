(() => {
  const $ = (id) => document.getElementById(id);

  const compass = $("compass");
  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  window.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; });
  function aim() {
    const r = compass.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const deg = Math.atan2(mx - cx, -(my - cy)) * 180 / Math.PI;
    compass.style.setProperty("--angle", deg + "deg");
    requestAnimationFrame(aim);
  }
  aim();

  const STATE_KEY = "lost-time:v2";
  const OFF_KEY = "lost-fx-off";
  const SAVE_EVERY = 5;

  const CATALOG = [
    { group: "파티클", items: [
      { id: "fireflies", name: "반딧불 파티클", price: 60, desc: "화면을 천천히 떠도는 빛 입자" },
      { id: "snow", name: "눈송이", price: 100, desc: "조용히 내리는 눈" },
      { id: "petals", name: "벚꽃잎", price: 120, desc: "바람에 흩날리는 꽃잎" },
      { id: "leaves", name: "단풍잎", price: 120, desc: "가을 바람에 떨어지는 잎" },
      { id: "rain", name: "빗방울", price: 150, desc: "잔잔하게 내리는 빗줄기" },
      { id: "bubbles", name: "비눗방울", price: 90, desc: "천천히 떠오르는 비눗방울" },
    ]},
    { group: "클릭 효과", items: [
      { id: "stardust", name: "별가루 클릭", price: 90, desc: "클릭할 때마다 별가루가 터져요" },
      { id: "confetti", name: "색종이 폭죽", price: 110, desc: "클릭하면 색종이가 튀어요" },
      { id: "hearts", name: "하트 클릭", price: 80, desc: "클릭한 자리에서 하트가 떠올라요" },
    ]},
    { group: "커서", items: [
      { id: "comet-trail", name: "혜성 커서", price: 150, desc: "커서가 지나간 자리에 빛이 남아요" },
      { id: "sparkle-trail", name: "반짝이 커서", price: 100, desc: "커서 주변에 반짝임이 흩어져요" },
    ]},
    { group: "배경", items: [
      { id: "aurora", name: "오로라 배경", price: 300, desc: "배경에서 오로라가 천천히 흘러요" },
      { id: "starfield", name: "별빛 배경", price: 180, desc: "배경의 별들이 반짝여요" },
      { id: "neon-grid", name: "네온 그리드", price: 200, desc: "배경에 네온 격자가 흘러요" },
    ]},
    { group: "테마", items: [
      { id: "rainbow-compass", name: "무지개 나침반", price: 200, desc: "나침반에 무지개 빛이 돌아요" },
      { id: "gold-digits", name: "황금 404", price: 250, desc: "404 숫자가 금빛으로 빛나요" },
      { id: "glitch-digits", name: "글리치 404", price: 220, desc: "404 숫자가 가끔 흔들려요" },
    ]},
  ];
  const ITEMS = new Map(CATALOG.flatMap((g) => g.items.map((i) => [i.id, i])));

  const shopEl = $("shop");
  const earnedEl = $("earned");
  const balanceEl = $("balance");
  const toastEl = $("toast");

  function readJson(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }
  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  const stored = readJson(STATE_KEY, null);
  const state = {
    earned: Number.isFinite(stored?.earned) ? stored.earned : 0,
    spent: Number.isFinite(stored?.spent) ? stored.spent : 0,
    purchases: Array.isArray(stored?.purchases) ? stored.purchases : [],
  };
  const offFx = new Set(readJson(OFF_KEY, []));

  const balance = () => state.earned - state.spent;
  const owned = (id) => state.purchases.some((p) => p.id === id);

  function save() {
    writeJson(STATE_KEY, state);
  }

  function fmt(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }
  function clock(ts) {
    const d = new Date(ts);
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  let lastBal = null;
  function flash(el) {
    el.classList.add("bump");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("bump"), 500);
  }

  function renderWallet() {
    const bal = balance();
    earnedEl.textContent = fmt(state.earned);
    balanceEl.textContent = fmt(bal);
    if (lastBal !== null && bal > lastBal) flash(balanceEl);
    lastBal = bal;
  }

  function buildShop() {
    shopEl.textContent = "";
    CATALOG.forEach((group) => {
      const section = document.createElement("div");
      section.className = "shop-group";
      const h = document.createElement("h3");
      h.textContent = group.group;
      const grid = document.createElement("div");
      grid.className = "shop-grid";
      group.items.forEach((item) => {
        const card = document.createElement("article");
        card.className = "item";
        const title = document.createElement("h4");
        title.textContent = item.name;
        const desc = document.createElement("p");
        desc.textContent = item.desc;
        const foot = document.createElement("div");
        foot.className = "item-foot";
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = `${item.price}초`;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "buy";
        btn.dataset.id = item.id;
        foot.append(tag, btn);
        card.append(title, desc, foot);
        grid.appendChild(card);
      });
      section.append(h, grid);
      shopEl.appendChild(section);
    });
  }

  function updateShop() {
    const bal = balance();
    shopEl.querySelectorAll("button[data-id]").forEach((btn) => {
      const item = ITEMS.get(btn.dataset.id);
      if (owned(item.id)) {
        const on = !offFx.has(item.id);
        btn.className = "buy " + (on ? "on" : "off");
        btn.textContent = on ? "켜짐 · 끄기" : "꺼짐 · 켜기";
        btn.disabled = false;
        return;
      }
      btn.className = "buy";
      const short = item.price - bal;
      btn.disabled = short > 0;
      btn.textContent = short > 0 ? `${short}초 더 필요` : "구매하기";
    });
  }

  function applyFx() {
    const ids = state.purchases.map((p) => p.id).filter((id) => !offFx.has(id));
    window.LostFx?.setActive(ids);
    updateShop();
  }

  function renderHistory() {
    const list = $("historyList");
    list.textContent = "";
    state.purchases.forEach((p) => {
      const item = ITEMS.get(p.id);
      if (!item) return;
      const li = document.createElement("li");
      const what = document.createElement("span");
      what.className = "what";
      const amount = document.createElement("b");
      amount.textContent = `${item.price}초`;
      what.append(amount, document.createTextNode(` → ${item.name} 구매`));
      const when = document.createElement("span");
      when.className = "when";
      when.textContent = clock(p.at);
      li.append(what, when);
      list.appendChild(li);
    });
    $("historyEmpty").hidden = state.purchases.length > 0;
  }

  function buy(id) {
    const item = ITEMS.get(id);
    if (balance() < item.price) {
      toast(`${item.price - balance()}초 더 머물러야 해요`);
      return;
    }
    state.spent += item.price;
    state.purchases.unshift({ id, at: Date.now() });
    offFx.delete(id);
    writeJson(OFF_KEY, [...offFx]);
    save();
    renderWallet();
    renderHistory();
    applyFx();
    toast(`${item.name}을(를) 구매했어요`);
  }

  function toggle(id) {
    if (offFx.has(id)) offFx.delete(id);
    else offFx.add(id);
    writeJson(OFF_KEY, [...offFx]);
    applyFx();
  }

  shopEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-id]");
    if (!btn || btn.disabled) return;
    if (owned(btn.dataset.id)) toggle(btn.dataset.id);
    else buy(btn.dataset.id);
  });

  function openEnding() {
    $("receiptDate").textContent = new Date().toLocaleDateString("ko-KR");
    $("rEarned").textContent = fmt(state.earned);
    $("rSpent").textContent = fmt(state.spent);
    $("rBalance").textContent = fmt(balance());
    const list = $("receiptList");
    list.textContent = "";
    state.purchases.slice(0, 10).forEach((p) => {
      const item = ITEMS.get(p.id);
      if (!item) return;
      const li = document.createElement("li");
      li.textContent = `${clock(p.at)} · ${item.name} (${item.price}초)`;
      list.appendChild(li);
    });
    $("receiptEmpty").hidden = state.purchases.length > 0;
    $("ending").hidden = false;
    $("ending").scrollTop = 0;
  }

  $("endingBtn").addEventListener("click", openEnding);
  $("stayBtn").addEventListener("click", () => { $("ending").hidden = true; });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") $("ending").hidden = true;
  });

  const home = $("home");
  const note = $("escapeNote");
  const notes = [
    "버튼이 도망가려고 할지도 몰라요",
    "아직도 쫓아오시네요 🏃",
    "좋아요, 이제 진짜 가셔도 돼요",
  ];
  const canHover = window.matchMedia("(hover: hover)").matches;
  let dodges = 0;
  home.addEventListener("mouseenter", () => {
    if (!canHover || dodges >= 3) return;
    dodges++;
    const dx = (Math.random() * 2 - 1) * 140;
    const dy = (Math.random() * 2 - 1) * 40;
    home.style.setProperty("--dx", dx + "px");
    home.style.setProperty("--dy", dy + "px");
    home.classList.add("dodge");
    note.textContent = notes[Math.min(dodges, notes.length - 1)];
  });

  let ticks = 0;
  setInterval(() => {
    if (!document.hidden) {
      state.earned++;
      ticks++;
      if (ticks % SAVE_EVERY === 0) save();
    }
    renderWallet();
    updateShop();
  }, 1000);
  window.addEventListener("pagehide", save);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) save();
  });

  buildShop();
  renderWallet();
  renderHistory();
  applyFx();
})();
