document.addEventListener("DOMContentLoaded", () => {
  // ---------- Theme (light / dark) ----------
  const THEME_STORAGE_KEY = "planfra-theme";
  const themeToggle = document.getElementById("themeToggle");

  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.dataset.theme = "dark";
    } else {
      delete document.documentElement.dataset.theme;
    }
    if (themeToggle) themeToggle.checked = theme === "dark";
  }

  applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || "light");

  if (themeToggle) {
    themeToggle.addEventListener("change", () => {
      const theme = themeToggle.checked ? "dark" : "light";
      applyTheme(theme);
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    });
  }

  const sidebar = document.getElementById("sidebar");
  const collapseBtn = document.getElementById("collapseBtn");

  collapseBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
  });

  document.querySelectorAll(".nav-item.has-submenu > .submenu-toggle").forEach((toggle) => {
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      toggle.parentElement.classList.toggle("open");
    });
  });

  document.querySelectorAll(".nav-item:not(.has-submenu) > .nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".nav-item.active").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".submenu .nav-link.active").forEach((a) => a.classList.remove("active"));
      link.parentElement.classList.add("active");
    });
  });

  document.querySelectorAll(".submenu .nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".nav-item.active").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".submenu .nav-link.active").forEach((a) => a.classList.remove("active"));
      link.classList.add("active");
      link.closest(".nav-item.has-submenu").classList.add("open");
    });
  });

  const pages = document.querySelectorAll(".page");

  // 입력창(입력/텍스트영역/선택/편집가능 요소)에 포커스가 있을 때는 단축키를 무시한다
  function isTypingTarget(target) {
    return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
  }

  // 대시보드 자리는 상단바 모드 스위치에 따라 프로젝트 대시보드 ↔ 전체판매처(광고보드)로 바뀐다.
  function currentTopbarMode() {
    const activeModeBtn = document.querySelector(".mode-switch-btn.is-active");
    return activeModeBtn ? activeModeBtn.dataset.mode : "project";
  }

  const dashboardLink = document.querySelector('.nav-link[data-page="page-dashboard"]');
  function dashboardTargetPage() {
    if (currentTopbarMode() === "adboard" && dashboardLink) {
      return dashboardLink.dataset.pageAdboard || "page-dashboard";
    }
    return "page-dashboard";
  }

  // 판매채널 페이지의 프로젝트 달성률·마감 알림 박스는 상단바 모드가 광고보드일 때 숨긴다
  function applyChannelViewMode(page) {
    const workRow = page.querySelector(".channel-work-row");
    if (workRow) workRow.hidden = currentTopbarMode() === "adboard";
  }

  function showPage(targetId) {
    pages.forEach((page) => {
      page.hidden = page.id !== targetId;
    });
    const activePage = document.getElementById(targetId);
    if (activePage) applyChannelViewMode(activePage);
    const channel = targetId.replace("page-", "");
    if (CHANNEL_STATS[channel]) animateChannelStats(channel);
    if (channel === "allchannels") renderChannelShareDonuts();
    renderChannelAlerts(channel);
  }

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      let targetId = link.dataset.page || "page-dashboard";
      if (link === dashboardLink) targetId = dashboardTargetPage();
      showPage(targetId);
    });
  });

  // ---------- Topbar mode switch (프로젝트 / 광고보드) ----------
  const modeSwitch = document.querySelector(".mode-switch");
  if (modeSwitch) {
    const modeThumb = modeSwitch.querySelector(".mode-switch-thumb");
    const modeBtns = Array.from(modeSwitch.querySelectorAll(".mode-switch-btn"));

    const moveModeThumb = (btn) => {
      modeThumb.style.width = `${btn.offsetWidth}px`;
      modeThumb.style.transform = `translateX(${btn.offsetLeft}px)`;
    };

    function activateModeBtn(btn) {
      modeBtns.forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", active ? "true" : "false");
      });
      moveModeThumb(btn);

      const visiblePage = Array.from(pages).find((p) => !p.hidden);
      if (!visiblePage) return;
      // 대시보드 자리를 보고 있을 때는 모드 전환과 동시에 화면을 갈아끼우고,
      // 판매채널 페이지를 보고 있을 때는 프로젝트 달성률 박스만 보이거나 숨겨진다.
      const isDashboardSlot = visiblePage.id === "page-dashboard" || visiblePage.id === dashboardLink?.dataset.pageAdboard;
      if (isDashboardSlot) {
        showPage(dashboardTargetPage());
        document.querySelectorAll(".nav-item.active").forEach((item) => item.classList.remove("active"));
        document.querySelectorAll(".submenu .nav-link.active").forEach((a) => a.classList.remove("active"));
        dashboardLink?.parentElement.classList.add("active");
      } else {
        applyChannelViewMode(visiblePage);
      }
    }

    modeBtns.forEach((btn) => {
      btn.addEventListener("click", () => activateModeBtn(btn));
    });

    requestAnimationFrame(() => {
      moveModeThumb(modeSwitch.querySelector(".mode-switch-btn.is-active") || modeBtns[0]);
    });

    window.addEventListener("resize", () => {
      const active = modeSwitch.querySelector(".mode-switch-btn.is-active");
      if (active) moveModeThumb(active);
    });

    // ---- 단축키: a = 프로젝트, d = 광고보드 (입력창에 포커스가 있을 땐 무시) ----
    const MODE_HOTKEYS = { a: "project", d: "adboard" };
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const mode = MODE_HOTKEYS[e.key.toLowerCase()];
      if (!mode) return;
      if (isTypingTarget(e.target)) return;

      const btn = modeBtns.find((b) => b.dataset.mode === mode);
      if (btn && !btn.classList.contains("is-active")) {
        activateModeBtn(btn);
      }
    });
  }

  // ---- 단축키: w = 사이드바 위로 이동하며 활성화, s = 아래로 이동하며 활성화 (입력창에 포커스가 있을 땐 무시) ----
  // 판매채널처럼 서브메뉴를 여닫기만 하는 항목은 "active" 클래스가 붙지 않으므로,
  // 현재 위치를 별도 인덱스로 직접 추적하고 마우스 클릭 시에도 같이 동기화한다.
  function getSidebarNavStops() {
    const stops = [];
    document.querySelectorAll(".nav-list > .nav-item").forEach((item) => {
      const topLink = item.querySelector(":scope > .nav-link");
      if (!topLink) return;
      stops.push(topLink);
      if (item.classList.contains("has-submenu") && item.classList.contains("open")) {
        item.querySelectorAll(":scope > .submenu li a").forEach((subLink) => stops.push(subLink));
      }
    });
    return stops;
  }

  let sidebarStopIndex = -1;
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      const idx = getSidebarNavStops().indexOf(link);
      if (idx >= 0) sidebarStopIndex = idx;
    });
  });

  const SIDEBAR_HOTKEYS = { w: -1, s: 1 };
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const dir = SIDEBAR_HOTKEYS[e.key.toLowerCase()];
    if (!dir) return;
    if (isTypingTarget(e.target)) return;

    const stops = getSidebarNavStops();
    if (!stops.length) return;

    if (sidebarStopIndex < 0 || sidebarStopIndex >= stops.length) {
      sidebarStopIndex = stops.findIndex(
        (el) => el.classList.contains("active") || el.parentElement.classList.contains("active")
      );
      if (sidebarStopIndex < 0) sidebarStopIndex = 0;
    }
    sidebarStopIndex = (sidebarStopIndex + dir + stops.length) % stops.length;
    stops[sidebarStopIndex].click();
  });

  // ---------- Channel Ad Stats (mock, count-up on click) ----------
  const CHANNEL_STATS = {
    allchannels: { adCost: 4050000, adRevenue: 17900000, roas: 442, totalRevenue: 54510000 },
    coupang: { adCost: 1240000, adRevenue: 5860000, roas: 472, totalRevenue: 18320000 },
    ownmall: { adCost: 860000, adRevenue: 3120000, roas: 363, totalRevenue: 9450000 },
    smartstore: { adCost: 1530000, adRevenue: 7240000, roas: 473, totalRevenue: 21780000 },
    talkdeal: { adCost: 420000, adRevenue: 1680000, roas: 400, totalRevenue: 4960000 },
  };

  function formatStat(key, value) {
    const rounded = Math.round(value);
    if (key === "roas") return `${rounded.toLocaleString("ko-KR")}%`;
    return `${rounded.toLocaleString("ko-KR")}원`;
  }

  // ---- 판매채널 대시보드 날짜 필터 상태 ----
  // CHANNEL_STATS 목업 수치는 30일 기준이라 가정하고, 선택한 기간 길이에 비례해 환산한다.
  // 실데이터 연동 전까지의 임시 방식이며, 채널간 비중(도넛)은 동일 비율로 스케일되어 유지된다.
  const CHANNEL_RANGE_STORAGE_KEY = "planfra_channel_range";
  const CHANNEL_BASELINE_DAYS = 30;

  // 처음 노출되는 기준은 당일(오늘)이며, 저장된 선택이 있으면 그 값을 이어서 사용한다.
  const todayDateKey = toDateKey(new Date());
  let channelRangeStart = todayDateKey;
  let channelRangeEnd = todayDateKey;
  try {
    const savedChannelRange = JSON.parse(localStorage.getItem(CHANNEL_RANGE_STORAGE_KEY));
    if (savedChannelRange && savedChannelRange.start && savedChannelRange.end) {
      channelRangeStart = savedChannelRange.start;
      channelRangeEnd = savedChannelRange.end;
    }
  } catch (e) {}

  function saveChannelRange() {
    localStorage.setItem(
      CHANNEL_RANGE_STORAGE_KEY,
      JSON.stringify({ start: channelRangeStart, end: channelRangeEnd })
    );
  }

  function hasChannelRange() {
    return Boolean(channelRangeStart && channelRangeEnd);
  }

  function channelRangeDayCount() {
    if (!hasChannelRange()) return CHANNEL_BASELINE_DAYS;
    const start = new Date(channelRangeStart + "T00:00:00");
    const end = new Date(channelRangeEnd + "T00:00:00");
    return Math.max(Math.round((end - start) / 86400000) + 1, 1);
  }

  function getScaledChannelStats(channel) {
    const base = CHANNEL_STATS[channel];
    if (!base) return base;
    const factor = channelRangeDayCount() / CHANNEL_BASELINE_DAYS;
    const adCost = base.adCost * factor;
    const adRevenue = base.adRevenue * factor;
    const totalRevenue = base.totalRevenue * factor;
    const roas = adCost > 0 ? Math.round((adRevenue / adCost) * 100) : 0;
    return { adCost, adRevenue, roas, totalRevenue };
  }

  function animateChannelStats(channel) {
    const targets = getScaledChannelStats(channel);
    const grid = document.querySelector(`[data-channel-stats="${channel}"]`);
    if (!targets || !grid) return;

    const duration = 700;
    const startTime = performance.now();
    const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
    const valueEls = grid.querySelectorAll("[data-stat]");

    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = easeOutQuad(progress);
      valueEls.forEach((el) => {
        const key = el.dataset.stat;
        el.textContent = formatStat(key, targets[key] * eased);
      });
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---------- Channel Share Donuts (매출 비중 / 광고비 비중) ----------
  const CHANNEL_SHARE_ORDER = ["coupang", "ownmall", "smartstore", "talkdeal"];
  const CHANNEL_SHARE_COLOR_VARS = {
    coupang: "--channel-coupang",
    ownmall: "--channel-ownmall",
    smartstore: "--channel-smartstore",
    talkdeal: "--channel-talkdeal",
  };
  const CHANNEL_SHARE_SOFT_VARS = {
    coupang: "--channel-coupang-soft",
    ownmall: "--channel-ownmall-soft",
    smartstore: "--channel-smartstore-soft",
    talkdeal: "--channel-talkdeal-soft",
  };

  // 넓은 면(도넛 조각·막대·아바타)은 연한 톤에서 원색으로 흐르는 그라디언트로 채운다
  function channelFill(key, angle) {
    return `linear-gradient(${angle}, var(${CHANNEL_SHARE_SOFT_VARS[key]}) 0%, var(${CHANNEL_SHARE_COLOR_VARS[key]}) 100%)`;
  }
  // 도넛은 하나의 원 위에 stroke-dasharray로 조각을 얹는 방식이라 100% 한 조각도 그대로 그려진다.
  const DONUT_VIEW_W = 380;
  const DONUT_VIEW_H = 240;
  const DONUT_CX = DONUT_VIEW_W / 2;
  const DONUT_CY = DONUT_VIEW_H / 2;
  const DONUT_RADIUS = 58; // 링 중심선 반지름
  const DONUT_THICKNESS = 23;
  const DONUT_OUTER = DONUT_RADIUS + DONUT_THICKNESS / 2;
  const DONUT_KNEE = DONUT_OUTER + 16; // 인출선이 꺾이는 지점
  const DONUT_GAP = 7; // 조각 사이 여백(원둘레 단위). 끝이 둥글어 조금 넉넉해야 분리돼 보인다
  const DONUT_CIRCUM = 2 * Math.PI * DONUT_RADIUS;
  const DONUT_LABEL_GAP = 46; // 같은 쪽 라벨끼리 최소 세로 간격

  function formatWon(value) {
    return `${Math.round(value).toLocaleString("ko-KR")}원`;
  }

  // 채널별 비중을 12시 방향부터 시계방향으로 누적해 조각 길이/시작점을 구한다.
  function buildDonutSegments(values) {
    const total = values.reduce((sum, v) => sum + v.value, 0);
    let cursor = 0;
    const segments = values.map((item) => {
      const fraction = total > 0 ? item.value / total : 0;
      const offset = cursor;
      cursor += fraction;
      return { ...item, fraction, offset };
    });
    return { segments, total };
  }

  // 같은 쪽(좌/우)에 몰린 라벨이 겹치지 않도록 세로 위치를 밀어낸다.
  function spreadLabels(items, minY, maxY) {
    items.sort((a, b) => a.y - b.y);
    for (let i = 1; i < items.length; i++) {
      if (items[i].y - items[i - 1].y < DONUT_LABEL_GAP) {
        items[i].y = items[i - 1].y + DONUT_LABEL_GAP;
      }
    }
    const overflow = items.length ? items[items.length - 1].y - maxY : 0;
    if (overflow > 0) items.forEach((it) => (it.y -= overflow));
    if (items.length && items[0].y < minY) {
      const shift = minY - items[0].y;
      items.forEach((it) => (it.y += shift));
    }
  }

  function renderDonutCard(containerId, values, totalLabel, opts) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return;
    const formatFull = (opts && opts.formatFull) || formatWon;
    const formatCompact = (opts && opts.formatCompact) || ((v) => `${acCompactWon(v)}원`);
    // ROAS처럼 채널별 값을 단순 합산하면 의미가 없는 지표는 opts.centerValue로 별도 계산해 넘긴다
    const centerValue = opts && opts.centerValue != null ? opts.centerValue : null;
    const { segments, total } = buildDonutSegments(values);
    const visible = segments.filter((s) => s.fraction > 0);
    // 조각이 하나뿐이면 여백을 두지 않아야 링이 끊기지 않는다
    const gap = visible.length > 1 ? DONUT_GAP : 0;

    // 그라디언트 id는 카드마다 달라야 하므로 컨테이너 id를 접두사로 붙인다.
    // 방향은 조각이 그려지는 호를 따라가도록 시작점 → 끝점으로 잡는다. 좌표계는 아래
    // rotate(-90) 이전 기준(3시 방향 시작)이며, 회전은 도형과 그라디언트에 함께 적용된다.
    const gradId = (key) => `${containerId}-grad-${key}`;
    const ringPoint = (fraction) => {
      const theta = fraction * 2 * Math.PI;
      return {
        x: DONUT_CX + DONUT_RADIUS * Math.cos(theta),
        y: DONUT_CY + DONUT_RADIUS * Math.sin(theta),
      };
    };
    const defsHtml = visible
      .map((s) => {
        // 한 조각이 원을 거의 다 차지하면 시작점과 끝점이 겹쳐 방향을 못 잡으므로 대각선으로 대체한다
        const wide = s.fraction > 0.9;
        const p0 = wide ? { x: 0, y: 0 } : ringPoint(s.offset);
        const p1 = wide ? { x: DONUT_VIEW_W, y: DONUT_VIEW_H } : ringPoint(s.offset + s.fraction);
        return `
          <linearGradient id="${gradId(s.key)}" gradientUnits="userSpaceOnUse"
            x1="${p0.x.toFixed(1)}" y1="${p0.y.toFixed(1)}" x2="${p1.x.toFixed(1)}" y2="${p1.y.toFixed(1)}">
            <stop offset="0%" stop-color="var(${CHANNEL_SHARE_SOFT_VARS[s.key]})" />
            <stop offset="100%" stop-color="var(${CHANNEL_SHARE_COLOR_VARS[s.key]})" />
          </linearGradient>`;
      })
      .join("");

    // stroke-linecap:round 는 dash 양끝에 반지름 T/2 만큼 잉크를 더 얹는다.
    // 그래서 dash 길이에서 두께만큼 빼고 시작점을 T/2 밀어야 실제 잉크가 제 비중을 차지한다.
    const cap = DONUT_THICKNESS / 2;
    const arcsHtml = visible
      .map((s) => {
        const arcLen = s.fraction * DONUT_CIRCUM;
        const startArc = s.offset * DONUT_CIRCUM;
        let dashLen = arcLen - gap - DONUT_THICKNESS;
        let dashStart = startArc + gap / 2 + cap;
        if (dashLen < 0.5) {
          // 캡만으로도 넘칠 만큼 작은 조각은 가운데에 동그란 점 하나로 남긴다
          dashLen = 0.5;
          dashStart = startArc + arcLen / 2;
        }
        // 처음엔 길이 0으로 그려 두었다가(아래 rAF) 실제 길이로 늘려 채워지는 애니메이션을 만든다
        const finalDasharray = `${dashLen.toFixed(2)} ${(DONUT_CIRCUM - dashLen).toFixed(2)}`;
        return `
          <circle class="donut-seg" cx="${DONUT_CX}" cy="${DONUT_CY}" r="${DONUT_RADIUS}"
            fill="none" stroke="url(#${gradId(s.key)})" stroke-width="${DONUT_THICKNESS}"
            stroke-linecap="round"
            stroke-dasharray="0 ${DONUT_CIRCUM.toFixed(2)}" data-final-dasharray="${finalDasharray}"
            stroke-dashoffset="${(-dashStart).toFixed(2)}">
            <title>${escapeHtml(s.label)} ${(s.fraction * 100).toFixed(1)}% · ${formatFull(s.value)}</title>
          </circle>`;
      })
      .join("");

    // 라벨은 각 조각이 향하는 방향(중심각)에 놓아 색과 이름이 바로 이어지게 한다.
    const marks = visible.map((s) => {
      const mid = (s.offset + s.fraction / 2) * 2 * Math.PI;
      const sinM = Math.sin(mid);
      const cosM = Math.cos(mid);
      return {
        seg: s,
        sinM,
        cosM,
        dir: sinM >= 0 ? 1 : -1,
        y: DONUT_CY - DONUT_KNEE * cosM,
      };
    });
    spreadLabels(marks.filter((m) => m.dir > 0), 26, DONUT_VIEW_H - 26);
    spreadLabels(marks.filter((m) => m.dir < 0), 26, DONUT_VIEW_H - 26);

    const calloutsHtml = marks
      .map((m) => {
        const s = m.seg;
        const color = `var(${CHANNEL_SHARE_COLOR_VARS[s.key]})`;
        const edgeX = DONUT_CX + (DONUT_OUTER + 3) * m.sinM;
        const edgeY = DONUT_CY - (DONUT_OUTER + 3) * m.cosM;
        const kneeX = DONUT_CX + DONUT_KNEE * m.sinM;
        const endX = kneeX + m.dir * 12;
        const textX = endX + m.dir * 6;
        const anchor = m.dir > 0 ? "start" : "end";
        return `
          <g class="donut-callout">
            <polyline points="${edgeX.toFixed(1)},${edgeY.toFixed(1)} ${kneeX.toFixed(1)},${m.y.toFixed(1)} ${endX.toFixed(1)},${m.y.toFixed(1)}"
              fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.75" />
            <circle cx="${endX.toFixed(1)}" cy="${m.y.toFixed(1)}" r="2.4" fill="${color}" />
            <text class="donut-callout-name" x="${textX.toFixed(1)}" y="${(m.y - 10).toFixed(1)}" text-anchor="${anchor}">${escapeHtml(s.label)}</text>
            <text class="donut-callout-pct" x="${textX.toFixed(1)}" y="${(m.y + 6).toFixed(1)}" text-anchor="${anchor}">${(s.fraction * 100).toFixed(1)}%</text>
            <text class="donut-callout-amount" x="${textX.toFixed(1)}" y="${(m.y + 19).toFixed(1)}" text-anchor="${anchor}">${formatCompact(s.value)}</text>
          </g>`;
      })
      .join("");

    wrap.innerHTML = `
      <div class="donut-visual">
        <svg viewBox="0 0 ${DONUT_VIEW_W} ${DONUT_VIEW_H}" class="donut-svg" role="img" aria-label="${escapeHtml(totalLabel)} 채널별 비중">
          <defs>${defsHtml}</defs>
          <circle class="donut-track" cx="${DONUT_CX}" cy="${DONUT_CY}" r="${DONUT_RADIUS}" fill="none" stroke-width="${DONUT_THICKNESS}" />
          <g transform="rotate(-90 ${DONUT_CX} ${DONUT_CY})">${arcsHtml}</g>
          ${calloutsHtml}
        </svg>
        <div class="donut-center">
          <span class="donut-center-label">${escapeHtml(totalLabel)}</span>
          <span class="donut-center-value">${formatCompact(centerValue != null ? centerValue : total)}</span>
        </div>
      </div>
    `;

    // 삽입 직후 0으로 그려둔 다음 프레임에서 실제 길이로 바꿔야 transition이 걸린다(같은 프레임이면 생략됨)
    const segEls = wrap.querySelectorAll(".donut-seg[data-final-dasharray]");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        segEls.forEach((el) => el.setAttribute("stroke-dasharray", el.dataset.finalDasharray));
      });
    });
  }

  function renderChannelShareDonuts() {
    const revenueValues = CHANNEL_SHARE_ORDER.map((key) => ({
      key,
      label: CHANNEL_LABELS[key],
      value: getScaledChannelStats(key).totalRevenue,
    }));
    const adCostValues = CHANNEL_SHARE_ORDER.map((key) => ({
      key,
      label: CHANNEL_LABELS[key],
      value: getScaledChannelStats(key).adCost,
    }));
    const roasValues = CHANNEL_SHARE_ORDER.map((key) => ({
      key,
      label: CHANNEL_LABELS[key],
      value: getScaledChannelStats(key).roas,
    }));
    renderDonutCard("revenueShareDonut", revenueValues, "전체매출");
    renderDonutCard("adCostShareDonut", adCostValues, "전체광고비");
    // ROAS는 채널별 비중(단순 합산)과 중앙에 표시할 전체 지표(광고매출 합계 ÷ 광고비 합계)가 다르므로 따로 계산해 넘긴다
    renderDonutCard("roasShareDonut", roasValues, "평균 ROAS", {
      formatFull: (v) => `${v.toLocaleString("ko-KR")}%`,
      formatCompact: (v) => `${v.toLocaleString("ko-KR")}%`,
      centerValue: getScaledChannelStats("allchannels").roas,
    });
  }

  // ---------- 전체판매처 분석 대시보드 (매출 추이 / 인사이트 / 랭킹 / 광고 집행 / 요약 / 지표) ----------
  // 아직 실데이터 연동 전이라 목업 기준값을 쓰며, 기간 의존 지표는 기존 도넛과 동일하게
  // getScaledChannelStats()로 선택 기간에 맞춰 환산한다.

  // 매출 추이는 자체 기간 탭(월/주/일)으로 보므로 상단 날짜 필터와 별개로 동작한다.
  const AC_TREND_DATA = {
    monthly: {
      labels: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월"],
      total: [31200, 33800, 36400, 35100, 41800, 44600, 47300, 50900, 54510],
      ad: [9800, 10600, 12100, 11400, 13900, 15200, 15800, 16900, 17900],
    },
    weekly: {
      labels: ["1주", "2주", "3주", "4주", "5주", "6주", "7주", "8주"],
      total: [10800, 11600, 11100, 12400, 12900, 13600, 13200, 14300],
      ad: [3400, 3700, 3500, 4100, 4300, 4600, 4400, 4900],
    },
    daily: {
      labels: ["월", "화", "수", "목", "금", "토", "일"],
      total: [1620, 1740, 1580, 1890, 2140, 2380, 1970],
      ad: [510, 560, 490, 610, 720, 810, 640],
    },
  };
  // 목업 배열은 만원 단위라 원 단위로 되돌려 쓴다
  const AC_TREND_UNIT = 10000;
  let acTrendPeriod = "monthly";

  const AC_CHART = { w: 760, h: 300, padT: 18, padR: 18, padB: 34, padL: 58 };
  const AC_GRID_COUNT = 4;
  const AC_NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

  // value 이상이면서 사람이 읽기 좋은(1·1.5·2·2.5·… ×10ⁿ) 가장 작은 눈금값을 돌려준다
  function acNiceStep(value) {
    if (!(value > 0)) return 1;
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const ratio = value / magnitude;
    const pick = AC_NICE_STEPS.find((s) => s >= ratio - 1e-9) || 10;
    return pick * magnitude;
  }

  // 축 눈금·도넛 중앙처럼 좁은 자리에는 억/만 단위로 줄여 쓴다.
  // 100만 미만은 반올림 오차가 커 보이므로 소수 첫째 자리까지 남긴다(135,000 → 13.5만).
  function acCompactWon(value) {
    if (value >= 100000000) return `${(value / 100000000).toFixed(1)}억`;
    if (value >= 1000000) return `${Math.round(value / 10000).toLocaleString("ko-KR")}만`;
    if (value >= 10000) return `${(value / 10000).toFixed(1)}만`;
    return Math.round(value).toLocaleString("ko-KR");
  }

  // Catmull-Rom 제어점을 베지어로 바꿔 꺾임 없는 추이선을 그린다
  function acSmoothPath(points) {
    if (points.length < 2) return "";
    let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }

  function renderAcTrendChart() {
    const wrap = document.getElementById("acTrendChart");
    if (!wrap) return;
    const data = AC_TREND_DATA[acTrendPeriod];
    const totals = data.total.map((v) => v * AC_TREND_UNIT);
    const ads = data.ad.map((v) => v * AC_TREND_UNIT);

    const { w, h, padT, padR, padB, padL } = AC_CHART;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    // 눈금값이 딱 떨어지면서도 최고점 위 여백이 과하지 않도록 눈금 간격을 고른다
    const rawMax = Math.max(...totals);
    const maxY = acNiceStep((rawMax * 1.05) / AC_GRID_COUNT) * AC_GRID_COUNT;

    const xAt = (i) => padL + (data.labels.length === 1 ? plotW / 2 : (plotW * i) / (data.labels.length - 1));
    const yAt = (v) => padT + plotH - (v / maxY) * plotH;

    const totalPts = totals.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
    const adPts = ads.map((v, i) => ({ x: xAt(i), y: yAt(v) }));

    let gridHtml = "";
    for (let g = 0; g <= AC_GRID_COUNT; g++) {
      const value = (maxY / AC_GRID_COUNT) * g;
      const y = yAt(value);
      gridHtml += `<line class="ac-grid-line" x1="${padL}" y1="${y.toFixed(1)}" x2="${w - padR}" y2="${y.toFixed(1)}" />`;
      gridHtml += `<text class="ac-axis-text" x="${padL - 10}" y="${(y + 4).toFixed(1)}" text-anchor="end">${acCompactWon(value)}</text>`;
    }

    const xLabelsHtml = data.labels
      .map((label, i) => `<text class="ac-axis-text" x="${xAt(i).toFixed(1)}" y="${h - 10}" text-anchor="middle">${escapeHtml(label)}</text>`)
      .join("");

    const areaPath = `${acSmoothPath(totalPts)} L${totalPts[totalPts.length - 1].x.toFixed(1)},${padT + plotH} L${totalPts[0].x.toFixed(1)},${padT + plotH} Z`;

    const bandW = plotW / Math.max(data.labels.length - 1, 1);
    const hotspotsHtml = data.labels
      .map((label, i) => {
        const p = totalPts[i];
        const tipW = 128;
        const tipX = Math.min(Math.max(p.x - tipW / 2, padL), w - padR - tipW);
        const tipY = Math.max(p.y - 62, 2);
        return `
          <g>
            <rect class="ac-trend-hit" x="${(p.x - bandW / 2).toFixed(1)}" y="${padT}" width="${bandW.toFixed(1)}" height="${plotH}" />
            <g class="ac-trend-tip">
              <rect class="ac-trend-tip-box" x="${tipX.toFixed(1)}" y="${tipY.toFixed(1)}" width="${tipW}" height="52" rx="8" />
              <text class="ac-trend-tip-text" x="${(tipX + 11).toFixed(1)}" y="${(tipY + 20).toFixed(1)}">${escapeHtml(label)} · ${acCompactWon(totals[i])}원</text>
              <text class="ac-trend-tip-sub" x="${(tipX + 11).toFixed(1)}" y="${(tipY + 38).toFixed(1)}">광고매출 ${acCompactWon(ads[i])}원</text>
            </g>
          </g>`;
      })
      .join("");

    const lastIdx = totalPts.length - 1;

    wrap.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" class="ac-trend-svg" role="img" aria-label="기간별 전체매출 및 광고매출 추이">
        <defs>
          <linearGradient id="acTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--channel-coupang-soft)" stop-opacity="0.5" />
            <stop offset="100%" stop-color="var(--channel-coupang-soft)" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="acTrendTotalStroke" gradientUnits="userSpaceOnUse" x1="${padL}" y1="0" x2="${w - padR}" y2="0">
            <stop offset="0%" stop-color="var(--channel-coupang-soft)" />
            <stop offset="100%" stop-color="var(--channel-coupang)" />
          </linearGradient>
          <linearGradient id="acTrendAdStroke" gradientUnits="userSpaceOnUse" x1="${padL}" y1="0" x2="${w - padR}" y2="0">
            <stop offset="0%" stop-color="var(--channel-talkdeal-soft)" />
            <stop offset="100%" stop-color="var(--channel-talkdeal)" />
          </linearGradient>
        </defs>
        ${gridHtml}
        ${xLabelsHtml}
        <path d="${areaPath}" fill="url(#acTrendFill)" />
        <path class="ac-line-ad" d="${acSmoothPath(adPts)}" />
        <path class="ac-line-total" d="${acSmoothPath(totalPts)}" />
        <circle class="ac-trend-dot" cx="${totalPts[lastIdx].x.toFixed(1)}" cy="${totalPts[lastIdx].y.toFixed(1)}" r="5" />
        ${hotspotsHtml}
      </svg>
    `;
  }

  // ---- 채널 인사이트 ----
  const AC_INSIGHT_ICONS = {
    trend: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 17L9 11L13 15L21 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 7H21V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    warn: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 4L21 19H3L12 4Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M12 10V14M12 16.5V17" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`,
    money: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.9"/><path d="M9 9l3 4 3-4M9 14h6M9 16.5h6M12 13v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    time: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.9"/><path d="M12 7v5.2l3.3 2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  };

  const AC_INSIGHTS = [
    {
      icon: "trend",
      tone: "ac-tone-primary",
      title: "스마트스토어 ROAS 최고치",
      desc: "ROAS 473%로 전체 채널 중 1위입니다. 광고비를 늘려도 효율이 유지될 여지가 있습니다.",
    },
    {
      icon: "warn",
      tone: "ac-tone-warning",
      title: "자사몰 효율 저하",
      desc: "ROAS 363%로 전체 평균(442%)을 밑돕니다. 소재·키워드 점검이 필요합니다.",
    },
    {
      icon: "money",
      tone: "ac-tone-success",
      title: "쿠팡 매출 비중 확대",
      desc: "전체매출의 33.6%를 차지하며 전월 대비 비중이 늘었습니다.",
    },
    {
      icon: "time",
      tone: "ac-tone-info",
      title: "톡딜 예산 여유",
      desc: "광고비 42만원으로 집행 규모가 가장 작습니다. 테스트 예산을 배분해볼 시점입니다.",
    },
  ];

  function renderAcInsights() {
    const list = document.getElementById("acInsightList");
    if (!list) return;
    list.innerHTML = AC_INSIGHTS.map(
      (item) => `
      <li class="ac-insight-item">
        <span class="ac-insight-icon ${item.tone}">${AC_INSIGHT_ICONS[item.icon]}</span>
        <div class="ac-insight-body">
          <p class="ac-insight-title">${escapeHtml(item.title)}</p>
          <p class="ac-insight-desc">${escapeHtml(item.desc)}</p>
        </div>
      </li>`
    ).join("");
  }

  // ---- 채널별 매출 랭킹 ----
  function renderAcChannelRank() {
    const list = document.getElementById("acChannelRank");
    if (!list) return;
    const rows = CHANNEL_SHARE_ORDER.map((key) => {
      const stats = getScaledChannelStats(key);
      return { key, label: CHANNEL_LABELS[key], revenue: stats.totalRevenue, roas: stats.roas };
    }).sort((a, b) => b.revenue - a.revenue);

    const total = rows.reduce((sum, r) => sum + r.revenue, 0);

    list.innerHTML = rows
      .map((r) => {
        // 막대 길이는 전체 대비 비중과 그대로 일치시킨다(트랙 전체 = 100%)
        const share = total > 0 ? (r.revenue / total) * 100 : 0;
        return `
        <li class="ac-rank-item">
          <div class="ac-rank-head">
            <span class="ac-rank-name">${escapeHtml(r.label)}</span>
            <span class="ac-rank-pct">${share.toFixed(1)}%</span>
          </div>
          <div class="ac-rank-bar"><div class="ac-rank-fill" style="width:${share.toFixed(1)}%;background:${channelFill(r.key, "90deg")}"></div></div>
          <div class="ac-rank-sub">${formatWon(r.revenue)} · ROAS ${r.roas.toLocaleString("ko-KR")}%</div>
        </li>`;
      })
      .join("");
  }

  // ---- 최근 광고 집행 ----
  const AC_RECENT_ADS = [
    { channel: "smartstore", campaign: "쇼핑검색 · 여름 신상", cost: 480000, status: "집행중" },
    { channel: "coupang", campaign: "매출최적화 · 베스트셀러", cost: 620000, status: "집행중" },
    { channel: "ownmall", campaign: "메타 리타겟팅", cost: 310000, status: "검수중" },
    { channel: "talkdeal", campaign: "톡딜 오픈 프로모션", cost: 180000, status: "예약" },
    { channel: "coupang", campaign: "브랜드 상단 노출", cost: 240000, status: "종료" },
  ];

  const AC_AD_STATUS_STYLE = {
    집행중: "background:var(--color-success-bg);color:var(--color-success-strong)",
    검수중: "background:var(--color-warning-bg);color:var(--color-warning)",
    예약: "background:var(--color-info-bg);color:var(--color-info)",
    종료: "background:var(--content-bg);color:var(--text-muted)",
  };

  function renderAcRecentAds() {
    const wrap = document.getElementById("acRecentAds");
    if (!wrap) return;
    const rowsHtml = AC_RECENT_ADS.map((ad) => {
      const label = CHANNEL_LABELS[ad.channel];
      return `
      <div class="ac-table-row">
        <div class="ac-cell-main">
          <span class="ac-avatar" style="background:${channelFill(ad.channel, "135deg")}">${escapeHtml(label.slice(0, 2))}</span>
          <div class="ac-cell-text">
            <div class="ac-cell-title">${escapeHtml(ad.campaign)}</div>
            <div class="ac-cell-sub">${escapeHtml(label)}</div>
          </div>
        </div>
        <div class="ac-cell-cost">${formatWon(ad.cost)}</div>
        <span class="ac-status" style="${AC_AD_STATUS_STYLE[ad.status] || ""}">${escapeHtml(ad.status)}</span>
      </div>`;
    }).join("");

    wrap.innerHTML = `
      <div class="ac-table-head"><span>캠페인</span><span>광고비</span><span>상태</span></div>
      ${rowsHtml}
    `;
  }

  // ---- 주문 요약 ----
  // 목업 기준(30일)의 건수를 기간 길이에 비례해 환산하고, 비율 지표는 그대로 둔다.
  const AC_ORDER_BASE = { orders: 1438, repeatRate: 41.7, cancelRate: 2.8 };

  function renderAcOrderSummary() {
    const wrap = document.getElementById("acOrderSummary");
    if (!wrap) return;
    const stats = getScaledChannelStats("allchannels");
    const factor = channelRangeDayCount() / CHANNEL_BASELINE_DAYS;
    const orders = Math.max(Math.round(AC_ORDER_BASE.orders * factor), 0);
    const aov = orders > 0 ? stats.totalRevenue / orders : 0;

    const tiles = [
      { label: "주문 건수", value: `${orders.toLocaleString("ko-KR")}건`, delta: "+7.2%", up: true },
      { label: "객단가", value: formatWon(aov), delta: "+11.9%", up: true },
      { label: "재구매율", value: `${AC_ORDER_BASE.repeatRate}%`, delta: "+2.3%", up: true },
      { label: "취소·반품률", value: `${AC_ORDER_BASE.cancelRate}%`, delta: "-0.4%", up: false },
    ];

    wrap.innerHTML = tiles
      .map(
        (t) => `
      <div class="ac-tile">
        <div class="ac-tile-label">${escapeHtml(t.label)}</div>
        <div class="ac-tile-value">${escapeHtml(t.value)}</div>
        <div class="ac-tile-delta ${t.up ? "ac-delta-up" : "ac-delta-down"}">${t.up ? "▲" : "▼"} ${escapeHtml(t.delta)}</div>
      </div>`
      )
      .join("");
  }

  // ---- 핵심 성과 지표 ----
  const AC_ROAS_TARGET = 600;

  function renderAcPerfMetrics() {
    const list = document.getElementById("acPerfMetrics");
    if (!list) return;
    const stats = getScaledChannelStats("allchannels");
    const adShare = stats.totalRevenue > 0 ? (stats.adCost / stats.totalRevenue) * 100 : 0;
    const adRevShare = stats.totalRevenue > 0 ? (stats.adRevenue / stats.totalRevenue) * 100 : 0;

    // pct는 막대 길이(0~100)이자 표시값과 같은 척도다. 목표가 있는 지표만 목표 대비로 환산하고,
    // 나머지는 비율 값을 그대로 써서 "숫자 = 막대 길이"가 어긋나지 않게 한다.
    const metrics = [
      { name: "ROAS 목표 달성률", value: `${stats.roas.toLocaleString("ko-KR")}% / ${AC_ROAS_TARGET}%`, pct: (stats.roas / AC_ROAS_TARGET) * 100, color: "--color-success" },
      { name: "광고매출 기여도", value: `${adRevShare.toFixed(1)}%`, pct: adRevShare, color: "--channel-coupang", soft: "--color-indigo-soft" },
      { name: "광고비 비율", value: `${adShare.toFixed(1)}%`, pct: adShare, color: "--color-warning" },
      { name: "전환율", value: "4.86%", pct: 4.86, color: "--color-info" },
      { name: "예산 소진율", value: "78.3%", pct: 78.3, color: "--color-violet" },
    ];

    list.innerHTML = metrics
      .map((m) => {
        const width = Math.max(Math.min(m.pct, 100), 0);
        const base = `var(${m.color})`;
        const soft = `var(${m.soft || m.color + "-soft"})`;
        return `
        <li class="ac-metric-item">
          <div class="ac-metric-head">
            <span class="ac-metric-name">${escapeHtml(m.name)}</span>
            <span class="ac-metric-value" style="color:${base}">${escapeHtml(m.value)}</span>
          </div>
          <div class="ac-metric-bar"><div class="ac-metric-fill" style="width:${width.toFixed(1)}%;background:linear-gradient(90deg, ${soft} 0%, ${base} 100%)"></div></div>
        </li>`;
      })
      .join("");
  }

  function renderAllChannelDashboard() {
    renderAcTrendChart();
    renderAcInsights();
    renderAcChannelRank();
    renderAcRecentAds();
    renderAcOrderSummary();
    renderAcPerfMetrics();
  }

  document.querySelectorAll("[data-trend-period]").forEach((btn) => {
    btn.addEventListener("click", () => {
      acTrendPeriod = btn.dataset.trendPeriod;
      document.querySelectorAll("[data-trend-period]").forEach((b) => {
        const on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
      renderAcTrendChart();
    });
  });

  // ---------- Channel Dashboard Date Filter (전체판매처 + 채널별 페이지 공통) ----------
  function formatChannelRangeLabel(start, end) {
    const compact = (d) => d.replace(/-/g, ".");
    if (start === end && start === toDateKey(new Date())) return "당일";
    const thisMonthRange = cPresetRange("thisMonth");
    if (start === thisMonthRange.start && end === thisMonthRange.end) return "이번달";
    return start === end ? compact(start) : `${compact(start)} ~ ${compact(end)}`;
  }

  function syncChannelRangeButtons() {
    const active = hasChannelRange();
    const label = active ? formatChannelRangeLabel(channelRangeStart, channelRangeEnd) : "당일";
    document.querySelectorAll("[data-channel-range-text]").forEach((el) => {
      el.textContent = label;
    });
    document.querySelectorAll("[data-channel-range-btn]").forEach((el) => {
      el.classList.toggle("is-active", active);
    });
    // 분석 카드 헤더의 기간 칩도 상단 날짜 필터와 같은 값을 보여준다
    document.querySelectorAll("[data-ac-range-chip]").forEach((el) => {
      el.textContent = label;
    });
  }

  function applyChannelRange(start, end) {
    channelRangeStart = start;
    channelRangeEnd = end;
    saveChannelRange();
    syncChannelRangeButtons();
    renderChannelShareDonuts();
    renderAllChannelDashboard();
    const activePage = document.querySelector(".page:not([hidden])");
    if (activePage) {
      const channel = activePage.id.replace("page-", "");
      if (CHANNEL_STATS[channel]) animateChannelStats(channel);
    }
  }

  const channelRangePopup = document.getElementById("channelRangePopup");
  const cRangeFieldStart = document.getElementById("cRangeFieldStart");
  const cRangeFieldEnd = document.getElementById("cRangeFieldEnd");
  const cRangeStartValue = document.getElementById("cRangeStartValue");
  const cRangeEndValue = document.getElementById("cRangeEndValue");
  const cRangeMonthLabel = document.getElementById("cRangeMonthLabel");
  const cRangeDaysGrid = document.getElementById("cRangeDaysGrid");

  // 팝업 내부 임시 선택값. 적용 버튼을 눌러야 channelRangeStart/End에 반영된다.
  let cDraftStart = "";
  let cDraftEnd = "";
  let cViewYear = new Date().getFullYear();
  let cViewMonth = new Date().getMonth();
  let cEditing = "start";
  let cActiveTrigger = null;

  function cRenderFields() {
    const fill = (el, value) => {
      el.textContent = value ? value.replace(/-/g, ".") : "선택";
      el.classList.toggle("is-empty", !value);
    };
    fill(cRangeStartValue, cDraftStart);
    fill(cRangeEndValue, cDraftEnd);
    cRangeFieldStart.classList.toggle("is-editing", cEditing === "start");
    cRangeFieldEnd.classList.toggle("is-editing", cEditing === "end");
  }

  function cPickDate(picked) {
    if (cEditing === "start" || !cDraftStart) {
      cDraftStart = picked;
      cDraftEnd = "";
      cEditing = "end";
    } else if (picked < cDraftStart) {
      cDraftEnd = cDraftStart;
      cDraftStart = picked;
      cEditing = "start";
    } else {
      cDraftEnd = picked;
      cEditing = "start";
    }
  }

  function cRenderCalendar() {
    cRangeMonthLabel.textContent = `${cViewYear}년 ${cViewMonth + 1}월`;
    const firstWeekday = new Date(cViewYear, cViewMonth, 1).getDay();
    const daysInMonth = new Date(cViewYear, cViewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(cViewYear, cViewMonth, 0).getDate();
    const todayStr = toDateKey(new Date());

    const cells = [];
    for (let i = firstWeekday - 1; i >= 0; i--) {
      cells.push({ label: daysInPrevMonth - i, dateStr: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        label: d,
        dateStr: `${cViewYear}-${String(cViewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }
    let nextLabel = 1;
    while (cells.length % 7 !== 0) {
      cells.push({ label: nextLabel++, dateStr: null });
    }

    cRangeDaysGrid.innerHTML = cells
      .map((c) => {
        if (!c.dateStr) return `<span class="dp-day dp-day-muted">${c.label}</span>`;
        const classes = ["dp-day"];
        if (c.dateStr === todayStr) classes.push("dp-day-today");
        if (cDraftStart && c.dateStr === cDraftStart) classes.push("dp-day-range-start");
        if (cDraftEnd && c.dateStr === cDraftEnd) classes.push("dp-day-range-end");
        if (cDraftStart && cDraftEnd && c.dateStr > cDraftStart && c.dateStr < cDraftEnd) {
          classes.push("dp-day-in-range");
        }
        return `<button type="button" class="${classes.join(" ")}" data-cdate="${c.dateStr}">${c.label}</button>`;
      })
      .join("");

    cRenderFields();
  }

  function cPresetRange(preset) {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(start);
    if (preset === "thisMonth") {
      start.setDate(1);
      end.setTime(new Date(today.getFullYear(), today.getMonth() + 1, 0).getTime());
    }
    return { start: toDateKey(start), end: toDateKey(end) };
  }

  function openChannelRangePopup(trigger) {
    cActiveTrigger = trigger;
    cDraftStart = channelRangeStart;
    cDraftEnd = channelRangeEnd;
    cEditing = "start";
    const base = cDraftStart ? new Date(cDraftStart + "T00:00:00") : new Date();
    cViewYear = base.getFullYear();
    cViewMonth = base.getMonth();
    cRenderCalendar();

    if (channelRangePopup.parentElement !== document.body) {
      document.body.appendChild(channelRangePopup);
    }
    const rect = trigger.getBoundingClientRect();
    channelRangePopup.style.position = "fixed";
    channelRangePopup.style.top = `${rect.bottom + 8}px`;
    const left = Math.max(12, Math.min(rect.right - 300, window.innerWidth - 312));
    channelRangePopup.style.left = `${left}px`;
    channelRangePopup.hidden = false;
  }

  function closeChannelRangePopup() {
    channelRangePopup.hidden = true;
    cActiveTrigger = null;
  }

  document.querySelectorAll("[data-channel-range-btn]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!channelRangePopup.hidden && cActiveTrigger === btn) {
        closeChannelRangePopup();
      } else {
        openChannelRangePopup(btn);
      }
    });
  });

  channelRangePopup.addEventListener("click", (e) => e.stopPropagation());

  document.getElementById("cRangePrevMonth").addEventListener("click", () => {
    cViewMonth -= 1;
    if (cViewMonth < 0) {
      cViewMonth = 11;
      cViewYear -= 1;
    }
    cRenderCalendar();
  });

  document.getElementById("cRangeNextMonth").addEventListener("click", () => {
    cViewMonth += 1;
    if (cViewMonth > 11) {
      cViewMonth = 0;
      cViewYear += 1;
    }
    cRenderCalendar();
  });

  cRangeDaysGrid.addEventListener("click", (e) => {
    const dayBtn = e.target.closest("[data-cdate]");
    if (!dayBtn) return;
    cPickDate(dayBtn.dataset.cdate);
    cRenderCalendar();
  });

  channelRangePopup.querySelector("[data-crange-custom]").addEventListener("click", () => {
    cDraftStart = "";
    cDraftEnd = "";
    cEditing = "start";
    cRenderCalendar();
  });

  channelRangePopup.querySelectorAll("[data-crange-field]").forEach((field) => {
    field.addEventListener("click", () => {
      cEditing = field.dataset.crangeField;
      cRenderFields();
    });
  });

  channelRangePopup.querySelectorAll("[data-crange-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const { start, end } = cPresetRange(btn.dataset.crangePreset);
      cDraftStart = start;
      cDraftEnd = end;
      cEditing = "start";
      const base = new Date(start + "T00:00:00");
      cViewYear = base.getFullYear();
      cViewMonth = base.getMonth();
      cRenderCalendar();
    });
  });

  document.getElementById("cRangeApplyBtn").addEventListener("click", () => {
    closeChannelRangePopup();
    if (!cDraftStart) {
      // 아무 것도 선택하지 않고 적용하면 기본값인 당일로 되돌아간다
      applyChannelRange(todayDateKey, todayDateKey);
      return;
    }
    applyChannelRange(cDraftStart, cDraftEnd || cDraftStart);
  });

  document.getElementById("cRangeResetBtn").addEventListener("click", () => {
    cDraftStart = "";
    cDraftEnd = "";
    cEditing = "start";
    cRenderCalendar();
  });

  document.addEventListener("click", (e) => {
    if (
      !channelRangePopup.hidden &&
      !channelRangePopup.contains(e.target) &&
      !e.target.closest("[data-channel-range-btn]")
    ) {
      closeChannelRangePopup();
    }
  });

  syncChannelRangeButtons();

  // ---------- Clock ----------
  const WEEKDAY_LABELS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTH_LABELS_EN = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  function updateClock() {
    const hhEl = document.getElementById("clockHH");
    const mmEl = document.getElementById("clockMM");
    const ssEl = document.getElementById("clockSS");
    const ampmEl = document.getElementById("clockAmPm");
    const dateEl = document.getElementById("clockDateEn");
    if (!hhEl || !mmEl || !ssEl || !ampmEl || !dateEl) return;

    const now = new Date();
    const hours24 = now.getHours();
    const hours12 = hours24 % 12 || 12;

    hhEl.textContent = String(hours12).padStart(2, "0");
    mmEl.textContent = String(now.getMinutes()).padStart(2, "0");
    ssEl.textContent = String(now.getSeconds()).padStart(2, "0");
    ampmEl.textContent = hours24 >= 12 ? "PM" : "AM";
    dateEl.textContent = `${WEEKDAY_LABELS_EN[now.getDay()]}, ${MONTH_LABELS_EN[now.getMonth()]} ${now.getDate()} · KST`;
  }

  updateClock();
  setInterval(updateClock, 1000);

  // ---------- Task Management ----------
  const TASKS_STORAGE_KEY = "planfra_tasks";
  const URGENT_WINDOW_DAYS = 3;
  const DASHBOARD_LIST_LIMIT = 5;
  const CHANNEL_LABELS = {
    coupang: "쿠팡",
    ownmall: "자사몰",
    smartstore: "스마트스토어",
    talkdeal: "톡딜",
  };

  function loadTasks() {
    try {
      return JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveTasks() {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    if (window.db) window.db.collection("boardData").doc("tasks").set({ list: tasks }).catch((e) => console.error("saveTasks sync failed", e));
  }

  let tasks = loadTasks();

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function getUrgency(dueDate, done) {
    if (done) return { key: "done", label: "완료" };
    if (!dueDate) return { key: "normal", label: "마감일 없음" };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate + "T00:00:00");
    const diffDays = Math.round((due - today) / 86400000);
    if (diffDays < 0) return { key: "overdue", label: `${-diffDays}일 지연` };
    if (diffDays === 0) return { key: "today", label: "오늘마감" };
    if (diffDays <= URGENT_WINDOW_DAYS) return { key: "soon", label: `D-${diffDays}` };
    return { key: "normal", label: `D-${diffDays}` };
  }

  function renderTaskItem(task, withChannelBadge) {
    const urgency = getUrgency(task.dueDate, task.done);
    const dueText = task.dueDate ? `마감일 ${task.dueDate}` : "마감일 없음";
    const statusBadgeHtml = !task.done
      ? `<span class="task-status-badge status-${urgency.key}">${urgency.label}</span>`
      : "";
    const channelBadgeHtml = withChannelBadge
      ? `<span class="site-badge site-${task.channel}">${CHANNEL_LABELS[task.channel]}</span>`
      : "";
    return `
      <li class="task-item ${task.done ? "is-done" : ""}" data-task-id="${task.id}">
        <label class="toggle task-check">
          <input type="checkbox" ${task.done ? "checked" : ""} data-toggle-task="${task.id}">
          <span class="toggle-track"></span>
        </label>
        <div class="task-info">
          <div class="task-title-row">
            ${channelBadgeHtml}
            <span class="task-title">${escapeHtml(task.title)}</span>
          </div>
          <span class="task-due">${dueText}</span>
          ${task.memo ? `<span class="task-memo">${escapeHtml(task.memo)}</span>` : ""}
        </div>
        ${statusBadgeHtml}
        <button type="button" class="ch-btn ch-btn-delete" data-delete-task="${task.id}">삭제</button>
      </li>
    `;
  }

  function sortTasks(list) {
    return list.slice().sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const da = a.dueDate || "9999-99-99";
      const db = b.dueDate || "9999-99-99";
      return da.localeCompare(db);
    });
  }

  function renderCappedTaskList(listEl, items, emptyText) {
    if (!listEl) return;
    if (!items.length) {
      listEl.innerHTML = `<li class="task-empty">${emptyText}</li>`;
      return;
    }
    const visible = items.slice(0, DASHBOARD_LIST_LIMIT);
    const remaining = items.length - visible.length;
    let html = visible.map((t) => renderTaskItem(t, true)).join("");
    if (remaining > 0) {
      html += `<li class="task-more">외 ${remaining}건 더 있어요</li>`;
    }
    listEl.innerHTML = html;
  }

  function renderDashboardWidgets() {
    const pending = tasks.filter((t) => !t.done);
    const withUrgency = pending.map((t) => ({ task: t, urgency: getUrgency(t.dueDate, t.done) }));

    const soon = withUrgency.filter((x) => x.urgency.key === "soon");

    const upcomingTasks = sortTasks(soon.map((x) => x.task));
    renderCappedTaskList(document.getElementById("upcomingTaskList"), upcomingTasks, "예정된 일정이 없습니다");
  }

  // ---- Project-based dashboard stat cards ----
  // 지연된 프로젝트: 마감기한이 지났는데 완료 처리되지 않은 프로젝트
  // 긴급 프로젝트: 우선순위가 "긴급"이고 마감까지 1일 이내인 미완료 프로젝트
  // 마감 3일 이내 프로젝트: 마감까지 3일 이내로 남은 미완료 프로젝트
  // 미완료 프로젝트: 상태가 "완료"·"종료"가 아닌 프로젝트 전체
  // 예정 프로젝트: 상태가 "예정"인 프로젝트 전체
  // 이번달 종료 프로젝트: 이번 달에 "종료" 처리된 프로젝트
  let projectStatGroups = { overdue: [], soon: [], urgent: [], incomplete: [], scheduled: [], closedThisMonth: [] };
  const STAT_FILTER_LABELS = {
    overdue: "지연된 프로젝트",
    urgent: "긴급 프로젝트",
    soon: "마감 3일 이내 프로젝트",
    incomplete: "미완료 프로젝트",
    scheduled: "예정 프로젝트",
    closedThisMonth: "이번달 종료 프로젝트",
  };
  const STAT_FILTER_DESCRIPTIONS = {
    overdue: "마감기한이 지났는데 아직 완료 처리되지 않은 프로젝트",
    urgent: "우선순위 '긴급' + 마감까지 1일 이내(오늘·내일) 남은 미완료 프로젝트",
    soon: "마감까지 3일 이내(마감 당일 포함) 남은 미완료 프로젝트",
    incomplete: "상태가 '완료'·'종료'가 아닌 전체 프로젝트",
    scheduled: "아직 시작하지 않은 상태가 '예정'인 프로젝트",
    closedThisMonth: "이번 달에 '종료'로 처리된 프로젝트 (종료 기록이 없는 예전 데이터는 마감일 기준)",
  };

  function getProjectDueDiffDays(dueDate) {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate + "T00:00:00");
    return Math.round((due - today) / 86400000);
  }

  // 종료 시각(closedAt)이 없던 예전 데이터는 마감일(dueDate)을 종료 시점으로 간주한다
  function getProjectClosedDate(p) {
    const raw = p.closedAt || p.dueDate;
    if (!raw) return null;
    const d = new Date(raw.length === 10 ? raw + "T00:00:00" : raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function isInCurrentMonth(date) {
    if (!date) return false;
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  function renderProjectDashboardStats() {
    const statOverdue = document.getElementById("statOverdueCount");
    const statToday = document.getElementById("statTodayCount");
    const statSoon = document.getElementById("statSoonCount");
    const statPending = document.getElementById("statPendingCount");
    const statScheduled = document.getElementById("statScheduledCount");
    const statClosedMonth = document.getElementById("statClosedMonthCount");
    if (!statOverdue && !statToday && !statSoon && !statPending && !statScheduled && !statClosedMonth) return;

    const incomplete = projects.filter((p) => !["완료", "종료"].includes(p.status || "진행중"));

    const overdueProjects = incomplete.filter((p) => {
      const diff = getProjectDueDiffDays(p.dueDate);
      return diff !== null && diff < 0;
    });

    const soonProjects = incomplete.filter((p) => {
      const diff = getProjectDueDiffDays(p.dueDate);
      return diff !== null && diff >= 0 && diff <= URGENT_WINDOW_DAYS;
    });

    const urgentAlertProjects = incomplete.filter((p) => {
      if ((p.priority || "보통") !== "긴급") return false;
      const diff = getProjectDueDiffDays(p.dueDate);
      return diff !== null && diff <= 1;
    });

    const scheduledProjects = projects.filter((p) => (p.status || "진행중") === "예정");

    const closedThisMonthProjects = projects.filter(
      (p) => (p.status || "진행중") === "종료" && isInCurrentMonth(getProjectClosedDate(p))
    );

    if (statOverdue) statOverdue.textContent = overdueProjects.length;
    if (statToday) statToday.textContent = urgentAlertProjects.length;
    if (statSoon) statSoon.textContent = soonProjects.length;
    if (statPending) statPending.textContent = incomplete.length;
    if (statScheduled) statScheduled.textContent = scheduledProjects.length;
    if (statClosedMonth) statClosedMonth.textContent = closedThisMonthProjects.length;

    projectStatGroups = {
      overdue: overdueProjects,
      urgent: urgentAlertProjects,
      soon: soonProjects,
      incomplete,
      scheduled: scheduledProjects,
      closedThisMonth: closedThisMonthProjects,
    };
  }

  // ---- 프로젝트 달성률: 지정된 상태의 프로젝트를 달성률(progress) 높은 순으로 최대 5개 노출 ----
  function renderProjectRankList(listEl, projectsList, statuses = ["진행중"], emptyText = "진행중인 프로젝트가 없습니다") {
    if (!listEl) return;

    const ranked = projectsList
      .filter((p) => statuses.includes(p.status || "진행중"))
      .slice()
      .sort((a, b) => (b.progress || 0) - (a.progress || 0))
      .slice(0, 5);

    if (!ranked.length) {
      listEl.innerHTML = `<li class="task-empty">${emptyText}</li>`;
      return;
    }

    listEl.innerHTML = ranked
      .map((p, idx) => {
        const rank = idx + 1;
        const progress = Math.max(0, Math.min(100, p.progress || 0));
        return `
      <li class="rank-item" data-project-id="${p.id}">
        <span class="rank-number rank-${rank}">${rank}</span>
        <div class="rank-info">
          <span class="rank-title">${escapeHtml(p.title)}</span>
          <div class="rank-progress-track"><div class="rank-progress-fill" style="width:${progress}%"></div></div>
        </div>
        <span class="rank-value">${progress}%</span>
      </li>
    `;
      })
      .join("");
  }

  function renderProjectProgressRanking() {
    renderProjectRankList(document.getElementById("projectProgressRankList"), projects);
  }

  // ---- Dashboard stat card popover (mini project list) ----
  const statPopover = document.getElementById("statPopover");
  const statPopoverTitle = document.getElementById("statPopoverTitle");
  const statPopoverDesc = document.getElementById("statPopoverDesc");
  const statPopoverList = document.getElementById("statPopoverList");
  const statPopoverClose = document.getElementById("statPopoverClose");

  function closeStatPopover() {
    if (!statPopover) return;
    statPopover.hidden = true;
    delete statPopover.dataset.activeFilter;
  }

  function openStatPopover(filterKey, anchorEl) {
    if (!statPopover) return;
    const items = projectStatGroups[filterKey] || [];
    statPopoverTitle.textContent = STAT_FILTER_LABELS[filterKey] || "";
    if (statPopoverDesc) statPopoverDesc.textContent = STAT_FILTER_DESCRIPTIONS[filterKey] || "";
    statPopoverList.innerHTML = items.length
      ? items
          .map(
            (p) => `
        <li class="stat-popover-item" data-goto-project="${p.id}">
          <span class="stat-popover-item-title">${escapeHtml(p.title)}</span>
          ${p.dueDate ? `<span class="stat-popover-item-due">${formatProjectDate(p.dueDate)}</span>` : ""}
        </li>
      `
          )
          .join("")
      : `<li class="stat-popover-empty">해당하는 프로젝트가 없습니다</li>`;

    if (statPopover.parentElement !== document.body) {
      document.body.appendChild(statPopover);
    }
    const rect = anchorEl.getBoundingClientRect();
    const popoverWidth = statPopover.offsetWidth || 280;
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popoverWidth - 12);
    }
    statPopover.style.top = `${rect.bottom + 8}px`;
    statPopover.style.left = `${left}px`;
    statPopover.hidden = false;
    statPopover.dataset.activeFilter = filterKey;
  }

  function goToProject(projectId) {
    const projectNavLink = document.querySelector('.nav-link[data-page="page-project"]');
    if (projectNavLink) projectNavLink.click();
    setTimeout(() => {
      const card = document.querySelector(`.board-card[data-project-id="${projectId}"]`);
      if (!card) return;
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      card.classList.add("board-card-flash");
      setTimeout(() => card.classList.remove("board-card-flash"), 1600);
    }, 60);
  }

  document.querySelectorAll(".stat-card-clickable").forEach((card) => {
    card.addEventListener("click", () => {
      const key = card.dataset.statFilter;
      if (statPopover && !statPopover.hidden && statPopover.dataset.activeFilter === key) {
        closeStatPopover();
        return;
      }
      openStatPopover(key, card);
    });
  });

  if (statPopoverClose) statPopoverClose.addEventListener("click", closeStatPopover);

  if (statPopoverList) {
    statPopoverList.addEventListener("click", (e) => {
      const item = e.target.closest("[data-goto-project]");
      if (!item) return;
      closeStatPopover();
      goToProject(item.dataset.gotoProject);
    });
  }

  document.addEventListener("click", (e) => {
    if (
      statPopover &&
      !statPopover.hidden &&
      !statPopover.contains(e.target) &&
      !e.target.closest(".stat-card-clickable")
    ) {
      closeStatPopover();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && statPopover && !statPopover.hidden) closeStatPopover();
  });

  function renderAllTasks() {
    renderDashboardWidgets();
  }

  // ---------- Quick Notes (통화상담/임시미팅 등, 프로젝트와 무관한 간편 기록) ----------
  const QUICKNOTES_STORAGE_KEY = "planfra_quicknotes";

  function loadQuickNotes() {
    try {
      return JSON.parse(localStorage.getItem(QUICKNOTES_STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveQuickNotes() {
    localStorage.setItem(QUICKNOTES_STORAGE_KEY, JSON.stringify(quickNotes));
    if (window.db) window.db.collection("boardData").doc("quickNotes").set({ list: quickNotes }).catch((e) => console.error("saveQuickNotes sync failed", e));
  }

  let quickNotes = loadQuickNotes();

  const QUICKNOTE_PAGE_SIZE = 5;
  let quickNotePage = 1;

  function formatQuickNoteTime(iso) {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function renderQuickNotePagination(totalPages) {
    const paginationEl = document.getElementById("quickNotePagination");
    const numbersEl = document.getElementById("quickNotePageNumbers");
    const prevBtn = document.getElementById("quickNotePrevBtn");
    const nextBtn = document.getElementById("quickNoteNextBtn");
    if (!paginationEl || !numbersEl || !prevBtn || !nextBtn) return;

    // 페이지가 1개뿐이어도 "1" 페이지 번호를 항상 보여줘 레이아웃과 표시가 흔들리지 않게 한다
    const pageCount = Math.max(totalPages, 1);
    numbersEl.innerHTML = Array.from({ length: pageCount }, (_, i) => i + 1)
      .map(
        (p) =>
          `<button type="button" class="quicknote-page-btn${p === quickNotePage ? " is-active" : ""}" data-quicknote-page="${p}">${p}</button>`
      )
      .join("");
    prevBtn.disabled = quickNotePage <= 1;
    nextBtn.disabled = quickNotePage >= pageCount;
  }

  let quickNoteEditingId = null;

  function renderQuickNotes() {
    const listEl = document.getElementById("quickNoteList");
    if (!listEl) return;
    if (!quickNotes.length) {
      listEl.innerHTML = `<li class="quicknote-empty">기록된 노트가 없습니다</li>`;
      renderQuickNotePagination(0);
      return;
    }
    const sorted = quickNotes.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const totalPages = Math.max(1, Math.ceil(sorted.length / QUICKNOTE_PAGE_SIZE));
    if (quickNotePage > totalPages) quickNotePage = totalPages;
    if (quickNotePage < 1) quickNotePage = 1;

    const start = (quickNotePage - 1) * QUICKNOTE_PAGE_SIZE;
    const pageItems = sorted.slice(start, start + QUICKNOTE_PAGE_SIZE);

    listEl.innerHTML = pageItems
      .map((n) => {
        if (n.id === quickNoteEditingId) {
          return `
      <li class="quicknote-item is-editing" data-note-id="${n.id}">
        <div class="quicknote-item-body">
          <span class="quicknote-item-time">${formatQuickNoteTime(n.createdAt)}</span>
          <textarea class="quicknote-edit-textarea" data-edit-note-input="${n.id}">${escapeHtml(n.text)}</textarea>
        </div>
        <div class="quicknote-item-actions">
          <button type="button" class="quicknote-item-save" data-save-note="${n.id}" title="저장">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 13L9 17L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button type="button" class="quicknote-item-cancel" data-cancel-note-edit="${n.id}" title="취소">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
        </div>
      </li>
    `;
        }
        return `
      <li class="quicknote-item" data-note-id="${n.id}">
        <div class="quicknote-item-body">
          <span class="quicknote-item-time">${formatQuickNoteTime(n.createdAt)}</span>
          <div class="quicknote-item-text">${escapeHtml(n.text)}</div>
        </div>
        <div class="quicknote-item-actions">
          <button type="button" class="quicknote-item-edit" data-edit-note="${n.id}" title="수정">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button type="button" class="quicknote-item-delete" data-delete-note="${n.id}" title="삭제">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
        </div>
      </li>
    `;
      })
      .join("");

    renderQuickNotePagination(totalPages);
  }

  function addQuickNote(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    quickNotes.push({
      id: `n${Date.now()}${Math.random().toString(16).slice(2, 6)}`,
      text: trimmed,
      createdAt: new Date().toISOString(),
    });
    saveQuickNotes();
    quickNotePage = 1;
    renderQuickNotes();
  }

  function updateQuickNote(id, text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const note = quickNotes.find((n) => n.id === id);
    if (!note) return;
    note.text = trimmed;
    saveQuickNotes();
  }

  function deleteQuickNote(id) {
    quickNotes = quickNotes.filter((n) => n.id !== id);
    saveQuickNotes();
    renderQuickNotes();
  }

  const quickNoteInput = document.getElementById("quickNoteInput");
  const quickNoteAddBtn = document.getElementById("quickNoteAddBtn");
  const quickNoteList = document.getElementById("quickNoteList");

  if (quickNoteAddBtn && quickNoteInput) {
    quickNoteAddBtn.addEventListener("click", () => {
      addQuickNote(quickNoteInput.value);
      quickNoteInput.value = "";
      quickNoteInput.focus();
    });

    quickNoteInput.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        addQuickNote(quickNoteInput.value);
        quickNoteInput.value = "";
      }
    });
  }

  if (quickNoteList) {
    quickNoteList.addEventListener("click", (e) => {
      const editBtn = e.target.closest("[data-edit-note]");
      if (editBtn) {
        quickNoteEditingId = editBtn.dataset.editNote;
        renderQuickNotes();
        return;
      }

      const saveBtn = e.target.closest("[data-save-note]");
      if (saveBtn) {
        const id = saveBtn.dataset.saveNote;
        const textarea = quickNoteList.querySelector(`[data-edit-note-input="${id}"]`);
        if (textarea) updateQuickNote(id, textarea.value);
        quickNoteEditingId = null;
        renderQuickNotes();
        return;
      }

      const cancelBtn = e.target.closest("[data-cancel-note-edit]");
      if (cancelBtn) {
        quickNoteEditingId = null;
        renderQuickNotes();
        return;
      }

      const delBtn = e.target.closest("[data-delete-note]");
      if (!delBtn) return;
      deleteQuickNote(delBtn.dataset.deleteNote);
    });

    quickNoteList.addEventListener("keydown", (e) => {
      const textarea = e.target.closest("[data-edit-note-input]");
      if (!textarea) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        updateQuickNote(textarea.dataset.editNoteInput, textarea.value);
        quickNoteEditingId = null;
        renderQuickNotes();
      } else if (e.key === "Escape") {
        quickNoteEditingId = null;
        renderQuickNotes();
      }
    });
  }

  const quickNotePagination = document.getElementById("quickNotePagination");
  const quickNotePrevBtn = document.getElementById("quickNotePrevBtn");
  const quickNoteNextBtn = document.getElementById("quickNoteNextBtn");

  if (quickNotePrevBtn) {
    quickNotePrevBtn.addEventListener("click", () => {
      quickNotePage -= 1;
      renderQuickNotes();
    });
  }

  if (quickNoteNextBtn) {
    quickNoteNextBtn.addEventListener("click", () => {
      quickNotePage += 1;
      renderQuickNotes();
    });
  }

  if (quickNotePagination) {
    quickNotePagination.addEventListener("click", (e) => {
      const pageBtn = e.target.closest("[data-quicknote-page]");
      if (!pageBtn) return;
      quickNotePage = Number(pageBtn.dataset.quicknotePage);
      renderQuickNotes();
    });
  }

  renderQuickNotes();

  // ---------- Channel Notes (판매처 기록노트: 판매채널 대시보드별 간편 기록) ----------
  const CHANNEL_NOTES_STORAGE_KEY = "planfra_channel_notes";
  const CHANNEL_NOTE_PAGE_SIZE = 5;

  function loadChannelNotes() {
    try {
      return JSON.parse(localStorage.getItem(CHANNEL_NOTES_STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveChannelNotes() {
    localStorage.setItem(CHANNEL_NOTES_STORAGE_KEY, JSON.stringify(channelNotes));
    if (window.db) window.db.collection("boardData").doc("channelNotes").set({ list: channelNotes }).catch((e) => console.error("saveChannelNotes sync failed", e));
  }

  let channelNotes = loadChannelNotes();
  const channelNotePages = Object.keys(CHANNEL_LABELS).reduce((acc, key) => {
    acc[key] = 1;
    return acc;
  }, {});
  let channelNoteEditingId = null;

  function renderChannelNotePagination(channel, totalPages) {
    const paginationEl = document.querySelector(`[data-channel-note-pagination="${channel}"]`);
    const numbersEl = document.querySelector(`[data-channel-note-page-numbers="${channel}"]`);
    const prevBtn = document.querySelector(`[data-channel-note-prev="${channel}"]`);
    const nextBtn = document.querySelector(`[data-channel-note-next="${channel}"]`);
    if (!paginationEl || !numbersEl || !prevBtn || !nextBtn) return;

    const page = channelNotePages[channel] || 1;
    const pageCount = Math.max(totalPages, 1);
    numbersEl.innerHTML = Array.from({ length: pageCount }, (_, i) => i + 1)
      .map(
        (p) =>
          `<button type="button" class="quicknote-page-btn${p === page ? " is-active" : ""}" data-channel-note-page="${channel}" data-page-num="${p}">${p}</button>`
      )
      .join("");
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= pageCount;
  }

  function renderChannelNotes(channel) {
    const listEl = document.querySelector(`[data-channel-note-list="${channel}"]`);
    if (!listEl) return;

    const notes = channelNotes.filter((n) => n.channel === channel);
    if (!notes.length) {
      listEl.innerHTML = `<li class="quicknote-empty">기록된 노트가 없습니다</li>`;
      renderChannelNotePagination(channel, 0);
      return;
    }

    const sorted = notes.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const totalPages = Math.max(1, Math.ceil(sorted.length / CHANNEL_NOTE_PAGE_SIZE));
    let page = channelNotePages[channel] || 1;
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;
    channelNotePages[channel] = page;

    const start = (page - 1) * CHANNEL_NOTE_PAGE_SIZE;
    const pageItems = sorted.slice(start, start + CHANNEL_NOTE_PAGE_SIZE);

    listEl.innerHTML = pageItems
      .map((n) => {
        if (n.id === channelNoteEditingId) {
          return `
      <li class="quicknote-item is-editing" data-note-id="${n.id}">
        <div class="quicknote-item-body">
          <span class="quicknote-item-time">${formatQuickNoteTime(n.createdAt)}</span>
          <textarea class="quicknote-edit-textarea" data-edit-channel-note-input="${n.id}">${escapeHtml(n.text)}</textarea>
        </div>
        <div class="quicknote-item-actions">
          <button type="button" class="quicknote-item-save" data-save-channel-note="${n.id}" title="저장">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 13L9 17L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button type="button" class="quicknote-item-cancel" data-cancel-channel-note-edit="${n.id}" title="취소">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
        </div>
      </li>
    `;
        }
        return `
      <li class="quicknote-item" data-note-id="${n.id}">
        <div class="quicknote-item-body">
          <span class="quicknote-item-time">${formatQuickNoteTime(n.createdAt)}</span>
          <div class="quicknote-item-text">${escapeHtml(n.text)}</div>
        </div>
        <div class="quicknote-item-actions">
          <button type="button" class="quicknote-item-edit" data-edit-channel-note="${n.id}" title="수정">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button type="button" class="quicknote-item-delete" data-delete-channel-note="${n.id}" title="삭제">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
        </div>
      </li>
    `;
      })
      .join("");

    renderChannelNotePagination(channel, totalPages);
  }

  function renderAllChannelNotes() {
    Object.keys(CHANNEL_LABELS).forEach(renderChannelNotes);
  }

  function addChannelNote(channel, text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    channelNotes.push({
      id: `cn${Date.now()}${Math.random().toString(16).slice(2, 6)}`,
      channel,
      text: trimmed,
      createdAt: new Date().toISOString(),
    });
    saveChannelNotes();
    channelNotePages[channel] = 1;
    renderChannelNotes(channel);
  }

  function updateChannelNote(id, text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const note = channelNotes.find((n) => n.id === id);
    if (!note) return;
    note.text = trimmed;
    saveChannelNotes();
  }

  function deleteChannelNote(id) {
    const note = channelNotes.find((n) => n.id === id);
    channelNotes = channelNotes.filter((n) => n.id !== id);
    saveChannelNotes();
    if (note) renderChannelNotes(note.channel);
  }

  renderAllChannelNotes();

  // ---------- Consultation Console (call history + manual-matched AI answers) ----------
  const CONSULT_HISTORY_KEY = "planfra_consult_history";
  const CONSULT_MANUAL_KEY = "planfra_consult_manual";

  const DEFAULT_MANUAL = [
    {
      title: "배송 지연 문의",
      keywords: ["배송", "지연", "언제", "도착", "안와요", "안 와요"],
      answer: "불편을 드려 죄송합니다. 확인 결과 현재 물류 이슈로 배송이 지연되고 있으며, 영업일 기준 2~3일 이내 순차 발송될 예정입니다. 발송 즉시 문자로 송장번호를 안내드리겠습니다.",
    },
    {
      title: "교환/반품 문의",
      keywords: ["교환", "반품", "환불", "취소하고 싶어요"],
      answer: "네, 도와드리겠습니다. 상품 수령 후 7일 이내 단순 변심 교환/반품이 가능하며, 상품 상태(미개봉·미사용)에 따라 처리됩니다. 주문번호를 알려주시면 접수 도와드리겠습니다.",
    },
    {
      title: "상품 품절/재입고 문의",
      keywords: ["품절", "재입고", "재고", "언제 나와요"],
      answer: "현재 해당 상품은 일시 품절 상태입니다. 재입고 알림 신청을 해두시면 입고 즉시 문자로 안내드립니다. 예상 재입고 시점은 상품 상세페이지에서도 확인 가능합니다.",
    },
    {
      title: "주문 취소 문의",
      keywords: ["취소", "주문취소", "주문 취소"],
      answer: "출고 전 상태라면 바로 취소 처리가 가능합니다. 이미 출고된 경우에는 반품 접수로 안내드리고 있습니다. 주문번호 확인 후 즉시 처리해드리겠습니다.",
    },
    {
      title: "결제 오류 문의",
      keywords: ["결제", "오류", "실패", "결제가 안돼요", "결제안됨"],
      answer: "결제 오류로 불편을 드려 죄송합니다. 카드사 또는 통신사 인증 지연으로 발생하는 경우가 많으며, 잠시 후 재시도 부탁드립니다. 반복될 경우 다른 결제수단으로 안내드리겠습니다.",
    },
  ];

  function normalizePhone(v) {
    return (v || "").replace(/[^0-9]/g, "");
  }

  function loadConsultHistory() {
    try {
      return JSON.parse(localStorage.getItem(CONSULT_HISTORY_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveConsultHistory() {
    localStorage.setItem(CONSULT_HISTORY_KEY, JSON.stringify(consultHistory));
    if (window.db) window.db.collection("boardData").doc("consultHistory").set({ list: consultHistory }).catch((e) => console.error("saveConsultHistory sync failed", e));
  }

  let consultHistory = loadConsultHistory();

  function seedDefaultManual() {
    const seeded = DEFAULT_MANUAL.map((m, i) => ({
      id: `m${Date.now()}${i}${Math.random().toString(16).slice(2, 4)}`,
      ...m,
    }));
    localStorage.setItem(CONSULT_MANUAL_KEY, JSON.stringify(seeded));
    return seeded;
  }

  function loadManual() {
    try {
      const stored = JSON.parse(localStorage.getItem(CONSULT_MANUAL_KEY));
      if (Array.isArray(stored) && stored.length) return stored;
    } catch (e) {
      // fall through to seed defaults
    }
    return seedDefaultManual();
  }

  function saveManual() {
    localStorage.setItem(CONSULT_MANUAL_KEY, JSON.stringify(manualEntries));
    if (window.db) window.db.collection("boardData").doc("manualEntries").set({ list: manualEntries }).catch((e) => console.error("saveManual sync failed", e));
  }

  let manualEntries = loadManual();
  let currentConsultPhone = "";

  function matchManual(query) {
    const text = (query || "").toLowerCase();
    if (!text.trim()) return [];
    return manualEntries
      .map((m) => {
        const matched = (m.keywords || []).filter((k) => k && text.includes(k.toLowerCase()));
        return { entry: m, matched, score: matched.length };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  // ---- Consultation modal ----
  const consultFabBtn = document.getElementById("consultFabBtn");
  const consultModalOverlay = document.getElementById("consultModalOverlay");
  const consultPhoneInput = document.getElementById("consultPhoneInput");
  const consultNameInput = document.getElementById("consultNameInput");
  const consultOrderNoInput = document.getElementById("consultOrderNoInput");
  const consultInvoiceNoInput = document.getElementById("consultInvoiceNoInput");
  const consultChannelInput = document.getElementById("consultChannelInput");
  const consultCustomerStatus = document.getElementById("consultCustomerStatus");
  const consultHistoryList = document.getElementById("consultHistoryList");
  const consultHistoryCount = document.getElementById("consultHistoryCount");
  const consultRecordInput = document.getElementById("consultRecordInput");
  const consultAddRecordBtn = document.getElementById("consultAddRecordBtn");
  const consultSaveRecordBtn = document.getElementById("consultSaveRecordBtn");
  const consultAiList = document.getElementById("consultAiList");
  const consultAiCount = document.getElementById("consultAiCount");

  let consultHistoryEditingId = null;

  function renderConsultHistory() {
    const phone = currentConsultPhone;
    if (!phone) {
      consultHistoryList.innerHTML = `<li class="consult-history-empty">전화번호를 입력하면 상담 이력이 표시됩니다</li>`;
      consultHistoryCount.textContent = "0건";
      consultCustomerStatus.textContent = "";
      consultCustomerStatus.className = "consult-customer-status";
      return;
    }
    const items = consultHistory
      .filter((h) => h.phone === phone)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    consultHistoryCount.textContent = `${items.length}건`;
    consultCustomerStatus.textContent = items.length ? "기존 고객" : "신규 고객";
    consultCustomerStatus.className = `consult-customer-status ${items.length ? "is-existing" : "is-new"}`;
    consultHistoryList.innerHTML = items.length
      ? items
          .map((h) => {
            const tagsHtml = [h.customerName, h.channel]
              .filter(Boolean)
              .map((t) => `<span class="consult-history-tag">${escapeHtml(t)}</span>`)
              .join("");
            const subParts = [];
            if (h.orderNo) subParts.push(`주문번호 ${escapeHtml(h.orderNo)}`);
            if (h.invoiceNo) subParts.push(`송장번호 ${escapeHtml(h.invoiceNo)}`);
            const subHtml = subParts.length ? `<div class="consult-history-sub">${subParts.join(" · ")}</div>` : "";

            if (h.id === consultHistoryEditingId) {
              return `
        <li class="consult-history-item is-editing" data-history-id="${h.id}">
          <div class="consult-history-item-head">
            <span class="consult-history-time">${formatQuickNoteTime(h.createdAt)}</span>
            <div class="consult-history-item-actions">
              <button type="button" class="quicknote-item-save" data-save-history="${h.id}" title="저장">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 13L9 17L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button type="button" class="quicknote-item-cancel" data-cancel-history-edit="${h.id}" title="취소">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
              </button>
            </div>
          </div>
          <textarea class="consult-history-edit-textarea" data-edit-history-input="${h.id}">${escapeHtml(h.note)}</textarea>
          ${subHtml}
        </li>
      `;
            }

            return `
        <li class="consult-history-item" data-history-id="${h.id}">
          <div class="consult-history-item-head">
            <span class="consult-history-time">${formatQuickNoteTime(h.createdAt)}</span>
            <div class="consult-history-head-right">
              <div class="consult-history-meta">${tagsHtml}</div>
              <div class="consult-history-item-actions">
                <button type="button" class="quicknote-item-edit" data-edit-history="${h.id}" title="수정">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <button type="button" class="quicknote-item-delete" data-delete-history="${h.id}" title="삭제">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                </button>
              </div>
            </div>
          </div>
          <div class="consult-history-text">${escapeHtml(h.note)}</div>
          ${subHtml}
        </li>
      `;
          })
          .join("")
      : `<li class="consult-history-empty">상담 이력이 없습니다 (신규 고객)</li>`;
  }

  function updateConsultHistoryNote(id, text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const item = consultHistory.find((h) => h.id === id);
    if (!item) return;
    item.note = trimmed;
    saveConsultHistory();
  }

  function deleteConsultHistoryItem(id) {
    consultHistory = consultHistory.filter((h) => h.id !== id);
    saveConsultHistory();
    renderConsultHistory();
  }

  if (consultHistoryList) {
    consultHistoryList.addEventListener("click", (e) => {
      const editBtn = e.target.closest("[data-edit-history]");
      if (editBtn) {
        consultHistoryEditingId = editBtn.dataset.editHistory;
        renderConsultHistory();
        return;
      }

      const saveBtn = e.target.closest("[data-save-history]");
      if (saveBtn) {
        const id = saveBtn.dataset.saveHistory;
        const textarea = consultHistoryList.querySelector(`[data-edit-history-input="${id}"]`);
        if (textarea) updateConsultHistoryNote(id, textarea.value);
        consultHistoryEditingId = null;
        renderConsultHistory();
        return;
      }

      const cancelBtn = e.target.closest("[data-cancel-history-edit]");
      if (cancelBtn) {
        consultHistoryEditingId = null;
        renderConsultHistory();
        return;
      }

      const delBtn = e.target.closest("[data-delete-history]");
      if (!delBtn) return;
      deleteConsultHistoryItem(delBtn.dataset.deleteHistory);
    });

    consultHistoryList.addEventListener("keydown", (e) => {
      const textarea = e.target.closest("[data-edit-history-input]");
      if (!textarea) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        updateConsultHistoryNote(textarea.dataset.editHistoryInput, textarea.value);
        consultHistoryEditingId = null;
        renderConsultHistory();
      } else if (e.key === "Escape") {
        consultHistoryEditingId = null;
        renderConsultHistory();
      }
    });
  }

  // 조회 시 최근 이력에서 고객명/구매처를 찾아 비어있는 입력란만 채운다 (매번 다시 타이핑하지 않도록)
  function autofillFromLatestHistory(phone) {
    const latest = consultHistory
      .filter((h) => h.phone === phone)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!latest) return;
    if (!consultNameInput.value.trim() && latest.customerName) consultNameInput.value = latest.customerName;
    if (!consultChannelInput.value && latest.channel) consultChannelInput.value = latest.channel;
  }

  function renderConsultAi(query) {
    const results = matchManual(query);
    consultAiCount.textContent = `${results.length}건`;
    if (!query || !query.trim()) {
      consultAiList.innerHTML = `<li class="consult-ai-empty">왼쪽에 고객 문의 내용을 입력하면<br>일치하는 매뉴얼 답변을 추천합니다</li>`;
      return;
    }
    if (!results.length) {
      consultAiList.innerHTML = `<li class="consult-ai-empty">일치하는 매뉴얼이 없습니다<br>매뉴얼 관리에서 답변을 추가해보세요</li>`;
      return;
    }
    consultAiList.innerHTML = results
      .map(
        (r) => `
      <li class="consult-ai-item">
        <div class="consult-ai-item-head">
          <span class="consult-ai-item-title">${escapeHtml(r.entry.title)}</span>
          <span class="consult-ai-match-badge">${r.score}개 일치</span>
        </div>
        <div class="consult-ai-item-keywords">${r.matched
          .map((k) => `<span class="consult-ai-kw">${escapeHtml(k)}</span>`)
          .join("")}</div>
        <p class="consult-ai-item-answer">${escapeHtml(r.entry.answer)}</p>
      </li>
    `
      )
      .join("");
  }

  function openConsultModal() {
    consultModalOverlay.hidden = false;
    consultFabBtn.setAttribute("aria-expanded", "true");
    consultPhoneInput.value = "";
    consultNameInput.value = "";
    consultOrderNoInput.value = "";
    consultInvoiceNoInput.value = "";
    consultChannelInput.value = "";
    consultRecordInput.value = "";
    currentConsultPhone = "";
    consultHistoryEditingId = null;
    renderConsultHistory();
    renderConsultAi("");
    consultRecordInput.focus();
  }

  function closeConsultModal() {
    consultModalOverlay.hidden = true;
    consultFabBtn.setAttribute("aria-expanded", "false");
  }

  if (consultFabBtn && consultModalOverlay) {
    consultFabBtn.addEventListener("click", openConsultModal);
    document.getElementById("consultModalClose").addEventListener("click", closeConsultModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !consultModalOverlay.hidden && manualModalOverlay.hidden) {
        closeConsultModal();
      }
    });

    function lookupConsultHistory() {
      currentConsultPhone = normalizePhone(consultPhoneInput.value);
      renderConsultHistory();
      if (currentConsultPhone) autofillFromLatestHistory(currentConsultPhone);
    }

    consultPhoneInput.addEventListener("input", lookupConsultHistory);

    consultPhoneInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        lookupConsultHistory();
      }
    });

    consultRecordInput.addEventListener("input", () => {
      renderConsultAi(consultRecordInput.value);
    });

    // 연락처·고객명·구매처·주문번호·송장번호를 사람이 읽기 좋은 텍스트 블록으로 정리한다
    function buildCustomerInfoBlock() {
      const lines = [];
      const phoneDisplay = consultPhoneInput.value.trim();
      if (phoneDisplay) lines.push(`연락처: ${phoneDisplay}`);
      const name = consultNameInput.value.trim();
      if (name) lines.push(`고객명: ${name}`);
      const channel = consultChannelInput.value;
      if (channel) lines.push(`구매처: ${channel}`);
      const orderNo = consultOrderNoInput.value.trim();
      if (orderNo) lines.push(`주문번호: ${orderNo}`);
      const invoiceNo = consultInvoiceNoInput.value.trim();
      if (invoiceNo) lines.push(`송장번호: ${invoiceNo}`);
      return lines.join("\n");
    }

    consultAddRecordBtn.addEventListener("click", () => {
      const phone = normalizePhone(consultPhoneInput.value);
      if (!phone) {
        consultPhoneInput.focus();
        return;
      }

      // 고객정보는 상담이력에 바로 저장하지 않고, 상담내용 노트 맨 위에 붙인다.
      // 이미 적어둔 상담내용이 있으면 그 위에 추가하고, 없으면 그대로 채운다.
      const infoBlock = buildCustomerInfoBlock();
      const existingNote = consultRecordInput.value.trim();
      consultRecordInput.value = existingNote ? `${infoBlock}\n\n${existingNote}` : infoBlock;

      renderConsultAi(consultRecordInput.value);
      consultRecordInput.focus();
      const endPos = consultRecordInput.value.length;
      consultRecordInput.setSelectionRange(endPos, endPos);
    });

    consultSaveRecordBtn.addEventListener("click", () => {
      const phone = normalizePhone(consultPhoneInput.value);
      const note = consultRecordInput.value.trim();
      if (!phone || !note) {
        (phone ? consultRecordInput : consultPhoneInput).focus();
        return;
      }
      consultHistory.push({
        id: `h${Date.now()}${Math.random().toString(16).slice(2, 6)}`,
        phone,
        customerName: consultNameInput.value.trim(),
        channel: consultChannelInput.value,
        orderNo: consultOrderNoInput.value.trim(),
        invoiceNo: consultInvoiceNoInput.value.trim(),
        note,
        createdAt: new Date().toISOString(),
      });
      saveConsultHistory();
      currentConsultPhone = phone;
      renderConsultHistory();
      consultRecordInput.value = "";
    });
  }

  // ---- Manual management modal ----
  const manualModalOverlay = document.getElementById("manualModalOverlay");
  const manualTitleInput = document.getElementById("manualTitleInput");
  const manualKeywordsInput = document.getElementById("manualKeywordsInput");
  const manualAnswerInput = document.getElementById("manualAnswerInput");
  const manualEditIdInput = document.getElementById("manualEditId");
  const manualSaveBtn = document.getElementById("manualSaveBtn");
  const manualCancelEditBtn = document.getElementById("manualCancelEditBtn");
  const manualList = document.getElementById("manualList");
  const manualListCount = document.getElementById("manualListCount");
  const openManualBtn = document.getElementById("openManualBtn");

  function resetManualForm() {
    manualEditIdInput.value = "";
    manualTitleInput.value = "";
    manualKeywordsInput.value = "";
    manualAnswerInput.value = "";
    manualCancelEditBtn.hidden = true;
    manualSaveBtn.textContent = "저장";
  }

  function renderManualList() {
    manualListCount.textContent = `${manualEntries.length}건`;
    manualList.innerHTML = manualEntries.length
      ? manualEntries
          .map(
            (m) => `
        <li class="manual-item" data-manual-id="${m.id}">
          <div class="manual-item-body">
            <span class="manual-item-title">${escapeHtml(m.title)}</span>
            <div class="manual-item-keywords">${(m.keywords || [])
              .map((k) => `<span class="consult-ai-kw">${escapeHtml(k)}</span>`)
              .join("")}</div>
            <p class="manual-item-answer">${escapeHtml(m.answer)}</p>
          </div>
          <div class="manual-item-actions">
            <button type="button" class="ch-btn" data-edit-manual="${m.id}">수정</button>
            <button type="button" class="ch-btn ch-btn-delete" data-delete-manual="${m.id}">삭제</button>
          </div>
        </li>
      `
          )
          .join("")
      : `<li class="manual-empty">등록된 매뉴얼이 없습니다</li>`;
  }

  function openManualModal() {
    resetManualForm();
    renderManualList();
    manualModalOverlay.hidden = false;
    manualTitleInput.focus();
  }

  function closeManualModal() {
    manualModalOverlay.hidden = true;
  }

  if (openManualBtn && manualModalOverlay) {
    openManualBtn.addEventListener("click", openManualModal);
    document.getElementById("manualModalClose").addEventListener("click", closeManualModal);
    manualModalOverlay.addEventListener("click", (e) => {
      if (e.target === manualModalOverlay) closeManualModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !manualModalOverlay.hidden) closeManualModal();
    });

    manualSaveBtn.addEventListener("click", () => {
      const title = manualTitleInput.value.trim();
      const keywords = manualKeywordsInput.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const answer = manualAnswerInput.value.trim();
      if (!title || !keywords.length || !answer) return;

      const editId = manualEditIdInput.value;
      if (editId) {
        const m = manualEntries.find((x) => x.id === editId);
        if (m) {
          m.title = title;
          m.keywords = keywords;
          m.answer = answer;
        }
      } else {
        manualEntries.push({
          id: `m${Date.now()}${Math.random().toString(16).slice(2, 6)}`,
          title,
          keywords,
          answer,
        });
      }
      saveManual();
      resetManualForm();
      renderManualList();
    });

    manualCancelEditBtn.addEventListener("click", resetManualForm);

    manualList.addEventListener("click", (e) => {
      const editBtn = e.target.closest("[data-edit-manual]");
      if (editBtn) {
        const m = manualEntries.find((x) => x.id === editBtn.dataset.editManual);
        if (!m) return;
        manualEditIdInput.value = m.id;
        manualTitleInput.value = m.title;
        manualKeywordsInput.value = (m.keywords || []).join(", ");
        manualAnswerInput.value = m.answer;
        manualCancelEditBtn.hidden = false;
        manualSaveBtn.textContent = "수정 저장";
        manualTitleInput.focus();
        return;
      }
      const deleteBtn = e.target.closest("[data-delete-manual]");
      if (deleteBtn) {
        if (!confirm("이 매뉴얼을 삭제할까요?")) return;
        manualEntries = manualEntries.filter((x) => x.id !== deleteBtn.dataset.deleteManual);
        // 매뉴얼이 전부 삭제되면 답변가이드가 항상 결과 없음 상태로 멈추므로 기본 매뉴얼로 되돌린다
        if (!manualEntries.length) manualEntries = seedDefaultManual();
        saveManual();
        renderManualList();
      }
    });
  }

  function addTask(channel, title, dueDate, memo) {
    tasks.push({
      id: `t${Date.now()}${Math.random().toString(16).slice(2, 6)}`,
      channel,
      title,
      dueDate,
      memo,
      done: false,
      createdAt: new Date().toISOString(),
    });
    saveTasks();
  }

  function toggleTaskDone(id) {
    const task = tasks.find((t) => t.id === id);
    if (task) task.done = !task.done;
    saveTasks();
  }

  function deleteTask(id) {
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
  }

  const taskModalOverlay = document.getElementById("taskModalOverlay");
  const taskChannelSelect = document.getElementById("taskChannelSelect");
  const taskTitleInput = document.getElementById("taskTitleInput");
  const taskDueInput = document.getElementById("taskDueInput");
  const taskMemoInput = document.getElementById("taskMemoInput");

  function openTaskModal(channel) {
    taskChannelSelect.value = channel;
    taskTitleInput.value = "";
    taskDueInput.value = "";
    taskMemoInput.value = "";
    taskModalOverlay.hidden = false;
    taskTitleInput.focus();
  }

  function closeTaskModal() {
    taskModalOverlay.hidden = true;
  }

  document.querySelectorAll("[data-add-task]").forEach((btn) => {
    btn.addEventListener("click", () => openTaskModal(btn.dataset.addTask));
  });

  document.getElementById("taskModalClose").addEventListener("click", closeTaskModal);
  document.getElementById("taskCancel").addEventListener("click", closeTaskModal);
  taskModalOverlay.addEventListener("click", (e) => {
    if (e.target === taskModalOverlay) closeTaskModal();
  });

  document.getElementById("taskConfirm").addEventListener("click", () => {
    const title = taskTitleInput.value.trim();
    if (!title) {
      taskTitleInput.focus();
      return;
    }
    addTask(taskChannelSelect.value, title, taskDueInput.value, taskMemoInput.value.trim());
    closeTaskModal();
    renderAllTasks();
  });

  const contentEl = document.querySelector("main.content");

  contentEl.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest("[data-delete-task]");
    if (deleteBtn) {
      if (confirm("이 업무를 삭제할까요?")) {
        deleteTask(deleteBtn.dataset.deleteTask);
        renderAllTasks();
      }
      return;
    }

    const addProjectBtn = e.target.closest("[data-add-project]");
    if (addProjectBtn) {
      openProjectModal(addProjectBtn.dataset.addProject, addProjectBtn.dataset.addProjectChannel);
      return;
    }

    const editProjectBtn = e.target.closest("[data-edit-project]");
    if (editProjectBtn) {
      openProjectEditModal(editProjectBtn.dataset.editProject);
      return;
    }

    const deleteProjectBtn = e.target.closest("[data-delete-project]");
    if (deleteProjectBtn) {
      if (confirm("이 프로젝트를 삭제할까요?")) {
        deleteProject(deleteProjectBtn.dataset.deleteProject);
        renderBoard();
      }
      return;
    }

    const rankItem = e.target.closest(".rank-list [data-project-id], .deadline-alert-list [data-project-id]");
    if (rankItem) {
      goToProject(rankItem.dataset.projectId);
    }

    const channelNoteAddBtn = e.target.closest("[data-channel-note-add]");
    if (channelNoteAddBtn) {
      const channel = channelNoteAddBtn.dataset.channelNoteAdd;
      const input = document.querySelector(`[data-channel-note-input="${channel}"]`);
      if (input) {
        addChannelNote(channel, input.value);
        input.value = "";
        input.focus();
      }
      return;
    }

    const editChannelNoteBtn = e.target.closest("[data-edit-channel-note]");
    if (editChannelNoteBtn) {
      channelNoteEditingId = editChannelNoteBtn.dataset.editChannelNote;
      const note = channelNotes.find((n) => n.id === channelNoteEditingId);
      if (note) renderChannelNotes(note.channel);
      return;
    }

    const saveChannelNoteBtn = e.target.closest("[data-save-channel-note]");
    if (saveChannelNoteBtn) {
      const id = saveChannelNoteBtn.dataset.saveChannelNote;
      const note = channelNotes.find((n) => n.id === id);
      const textarea = document.querySelector(`[data-edit-channel-note-input="${id}"]`);
      if (textarea) updateChannelNote(id, textarea.value);
      channelNoteEditingId = null;
      if (note) renderChannelNotes(note.channel);
      return;
    }

    const cancelChannelNoteEditBtn = e.target.closest("[data-cancel-channel-note-edit]");
    if (cancelChannelNoteEditBtn) {
      const note = channelNotes.find((n) => n.id === cancelChannelNoteEditBtn.dataset.cancelChannelNoteEdit);
      channelNoteEditingId = null;
      if (note) renderChannelNotes(note.channel);
      return;
    }

    const deleteChannelNoteBtn = e.target.closest("[data-delete-channel-note]");
    if (deleteChannelNoteBtn) {
      deleteChannelNote(deleteChannelNoteBtn.dataset.deleteChannelNote);
      return;
    }

    const channelNotePrevBtn = e.target.closest("[data-channel-note-prev]");
    if (channelNotePrevBtn) {
      const channel = channelNotePrevBtn.dataset.channelNotePrev;
      channelNotePages[channel] = (channelNotePages[channel] || 1) - 1;
      renderChannelNotes(channel);
      return;
    }

    const channelNoteNextBtn = e.target.closest("[data-channel-note-next]");
    if (channelNoteNextBtn) {
      const channel = channelNoteNextBtn.dataset.channelNoteNext;
      channelNotePages[channel] = (channelNotePages[channel] || 1) + 1;
      renderChannelNotes(channel);
      return;
    }

    const channelNotePageBtn = e.target.closest("[data-channel-note-page]");
    if (channelNotePageBtn) {
      const channel = channelNotePageBtn.dataset.channelNotePage;
      channelNotePages[channel] = Number(channelNotePageBtn.dataset.pageNum);
      renderChannelNotes(channel);
    }
  });

  contentEl.addEventListener("keydown", (e) => {
    const noteInput = e.target.closest("[data-channel-note-input]");
    if (noteInput && (e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      const channel = noteInput.dataset.channelNoteInput;
      addChannelNote(channel, noteInput.value);
      noteInput.value = "";
      return;
    }

    const editInput = e.target.closest("[data-edit-channel-note-input]");
    if (editInput) {
      const id = editInput.dataset.editChannelNoteInput;
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        const note = channelNotes.find((n) => n.id === id);
        updateChannelNote(id, editInput.value);
        channelNoteEditingId = null;
        if (note) renderChannelNotes(note.channel);
      } else if (e.key === "Escape") {
        const note = channelNotes.find((n) => n.id === id);
        channelNoteEditingId = null;
        if (note) renderChannelNotes(note.channel);
      }
    }
  });

  contentEl.addEventListener("change", (e) => {
    const checkbox = e.target.closest("[data-toggle-task]");
    if (checkbox) {
      toggleTaskDone(checkbox.dataset.toggleTask);
      renderAllTasks();
    }
  });

  contentEl.addEventListener("dblclick", (e) => {
    if (e.target.closest(".board-card-actions")) return;
    const card = e.target.closest(".board-card");
    if (card) openProjectEditModal(card.dataset.projectId);
  });

  // ---- Custom mouse-based card drag (avoids native HTML5 DnD's flaky drop/snap-back behavior) ----
  const DRAG_MOVE_THRESHOLD = 5;

  function clearDragVisuals() {
    document.querySelectorAll(".board-card.is-pressed").forEach((el) => el.classList.remove("is-pressed"));
    document.querySelectorAll(".board-card.is-dragging").forEach((el) => el.classList.remove("is-dragging"));
    document.querySelectorAll(".board-cards.drag-over").forEach((el) => el.classList.remove("drag-over"));
    document.body.classList.remove("board-dragging-active");
  }

  function deselectAllCards() {
    document.querySelectorAll(".board-card.is-selected").forEach((el) => el.classList.remove("is-selected"));
  }

  contentEl.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest(".board-card-actions")) return;
    const card = e.target.closest(".board-card");
    if (!card) return;

    card.classList.add("is-pressed");

    const state = {
      id: card.dataset.projectId,
      card,
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
      ghost: null,
      offsetX: 0,
      offsetY: 0,
      dropZone: null,
    };

    function onMouseMove(ev) {
      const dx = ev.clientX - state.startX;
      const dy = ev.clientY - state.startY;

      if (!state.dragging && Math.hypot(dx, dy) > DRAG_MOVE_THRESHOLD) {
        state.dragging = true;
        card.classList.remove("is-pressed");
        card.classList.add("is-dragging");
        document.body.classList.add("board-dragging-active");

        const rect = card.getBoundingClientRect();
        state.offsetX = state.startX - rect.left;
        state.offsetY = state.startY - rect.top;

        const ghost = card.cloneNode(true);
        ghost.classList.add("board-card-ghost");
        ghost.style.width = `${rect.width}px`;
        ghost.style.left = `${rect.left}px`;
        ghost.style.top = `${rect.top}px`;
        document.body.appendChild(ghost);
        state.ghost = ghost;
      }

      if (state.dragging && state.ghost) {
        state.ghost.style.left = `${ev.clientX - state.offsetX}px`;
        state.ghost.style.top = `${ev.clientY - state.offsetY}px`;

        const elUnder = document.elementFromPoint(ev.clientX, ev.clientY);
        const dropZone = elUnder ? elUnder.closest(".board-cards") : null;
        if (dropZone !== state.dropZone) {
          document.querySelectorAll(".board-cards.drag-over").forEach((el) => el.classList.remove("drag-over"));
          if (dropZone) dropZone.classList.add("drag-over");
          state.dropZone = dropZone;
        }
      }
    }

    function onMouseUp() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      if (state.dragging) {
        if (state.ghost) state.ghost.remove();
        if (state.dropZone && state.dropZone.dataset.status) {
          moveProjectToStatus(state.id, state.dropZone.dataset.status);
        }
      } else {
        const alreadySelected = card.classList.contains("is-selected");
        deselectAllCards();
        if (!alreadySelected) card.classList.add("is-selected");
      }
      clearDragVisuals();
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".board-card")) {
      deselectAllCards();
    }
  });

  renderAllTasks();

  // ---------- Project Board ----------
  const PROJECTS_STORAGE_KEY = "planfra_projects";
  const STATUS_COLORS = ["#8983e0", "#26b862", "#f0883e", "#3b8ef0", "#ff5c7d", "#17a589"];
  const TAG_COLORS = [
    { bg: "#f1e8ff", color: "#7c4dff" },
    { bg: "#fdeee0", color: "#f0883e" },
    { bg: "#e2f6ea", color: "#26b862" },
    { bg: "#e2f0ff", color: "#3b8ef0" },
    { bg: "#ffe6ea", color: "#ff5c7d" },
    { bg: "#e2fbf6", color: "#17a589" },
  ];
  const PROJECT_CARD_ICON =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="M20 20L16.5 16.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  function loadProjects() {
    try {
      const stored = JSON.parse(localStorage.getItem(PROJECTS_STORAGE_KEY));
      if (!Array.isArray(stored)) return [];
      // 작성일이 없던 예전 데이터는 오늘로 채워 카드 표시·기간 필터에서 누락되지 않게 한다
      let patched = false;
      stored.forEach((p) => {
        if (!p.createdAt) {
          p.createdAt = new Date().toISOString();
          patched = true;
        }
      });
      if (patched) localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(stored));
      return stored;
    } catch (e) {
      return [];
    }
  }

  function saveProjects() {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    if (window.db) window.db.collection("boardData").doc("projects").set({ list: projects }).catch((e) => console.error("saveProjects sync failed", e));
  }

  let projects = loadProjects();

  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  function statusColor(status) {
    return STATUS_COLORS[hashString(status) % STATUS_COLORS.length];
  }

  function tagColor(tag) {
    return TAG_COLORS[hashString(tag) % TAG_COLORS.length];
  }

  function formatProjectDate(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${y}년 ${parseInt(m, 10)}월 ${parseInt(d, 10)}일`;
  }

  const STATUS_ORDER = ["예정", "진행중", "보류", "완료", "종료"];
  const activeStatusFilters = new Set();
  let boardSearchQuery = "";
  let boardRangeStart = "";
  let boardRangeEnd = "";

  function toDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function hasActiveRange() {
    return Boolean(boardRangeStart && boardRangeEnd);
  }

  function getProjectCreatedDate(p) {
    if (!p.createdAt) return "";
    const d = new Date(p.createdAt);
    return Number.isNaN(d.getTime()) ? "" : toDateKey(d);
  }

  function projectMatchesRange(p) {
    if (!hasActiveRange()) return true;
    // 마감기한이 없는 프로젝트는 작성일을 기준으로 본다
    const key = p.dueDate || getProjectCreatedDate(p);
    if (!key) return false;
    return key >= boardRangeStart && key <= boardRangeEnd;
  }

  function getVisibleStatuses() {
    if (activeStatusFilters.size === 0) return STATUS_ORDER;
    return STATUS_ORDER.filter((s) => activeStatusFilters.has(s));
  }

  function projectMatchesSearch(p, query) {
    if (!query) return true;
    const haystack = [p.title, p.channel, p.status, p.priority, stripHtml(p.note), ...(p.tags || [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  }

  function groupProjectsByStatus() {
    const groups = {};
    projects.forEach((p) => {
      const status = p.status || "진행중";
      if (!groups[status]) groups[status] = [];
      groups[status].push(p);
    });
    return groups;
  }

  const PRIORITY_TAG_COLORS = {
    "낮음": { bg: "#f5f6fb", color: "#8a8aa3" },
    "보통": { bg: "#e2f0ff", color: "#3b8ef0" },
    "긴급": { bg: "#ffe6ea", color: "#ff5c7d" },
  };
  const STATUS_TAG_COLORS = {
    "예정": { bg: "#eee6ff", color: "#6d4aff" },
    "진행중": { bg: "#e2f0ff", color: "#3b8ef0" },
    "보류": { bg: "#fdeee0", color: "#f0883e" },
    "완료": { bg: "#e2f6ea", color: "#26b862" },
    "종료": { bg: "#e9eaef", color: "#5c6270" },
  };

  function statusTagColor(status) {
    return STATUS_TAG_COLORS[status] || STATUS_TAG_COLORS["진행중"];
  }
  const EDIT_ICON =
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 5l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const DELETE_ICON =
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  function renderProjectCard(p) {
    const channel = p.channel || "쿠팡";
    const channelDotColor = statusColor(channel);
    const status = p.status || "진행중";
    const statusColorPair = statusTagColor(status);
    const statusTagHtml = `<span class="board-tag" style="background:${statusColorPair.bg};color:${statusColorPair.color}">${escapeHtml(status)}</span>`;
    const priority = p.priority || "보통";
    const priorityColor = PRIORITY_TAG_COLORS[priority] || PRIORITY_TAG_COLORS["보통"];
    const priorityTagHtml = `<span class="board-tag" style="background:${priorityColor.bg};color:${priorityColor.color}">${escapeHtml(priority)}</span>`;
    const tagsHtml = (p.tags || [])
      .map((t) => {
        const c = tagColor(t);
        return `<span class="board-tag" style="background:${c.bg};color:${c.color}">${escapeHtml(t)}</span>`;
      })
      .join("");
    const progress = Math.max(0, Math.min(100, p.progress || 0));
    const createdDate = getProjectCreatedDate(p);
    const dateRows = [];
    if (p.dueDate) {
      dateRows.push(`<span class="board-card-date">마감 ${formatProjectDate(p.dueDate)}</span>`);
    }
    if (createdDate) {
      dateRows.push(`<span class="board-card-created">작성 ${createdDate.replace(/-/g, ".")}</span>`);
    }
    const dateRowsHtml = dateRows.length ? `<div class="board-card-dates">${dateRows.join("")}</div>` : "";
    return `
      <div class="board-card" data-project-id="${p.id}">
        <div class="board-card-top">
          <span class="board-card-icon">${PROJECT_CARD_ICON}</span>
          <span class="board-card-title">${escapeHtml(p.title)}</span>
          <div class="board-card-actions">
            <button type="button" class="board-card-icon-btn board-card-edit-btn" data-edit-project="${p.id}" title="수정">${EDIT_ICON}</button>
            <button type="button" class="board-card-icon-btn board-card-delete-btn" data-delete-project="${p.id}" title="삭제">${DELETE_ICON}</button>
          </div>
        </div>
        ${dateRowsHtml}
        <div class="board-card-tags">${statusTagHtml}${priorityTagHtml}${tagsHtml}</div>
        <div class="board-card-progress">
          <div class="board-progress-track"><div class="board-progress-fill" style="width:${progress}%"></div></div>
          <span class="board-progress-label">${progress}%</span>
        </div>
        <div class="board-card-status">
          <span class="board-dot-sm" style="background:${channelDotColor}"></span>${escapeHtml(channel)}
        </div>
      </div>
    `;
  }

  function renderBoard() {
    renderProjectDashboardStats();
    renderProjectProgressRanking();
    const container = document.getElementById("boardColumns");
    if (container) {
      const groups = groupProjectsByStatus();
      const order = getVisibleStatuses();
      container.innerHTML = order
        .map((status) => {
          const allItems = groups[status] || [];
          const items = allItems.filter(
            (p) => projectMatchesSearch(p, boardSearchQuery) && projectMatchesRange(p)
          );
          const color = statusTagColor(status).color;
          const narrowed = Boolean(boardSearchQuery) || hasActiveRange();
          const emptyText = narrowed && allItems.length > 0 ? "조건에 맞는 카드가 없습니다" : "카드가 없습니다";
          const cardsHtml = items.length
            ? items.map(renderProjectCard).join("")
            : `<div class="board-empty">${emptyText}</div>`;
          return `
            <div class="board-column">
              <div class="board-column-header">
                <span class="board-dot" style="background:${color}"></span>
                <span class="board-column-title">${escapeHtml(status)}</span>
                <span class="board-column-count">${items.length}</span>
                <button type="button" class="board-add-btn" data-add-project="${escapeHtml(status)}" title="프로젝트 추가">+</button>
              </div>
              <div class="board-cards" data-status="${escapeHtml(status)}">${cardsHtml}</div>
            </div>
          `;
        })
        .join("");
    }
    renderAllChannelBoards();
  }

  // ---- 채널별 마감 임박 · 긴급 알림 ----
  // 프로젝트 하나당 알림 하나만 노출하며, 겹칠 경우 지연 > 긴급 > 임박 순으로 판정한다.
  // 판정 기준은 대시보드 통계 카드(renderProjectDashboardStats)와 동일하다.
  const DEADLINE_ALERT_LIMIT = 5;

  function ddayLabel(diff) {
    return diff === 0 ? "D-DAY" : `D-${diff}`;
  }

  function buildDeadlineAlerts(channelProjects) {
    return channelProjects
      .filter((p) => !["완료", "종료"].includes(p.status || "진행중"))
      .map((p) => {
        const diff = getProjectDueDiffDays(p.dueDate);
        if (diff === null) return null;
        if (diff < 0) {
          return { project: p, diff, tone: "danger", label: "마감 지남", dday: `D+${-diff}` };
        }
        if ((p.priority || "보통") === "긴급" && diff <= 1) {
          return { project: p, diff, tone: "danger", label: "긴급 프로젝트", dday: ddayLabel(diff) };
        }
        if (diff <= URGENT_WINDOW_DAYS) {
          return { project: p, diff, tone: "warn", label: "마감 임박", dday: ddayLabel(diff) };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a.diff - b.diff);
  }

  function renderChannelAlerts(channel) {
    const listEl = document.querySelector(`[data-deadline-alerts="${channel}"]`);
    if (!listEl) return;

    const channelLabel = CHANNEL_LABELS[channel];
    const channelProjects = projects.filter((p) => (p.channel || "쿠팡") === channelLabel);
    const alerts = buildDeadlineAlerts(channelProjects);

    const countEl = document.querySelector(`[data-deadline-alert-count="${channel}"]`);
    if (countEl) countEl.textContent = `${alerts.length}건`;

    if (!alerts.length) {
      listEl.innerHTML = `<li class="deadline-alert-empty">마감 임박·긴급 프로젝트가 없습니다</li>`;
      return;
    }

    listEl.innerHTML = alerts
      .slice(0, DEADLINE_ALERT_LIMIT)
      .map(
        (a) => `
          <li class="deadline-alert-item deadline-alert-${a.tone}" data-project-id="${a.project.id}">
            <span class="deadline-alert-dot">!</span>
            <span class="deadline-alert-body">
              <span class="deadline-alert-title">${escapeHtml(a.project.title)}</span>
              <span class="deadline-alert-desc">${escapeHtml(`${a.label} · ${a.dday}`)}</span>
              <span class="deadline-alert-meta">${escapeHtml(`${formatProjectDate(a.project.dueDate)} 마감`)}</span>
            </span>
          </li>
        `
      )
      .join("");
  }

  function renderChannelBoard(channel) {
    const container = document.querySelector(`[data-channel-rank="${channel}"]`);
    if (!container) return;
    const channelLabel = CHANNEL_LABELS[channel];
    const channelProjects = projects.filter((p) => (p.channel || "쿠팡") === channelLabel);
    renderProjectRankList(container, channelProjects, ["예정", "진행중", "보류"], "표시할 프로젝트가 없습니다");
    renderChannelAlerts(channel);
  }

  function renderAllChannelBoards() {
    Object.keys(CHANNEL_LABELS).forEach(renderChannelBoard);
  }

  // '종료'로 바뀌는 순간을 기록해 '이번달 종료 프로젝트' 집계 기준으로 쓴다
  function stampClosedAt(project, nextStatus) {
    if (nextStatus === "종료") {
      if (project.status !== "종료" || !project.closedAt) project.closedAt = new Date().toISOString();
    } else {
      delete project.closedAt;
    }
  }

  function addProject(title, dueDate, tags, status, priority, progress, note, channel) {
    const project = {
      id: `p${Date.now()}${Math.random().toString(16).slice(2, 6)}`,
      title,
      dueDate,
      tags,
      status,
      priority,
      progress,
      note,
      channel,
      createdAt: new Date().toISOString(),
    };
    if (status === "종료") project.closedAt = project.createdAt;
    projects.push(project);
    saveProjects();
  }

  function updateProject(id, title, dueDate, tags, status, priority, progress, note, channel) {
    const p = projects.find((item) => item.id === id);
    if (!p) return;
    p.title = title;
    p.dueDate = dueDate;
    p.tags = tags;
    stampClosedAt(p, status);
    p.status = status;
    p.priority = priority;
    p.progress = progress;
    p.note = note;
    p.channel = channel;
    saveProjects();
  }

  function deleteProject(id) {
    projects = projects.filter((p) => p.id !== id);
    saveProjects();
  }

  function moveProjectToStatus(id, newStatus) {
    const p = projects.find((item) => item.id === id);
    if (!p) return;
    if (p.status === newStatus) return;
    stampClosedAt(p, newStatus);
    p.status = newStatus;
    if (newStatus === "완료" || newStatus === "종료") {
      p.progress = 100;
    }
    saveProjects();
    renderBoard();
  }

  const projectModalOverlay = document.getElementById("projectModalOverlay");
  const projectModalTitleText = document.getElementById("projectModalTitleText");
  const projectTitleInput = document.getElementById("projectTitleInput");
  const projectNoteInput = document.getElementById("projectNoteInput");
  const projectTagsInput = document.getElementById("projectTagsInput");
  const projectStatusInput = document.getElementById("projectStatusInput");
  const projectPriorityInput = document.getElementById("projectPriorityInput");
  const projectChannelInput = document.getElementById("projectChannelInput");
  const projectProgressInput = document.getElementById("projectProgressInput");
  const projectProgressValue = document.getElementById("projectProgressValue");
  let editingProjectId = null;

  projectProgressInput.addEventListener("input", () => {
    projectProgressValue.textContent = `${projectProgressInput.value}%`;
  });

  // ---- Custom due-date picker ----
  const projectDuePicker = document.getElementById("projectDuePicker");
  const projectDueBtn = document.getElementById("projectDueBtn");
  const projectDueText = document.getElementById("projectDueText");
  const projectDuePopup = document.getElementById("projectDuePopup");
  const dpMonthLabel = document.getElementById("dpMonthLabel");
  const dpDaysGrid = document.getElementById("dpDaysGrid");

  let projectDueDate = "";
  let dpViewYear = new Date().getFullYear();
  let dpViewMonth = new Date().getMonth();

  function renderDatePickerCalendar() {
    dpMonthLabel.textContent = `${dpViewYear}년 ${dpViewMonth + 1}월`;
    const firstWeekday = new Date(dpViewYear, dpViewMonth, 1).getDay();
    const daysInMonth = new Date(dpViewYear, dpViewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(dpViewYear, dpViewMonth, 0).getDate();
    const todayStr = new Date().toISOString().slice(0, 10);

    const cells = [];
    for (let i = firstWeekday - 1; i >= 0; i--) {
      cells.push({ label: daysInPrevMonth - i, dateStr: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${dpViewYear}-${String(dpViewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ label: d, dateStr });
    }
    let nextLabel = 1;
    while (cells.length % 7 !== 0) {
      cells.push({ label: nextLabel++, dateStr: null });
    }

    dpDaysGrid.innerHTML = cells
      .map((c) => {
        if (!c.dateStr) {
          return `<span class="dp-day dp-day-muted">${c.label}</span>`;
        }
        const classes = ["dp-day"];
        if (c.dateStr === todayStr) classes.push("dp-day-today");
        if (c.dateStr === projectDueDate) classes.push("dp-day-selected");
        return `<button type="button" class="${classes.join(" ")}" data-date="${c.dateStr}">${c.label}</button>`;
      })
      .join("");
  }

  function setProjectDueDate(dateStr) {
    projectDueDate = dateStr;
    projectDueText.textContent = dateStr ? formatProjectDate(dateStr) : "날짜 선택";
  }

  function openDatePickerPopup() {
    const base = projectDueDate ? new Date(projectDueDate + "T00:00:00") : new Date();
    dpViewYear = base.getFullYear();
    dpViewMonth = base.getMonth();
    renderDatePickerCalendar();

    if (projectDuePopup.parentElement !== document.body) {
      document.body.appendChild(projectDuePopup);
    }
    const rect = projectDueBtn.getBoundingClientRect();
    projectDuePopup.style.position = "fixed";
    projectDuePopup.style.top = `${rect.bottom + 6}px`;
    projectDuePopup.style.left = `${rect.left}px`;
    projectDuePopup.hidden = false;
  }

  function closeDatePickerPopup() {
    projectDuePopup.hidden = true;
  }

  projectDueBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (projectDuePopup.hidden) {
      openDatePickerPopup();
    } else {
      closeDatePickerPopup();
    }
  });

  document.getElementById("dpPrevMonth").addEventListener("click", () => {
    dpViewMonth -= 1;
    if (dpViewMonth < 0) {
      dpViewMonth = 11;
      dpViewYear -= 1;
    }
    renderDatePickerCalendar();
  });

  document.getElementById("dpNextMonth").addEventListener("click", () => {
    dpViewMonth += 1;
    if (dpViewMonth > 11) {
      dpViewMonth = 0;
      dpViewYear += 1;
    }
    renderDatePickerCalendar();
  });

  dpDaysGrid.addEventListener("click", (e) => {
    const dayBtn = e.target.closest("[data-date]");
    if (!dayBtn) return;
    setProjectDueDate(dayBtn.dataset.date);
    closeDatePickerPopup();
  });

  document.getElementById("dpTodayBtn").addEventListener("click", () => {
    setProjectDueDate(new Date().toISOString().slice(0, 10));
    closeDatePickerPopup();
  });

  document.getElementById("dpClearBtn").addEventListener("click", () => {
    setProjectDueDate("");
    closeDatePickerPopup();
  });

  document.addEventListener("click", (e) => {
    if (!projectDuePopup.hidden && !projectDuePicker.contains(e.target) && !projectDuePopup.contains(e.target)) {
      closeDatePickerPopup();
    }
  });

  function setProjectProgress(value) {
    projectProgressInput.value = value;
    projectProgressValue.textContent = `${value}%`;
  }

  // ---- 프로젝트 노트: 링크 붙여넣기 지원 (contenteditable) ----
  const NOTE_URL_RE = /^(https?:\/\/|www\.)\S+$/i;

  function setProjectNoteContent(raw) {
    const str = raw || "";
    if (/<[a-z][\s\S]*>/i.test(str)) {
      projectNoteInput.innerHTML = str;
    } else {
      projectNoteInput.textContent = str;
    }
  }

  function getProjectNoteContent() {
    return projectNoteInput.textContent.trim() === "" ? "" : projectNoteInput.innerHTML;
  }

  function stripHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return div.textContent || "";
  }

  projectNoteInput.addEventListener("paste", (e) => {
    const text = (e.clipboardData || window.clipboardData).getData("text/plain");
    if (!text) return;
    e.preventDefault();
    const trimmed = text.trim();
    const isUrl = NOTE_URL_RE.test(trimmed);
    if (!isUrl) {
      document.execCommand("insertText", false, text);
      return;
    }
    const href = trimmed.startsWith("www.") ? `http://${trimmed}` : trimmed;
    const sel = window.getSelection();
    const hasSelection = sel && sel.rangeCount > 0 && !sel.isCollapsed && projectNoteInput.contains(sel.anchorNode);
    if (hasSelection) {
      document.execCommand("createLink", false, href);
      projectNoteInput.querySelectorAll(`a[href="${href}"]`).forEach((a) => {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      });
    } else {
      const html = `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(trimmed)}</a>`;
      document.execCommand("insertHTML", false, html);
    }
  });

  projectNoteInput.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (link && projectNoteInput.contains(link)) {
      e.preventDefault();
      window.open(link.href, "_blank", "noopener,noreferrer");
    }
  });

  function openProjectModal(status, channel) {
    editingProjectId = null;
    projectModalTitleText.textContent = "프로젝트 추가";
    projectTitleInput.value = "";
    setProjectNoteContent("");
    projectTagsInput.value = "";
    projectStatusInput.value = status || "진행중";
    projectPriorityInput.value = "보통";
    projectChannelInput.value = channel || "쿠팡";
    setProjectProgress(0);
    setProjectDueDate("");
    closeDatePickerPopup();
    projectModalOverlay.hidden = false;
    projectTitleInput.focus();
  }

  function openProjectEditModal(id) {
    const p = projects.find((item) => item.id === id);
    if (!p) return;
    editingProjectId = id;
    projectModalTitleText.textContent = "프로젝트 수정";
    projectTitleInput.value = p.title;
    setProjectNoteContent(p.note || "");
    projectTagsInput.value = (p.tags || []).join(", ");
    projectStatusInput.value = p.status || "진행중";
    projectPriorityInput.value = p.priority || "보통";
    projectChannelInput.value = p.channel || "쿠팡";
    setProjectProgress(p.progress || 0);
    setProjectDueDate(p.dueDate || "");
    closeDatePickerPopup();
    projectModalOverlay.hidden = false;
    projectTitleInput.focus();
  }

  // 제목이 비어 있으면 저장하지 않는다 (빈 카드 생성·제목 유실 방지)
  function saveProjectFromModal() {
    const title = projectTitleInput.value.trim();
    if (!title) return;
    const tags = projectTagsInput.value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const status = projectStatusInput.value;
    const priority = projectPriorityInput.value;
    const channel = projectChannelInput.value;
    const progress = parseInt(projectProgressInput.value, 10);
    const note = getProjectNoteContent();
    if (editingProjectId) {
      updateProject(editingProjectId, title, projectDueDate, tags, status, priority, progress, note, channel);
    } else {
      addProject(title, projectDueDate, tags, status, priority, progress, note, channel);
    }
  }

  // 닫기 = 저장. 저장/취소 버튼 없이 바깥 클릭·X·Esc로 자동 저장된다
  function closeProjectModal() {
    saveProjectFromModal();
    projectModalOverlay.hidden = true;
    closeDatePickerPopup();
    editingProjectId = null;
    renderBoard();
  }

  document.getElementById("projectModalClose").addEventListener("click", closeProjectModal);
  let projectModalOverlayClickAt = 0;
  projectModalOverlay.addEventListener("click", (e) => {
    if (e.target !== projectModalOverlay) return;
    const now = Date.now();
    if (now - projectModalOverlayClickAt < 500) {
      projectModalOverlayClickAt = 0;
      closeProjectModal();
    } else {
      projectModalOverlayClickAt = now;
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !projectModalOverlay.hidden) closeProjectModal();
  });

  const boardFilterWrap = document.getElementById("boardFilterWrap");
  const boardFilterBtn = document.getElementById("boardFilterBtn");
  const boardFilterPopup = document.getElementById("boardFilterPopup");
  const filterCountBadge = document.getElementById("filterCountBadge");
  const filterCheckboxes = document.querySelectorAll(".board-filter-checkbox");

  function updateFilterBadge() {
    if (activeStatusFilters.size > 0) {
      filterCountBadge.textContent = activeStatusFilters.size;
      filterCountBadge.hidden = false;
    } else {
      filterCountBadge.hidden = true;
    }
  }

  function syncFilterCheckboxes() {
    filterCheckboxes.forEach((cb) => {
      cb.checked = activeStatusFilters.has(cb.value);
    });
  }

  function openFilterPopup() {
    syncFilterCheckboxes();
    const rangePopup = document.getElementById("boardRangePopup");
    if (rangePopup) rangePopup.hidden = true;
    boardFilterPopup.hidden = false;
  }

  function closeFilterPopup() {
    boardFilterPopup.hidden = true;
  }

  if (boardFilterBtn) {
    boardFilterBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (boardFilterPopup.hidden) {
        openFilterPopup();
      } else {
        closeFilterPopup();
      }
    });

    document.getElementById("filterApplyBtn").addEventListener("click", () => {
      activeStatusFilters.clear();
      filterCheckboxes.forEach((cb) => {
        if (cb.checked) activeStatusFilters.add(cb.value);
      });
      updateFilterBadge();
      closeFilterPopup();
      renderBoard();
    });

    document.getElementById("filterResetBtn").addEventListener("click", () => {
      activeStatusFilters.clear();
      syncFilterCheckboxes();
      updateFilterBadge();
      closeFilterPopup();
      renderBoard();
    });

    document.addEventListener("click", (e) => {
      if (!boardFilterPopup.hidden && !boardFilterWrap.contains(e.target)) {
        closeFilterPopup();
      }
    });
  }

  // ---- Board due-date range picker ----
  const boardRangeWrap = document.getElementById("boardRangeWrap");
  const boardRangeBtn = document.getElementById("boardRangeBtn");
  const boardRangeText = document.getElementById("boardRangeText");
  const boardRangeClear = document.getElementById("boardRangeClear");
  const boardRangePopup = document.getElementById("boardRangePopup");
  const rangeFieldStart = document.getElementById("rangeFieldStart");
  const rangeFieldEnd = document.getElementById("rangeFieldEnd");
  const rangeStartValue = document.getElementById("rangeStartValue");
  const rangeEndValue = document.getElementById("rangeEndValue");
  const rangeMonthLabel = document.getElementById("rangeMonthLabel");
  const rangeDaysGrid = document.getElementById("rangeDaysGrid");

  // draft selection inside the popup; committed to boardRange* only on 적용
  let draftRangeStart = "";
  let draftRangeEnd = "";
  let rangeViewYear = new Date().getFullYear();
  let rangeViewMonth = new Date().getMonth();
  // 달력 클릭이 시작일을 채울지 종료일을 채울지
  let rangeEditing = "start";

  function compactDate(dateStr) {
    return dateStr.replace(/-/g, ".");
  }

  function formatRangeLabel(start, end) {
    return start === end ? compactDate(start) : `${compactDate(start)} ~ ${compactDate(end)}`;
  }

  function renderRangeFields() {
    const fill = (el, value) => {
      el.textContent = value ? compactDate(value) : "선택";
      el.classList.toggle("is-empty", !value);
    };
    fill(rangeStartValue, draftRangeStart);
    fill(rangeEndValue, draftRangeEnd);
    rangeFieldStart.classList.toggle("is-editing", rangeEditing === "start");
    rangeFieldEnd.classList.toggle("is-editing", rangeEditing === "end");
  }

  function pickRangeDate(picked) {
    if (rangeEditing === "start" || !draftRangeStart) {
      draftRangeStart = picked;
      draftRangeEnd = "";
      rangeEditing = "end";
    } else if (picked < draftRangeStart) {
      draftRangeEnd = draftRangeStart;
      draftRangeStart = picked;
      rangeEditing = "start";
    } else {
      draftRangeEnd = picked;
      rangeEditing = "start";
    }
  }

  function renderRangeCalendar() {
    rangeMonthLabel.textContent = `${rangeViewYear}년 ${rangeViewMonth + 1}월`;
    const firstWeekday = new Date(rangeViewYear, rangeViewMonth, 1).getDay();
    const daysInMonth = new Date(rangeViewYear, rangeViewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(rangeViewYear, rangeViewMonth, 0).getDate();
    const todayStr = toDateKey(new Date());

    const cells = [];
    for (let i = firstWeekday - 1; i >= 0; i--) {
      cells.push({ label: daysInPrevMonth - i, dateStr: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        label: d,
        dateStr: `${rangeViewYear}-${String(rangeViewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }
    let nextLabel = 1;
    while (cells.length % 7 !== 0) {
      cells.push({ label: nextLabel++, dateStr: null });
    }

    rangeDaysGrid.innerHTML = cells
      .map((c) => {
        if (!c.dateStr) {
          return `<span class="dp-day dp-day-muted">${c.label}</span>`;
        }
        const classes = ["dp-day"];
        if (c.dateStr === todayStr) classes.push("dp-day-today");
        if (draftRangeStart && c.dateStr === draftRangeStart) classes.push("dp-day-range-start");
        if (draftRangeEnd && c.dateStr === draftRangeEnd) classes.push("dp-day-range-end");
        if (
          draftRangeStart &&
          draftRangeEnd &&
          c.dateStr > draftRangeStart &&
          c.dateStr < draftRangeEnd
        ) {
          classes.push("dp-day-in-range");
        }
        return `<button type="button" class="${classes.join(" ")}" data-date="${c.dateStr}">${c.label}</button>`;
      })
      .join("");

    renderRangeFields();
  }

  function syncRangeButton() {
    if (hasActiveRange()) {
      boardRangeText.textContent = formatRangeLabel(boardRangeStart, boardRangeEnd);
      boardRangeBtn.classList.add("is-active");
      boardRangeClear.hidden = false;
    } else {
      boardRangeText.textContent = "날짜";
      boardRangeBtn.classList.remove("is-active");
      boardRangeClear.hidden = true;
    }
  }

  function applyRange(start, end) {
    boardRangeStart = start;
    boardRangeEnd = end;
    syncRangeButton();
    renderBoard();
  }

  function presetRange(preset) {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(start);
    if (preset === "thisMonth") {
      start.setDate(1);
      end.setTime(new Date(today.getFullYear(), today.getMonth() + 1, 0).getTime());
    } else if (preset === "nextMonth") {
      start.setTime(new Date(today.getFullYear(), today.getMonth() + 1, 1).getTime());
      end.setTime(new Date(today.getFullYear(), today.getMonth() + 2, 0).getTime());
    }
    return { start: toDateKey(start), end: toDateKey(end) };
  }

  function openRangePopup() {
    draftRangeStart = boardRangeStart;
    draftRangeEnd = boardRangeEnd;
    rangeEditing = "start";
    const base = draftRangeStart ? new Date(draftRangeStart + "T00:00:00") : new Date();
    rangeViewYear = base.getFullYear();
    rangeViewMonth = base.getMonth();
    renderRangeCalendar();
    boardRangePopup.hidden = false;
  }

  function closeRangePopup() {
    boardRangePopup.hidden = true;
  }

  if (boardRangeBtn) {
    boardRangePopup.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    boardRangeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (boardRangePopup.hidden) {
        closeFilterPopup();
        openRangePopup();
      } else {
        closeRangePopup();
      }
    });

    boardRangeClear.addEventListener("click", (e) => {
      e.stopPropagation();
      draftRangeStart = "";
      draftRangeEnd = "";
      closeRangePopup();
      applyRange("", "");
    });

    document.getElementById("rangePrevMonth").addEventListener("click", () => {
      rangeViewMonth -= 1;
      if (rangeViewMonth < 0) {
        rangeViewMonth = 11;
        rangeViewYear -= 1;
      }
      renderRangeCalendar();
    });

    document.getElementById("rangeNextMonth").addEventListener("click", () => {
      rangeViewMonth += 1;
      if (rangeViewMonth > 11) {
        rangeViewMonth = 0;
        rangeViewYear += 1;
      }
      renderRangeCalendar();
    });

    rangeDaysGrid.addEventListener("click", (e) => {
      const dayBtn = e.target.closest("[data-date]");
      if (!dayBtn) return;
      pickRangeDate(dayBtn.dataset.date);
      renderRangeCalendar();
    });

    boardRangePopup.querySelector("[data-range-custom]").addEventListener("click", () => {
      // 시작일부터 종료일까지 달력에서 직접 고르는 모드
      draftRangeStart = "";
      draftRangeEnd = "";
      rangeEditing = "start";
      renderRangeCalendar();
    });

    boardRangePopup.querySelectorAll("[data-range-field]").forEach((field) => {
      field.addEventListener("click", () => {
        rangeEditing = field.dataset.rangeField;
        renderRangeFields();
      });
    });

    boardRangePopup.querySelectorAll("[data-range-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const { start, end } = presetRange(btn.dataset.rangePreset);
        draftRangeStart = start;
        draftRangeEnd = end;
        rangeEditing = "start";
        const base = new Date(start + "T00:00:00");
        rangeViewYear = base.getFullYear();
        rangeViewMonth = base.getMonth();
        renderRangeCalendar();
      });
    });

    document.getElementById("rangeApplyBtn").addEventListener("click", () => {
      if (!draftRangeStart) {
        closeRangePopup();
        applyRange("", "");
        return;
      }
      // 하루만 선택했다면 그 하루만 조회
      applyRange(draftRangeStart, draftRangeEnd || draftRangeStart);
      closeRangePopup();
    });

    document.getElementById("rangeResetBtn").addEventListener("click", () => {
      draftRangeStart = "";
      draftRangeEnd = "";
      rangeEditing = "start";
      renderRangeCalendar();
    });

    document.addEventListener("click", (e) => {
      if (!boardRangePopup.hidden && !boardRangeWrap.contains(e.target)) {
        closeRangePopup();
      }
    });

    syncRangeButton();
  }

  const boardSearchInput = document.getElementById("boardSearchInput");
  const boardSearchClear = document.getElementById("boardSearchClear");

  if (boardSearchInput) {
    boardSearchInput.addEventListener("input", () => {
      boardSearchQuery = boardSearchInput.value.trim().toLowerCase();
      boardSearchClear.hidden = boardSearchQuery.length === 0;
      renderBoard();
    });

    boardSearchClear.addEventListener("click", () => {
      boardSearchInput.value = "";
      boardSearchQuery = "";
      boardSearchClear.hidden = true;
      renderBoard();
      boardSearchInput.focus();
    });
  }

  renderBoard();
  renderChannelShareDonuts();
  renderAllChannelDashboard();

  // ---------- System Status Modal (mock) ----------
  const SYSTEM_STATUS = {
    apiConnected: true,
    collectedAt: "26.09.03 23:30",
    groups: [
      {
        label: "수집",
        // 스케줄·최근 실행은 아직 설정 전이라 비워두면 표에 "—"로 표기된다
        items: [
          { name: "카페24 판매 수집", schedule: "", lastRun: "" },
        ],
      },
      {
        label: "알림·보고",
        items: [
          { name: "이사님 보고", schedule: "", lastRun: "" },
        ],
      },
    ],
  };

  const SYS_BADGE_CLASS = {
    중단됨: "sys-badge-stopped",
    오류: "sys-badge-error",
    예정: "sys-badge-scheduled",
    정상: "sys-badge-ok",
  };
  const SYS_ALERT_STATES = ["오류", "중단됨"];

  const systemStatusBtn = document.getElementById("systemStatusBtn");
  const systemModalOverlay = document.getElementById("systemModalOverlay");
  const sysViewTabs = document.getElementById("sysViewTabs");
  let sysActiveFilter = "all";

  function loadSystemStatus() {
    return SYSTEM_STATUS;
  }

  function sysItemState(item) {
    return item.state || "정상";
  }

  function sysItemMatchesFilter(item, filter) {
    if (filter === "all") return true;
    const isAlert = SYS_ALERT_STATES.includes(sysItemState(item));
    return filter === "alert" ? isAlert : !isAlert;
  }

  function renderSystemStatus() {
    const data = loadSystemStatus();
    const apiEl = document.getElementById("sysMetaApi");
    apiEl.textContent = data.apiConnected ? "연결됨" : "연결 끊김";
    apiEl.classList.toggle("is-positive", data.apiConnected);
    apiEl.classList.toggle("is-down", !data.apiConnected);
    document.getElementById("sysMetaCollected").textContent = data.collectedAt || "—";

    const groups = data.groups.filter((group) => group.items.length > 0);
    const allItems = groups.flatMap((group) => group.items);
    const alertCount = allItems.filter((item) => SYS_ALERT_STATES.includes(sysItemState(item))).length;

    document.getElementById("sysMetaTotal").textContent = `${allItems.length}개`;
    const alertEl = document.getElementById("sysMetaAlert");
    alertEl.textContent = `${alertCount}개`;
    document.getElementById("sysMetaAlertCard").classList.toggle("has-alert", alertCount > 0);

    const visibleGroups = groups
      .map((group, groupIndex) => ({
        group,
        groupIndex,
        items: group.items.filter((item) => sysItemMatchesFilter(item, sysActiveFilter)),
      }))
      .filter((entry) => entry.items.length > 0);

    const tbody = document.getElementById("sysTableBody");
    tbody.innerHTML = visibleGroups
      .map(({ group, groupIndex, items }) => {
        const rows = items
          .map((item) => {
            const state = sysItemState(item);
            const badgeClass = SYS_BADGE_CLASS[state] || "sys-badge-ok";
            const badge = `<span class="sys-badge ${badgeClass}">${state}</span>`;
            return `
              <div class="sys-row" data-group-body="${groupIndex}">
                <span class="sys-row-name" title="${item.name}">${item.name}</span>
                <span class="sys-row-schedule">${item.schedule || "—"}</span>
                <span class="sys-row-lastrun">${item.lastRun || "—"}</span>
                <span class="sys-row-state">${badge}</span>
              </div>`;
          })
          .join("");
        return `
          <button type="button" class="sys-group-row" data-group-toggle="${groupIndex}" aria-expanded="true">
            <span class="sys-group-toggle">−</span>
            <span class="sys-group-label">${group.label}</span>
            <span class="sys-group-count">${items.length}</span>
          </button>${rows}`;
      })
      .join("");

    document.getElementById("sysEmptyState").hidden = visibleGroups.length > 0;
    document.getElementById("systemStatusDot").hidden = alertCount === 0 && data.apiConnected;
  }

  if (sysViewTabs) {
    sysViewTabs.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-sys-filter]");
      if (!btn) return;
      sysActiveFilter = btn.dataset.sysFilter;
      sysViewTabs.querySelectorAll(".channel-view-btn").forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle("is-active", isActive);
        b.setAttribute("aria-pressed", String(isActive));
      });
      renderSystemStatus();
    });
  }

  function openSystemModal() {
    renderSystemStatus();
    systemModalOverlay.hidden = false;
  }

  function closeSystemModal() {
    systemModalOverlay.hidden = true;
  }

  if (systemStatusBtn && systemModalOverlay) {
    systemStatusBtn.addEventListener("click", openSystemModal);
    document.getElementById("systemModalClose").addEventListener("click", closeSystemModal);
    systemModalOverlay.addEventListener("click", (e) => {
      if (e.target === systemModalOverlay) closeSystemModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !systemModalOverlay.hidden) closeSystemModal();
    });

    document.getElementById("sysTableBody").addEventListener("click", (e) => {
      const toggle = e.target.closest("[data-group-toggle]");
      if (!toggle) return;
      const groupIndex = toggle.dataset.groupToggle;
      const collapsed = toggle.getAttribute("aria-expanded") === "false";
      toggle.setAttribute("aria-expanded", collapsed ? "true" : "false");
      toggle.querySelector(".sys-group-toggle").textContent = collapsed ? "−" : "+";
      document
        .querySelectorAll(`[data-group-body="${groupIndex}"]`)
        .forEach((row) => {
          row.hidden = !collapsed;
        });
    });

    renderSystemStatus();
  }

  // ---------- Firebase realtime sync (팀 공유 보드) ----------
  // 저장소별로 Firestore 문서 하나(boardData/<key>)에 배열 전체를 저장/구독한다.
  // 최초 tasks 리스너가 로그인 허용 여부 판정을 겸한다: 성공하면 나머지를 구독한다.
  let realtimeUnsubscribers = [];

  function detachRealtimeSync() {
    realtimeUnsubscribers.forEach((unsub) => unsub());
    realtimeUnsubscribers = [];
  }

  function attachRemainingStores() {
    realtimeUnsubscribers.push(
      db
        .collection("boardData")
        .doc("quickNotes")
        .onSnapshot((snap) => {
          const data = snap.data();
          quickNotes = data && Array.isArray(data.list) ? data.list : [];
          localStorage.setItem(QUICKNOTES_STORAGE_KEY, JSON.stringify(quickNotes));
          renderQuickNotes();
        })
    );

    realtimeUnsubscribers.push(
      db
        .collection("boardData")
        .doc("channelNotes")
        .onSnapshot((snap) => {
          const data = snap.data();
          channelNotes = data && Array.isArray(data.list) ? data.list : [];
          localStorage.setItem(CHANNEL_NOTES_STORAGE_KEY, JSON.stringify(channelNotes));
          renderAllChannelNotes();
        })
    );

    realtimeUnsubscribers.push(
      db
        .collection("boardData")
        .doc("manualEntries")
        .onSnapshot((snap) => {
          if (!snap.exists) {
            manualEntries = seedDefaultManual();
            saveManual();
            return;
          }
          const data = snap.data();
          manualEntries = Array.isArray(data.list) ? data.list : [];
          localStorage.setItem(CONSULT_MANUAL_KEY, JSON.stringify(manualEntries));
          renderManualList();
        })
    );

    realtimeUnsubscribers.push(
      db
        .collection("boardData")
        .doc("projects")
        .onSnapshot((snap) => {
          const data = snap.data();
          projects = data && Array.isArray(data.list) ? data.list : [];
          localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
          renderBoard();
        })
    );

    realtimeUnsubscribers.push(
      db
        .collection("boardData")
        .doc("consultHistory")
        .onSnapshot((snap) => {
          const data = snap.data();
          consultHistory = data && Array.isArray(data.list) ? data.list : [];
          localStorage.setItem(CONSULT_HISTORY_KEY, JSON.stringify(consultHistory));
          renderConsultHistory();
        })
    );
  }

  function attachRealtimeSync(attemptedEmail) {
    detachRealtimeSync();
    let gateOpened = false;
    realtimeUnsubscribers.push(
      db
        .collection("boardData")
        .doc("tasks")
        .onSnapshot(
          (snap) => {
            const data = snap.data();
            tasks = data && Array.isArray(data.list) ? data.list : [];
            localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
            renderAllTasks();
            if (!gateOpened) {
              gateOpened = true;
              window.__planfraAuthSuccess();
              attachRemainingStores();
            }
          },
          (err) => {
            console.error("tasks sync error", err);
            window.__planfraAuthDenied(attemptedEmail);
          }
        )
    );
  }

  window.attachRealtimeSync = attachRealtimeSync;
  window.detachRealtimeSync = detachRealtimeSync;
  (window.__planfraOnReadyQueue || []).forEach((fn) => fn());
  window.__planfraOnReadyQueue = [];
});
