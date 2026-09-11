import React from 'react';
import Svg, {Circle, Path, Rect} from 'react-native-svg';

export type IconName = 'logo' | 'shield' | 'connection' | 'upload' | 'download' | 'settings' | 'server' | 'transport' | 'warning' | 'check' | 'refresh' | 'power' | 'home' | 'info';

export function Icon({name, size = 24, color = '#F5F7FF', strokeWidth = 1.8}: {name: IconName; size?: number; color?: string; strokeWidth?: number}) {
  const common = {stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none'};
  const props = {width: size, height: size, viewBox: '0 0 24 24'};
  switch (name) {
    case 'logo': return <Svg {...props}><Path d="M12 2.5 20 6v5.7c0 4.8-3.35 8.8-8 10.3-4.65-1.5-8-5.5-8-10.3V6l8-3.5Z" fill={color} /><Path d="M8.5 12h7M12 8.5v7" stroke="#090A10" strokeWidth="2" strokeLinecap="round" /></Svg>;
    case 'shield': return <Svg {...props}><Path {...common} d="M12 2.5 20 6v5.7c0 4.8-3.35 8.8-8 10.3-4.65-1.5-8-5.5-8-10.3V6l8-3.5Z"/><Path {...common} d="m8.6 12 2.1 2.1 4.8-4.8"/></Svg>;
    case 'connection': return <Svg {...props}><Circle {...common} cx="12" cy="12" r="2"/><Path {...common} d="M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8M8.4 8.4a5 5 0 0 0 0 7.2M15.6 8.4a5 5 0 0 1 0 7.2"/></Svg>;
    case 'upload': return <Svg {...props}><Path {...common} d="M12 19V5m0 0L7.5 9.5M12 5l4.5 4.5M5 21h14"/></Svg>;
    case 'download': return <Svg {...props}><Path {...common} d="M12 5v14m0 0 4.5-4.5M12 19l-4.5-4.5M5 3h14"/></Svg>;
    case 'settings': return <Svg {...props}><Circle {...common} cx="12" cy="12" r="3"/><Path {...common} d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.2 2.2-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56v.1h-3.1v-.1a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.2-2.2.06-.06A1.7 1.7 0 0 0 6.74 15 1.7 1.7 0 0 0 5.2 14H5.1v-3.1h.1a1.7 1.7 0 0 0 1.54-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.2-2.2.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.04-1.56v-.1h3.1v.1a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.2 2.2-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.54 1h.1V14h-.1a1.7 1.7 0 0 0-1.54 1Z"/></Svg>;
    case 'server': return <Svg {...props}><Rect {...common} x="4" y="4" width="16" height="6" rx="1.5"/><Rect {...common} x="4" y="14" width="16" height="6" rx="1.5"/><Path {...common} d="M7 7h.01M7 17h.01M11 7h6M11 17h6"/></Svg>;
    case 'transport': return <Svg {...props}><Path {...common} d="M4 7h10m-4-3 4 3-4 3M20 17H10m4-3-4 3 4 3"/></Svg>;
    case 'warning': return <Svg {...props}><Path {...common} d="M11 4.2 3.8 17a2 2 0 0 0 1.74 3h13a2 2 0 0 0 1.74-3L13 4.2a1.15 1.15 0 0 0-2 0Z"/><Path {...common} d="M12 9v4m0 3h.01"/></Svg>;
    case 'check': return <Svg {...props}><Path {...common} d="m5 12.5 4.3 4.3L19.5 6.5"/></Svg>;
    case 'refresh': return <Svg {...props}><Path {...common} d="M20 7v5h-5M4 17v-5h5M6.1 9A7 7 0 0 1 18.5 7M17.9 15A7 7 0 0 1 5.5 17"/></Svg>;
    case 'power': return <Svg {...props}><Path {...common} d="M12 3v9M6.35 5.95a8 8 0 1 0 11.3 0"/></Svg>;
    case 'home': return <Svg {...props}><Path {...common} d="m3.8 10.8 8.2-7 8.2 7V20H14v-5.2h-4V20H3.8v-9.2Z"/></Svg>;
    case 'info': return <Svg {...props}><Circle {...common} cx="12" cy="12" r="8.5"/><Path {...common} d="M12 10.7V17m0-9.8h.01"/></Svg>;
  }
}
