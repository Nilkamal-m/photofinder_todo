import { Platform, StyleSheet } from 'react-native';

export const COLORS = {
  primary: '#4e5941', primaryLight: '#eff0e8', accent: '#946546',
  bg: '#f7f6f2', surface: '#fffefa', border: '#e2dfd6',
  text: '#292d27', subtext: '#686d62', error: '#aa443c', success: '#467052',
};
export const FONTS = {
  heading: Platform.select({ web: 'Georgia, "Times New Roman", serif', ios: 'Georgia', default: 'serif' }),
  body: Platform.select({ web: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', default: undefined }),
};
const legacy = {
  '#2459d3': COLORS.primary, '#1a237e': COLORS.primary, '#0d47a1': COLORS.primary,
  '#edf2ff': COLORS.primaryLight, '#e3f2fd': COLORS.primaryLight, '#f0f7ff': COLORS.primaryLight,
  '#f4f6fc': COLORS.bg, '#f3f6fd': COLORS.bg, '#fafafa': COLORS.bg,
  '#202b45': COLORS.text, '#1a1a1a': COLORS.text,
  '#626f89': COLORS.subtext, '#616161': COLORS.subtext,
  '#dce3f1': COLORS.border, '#e0e0e0': COLORS.border, '#e8e8e8': COLORS.border,
  '#ebebeb': COLORS.border, '#f0f0f0': COLORS.border, '#d9e3fa': COLORS.border,
  '#ffffff': COLORS.surface, '#fff': COLORS.surface,
  '#e8f5e9': '#edf2e9', '#fff3e0': '#f7efdf', '#b85e19': COLORS.accent,
};
export function createStyles(rules) {
  return StyleSheet.create(Object.fromEntries(Object.entries(rules).map(([name, original]) => {
    const style = Object.fromEntries(Object.entries(original).map(([key,value]) => [key, typeof value === 'string' ? (legacy[value.toLowerCase()] || value) : value]));
    if (!style.fontFamily && (style.fontSize || style.fontWeight || style.color)) style.fontFamily = FONTS.body;
    if (style.fontWeight === 'bold') style.fontWeight = '600';
    if (style.shadowOpacity !== undefined) { style.shadowOpacity = 0; style.elevation = 0; }
    if (style.borderRadius > 8) style.borderRadius = 8;
    if (/^(container|body)$/.test(name)) style.backgroundColor = COLORS.bg;
    if (/^(topBar|header)$/.test(name)) Object.assign(style,{paddingTop:24,paddingBottom:20,flexWrap:'wrap',gap:12,backgroundColor:COLORS.bg,justifyContent:'flex-start'});
    if (/^(heading|greeting|title|verifyTitle|studioName|sectionTitle|stepTitle|topBarTitle|modalTitle)$/.test(name) && (style.fontSize || 0) >= 18) Object.assign(style,{fontFamily:FONTS.heading,fontWeight:'400',letterSpacing:-0.5,...(name==='heading'?{fontSize:28}:{})});
    if (/input/i.test(name) && (style.borderWidth || style.borderBottomWidth)) Object.assign(style,{backgroundColor:COLORS.surface,minHeight:46,fontSize:16,borderColor:COLORS.border,color:COLORS.text});
    if (/Btn$|Button$|^chip$/.test(name)) Object.assign(style,{minHeight:44,justifyContent:'center'});
    if (/^(listContainer|content|bodyContent|stepContent|scrollContent)$/.test(name)) Object.assign(style,{width:'100%',maxWidth:original.maxWidth || 1080,alignSelf:'center',padding:24});
    if (name === 'listContainer') style.backgroundColor = COLORS.bg;
    return [name,style];
  })));
}
