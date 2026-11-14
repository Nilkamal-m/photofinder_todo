import { useEffect } from 'react';
import { Platform } from 'react-native';
export default function WebPolish() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const style = document.createElement('style');
    style.textContent = `html{background:#f7f6f2;-webkit-tap-highlight-color:transparent}body{color:#292d27}input,textarea{font-size:16px}input:focus,textarea:focus{outline:2px solid #879373;outline-offset:2px}[role=button],button,a{touch-action:manipulation} [role=button]:focus-visible,button:focus-visible,a:focus-visible{outline:2px solid #4e5941;outline-offset:3px}[role=button][aria-disabled=true]{opacity:.5} @media(hover:hover) and (pointer:fine){[role=button]:hover{filter:brightness(.96)}} @media(prefers-reduced-motion:no-preference){[role=button]{transition:background-color 140ms ease,opacity 140ms ease}[role=button]:active{opacity:.72}}`;
    document.head.appendChild(style);
    const meta = document.createElement('meta'); meta.name='theme-color'; meta.content='#f7f6f2'; document.head.appendChild(meta);
    document.title = 'PhotoFinder — Studio';
    return () => {style.remove();meta.remove();};
  },[]);
  return null;
}
