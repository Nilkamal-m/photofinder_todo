import { StyleSheet } from 'react-native';
export const COLORS = { primary:'#2459d3', primaryLight:'#edf2ff', accent:'#b85e19', bg:'#f4f6fc', surface:'#ffffff', border:'#dce3f1', text:'#202b45', subtext:'#626f89', error:'#b4433d', success:'#128060' };
export function createStyles(rules) {
  const result = {};
  for (const [name, original] of Object.entries(rules)) {
    const style = {...original};
    if (style.fontWeight === 'bold') style.fontWeight = '600';
    if (style.shadowOpacity !== undefined) { style.shadowOpacity = 0; style.elevation = 0; }
    if (style.borderRadius > 10) style.borderRadius = 10;
    if (/^(container|body)$/.test(name)) style.backgroundColor = COLORS.bg;
    if (/^(topBar|header)$/.test(name)) { style.paddingTop = 28; style.paddingBottom = 20; style.flexWrap = 'wrap'; style.gap = 12; }
    if (/^(heading|greeting)$/.test(name)) {style.fontSize=24;style.letterSpacing=-0.6;}
    if (/input/i.test(name) && style.borderWidth) {style.backgroundColor='#ffffff';style.minHeight=46;style.borderColor=COLORS.border;}
    if (/Btn$|^chip$/.test(name)) {style.minHeight=44;style.justifyContent='center';}
    if (/^(listContainer|content|bodyContent|stepContent)$/.test(name)) {style.width='100%';style.maxWidth=1120;style.alignSelf='center';style.padding=24;}
    result[name]=style;
  }
  return StyleSheet.create(result);
}
