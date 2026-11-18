/* JIKSAWSHOP — Official Rules · app
   โครงสร้าง: data (load/normalize) → render (components) → features (search, accordion, deep link, nav, fx) */
(function () {
  "use strict";
  var CFG = window.JIKSAW_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var ICON = {
    chev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/></svg>'
  };

  /* ═════════ DATA ═════════ */
  var KNOWN_SLUGS = { "กฎทั่วไป": "general", "กฎการขาย": "sales", "กฎการปาด": "pad", "กฎการโพสต์": "post", "กฎการปล่อยเช่า": "rent", "website": "website" };
  /* กันข้อมูลเข้าสู่ระบบหลุดขึ้นเว็บ เมื่อดึงจากชีตสด */
  var SENSITIVE = /[^\s@]+@[^\s@]+\.[^\s@]+|รหัสเข้า|รหัสผ่าน|password/i;

  function parseCSV(text) {
    var rows = [], row = [], cell = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  function fromCSV(text) {
    var rows = parseCSV(text).filter(function (r) { return r.some(function (c) { return c.trim() !== ""; }); });
    if (rows.length < 2) throw new Error("CSV ว่าง");
    var head = rows[0].map(function (h) { return h.trim(); });
    var ix = { cat: head.indexOf("หมวด"), no: head.indexOf("ลำดับ"), content: head.indexOf("รายละเอียด"), penalty: head.indexOf("โทษ/ปรับ"), note: head.indexOf("หมายเหตุ") };
    if (ix.cat < 0 || ix.content < 0) throw new Error("ไม่พบคอลัมน์ หมวด / รายละเอียด");
    var cats = [], byName = {}, rules = [], lastCat = "";
    rows.slice(1).forEach(function (r) {
      var name = (r[ix.cat] || "").trim() || lastCat; lastCat = name;
      var content = (r[ix.content] || "").trim();
      if (!name || !content || SENSITIVE.test(content)) return;
      if (!byName[name]) {
        var plain = name.replace(/^[^฀-๿A-Za-z]+/, "").trim().toLowerCase();
        byName[name] = { id: KNOWN_SLUGS[plain] || "cat-" + (cats.length + 1), order: cats.length + 1, name: name, description: null };
        cats.push(byName[name]);
      }
      var no = parseInt(r[ix.no], 10);
      rules.push({
        id: rules.length + 1, category_id: byName[name].id, rule_number: isNaN(no) ? null : no, title: null, content: content,
        penalty: ix.penalty >= 0 && r[ix.penalty] && r[ix.penalty].trim() || null,
        note: ix.note >= 0 && r[ix.note] && r[ix.note].trim() || null, created_at: null, updated_at: null
      });
    });
    if (!rules.length) throw new Error("ไม่มีแถวข้อมูล");
    return { categories: cats, rules: rules, synced_at: null, live: true };
  }

  function loadData() {
    var local = window.JIKSAW_RULES;
    if (!CFG.sheetCsvUrl) return Promise.resolve({ data: local });
    $("#loader").hidden = false;
    return fetch(CFG.sheetCsvUrl, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
      .then(function (t) { return { data: fromCSV(t) }; })
      .catch(function (e) {
        console.warn("[JIKSAW] โหลดข้อมูลสดไม่สำเร็จ ใช้ข้อมูลสำรอง:", e);
        return { data: local, fallback: true };
      });
  }

  /* ═════════ HELPERS ═════════ */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function hi(text, q) {
    var s = esc(text);
    if (!q) return s;
    var re = new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    return s.replace(re, function (m) { return "<mark>" + m + "</mark>"; });
  }
  /* เนื้อหากฎ: คงข้อความเดิมทุกตัวอักษร แค่ทำให้ URL กดได้ และไฮไลต์คำค้น */
  function rich(text, q) {
    return String(text).split(/(https?:\/\/[^\s]+)/g).map(function (part, i) {
      if (i % 2) return '<a href="' + esc(part) + '" target="_blank" rel="noopener">' + hi(part, q) + "</a>";
      return hi(part, q).replace(/\n/g, "<br>");
    }).join("");
  }
  var toastT;
  function toast(msg) {
    var t = $("#toast"); t.textContent = msg; t.classList.add("is-on");
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("is-on"); }, 2600);
  }

  /* ═════════ STATE ═════════ */
  var DATA, GROUPS = [], query = "";

  function build(data) {
    DATA = data;
    var seen = {};
    GROUPS = data.categories.slice().sort(function (a, b) { return a.order - b.order; }).map(function (c) {
      var rules = data.rules.filter(function (r) { return r.category_id === c.id; }).map(function (r, i) {
        var key = "rule-" + c.id + "-" + (r.rule_number != null ? pad(r.rule_number) : "x" + (i + 1));
        while (seen[key]) key += "b";
        seen[key] = 1;
        return Object.assign({}, r, {
          anchor: key, cat: c,
          hay: [r.rule_number != null ? "ข้อ " + r.rule_number : "", r.title, r.content, r.penalty, r.note, c.name].filter(Boolean).join(" \u0001 ").toLowerCase()
        });
      });
      return { cat: c, rules: rules };
    });
  }

  /* ═════════ RENDER ═════════ */
  function renderStatic() {
    var total = DATA.rules.length;
    $("#statCats").textContent = GROUPS.length;
    $("#statRules").textContent = total;
    var sync = DATA.live ? "ดึงสดจากชีต" : DATA.synced_at;
    if (sync) $("#statSync").textContent = sync; else $("#statSync").parentNode.hidden = true;

    $("#catGrid").innerHTML = GROUPS.map(function (g, i) {
      return '<button class="cat" type="button" data-go="cat-' + g.cat.id + '" data-reveal>' +
        '<span class="cat__top"><span class="cat__no">STAGE ' + pad(i + 1) + '</span><span class="cat__count">' + g.rules.length + " ข้อ</span></span>" +
        '<span class="cat__name">' + esc(g.cat.name) + "</span>" +
        (g.cat.description ? '<span class="cat__desc">' + esc(g.cat.description) + "</span>" : "") +
        '<span class="cat__go">ดูรายละเอียด ' + ICON.arrow + "</span></button>";
    }).join("");

    $("#toc").innerHTML = GROUPS.map(function (g) {
      return '<li><a href="#cat-' + g.cat.id + '" data-toc="cat-' + g.cat.id + '"><span>' + esc(g.cat.name) + "</span><span>" + g.rules.length + "</span></a></li>";
    }).join("");

    $("#footCats").innerHTML = GROUPS.map(function (g) {
      return '<li><a href="#cat-' + g.cat.id + '">' + esc(g.cat.name) + "</a></li>";
    }).join("");

    var contacts = CFG.contacts || [];
    $("#channels").innerHTML = contacts.map(function (c) {
      return c.url
        ? '<li><a class="channel" href="' + esc(c.url) + '" target="_blank" rel="noopener"><b>' + esc(c.label) + "</b><small>" + esc(c.url.replace(/^https?:\/\//, "")) + "</small></a></li>"
        : '<li><div class="channel channel--empty"><b>' + esc(c.label) + "</b><small>ยังไม่ได้ระบุลิงก์ · รอผู้ดูแลเพิ่ม</small></div></li>";
    }).join("");
    $("#footContacts").innerHTML = contacts.map(function (c) {
      return c.url ? '<li><a href="' + esc(c.url) + '" target="_blank" rel="noopener">' + esc(c.label) + "</a></li>"
                   : '<li class="pending">' + esc(c.label) + " (รอเพิ่มลิงก์)</li>";
    }).join("");

    if (CFG.announcement) $("#annText").textContent = "“" + CFG.announcement + "”";

    var faq = CFG.faq || [];
    if (faq.length) {
      $("#faq").hidden = false; $("#navFaq").hidden = false;
      $("#faqList").innerHTML = faq.map(function (f) {
        return "<details><summary>" + esc(f.q) + "</summary><p>" + esc(f.a) + "</p></details>";
      }).join("");
    }
    $("#year").textContent = new Date().getFullYear();
  }

  function ruleHTML(r, open) {
    var no = r.rule_number != null ? r.rule_number : "•";
    var label = r.rule_number != null ? "ข้อ " + r.rule_number : "ไม่มีเลขข้อในต้นฉบับ";
    return '<article class="rule' + (open ? " is-open" : "") + '" id="' + r.anchor + '">' +
      '<button class="rule__head" type="button" aria-expanded="' + (open ? "true" : "false") + '" aria-controls="' + r.anchor + '-p">' +
        '<span class="rule__no" title="' + label + '"><span class="sr">' + label + ' </span><span aria-hidden="true">' + hi(String(no), /^\d+$/.test(query) ? query : "") + "</span></span>" +
        '<span class="rule__text">' + (r.title ? '<span class="rule__title">' + hi(r.title, query) + "</span>" : "") + rich(r.content, query) + "</span>" +
        '<span class="rule__chev">' + ICON.chev + "</span>" +
      "</button>" +
      '<div class="rule__panel" id="' + r.anchor + '-p"><div class="rule__inner"><div class="rule__detail">' +
        (r.note ? '<div class="field"><span class="field__label">รายละเอียดเพิ่มเติม / หมายเหตุ</span><div class="field__value">' + rich(r.note, query) + "</div></div>" : "") +
        (r.penalty ? '<div class="field penalty"><span class="field__label">บทลงโทษ (โทษ/ปรับ)</span><div class="field__value">' + rich(r.penalty, query) + "</div></div>" : "") +
        '<div class="rule__meta"><span><span class="field__label">หมวดหมู่</span><span class="chip">' + hi(r.cat.name, query) + "</span></span>" +
        '<button class="mini copy" type="button" data-copy="' + r.anchor + '">' + ICON.link + "คัดลอกลิงก์ข้อนี้</button></div>" +
      "</div></div></div></article>";
  }

  function renderRules() {
    var q = query.toLowerCase();
    var openIds = {};
    $$(".rule.is-open").forEach(function (el) { openIds[el.id] = 1; });
    var collapsed = {};
    $$(".group.is-collapsed").forEach(function (el) { collapsed[el.id] = 1; });
    var shown = 0, total = DATA.rules.length, html = "";
    GROUPS.forEach(function (g, i) {
      var list = q ? g.rules.filter(function (r) { return r.hay.indexOf(q) > -1; }) : g.rules;
      if (!list.length) return;
      shown += list.length;
      var id = "cat-" + g.cat.id;
      html += '<section class="group' + (!q && collapsed[id] ? " is-collapsed" : "") + '" id="' + id + '">' +
        '<button class="group__head" type="button" aria-expanded="' + (!q && collapsed[id] ? "false" : "true") + '">' +
          '<span class="group__no">' + pad(i + 1) + "</span>" +
          '<span class="group__name">' + hi(g.cat.name, query) + "</span>" +
          '<span class="group__count">' + (q ? list.length + " / " : "") + g.rules.length + " ข้อ</span>" + ICON.chev +
        "</button>" +
        '<div class="group__body">' + list.map(function (r) { return ruleHTML(r, openIds[r.anchor]); }).join("") + "</div></section>";
    });
    $("#ruleList").innerHTML = html;
    $("#empty").hidden = shown > 0;
    $("#count").innerHTML = q
      ? "พบ <b>" + shown + "</b> จาก " + total + " ข้อ สำหรับ “" + esc(query) + "”"
      : "แสดงกฎทั้งหมด <b>" + total + "</b> ข้อ ใน " + GROUPS.length + " หมวด";
    $("#qClear").hidden = !query;
  }

  /* ═════════ FEATURES ═════════ */
  function setOpen(rule, open) {
    rule.classList.toggle("is-open", open);
    $(".rule__head", rule).setAttribute("aria-expanded", open ? "true" : "false");
  }

  function goTo(id, opts) {
    var el = document.getElementById(id);
    if (!el && query) { clearSearch(); el = document.getElementById(id); }
    if (!el) return false;
    var group = el.closest(".group") || (el.classList.contains("group") ? el : null);
    if (group) { group.classList.remove("is-collapsed"); $(".group__head", group).setAttribute("aria-expanded", "true"); }
    if (el.classList.contains("rule")) {
      setOpen(el, true);
      $$(".rule.is-target").forEach(function (r) { r.classList.remove("is-target"); });
      el.classList.add("is-target");
    }
    el.scrollIntoView({ behavior: reduced || (opts && opts.instant) ? "auto" : "smooth", block: "start" });
    return true;
  }

  function clearSearch() { $("#q").value = ""; query = ""; renderRules(); }

  function ruleUrl(anchor) { return location.href.split("#")[0] + "#" + anchor; }

  function copyLink(anchor) {
    var url = ruleUrl(anchor);
    try { history.replaceState(null, "", "#" + anchor); } catch (e) { location.hash = anchor; }
    var done = function () { toast("คัดลอกลิงก์แล้ว"); };
    var fail = function () { toast("คัดลอกอัตโนมัติไม่ได้ ลิงก์: " + url); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, fail);
    else fail();
  }

  function bind() {
    var qEl = $("#q"), t;
    qEl.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () { query = qEl.value.trim(); renderRules(); }, 90);
    });
    $("#qClear").addEventListener("click", function () { clearSearch(); qEl.focus(); });
    $("#emptyClear").addEventListener("click", function () { clearSearch(); qEl.focus(); });
    $("#expandAll").addEventListener("click", function () {
      $$(".group").forEach(function (g) { g.classList.remove("is-collapsed"); $(".group__head", g).setAttribute("aria-expanded", "true"); });
      $$(".rule").forEach(function (r) { setOpen(r, true); });
    });
    $("#collapseAll").addEventListener("click", function () { $$(".rule").forEach(function (r) { setOpen(r, false); }); });

    $("#ruleList").addEventListener("click", function (e) {
      if (e.target.closest("a")) return;
      var copy = e.target.closest("[data-copy]");
      if (copy) { copyLink(copy.getAttribute("data-copy")); return; }
      var gh = e.target.closest(".group__head");
      if (gh) {
        var g = gh.parentNode, c = g.classList.toggle("is-collapsed");
        gh.setAttribute("aria-expanded", c ? "false" : "true"); return;
      }
      var rh = e.target.closest(".rule__head");
      if (rh) { var r = rh.parentNode; setOpen(r, !r.classList.contains("is-open")); }
    });

    $("#catGrid").addEventListener("click", function (e) {
      var b = e.target.closest("[data-go]");
      if (b) { var id = b.getAttribute("data-go"); if (goTo(id)) { try { history.replaceState(null, "", "#" + id); } catch (x) {} } }
    });

    /* ลิงก์ภายในหน้า: เลื่อนลื่น + เปิดหมวด/ข้อที่ถูกชี้ */
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href").slice(1);
      if (!id) return;
      closeMenu();
      if (/^(cat|rule)-/.test(id)) { e.preventDefault(); if (goTo(id)) { try { history.replaceState(null, "", "#" + id); } catch (x) {} } }
    });
    window.addEventListener("hashchange", function () { fromHash(false); });

    /* mobile menu */
    var burger = $("#burger"), links = $("#navLinks");
    function closeMenu() { links.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "เปิดเมนู"); }
    burger.addEventListener("click", function () {
      var open = !links.classList.contains("is-open");
      links.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "ปิดเมนู" : "เปิดเมนู");
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
    document.addEventListener("click", function (e) { if (!e.target.closest(".nav__bar")) closeMenu(); });

    $("#toTop").addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }); });
  }

  function fromHash(instant) {
    var id = decodeURIComponent(location.hash.slice(1));
    if (/^(cat|rule)-[A-Za-z0-9-]+$/.test(id)) goTo(id, { instant: instant });
  }

  /* scroll: progress bar, back-to-top, active nav + toc, hero parallax — one rAF loop */
  function scrollFx() {
    var bar = $("#progressBar"), top = $("#toTop"), layers = $$("[data-depth]"), hero = $("#home");
    var spies = $$("[data-spy]"), ticking = false;
    function update() {
      ticking = false;
      var y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
      top.hidden = y < 700;
      if (!reduced && y < hero.offsetHeight) layers.forEach(function (l) { l.style.transform = "translate3d(0," + (y * parseFloat(l.dataset.depth)).toFixed(1) + "px,0)"; });
      var line = y + 140, current = "home";
      spies.forEach(function (a) { var s = document.getElementById(a.dataset.spy); if (s && !s.hidden && s.offsetTop <= line) current = a.dataset.spy; });
      spies.forEach(function (a) { var on = a.dataset.spy === current; a.classList.toggle("is-active", on); if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
      var cur = null;
      $$(".group").forEach(function (g) { if (g.getBoundingClientRect().top < 180) cur = g.id; });
      $$("[data-toc]").forEach(function (a) { a.classList.toggle("is-active", a.dataset.toc === cur); });
    }
    function req() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    addEventListener("scroll", req, { passive: true }); addEventListener("resize", req);
    update();
  }

  function reveal() {
    if (reduced || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove("pre"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    $$("[data-reveal]").forEach(function (el) {
      if (el.getBoundingClientRect().top > innerHeight) { el.classList.add("pre"); io.observe(el); }
    });
  }

  /* star particles in the hero sky — tiny canvas, paused when off-screen */
  function stars() {
    var cv = $("#stars");
    if (reduced || !cv.getContext) return;
    var ctx = cv.getContext("2d"), W, H, dpr = Math.min(2, devicePixelRatio || 1), ps = [], run = true, raf;
    function size() {
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(46, W / 26)); ps = [];
      for (var i = 0; i < n; i++) ps.push({ x: Math.random() * W, y: Math.random() * H, r: 2 + Math.random() * 5, s: .15 + Math.random() * .35, p: Math.random() * 6.28, c: Math.random() < .55 ? "#FFFFFF" : "#FFD84D" });
    }
    function star(x, y, r) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill(); }
    function frame(t) {
      if (!run) return;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i]; p.y -= p.s; if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        ctx.globalAlpha = .35 + .6 * Math.abs(Math.sin(t / 900 + p.p)); ctx.fillStyle = p.c; star(p.x, p.y, p.r);
      }
      raf = requestAnimationFrame(frame);
    }
    size(); addEventListener("resize", size);
    new IntersectionObserver(function (es) {
      run = es[0].isIntersecting; cancelAnimationFrame(raf); if (run) raf = requestAnimationFrame(frame);
    }).observe(cv);
  }

  /* ═════════ BOOT ═════════ */
  loadData().then(function (res) {
    $("#loader").hidden = true;
    if (!res.data || !res.data.rules || !res.data.rules.length) {
      var n = $("#notice"); n.hidden = false;
      n.textContent = "ยังไม่มีข้อมูลกฎ กรุณาเพิ่มข้อมูลใน data/rules.js หรือกำหนด sheetCsvUrl";
      build({ categories: [], rules: [] });
    } else {
      if (res.fallback) { var w = $("#notice"); w.hidden = false; w.textContent = "โหลดข้อมูลล่าสุดจากชีตไม่สำเร็จ กำลังแสดงข้อมูลสำรองที่บันทึกไว้ในเว็บไซต์"; }
      build(res.data);
    }
    renderStatic(); renderRules(); bind(); fromHash(true); scrollFx(); reveal(); stars();
  });
})();
