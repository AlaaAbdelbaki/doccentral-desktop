// SVG icons — single-file, lucide-style 1.5 stroke
export const Icon = ({ name, size = 16, className = '', style = {} }) => {
  const s = { width: size, height: size, ...style };
  const common = {
    width: size, height: size,
    viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.6,
    strokeLinecap: 'round', strokeLinejoin: 'round',
    className, style: s,
  };
  switch (name) {
    case 'home': return (<svg {...common}><path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></svg>);
    case 'calendar': return (<svg {...common}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>);
    case 'users': return (<svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
    case 'tooth': return (<svg {...common}><path d="M12 22c-1 0-1.5-1.5-1.8-3.5C9.8 16 9.5 14 8 14s-2 2-2 4-1 3-2 3-2-2-2-4c0-3 2-12 5-13 1.5-.5 3 1 5 1s3.5-1.5 5-1c3 1 5 10 5 13 0 2-1 4-2 4s-2-1-2-3-.5-4-2-4-1.7 2-2.2 4.5C13.5 20.5 13 22 12 22z"/></svg>);
    case 'file-text': return (<svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>);
    case 'package': return (<svg {...common}><path d="M16.5 9.4 7.5 4.21M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.27 6.96 8.73 5.05 8.73-5.05M12 22.08V12"/></svg>);
    case 'flask': return (<svg {...common}><path d="M9 2v6L4 18a2 2 0 0 0 1.7 3h12.6A2 2 0 0 0 20 18L15 8V2"/><path d="M8 2h8M7 14h10"/></svg>);
    case 'message': return (<svg {...common}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>);
    case 'chart': return (<svg {...common}><path d="M3 3v18h18"/><path d="M7 14l3-3 4 4 5-5"/></svg>);
    case 'settings': return (<svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.36.65.99 1.06 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>);
    case 'search': return (<svg {...common}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>);
    case 'bell': return (<svg {...common}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>);
    case 'plus': return (<svg {...common}><path d="M12 5v14M5 12h14"/></svg>);
    case 'check': return (<svg {...common}><path d="M20 6 9 17l-5-5"/></svg>);
    case 'chevron-left': return (<svg {...common}><path d="m15 18-6-6 6-6"/></svg>);
    case 'chevron-right': return (<svg {...common}><path d="m9 18 6-6-6-6"/></svg>);
    case 'chevron-down': return (<svg {...common}><path d="m6 9 6 6 6-6"/></svg>);
    case 'more': return (<svg {...common}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>);
    case 'phone': return (<svg {...common}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>);
    case 'mail': return (<svg {...common}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>);
    case 'alert-tri': return (<svg {...common}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>);
    case 'alert-circle': return (<svg {...common}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>);
    case 'dollar': return (<svg {...common}><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>);
    case 'pill': return (<svg {...common}><path d="M10.5 20.5a4.95 4.95 0 1 1-7-7l10-10a4.95 4.95 0 0 1 7 7z"/><path d="m8.5 8.5 7 7"/></svg>);
    case 'clock': return (<svg {...common}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>);
    case 'x': return (<svg {...common}><path d="M18 6 6 18M6 6l12 12"/></svg>);
    case 'arrow-up': return (<svg {...common}><path d="M12 19V5M5 12l7-7 7 7"/></svg>);
    case 'arrow-down': return (<svg {...common}><path d="M12 5v14M19 12l-7 7-7-7"/></svg>);
    case 'arrow-right': return (<svg {...common}><path d="M5 12h14M12 5l7 7-7 7"/></svg>);
    case 'sparkle': return (<svg {...common}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>);
    case 'filter': return (<svg {...common}><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>);
    default: return null;
  }
};
