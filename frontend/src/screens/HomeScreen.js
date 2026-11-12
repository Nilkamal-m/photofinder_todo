import React from 'react';
import Feather from '@expo/vector-icons/Feather';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

import { COLORS, createStyles } from '../design/system';

const cardTones = [{bg:'#e9f0ff',ink:'#2459d3'},{bg:'#fff0df',ink:'#ad5a16'},{bg:'#e5f6f3',ink:'#127c6b'},{bg:'#ffecef',ink:'#bc4560'},{bg:'#e9f4ff',ink:'#19749a'},{bg:'#fff5d9',ink:'#8e6b12'},{bg:'#eaf6e5',ink:'#4a7d2d'}];
const cards = [
  { label: 'Team payments', icon: 'credit-card', screen: 'Team', desc: 'Assigned costs and payments' },
  { label: 'Price List', icon: 'tag', screen: 'PriceList', desc: 'Service rates and costs' },
  { label: 'Packages', icon: 'package', screen: 'Packages', desc: 'Services grouped for a job' },
  { label: 'Clients', icon: 'users', screen: 'Clients', desc: 'Contacts and events' },
  { label: 'Bills', icon: 'file-text', screen: 'Bills', desc: 'Invoices and agreements' },
  { label: 'Estimates', icon: 'sliders', screen: 'Estimation', desc: 'Plan a job and check the total' },
  { label: 'Calendar', icon: 'calendar', screen: 'Dates', desc: 'Bookings and availability' },
];

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Top Welcome Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name || 'Studio Owner'} </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, user?.role === 'admin' ? styles.adminBadge : styles.userBadge]}>
              <Text style={styles.badgeText}>{user?.role?.toUpperCase()} ACCOUNT</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.workspaceBanner}><View style={{flex:1}}><Text style={styles.bannerTitle}>A good day for great work.</Text><Text style={styles.bannerText}>Plan the job. Send the bill. Keep everything in order.</Text></View><TouchableOpacity style={styles.bannerBtn} onPress={() => navigation.navigate('CreateBill')}><Text style={{color:COLORS.primary,fontWeight:'600'}}>Create bill +</Text></TouchableOpacity></View><Text style={styles.sectionTitle}>Your studio</Text>
        <View style={styles.grid}>
          {cards.filter(c => c.screen !== 'Team' || user?.role === 'admin').map((card, index) => (
            <TouchableOpacity
              key={card.screen}
              style={[styles.card,{borderTopWidth:3,borderTopColor:cardTones[index].ink}]}
              onPress={() => navigation.navigate(card.screen)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircle,{backgroundColor:cardTones[index].bg}]}>
                <Feather name={card.icon || "folder"} size={22} color={cardTones[index].ink} />
              </View>
              <Text style={styles.cardLabel}>{card.label}</Text>
              <Text style={styles.cardDesc}>{card.desc}</Text>
              <Text style={styles.arrowText}>View →</Text>
            </TouchableOpacity>
          ))}
        </View>


      </View>
    </ScrollView>
  );
}

const styles = createStyles({
 workspaceBanner:{backgroundColor:COLORS.primary,padding:28,borderRadius:16,marginBottom:28,flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:20},
 bannerTitle:{fontSize:25,fontWeight:'600',color:'#fff',marginBottom:8},
 bannerText:{fontSize:14,color:'#e3ebff',lineHeight:22},
 bannerBtn:{backgroundColor:'#fff',padding:14,borderRadius:8,minHeight:44},
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ebebeb',
  },
  greeting: { color: COLORS.text, fontSize: 22, fontWeight: 'bold' },
  badgeRow: { marginTop: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, alignSelf: 'flex-start' },
  adminBadge: { backgroundColor: '#e8f5e9' },
  userBadge: { backgroundColor: '#f0f0f0' },
  badgeText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#ffd5d5',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  logoutText: { color: '#d32f2f', fontWeight: 'bold', fontSize: 13 },
  content: { padding: 20, maxWidth: 900, alignSelf: 'center', width: '100%' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: {
    width: '48%',
    minWidth: 0,
    flexGrow: 1,
    flexBasis: 280,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#dce3f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#edf2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardIcon: { fontSize: 26 },
  cardLabel: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },
  cardDesc: { fontSize: 13, color: COLORS.subtext, marginTop: 4, lineHeight: 18, minHeight: 36 },
  arrowText: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary, marginTop: 12 },
  infoBox: {
    marginTop: 24,
    backgroundColor: '#fafafa',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#dce3f1',
  },
  infoTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginBottom: 8 },
  infoText: { color: COLORS.subtext, fontSize: 13, lineHeight: 22 },
  adminInfoBox: {
    marginTop: 14,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  adminInfoText: { color: '#2e7d32', fontSize: 13, lineHeight: 18 },
  userInfoBox: {
    marginTop: 14,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
  },
  userInfoText: { color: COLORS.subtext, fontSize: 13 },
});
