// Decorative ink marks; meaningful labels stay in the surrounding HTML.
export function Marker({ children, color = "yellow" }) {
  return <span className={`sketch-marker marker-${color}`}>{children}<svg viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true"><path d="M8 16 Q130 4 289 13" pathLength="1"/></svg></span>;
}

export function HandArrow({ className = "" }) {
  return <svg className={`hand-arrow ${className}`} viewBox="0 0 110 70" fill="none" aria-hidden="true"><path d="M6 9C24 56 67 57 99 33M81 32l19-1-5 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export function WavyRule() {
  return <svg className="wavy-rule" viewBox="0 0 1000 12" preserveAspectRatio="none" fill="none" aria-hidden="true"><path d="M1 6Q25 0 50 6T100 6T150 6T200 6T250 6T300 6T350 6T400 6T450 6T500 6T550 6T600 6T650 6T700 6T750 6T800 6T850 6T900 6T950 6T999 6" stroke="currentColor" strokeWidth="1.5"/></svg>;
}
