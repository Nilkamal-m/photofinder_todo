import React,{useState,useEffect} from 'react';
import {View,Text,TouchableOpacity,Modal,FlatList,TextInput,Platform} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import {COLORS,createStyles} from '../design/system';
export default function SelectField({label,value,options,onChange,placeholder='Choose',disabled=false}) {
  const [open,setOpen]=useState(false),[search,setSearch]=useState('');
  const choices=options.map(option=>typeof option==='string'?{label:option,value:option}:option);
  const selected=choices.find(option=>String(option.value)===String(value));
  useEffect(()=>{if(!open||Platform.OS!=='web')return;const close=e=>{if(e.key==='Escape')setOpen(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[open]);
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{expanded:open,disabled}} disabled={disabled} style={[styles.trigger,disabled&&{opacity:.5}]} onPress={()=>{setSearch('');setOpen(true);}}>
      <Text style={[styles.value,!selected&&{color:COLORS.subtext}]}>{selected?.label || value || placeholder}</Text><Feather accessible={false} name="chevron-down" size={17} color={COLORS.subtext}/>
    </TouchableOpacity>
    <Modal transparent visible={open} animationType="none" onRequestClose={()=>setOpen(false)}>
      <View style={styles.overlay}><View style={styles.panel} accessibilityViewIsModal>
        <View style={styles.header}><Text style={styles.title}>{label}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close choices" style={styles.close} onPress={()=>setOpen(false)}><Feather accessible={false} name="x" size={20} color={COLORS.text}/></TouchableOpacity></View>
        <TextInput accessibilityLabel={'Search '+label.toLowerCase()} style={styles.input} value={search} onChangeText={setSearch} placeholder="Search" autoFocus />
        <FlatList keyboardShouldPersistTaps="handled" data={choices.filter(option=>option.label.toLowerCase().includes(search.toLowerCase()))} keyExtractor={item=>String(item.value)} renderItem={({item})=><TouchableOpacity accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{selected:String(item.value)===String(value)}} style={[styles.option,String(item.value)===String(value)&&{backgroundColor:COLORS.primaryLight}]} onPress={()=>{onChange(item.value);setOpen(false);}}><Text style={styles.value}>{item.label}</Text>{String(item.value)===String(value)&&<Feather accessible={false} name="check" size={17} color={COLORS.primary}/>}</TouchableOpacity>} ListEmptyComponent={<Text style={styles.empty}>No matches</Text>}/>
      </View></View>
    </Modal>
  </View>;
}
const styles=createStyles({field:{marginBottom:16},label:{fontSize:13,fontWeight:'600',color:COLORS.text,marginBottom:8},trigger:{borderWidth:1,borderColor:COLORS.border,borderRadius:7,paddingHorizontal:13,minHeight:48,flexDirection:'row',alignItems:'center',gap:12,backgroundColor:COLORS.surface},value:{fontSize:15,color:COLORS.text,flex:1},overlay:{flex:1,backgroundColor:'rgba(32,36,29,.4)',justifyContent:'center',alignItems:'center',padding:20},panel:{width:'100%',maxWidth:480,maxHeight:'75%',backgroundColor:COLORS.surface,borderRadius:10,padding:16},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12},title:{fontSize:20,color:COLORS.text},close:{width:44,height:44,alignItems:'center',justifyContent:'center'},input:{borderWidth:1,borderColor:COLORS.border,borderRadius:6,padding:12,marginBottom:8},option:{minHeight:48,padding:14,flexDirection:'row',alignItems:'center',gap:10,borderRadius:6},empty:{padding:20,color:COLORS.subtext}});
