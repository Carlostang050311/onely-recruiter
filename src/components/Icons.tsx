'use client';
// 图标集：与参照稿一致的线性 SVG
export function Icon({ name, size = 17 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </>
    ),
    leads: (
      <>
        <circle cx="9" cy="8" r="3.4" />
        <path d="M3.5 20c.6-3.4 3-5 5.5-5s4.9 1.6 5.5 5" />
        <path d="M16 5.2a3.4 3.4 0 010 6.2M17.5 15.2c2 .6 3.2 2.2 3.6 4.8" />
      </>
    ),
    pipeline: (
      <>
        <rect x="3" y="4" width="5" height="16" rx="1.2" />
        <rect x="10" y="4" width="5" height="10" rx="1.2" />
        <rect x="17" y="4" width="4" height="6" rx="1.2" />
      </>
    ),
    outreach: (
      <>
        <path d="M4 6h16v11H8l-4 4z" />
        <path d="M8 10h8M8 13h5" />
      </>
    ),
    plan: (
      <>
        <path d="M4 19V9l8-5 8 5v10" />
        <path d="M9 19v-5h6v5" />
      </>
    ),
    scope: (
      <>
        <path d="M10 3h4v3l2.5 1.5 2.6-1.5 2.8 2.8-1.5 2.6L22 14v4h-3l-1.5 2.5L14 22h-4l-2.5-1.5L7 21H2v-4l1.5-2.6L2 11.4 4.8 8.6l2.6 1.5L10 8z" />
        <circle cx="12" cy="13" r="3" />
      </>
    ),
    reset: (
      <>
        <path d="M4 12a8 8 0 108-8 8 8 0 00-6.3 3M4 4v4h4" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    import: (
      <>
        <path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14" />
      </>
    ),
    export: (
      <>
        <path d="M12 20V10m0 0l-4 4m4-4l4 4M5 4h14" />
      </>
    ),
    grade: (
      <>
        <path d="M4 20l4.5-1L19 8.5 15.5 5 5 15.5z" />
      </>
    ),
    send: (
      <>
        <path d="M4 12l16-7-7 16-2.5-6.5z" />
      </>
    ),
    copy: (
      <>
        <rect x="8" y="8" width="12" height="12" rx="2" />
        <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
      </>
    ),
    close: (
      <>
        <path d="M6 6l12 12M18 6L6 18" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4 4" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8h.01M11 12h1v4h1" />
      </>
    ),
    star: (
      <>
        <path d="M12 3l2.2 5.3L20 9l-4.2 3.8L17 19l-5-3-5 3 1.2-6.2L4 9l5.8-.7z" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8}>
      {paths[name]}
    </svg>
  );
}

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="13" fill="none" stroke="#d8a45d" strokeWidth="1.6" opacity=".55" />
      <circle cx="16" cy="16" r="6.5" fill="none" stroke="#c84c66" strokeWidth="2" />
      <circle cx="16" cy="16" r="2.2" fill="#e8c796" />
    </svg>
  );
}
