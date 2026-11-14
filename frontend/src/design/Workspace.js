import React from 'react';
import {View,Text,TouchableOpacity,ScrollView,useWindowDimensions} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import {COLORS,FONTS,createStyles} from './system';
const links=[['Home','Overview','grid'],['PriceList','Services','tag'],['Packages','Packages','package'],['Clients','Clients','users'],['Bills','Bills','file-text'],['Estimation','Estimates','sliders'],['Dates','Calendar','calendar'],['Team','Wallets','credit-card'],['Enquiries','Enquiries','inbox']];
export default function Workspace({children,user,route,navigate,logout}) {
 const {width}=useWindowDimensions(); const wide=width>=1000;
 if(!user || ['Landing','Login','SharedBill'].includes(route)) return children;
 const nav=links.filter(([key])=>key!=='Enquiries'||user.role==='admin');
 return <View style={{flex:1,flexDirection:wide?'row':'column',backgroundColor:COLORS.bg}}><View style={wide?styles.sidebar:styles.mobile}>
   <View style={styles.brand}><View style={styles.mark}><Text style={styles.markText}>pf.</Text></View><View><Text style={styles.brandName}>PhotoFinder</Text><Text style={styles.caption}>STUDIO WORKSPACE</Text></View></View>
   <ScrollView horizontal={!wide} style={wide?{flex:1}:{flexGrow:0}} contentContainerStyle={wide?{gap:6,paddingTop:32}:{gap:6,paddingBottom:10}} showsHorizontalScrollIndicator={false}>
    {nav.map(([key,label,icon])=><TouchableOpacity key={key} accessibilityRole="button" accessibilityState={{selected:route===key}} style={[styles.link,route===key&&styles.active,!wide&&{marginRight:4}]} onPress={()=>navigate(key)}><Feather name={icon} size={17} color={route===key?COLORS.primary:COLORS.subtext}/><Text style={[styles.linkText,route===key&&{color:COLORS.primary,fontWeight:'600'}]}>{label}</Text></TouchableOpacity>)}
   </ScrollView>
   {wide&&<View style={styles.account}><Text style={styles.accountName}>{user.name}</Text><Text style={styles.accountRole}>{user.role==='admin'?'Studio admin':'Studio member'}</Text><TouchableOpacity style={styles.signout} onPress={logout}><Text style={{color:COLORS.subtext}}>Sign out</Text><Feather name="log-out" size={15} color={COLORS.subtext}/></TouchableOpacity></View>}
 </View><View style={{flex:1,minWidth:0}}>{children}</View></View>;
}
const styles=createStyles({sidebar:{width:224,borderRightWidth:1,borderColor:COLORS.border,padding:22,backgroundColor:'#f0efe9'},mobile:{paddingHorizontal:18,paddingTop:12,borderBottomWidth:1,borderColor:COLORS.border},brand:{flexDirection:'row',gap:10,alignItems:'center',paddingVertical:10},mark:{width:36,height:36,backgroundColor:COLORS.primary,borderRadius:6,alignItems:'center',justifyContent:'center'},markText:{fontFamily:FONTS.heading,color:'#fff',fontSize:25},brandName:{fontSize:16,fontWeight:'600',color:COLORS.text},caption:{fontSize:8,letterSpacing:1.6,color:COLORS.subtext,marginTop:4},link:{flexDirection:'row',gap:12,alignItems:'center',paddingHorizontal:12,paddingVertical:13,minHeight:46,borderRadius:6},active:{backgroundColor:'#e4e7db'},linkText:{fontSize:14,color:COLORS.subtext},account:{borderTopWidth:1,borderColor:COLORS.border,paddingTop:20},accountName:{fontSize:14,color:COLORS.text,fontWeight:'600'},accountRole:{fontSize:12,color:COLORS.subtext,marginTop:5},signout:{flexDirection:'row',justifyContent:'space-between',paddingVertical:16,minHeight:44}});
