import { useLayoutEffect, useRef, useState } from "react";
import UsageHeatmap from "./UsageHeatmap";
import usage from "../data/usage.json";
import "./home-usage.css";

const calendar = { weeks: 53, gap: 3, minCellSize: 13 };

export function HomeUsage({ language, t }) {
  const section = useRef(null);
  const [cellSize, setCellSize] = useState(calendar.minCellSize);

  useLayoutEffect(() => {
    const charts = section.current.querySelectorAll(".uh-chart");
    const observer = new ResizeObserver(entries => {
      const chart = entries[0].target;
      const labels = chart.querySelector(".uh-weekdays").getBoundingClientRect().width;
      const available = chart.clientWidth - labels - (calendar.weeks - 1) * calendar.gap;
      setCellSize(Math.max(calendar.minCellSize, available / calendar.weeks));
      for (const chart of charts) chart.scrollLeft = chart.scrollWidth - chart.clientWidth;
    });
    for (const chart of charts) observer.observe(chart);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    for (const chart of section.current.querySelectorAll(".uh-chart")) {
      chart.scrollLeft = chart.scrollWidth - chart.clientWidth;
    }
  }, [cellSize]);

  return <section ref={section} className="home-usage" aria-labelledby="home-usage-title" style={{ "--home-usage-cell-size": `${cellSize}px` }}>
    <div className="home-usage-heading"><h2 id="home-usage-title">{t.usageOverview}</h2></div>
    <UsageHeatmap className="home-usage-heatmap" data={usage} lang={language} theme="light" cellSize={cellSize} gap={calendar.gap} title={t.usageCalendar}/>
    <p className="home-usage-scroll">{t.usageScroll}</p>
  </section>;
}
