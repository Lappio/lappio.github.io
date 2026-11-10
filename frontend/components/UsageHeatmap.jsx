import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./usage-heatmap.css";
import { usageCopy } from "../copy";

/**
 * UsageHeatmap — 可复用的「用量热力图」卡片。
 *
 * 数据形状（见 scripts/export-usage.mjs）：
 * {
 *   range: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" },
 *   totals: { tokens, requests, cost, cacheHitRate },
 *   days: { "YYYY-MM-DD": { tokens, requests, cost } }
 * }
 *
 * 只依赖 React；样式全部收在 .uh- 前缀下，拷进任意 React 站点即可使用。
 */

const WEEKS = 53;
const ROWS = 7;



/* ------------------------------------------------------------------ */
/* 日期与格式化工具                                                     */
/* ------------------------------------------------------------------ */

const pad2 = (n) => String(n).padStart(2, "0");

function isoDate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseISO(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** 周一为一周的开始 */
function startOfWeek(date) {
  const dow = (date.getDay() + 6) % 7;
  return addDays(date, -dow);
}

const numberFormatter = new Intl.NumberFormat("en-US");

function formatMetric(value) {
  if (!Number.isFinite(value)) return "0";
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${Math.round(value / 1e6)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return numberFormatter.format(value);
}

function formatBigTokens(value, lang) {
  if (lang === "zh" && value >= 1e8) return `${(value / 1e8).toFixed(2)} 亿`;
  return formatMetric(value);
}

function formatCost(value) {
  return numberFormatter.format(Math.round(value * 100) / 100);
}

function formatPercent(rate) {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatLongDate(date, lang) {
  if (lang === "zh") {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/* ------------------------------------------------------------------ */
/* 数据整理                                                             */
/* ------------------------------------------------------------------ */

function collectValues(days) {
  return Object.values(days || {})
    .map((day) => day?.tokens || 0)
    .filter((value) => value > 0)
    .sort((a, b) => a - b);
}

function makeLevelResolver(days) {
  const values = collectValues(days);
  if (!values.length) return () => 0;
  const quantile = (p) => values[Math.min(values.length - 1, Math.floor(p * (values.length - 1)))];
  const cuts = [quantile(0.2), quantile(0.4), quantile(0.6), quantile(0.8)];
  return (tokens) => {
    if (!tokens || tokens <= 0) return 0;
    let level = 1;
    for (const cut of cuts) if (tokens > cut) level += 1;
    return Math.min(level, 5);
  };
}

/* ------------------------------------------------------------------ */
/* 贪吃蛇路径                                                           */
/* ------------------------------------------------------------------ */

function buildSnakePath(blockStart, today, days, cellSize, step) {
  const points = [];
  let previous = null;

  const pushPoint = (x, y, meta) => {
    if (previous && previous.x === x && previous.y === y) {
      if (meta) Object.assign(previous, meta);
      return;
    }
    if (previous && previous.x !== x && previous.y !== y) {
      points.push({ x, y: previous.y, corner: true });
    }
    const point = { x, y, ...meta };
    points.push(point);
    previous = point;
  };

  for (let w = 0; w < WEEKS; w += 1) {
    const rows = [];
    for (let r = 0; r < ROWS; r += 1) {
      const date = addDays(blockStart, w * ROWS + r);
      if (date > today) continue;
      const day = days[isoDate(date)];
      if (day && day.tokens > 0) rows.push(r);
    }
    if (!rows.length) continue;

    const ordered = w % 2 === 0 ? rows : rows.slice().reverse();
    for (const r of ordered) {
      const x = w * step + cellSize / 2;
      const y = r * step + cellSize / 2;
      pushPoint(x, y, { date: isoDate(addDays(blockStart, w * ROWS + r)), row: r });
    }
  }

  if (points.length < 2) return null;

  let travelled = 0;
  const marks = [];
  const stops = [{ x: points[0].x, y: points[0].y, offset: 0 }];

  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    travelled += Math.hypot(b.x - a.x, b.y - a.y);
    stops.push({ x: b.x, y: b.y, offset: travelled });
    if (b.date) marks.push({ offset: travelled, date: b.date });
  }

  return { marks, length: travelled, stops };
}

/** 在折线上按弧长取点，避免每帧调用 getPointAtLength */
function makePointAt(stops, total) {
  return (distance) => {
    const target = Math.max(0, Math.min(total, distance));
    let low = 0;
    let high = stops.length - 1;
    while (low < high - 1) {
      const mid = (low + high) >> 1;
      if (stops[mid].offset <= target) low = mid;
      else high = mid;
    }
    const a = stops[low];
    const b = stops[high];
    const span = b.offset - a.offset || 1;
    const ratio = Math.max(0, Math.min(1, (target - a.offset) / span));
    return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
  };
}

/* ------------------------------------------------------------------ */
/* 单个 53 周分段                                                       */
/* ------------------------------------------------------------------ */

function Segment({ blockStart, today, days, levelOf, copy, lang, cellSize, gap, snakeEnabled, open }) {
  const step = cellSize + gap;
  const width = WEEKS * step - gap;
  const height = ROWS * step - gap;

  const snakeGroupRef = useRef(null);
  const headRef = useRef(null);
  const segmentRefs = useRef([]);
  const eyeRefs = useRef([]);
  const cellRefs = useRef(new Map());

  const [hover, setHover] = useState(null);
  const tooltipRef = useRef(null);

  useLayoutEffect(() => {
    if (!hover) return undefined;
    if (!open) {
      setHover(null);
      return undefined;
    }
    const tooltip = tooltipRef.current;
    // The top layer escapes both the chart's scrolling clip and the collapse clip,
    // while keeping the card's inherited theme variables.
    tooltip.showPopover();
    const position = () => {
      const anchor = hover.anchor.getBoundingClientRect();
      const bounds = tooltip.getBoundingClientRect();
      const margin = 8;
      const center = anchor.left + anchor.width / 2;
      const left = Math.max(margin, Math.min(
        document.documentElement.clientWidth - bounds.width - margin,
        center - bounds.width / 2,
      ));
      const above = anchor.top - bounds.height - margin;
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${above >= margin ? above : anchor.bottom + margin}px`;
    };
    position();

    // Do not leave a viewport-positioned tooltip behind when its anchor moves.
    const onScroll = () => {
      // Focusing a date can scroll both the page and the calendar into view.
      if (document.activeElement === hover.anchor) position();
      else setHover(null);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", position);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", position);
      if (tooltip.matches(":popover-open")) tooltip.hidePopover();
    };
  }, [hover, open]);

  const weeks = useMemo(() => {
    const result = [];
    for (let w = 0; w < WEEKS; w += 1) {
      const column = [];
      for (let r = 0; r < ROWS; r += 1) {
        const date = addDays(blockStart, w * ROWS + r);
        const iso = isoDate(date);
        const future = date > today;
        column.push({
          iso,
          date,
          future,
          row: r,
          col: w,
          day: future ? null : days[iso] || null,
        });
      }
      result.push(column);
    }
    return result;
  }, [blockStart, today, days]);

  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    let lastCol = -99;
    for (let w = 0; w < WEEKS; w += 1) {
      const date = addDays(blockStart, w * ROWS);
      if (date.getMonth() === lastMonth) continue;
      lastMonth = date.getMonth();
      if (w - lastCol >= 3) {
        labels.push({ col: w, text: copy.months[date.getMonth()] });
        lastCol = w;
      }
    }
    return labels;
  }, [blockStart, copy.months]);

  const totals = useMemo(() => {
    let tokens = 0;
    let requests = 0;
    let cost = 0;
    for (const column of weeks) {
      for (const cell of column) {
        if (cell.day) {
          tokens += cell.day.tokens || 0;
          requests += cell.day.requests || 0;
          cost += cell.day.cost || 0;
        }
      }
    }
    return { tokens, requests, cost };
  }, [weeks]);

  const blockEnd = useMemo(() => {
    const end = addDays(blockStart, WEEKS * ROWS - 1);
    return end > today ? today : end;
  }, [blockStart, today]);

  const snake = useMemo(
    () => buildSnakePath(blockStart, today, days, cellSize, step),
    [blockStart, today, days, cellSize, step],
  );

  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!snakeEnabled || !open || reducedMotion || !snake) return undefined;
    const group = snakeGroupRef.current;
    const head = headRef.current;
    if (!group || !head) return undefined;

    const total = snake.length;
    if (!total) return undefined;

    const pointAt = makePointAt(snake.stops, total);
    const segmentCount = 34;
    const bodyRadius = cellSize * 0.42;
    const headRadius = cellSize * 0.56;
    const tailRadius = cellSize * 0.14;
    const baseLength = Math.min(Math.max(cellSize * 6.5, 80), total * 0.4);
    const maxLength = Math.min(total * 0.7, baseLength + cellSize * 6);
    const speed = 56; // px / s
    const marks = snake.marks;

    let headPosition = -baseLength;
    let length = baseLength;
    let targetLength = baseLength;
    let previousTime = performance.now();
    let holdUntil = 0;
    let activeDate = "";
    let raf = 0;
    const timers = [];

    const setActiveCell = (iso, canEat) => {
      if (iso === activeDate) return;
      const previousCell = cellRefs.current.get(activeDate);
      if (previousCell) previousCell.classList.remove("is-here");
      activeDate = iso;
      const nextCell = cellRefs.current.get(iso);
      if (!nextCell) return;
      nextCell.classList.add("is-here");
      if (!canEat) return;
      nextCell.classList.remove("is-eaten");
      // 强制重播吃掉动画
      void nextCell.offsetWidth;
      nextCell.classList.add("is-eaten");
      timers.push(setTimeout(() => nextCell.classList.remove("is-eaten"), 700));
    };

    const markAt = (position) => {
      let low = 0;
      let high = marks.length - 1;
      let found = marks[0];
      while (low <= high) {
        const mid = (low + high) >> 1;
        if (marks[mid].offset <= position) {
          found = marks[mid];
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      return found;
    };

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const delta = Math.min(0.064, (now - previousTime) / 1000);
      previousTime = now;

      if (now < holdUntil) return;

      headPosition += speed * delta;

      if (headPosition - length > total) {
        // 从头再来
        headPosition = -length;
        activeDate = "";
        for (const cell of cellRefs.current.values()) cell.classList.remove("is-here", "is-eaten");
        holdUntil = now + 1500;
        group.style.opacity = "0";
        return;
      }

      const clampedHead = Math.max(0, Math.min(total, headPosition));
      const mark = markAt(clampedHead);
      const level = levelOf(days[mark.date]?.tokens || 0);
      targetLength = level >= 4 ? maxLength : baseLength;
      length += (targetLength - length) * Math.min(1, delta * 4.5);

      const visible = headPosition >= 0;
      group.style.opacity = visible ? "1" : "0";
      if (!visible) return;

      // 高亮跟随蛇头所在的格子（不只是有数据的那一格）
      const headPoint = pointAt(clampedHead);
      const headCol = Math.floor(headPoint.x / step);
      const headRow = Math.floor(headPoint.y / step);
      const headIso = isoDate(addDays(blockStart, headCol * ROWS + headRow));
      setActiveCell(headIso, (days[headIso]?.tokens || 0) > 0);

      // 锥形身体：从蛇头到蛇尾画一串半径递减的圆
      for (let i = 0; i < segmentCount; i += 1) {
        const node = segmentRefs.current[i];
        if (!node) continue;
        const distance = headPosition - (length * i) / (segmentCount - 1);
        if (distance <= 0) {
          node.setAttribute("r", "0");
          continue;
        }
        const point = pointAt(distance);
        const ratio = i / (segmentCount - 1);
        const radius = tailRadius + (bodyRadius - tailRadius) * Math.pow(1 - ratio, 0.7);
        node.setAttribute("cx", point.x.toFixed(2));
        node.setAttribute("cy", point.y.toFixed(2));
        node.setAttribute("r", radius.toFixed(2));
      }

      if (headPosition <= total) {
        const point = pointAt(headPosition);
        head.setAttribute("cx", point.x.toFixed(2));
        head.setAttribute("cy", point.y.toFixed(2));
        head.setAttribute("r", headRadius.toFixed(2));

        // 眼睛朝向前进方向
        const behind = pointAt(headPosition - Math.max(2, cellSize * 0.9));
        let dx = point.x - behind.x;
        let dy = point.y - behind.y;
        const magnitude = Math.hypot(dx, dy) || 1;
        dx /= magnitude;
        dy /= magnitude;
        const sideX = -dy;
        const sideY = dx;
        const forward = headRadius * 0.4;
        const side = headRadius * 0.42;
        const eyeRadius = Math.max(1, headRadius * 0.2);
        const eyes = [
          { x: point.x + dx * forward + sideX * side, y: point.y + dy * forward + sideY * side },
          { x: point.x + dx * forward - sideX * side, y: point.y + dy * forward - sideY * side },
        ];
        eyes.forEach((eye, index) => {
          const node = eyeRefs.current[index];
          if (!node) return;
          node.setAttribute("cx", eye.x.toFixed(2));
          node.setAttribute("cy", eye.y.toFixed(2));
          node.setAttribute("r", eyeRadius.toFixed(2));
        });
      } else {
        head.setAttribute("r", "0");
        for (const node of eyeRefs.current) if (node) node.setAttribute("r", "0");
      }
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      for (const timer of timers) clearTimeout(timer);
      for (const cell of cellRefs.current.values()) {
        cell.classList.remove("is-here", "is-eaten");
      }
    };
  }, [snakeEnabled, open, reducedMotion, snake, cellSize, days, levelOf]);

  const showTooltip = (cell, anchor) => {
    if (!cell.day) return;
    setHover({ ...cell, anchor });
  };

  const hideTooltip = () => setHover(null);

  const rangeText = `${formatLongDate(blockStart, lang)} – ${formatLongDate(blockEnd, lang)}`;
  const summary = copy.ariaSummary(
    formatLongDate(blockStart, lang),
    formatLongDate(blockEnd, lang),
    formatBigTokens(totals.tokens, lang),
    numberFormatter.format(totals.requests),
  );

  return (
    <div className="uh-segment">
      <p className="uh-range">
        <strong>{rangeText}</strong>
        <span className="uh-range-stats">
          {formatBigTokens(totals.tokens, lang)} {copy.tokenUnit} · {numberFormatter.format(totals.requests)}{" "}
          {copy.requestsUnit} · ${formatCost(totals.cost)}
        </span>
      </p>

      <div className="uh-chart">
        <div className="uh-months" style={{ width }}>
          {monthLabels.map((label) => (
            <span key={`${label.col}-${label.text}`} className="uh-month" style={{ left: label.col * step }}>
              {label.text}
            </span>
          ))}
        </div>

        <div className="uh-plot-row">
          <div className="uh-weekdays" style={{ height }}>
            {copy.weekdayMarks.map((text, index) => (
              <span key={index} className="uh-weekday" style={{ top: index * step }}>
                {text}
              </span>
            ))}
          </div>

          <div className="uh-plot" style={{ width, height }}>
            <div
              className="uh-grid"
              style={{
                gridTemplateColumns: `repeat(${WEEKS}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${ROWS}, ${cellSize}px)`,
                gap,
              }}
              role="group"
              aria-label={summary}
            >
              {weeks.map((column) =>
                column.map((cell) => {
                  const level = cell.day ? levelOf(cell.day.tokens) : 0;
                  return (
                    <div
                      key={cell.iso}
                      ref={(node) => {
                        if (node) cellRefs.current.set(cell.iso, node);
                        else cellRefs.current.delete(cell.iso);
                      }}
                      className={`uh-cell uh-level-${level}${cell.future ? " is-future" : ""}${
                        cell.day ? "" : " is-empty"
                      }`}
                      aria-hidden={cell.day ? undefined : true}
                      role={cell.day ? "img" : undefined}
                      tabIndex={cell.day && open ? 0 : undefined}
                      aria-label={cell.day ? `${formatLongDate(cell.date, lang)}: ${copy.dayDetail(formatMetric(cell.day.tokens), numberFormatter.format(cell.day.requests), formatCost(cell.day.cost))}` : undefined}
                      onFocus={(event) => showTooltip(cell, event.currentTarget)}
                      onBlur={hideTooltip}
                      onClick={(event) => showTooltip(cell, event.currentTarget)}
                      onKeyDown={(event) => { if (event.key === "Escape") hideTooltip(); }}
                      onMouseEnter={(event) => showTooltip(cell, event.currentTarget)}
                      onMouseLeave={(event) => { if (document.activeElement !== event.currentTarget) hideTooltip(); }}
                    />
                  );
                }),
              )}
            </div>

            {snake && (
              <svg
                className="uh-snake-layer"
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                aria-hidden="true"
              >
                <g ref={snakeGroupRef} className="uh-snake" style={{ opacity: 0 }}>
                  {Array.from({ length: 34 }, (_, index) => (
                    <circle
                      key={`seg-${index}`}
                      ref={(node) => {
                        segmentRefs.current[index] = node;
                      }}
                      className="uh-snake-seg"
                      r="0"
                    />
                  ))}
                  <circle ref={headRef} className="uh-snake-head" r="0" />
                  {[0, 1].map((index) => (
                    <circle
                      key={`eye-${index}`}
                      ref={(node) => {
                        eyeRefs.current[index] = node;
                      }}
                      className="uh-snake-eye"
                      r="0"
                    />
                  ))}
                </g>
              </svg>
            )}

            {hover && open && (
              <div ref={tooltipRef} className="uh-tip" popover="manual" role="tooltip">
                <div className="uh-tip-date">{formatLongDate(hover.date, lang)}</div>
                <div className="uh-tip-meta">
                  {copy.dayDetail(
                    formatMetric(hover.day.tokens),
                    numberFormatter.format(hover.day.requests),
                    formatCost(hover.day.cost),
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="uh-legend">
          <span>{copy.less}</span>
          {[1, 2, 3, 4, 5].map((level) => (
            <span key={level} className={`uh-swatch uh-level-${level}`} />
          ))}
          <span>{copy.more}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 卡片                                                                 */
/* ------------------------------------------------------------------ */

export default function UsageHeatmap({
  data,
  lang = "zh",
  theme = "auto",
  defaultOpen = true,
  showSnake = true,
  cellSize = 13,
  gap = 3,
  title = null,
  className = "",
}) {
  const copy = usageCopy[lang] || usageCopy.zh;
  const bodyId = useId();
  const [open, setOpen] = useState(defaultOpen);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const days = data?.days || {};

  const blocks = useMemo(() => {
    const starts = Object.keys(days).sort();
    if (!starts.length) return [];
    const earliest = parseISO(starts[0]);
    // 最新一段以「今天所在周」结尾，向前铺满 53 列
    const latestStart = addDays(startOfWeek(today), -(WEEKS - 1) * ROWS);
    const result = [latestStart];
    let cursor = latestStart;
    let guard = 0;
    while (earliest < cursor && guard < 12) {
      cursor = addDays(cursor, -WEEKS * ROWS);
      result.push(cursor);
      guard += 1;
    }
    return result;
  }, [days, today]);

  const levelOf = useMemo(() => makeLevelResolver(days), [days]);

  const totals = useMemo(() => {
    if (data?.totals) return data.totals;
    let tokens = 0;
    let requests = 0;
    let cost = 0;
    for (const day of Object.values(days)) {
      tokens += day.tokens || 0;
      requests += day.requests || 0;
      cost += day.cost || 0;
    }
    return { tokens, requests, cost, cacheHitRate: 0 };
  }, [data, days]);

  const stats = [
    { label: copy.totalCost, help: copy.totalCostHelp, value: `$${formatCost(totals.cost)}` },
    { label: copy.totalRequests, help: copy.totalRequestsHelp, value: numberFormatter.format(totals.requests) },
    { label: copy.totalTokens, help: copy.totalTokensHelp, value: formatMetric(totals.tokens) },
    {
      label: copy.cacheHitRate,
      help: copy.cacheHitRateHelp,
      value: formatPercent(totals.cacheHitRate || 0),
    },
  ];

  return (
    <section className={`uh-root ${className}`.trim()} data-theme={theme} data-open={open ? "true" : "false"}>
      <div className="uh-stats">
        {stats.map((stat, index) => (
          <div key={stat.label} className="uh-stat">
            <div className="uh-stat-label" title={stat.help}>
              <span>{stat.label}</span>
              <span className="uh-help" title={stat.help} aria-label={stat.help} tabIndex={0}>
                ?
              </span>
            </div>
            <div className="uh-stat-value" data-index={index}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="uh-rule">
        <button
          type="button"
          className="uh-toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          aria-label={open ? copy.collapse : copy.expand}
          onClick={() => setOpen((value) => !value)}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      <div className="uh-body" id={bodyId} inert={!open}>
        <div className="uh-body-inner">
          <div className="uh-body-content">
            {title && <h3 className="uh-title">{title}</h3>}
            {blocks.length === 0 ? (
              <p className="uh-empty">{copy.empty}</p>
            ) : (
              blocks.map((blockStart, index) => (
                <Segment
                  key={isoDate(blockStart)}
                  blockStart={blockStart}
                  today={today}
                  days={days}
                  levelOf={levelOf}
                  copy={copy}
                  lang={lang}
                  cellSize={cellSize}
                  gap={gap}
                  snakeEnabled={showSnake && index === 0}
                  open={open}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
