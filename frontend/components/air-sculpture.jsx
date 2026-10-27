export function AirSculpture({ t }) {
  return <div className="air-art" aria-hidden="true">
    <div className="art-halo" />
    <svg className="air-orbits" viewBox="0 0 480 440" fill="none">
      <ellipse cx="241" cy="218" rx="205" ry="163" stroke="#98b4a4" strokeOpacity=".22" transform="rotate(-23 241 218)" />
      <ellipse cx="241" cy="218" rx="181" ry="194" stroke="#98b4a4" strokeOpacity=".12" transform="rotate(28 241 218)" />
      <circle cx="80" cy="131" r="4" fill="#91ad9d" /><circle cx="410" cy="277" r="3" fill="#a9c3b2" />
      <path d="M390 102v12m-6-6h12M100 310v10m-5-5h10" stroke="#8fae9c" strokeWidth="1.5" />
    </svg>
    <svg className="air-ring" viewBox="0 0 480 440" fill="none">
      <defs>
        <linearGradient id="ring-color" x1="133" y1="82" x2="350" y2="359" gradientUnits="userSpaceOnUse"><stop stopColor="#f7fff9"/><stop offset=".31" stopColor="#dbece0"/><stop offset=".63" stopColor="#a4c5af"/><stop offset=".85" stopColor="#e9f5ec"/><stop offset="1" stopColor="#b4cbb9"/></linearGradient>
        <linearGradient id="ring-inner" x1="160" y1="121" x2="310" y2="311" gradientUnits="userSpaceOnUse"><stop stopColor="#91b69e"/><stop offset=".5" stopColor="#edf6ef"/><stop offset="1" stopColor="#fbfffb"/></linearGradient>
        <filter id="ring-shadow" x="0" y="0" width="480" height="440" filterUnits="userSpaceOnUse"><feDropShadow dx="0" dy="22" stdDeviation="18" floodColor="#749a82" floodOpacity=".17"/></filter>
      </defs>
      <g transform="rotate(-34 240 215)" filter="url(#ring-shadow)">
        <ellipse cx="240" cy="215" rx="98" ry="132" stroke="url(#ring-color)" strokeWidth="63" />
        <ellipse cx="240" cy="215" rx="72" ry="105" stroke="url(#ring-inner)" strokeWidth="9" />
        <path d="M144 211c0-69 40-128 90-129" stroke="white" strokeOpacity=".8" strokeWidth="2" strokeLinecap="round"/>
      </g>
    </svg>
    <div className="art-note"><span className="art-note-dot"/><span>{t.sculpture}</span><span className="art-note-star">✧</span></div>
    <span className="art-caption">{t.sculptureSmall}</span>
    <span className="art-coordinate">01 — ∞</span>
  </div>;
}
