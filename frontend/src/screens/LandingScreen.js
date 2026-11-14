import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import api from '../services/api';
import { notify } from '../utils/dialog';

import { COLORS as SYSTEM, FONTS } from '../design/system';
const COLORS = {ink:SYSTEM.text, muted:SYSTEM.subtext, navy:SYSTEM.primary, blue:SYSTEM.primary, cream:SYSTEM.bg, peach:'#eae8dd', line:SYSTEM.border, white:SYSTEM.surface, green:SYSTEM.success};

const emptyEnquiry = {
  name: '',
  phone: '',
  email: '',
  eventType: '',
  eventDate: '',
  message: '',
};

export default function LandingScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef(null);
  const positions = useRef({});
  const isCompact = width < 720;
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [enquiry, setEnquiry] = useState(emptyEnquiry);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    api.get('/packages/public')
      .then(({ data }) => setPackages(data))
      .catch(() => setPackages([]))
      .finally(() => setLoadingPackages(false));
  }, []);

  const estimatedTotal = useMemo(
    () => (selectedPackage?.totalSellingPrice || 0) * quantity,
    [selectedPackage, quantity],
  );

  const updateEnquiry = (key, value) => {
    setEnquiry((current) => ({ ...current, [key]: value }));
  };

  const submitEnquiry = async () => {
    if (!enquiry.name.trim() || !enquiry.phone.trim()) {
      notify('Name and phone required', 'Please add your name and phone number.');
      return;
    }

    setSending(true);
    try {
      await api.post('/enquiries', enquiry);
      setEnquiry(emptyEnquiry);
      setSent(true);
    } catch (err) {
      notify('Could not send enquiry', err.response?.data?.message || 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const scrollTo = (id) => {
    setMenuOpen(false);
    scrollRef.current?.scrollTo({y: positions.current[id] || 0, animated:true});
  };

  return (
    <View style={styles.screen}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" style={styles.brand} onPress={() => scrollTo('top')}>
            <View style={styles.logoMark}><Text style={styles.logoLetters}>PF</Text></View>
            <Text style={styles.brandName}>PhotoFinder</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.menuButton} onPress={() => setMenuOpen(true)}>
            <Feather accessible={false} name="menu" size={18} color={COLORS.ink} />
            <Text style={styles.menuText}>Menu</Text>
          </TouchableOpacity>
        </View>

        <View nativeID="top" onLayout={e => {positions.current.top = e.nativeEvent.layout.y;}} style={[styles.hero, isCompact && styles.heroCompact]}>
          <View style={[styles.heroCopy,isCompact&&{flex:0,flexBasis:'auto',flexShrink:0}]}>
            <Text style={styles.eyebrow}>PHOTOGRAPHY, WITH INTENTION</Text>
            <Text style={[styles.heroTitle, isCompact && styles.heroTitleCompact]}>For the moments
that stay with you.</Text>
            <Text style={styles.heroText}>
              Photography and films for your celebrations. Thoughtfully planned, simply remembered.
            </Text>
            <TouchableOpacity accessibilityRole="button" style={styles.heroButton} onPress={() => scrollTo('enquiry')}>
              <Text style={styles.heroButtonText}>Enquire about a date</Text>
              <Feather accessible={false} name="arrow-up-right" size={17} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <Image source={require('../../assets/studio-editorial.jpg')} accessibilityLabel="Wedding hands and bouquet, editorial photograph by Mesa Photo" style={[styles.heroPhoto,isCompact && {width:'100%',height:300}]} resizeMode="cover" />
        </View>

        <View style={[styles.introRow, isCompact && styles.introRowCompact]}>
          <Text style={styles.sectionKicker}>OUR APPROACH</Text>
          <Text style={styles.introText}>
            Thoughtful direction, honest colour, and a team that knows when to step in—and when to let the moment happen.
          </Text>
        </View>

        <View nativeID="packages" onLayout={e => {positions.current.packages = e.nativeEvent.layout.y;}} style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <View>
              <Text style={styles.sectionKicker}>PACKAGES</Text>
              <Text style={styles.sectionTitle}>Find your collection.</Text>
            </View>
            <Text style={styles.sectionAside}>Choose a collection to estimate your budget.</Text>
          </View>
          {loadingPackages ? (
            <ActivityIndicator color={COLORS.blue} size="large" style={styles.loader} />
          ) : packages.length === 0 ? (
            <View style={styles.emptyPackage}><Text style={styles.emptyText}>Our collections are being refreshed. Enquire for a tailored estimate.</Text></View>
          ) : (
            <View style={styles.packageGrid}>
              {packages.map((item, index) => {
                const active = selectedPackage?._id === item._id;
                return (
                  <TouchableOpacity accessibilityRole="button"
                    key={item._id}
                    style={[styles.packageCard, active && styles.packageCardActive]}
                    onPress={() => { setSelectedPackage(item); setQuantity(1); }}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.packageNumber}>0{index + 1}</Text>
                    <Text style={styles.packageName}>{item.name}</Text>
                    <Text style={styles.packageDescription}>{item.description || 'A considered collection for your day.'}</Text>
                    <Text style={styles.packagePrice}>₹{item.totalSellingPrice?.toLocaleString('en-IN')}</Text>
                    <Text style={styles.packageLink}>{active ? 'Selected' : 'Use this collection'}  →</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View nativeID="calculator" onLayout={e => {positions.current.calculator = e.nativeEvent.layout.y;}} style={[styles.calculator, isCompact && styles.calculatorCompact]}>
          <View style={[styles.calculatorCopy,isCompact&&{flex:0,flexBasis:'auto',flexShrink:0}]}>
            <Text style={styles.sectionKicker}>YOUR ESTIMATE</Text>
            <Text style={styles.calculatorTitle}>Make a rough plan before we talk.</Text>
            <Text style={styles.calculatorText}>This is a simple starting estimate. Your final proposal can be shaped around the people, places, and details that matter to you.</Text>
          </View>
          <View style={styles.calculatorBox}>
            <Text style={styles.calculatorLabel}>Selected collection</Text>
            <Text style={styles.selectedName}>{selectedPackage?.name || 'Choose a package above'}</Text>
            <View style={styles.quantityRow}>
              <Text style={styles.calculatorLabel}>Number of events</Text>
              <View style={styles.stepper}>
                <TouchableOpacity accessibilityRole="button" onPress={() => setQuantity(Math.max(1, quantity - 1))} style={styles.stepperButton}><Text style={styles.stepperText}>−</Text></TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity accessibilityRole="button" onPress={() => setQuantity(quantity + 1)} style={styles.stepperButton}><Text style={styles.stepperText}>+</Text></TouchableOpacity>
              </View>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Estimated budget</Text>
              <Text style={styles.totalValue}>{selectedPackage ? `₹${estimatedTotal.toLocaleString('en-IN')}` : '—'}</Text>
            </View>
          </View>
        </View>

        <View nativeID="enquiry" onLayout={e => {positions.current.enquiry = e.nativeEvent.layout.y;}} style={[styles.enquirySection, isCompact && styles.enquirySectionCompact]}>
          <View style={[styles.enquiryIntro,isCompact&&{flex:0,flexBasis:'auto',flexShrink:0}]}>
            <Text style={styles.sectionKicker}>LET'S TALK</Text>
            <Text style={styles.sectionTitle}>Tell us what you’re planning.</Text>
            <Text style={styles.enquiryText}>Share your date and a few details. We’ll take it from there.</Text>
          </View>
          <View style={[styles.formCard,isCompact&&{flex:0,flexBasis:'auto',flexShrink:0}]}>
            {sent ? (
              <View style={styles.successState}>
                <View style={styles.successIcon}><Feather accessible={false} name="check" size={22} color={COLORS.green} /></View>
                <Text style={styles.successTitle}>Thank you for reaching out.</Text>
                <Text style={styles.successText}>We’ve received your enquiry and will be in touch soon.</Text>
                <TouchableOpacity accessibilityRole="button" onPress={() => setSent(false)}><Text style={styles.formLink}>Send another enquiry</Text></TouchableOpacity>
              </View>
            ) : (
              <>
                {[
                  ['name','Name *'],['phone','Phone *'],['email','Email'],['eventType','Event type'],['eventDate','Date · YYYY-MM-DD'],['message','Your plans'],
                ].map(([key,label]) => <View key={key} style={{marginBottom:12}}><Text style={styles.formLabel}>{label}</Text><TextInput accessibilityLabel={label} style={[styles.formInput,key==='message'&&styles.messageInput]} value={enquiry[key]} onChangeText={value=>updateEnquiry(key,value)} keyboardType={key==='phone'?'phone-pad':key==='email'?'email-address':'default'} autoCapitalize={key==='email'?'none':'sentences'} multiline={key==='message'} /></View>)}
                <TouchableOpacity accessibilityRole="button" style={styles.submitButton} onPress={submitEnquiry} disabled={sending}>
                  {sending ? <ActivityIndicator color={COLORS.white} /> : <><Text style={styles.submitText}>Send enquiry</Text><Feather accessible={false} name="arrow-up-right" size={17} color={COLORS.white} /></>}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.logoMark}><Text style={styles.logoLetters}>PF</Text></View>
          <View style={{flex:1}}><Text style={styles.footerText}>PhotoFinder Studio</Text><Text style={[styles.footerText,{marginTop:6}]}>Editorial stand-in: Mesa Photo / Unsplash</Text></View>
          <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Login')}><Text style={styles.footerLink}>Studio login</Text></TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={menuOpen} animationType="fade" transparent onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity accessibilityRole="button" style={styles.modalBackdrop} activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuPanel}>
            <TouchableOpacity accessibilityRole="button" style={styles.closeButton} onPress={() => setMenuOpen(false)}><Feather accessible={false} name="x" size={22} color={COLORS.ink} /></TouchableOpacity>
            <Text style={styles.menuTitle}>Explore PhotoFinder</Text>
            {[
              ['packages', 'Packages'],
              ['calculator', 'Estimate your budget'],
              ['enquiry', 'Send an enquiry'],
            ].map(([id, label]) => (
              <TouchableOpacity accessibilityRole="button" key={id} style={styles.menuItem} onPress={() => scrollTo(id)}>
                <Text style={styles.menuItemText}>{label}</Text>
                <Feather accessible={false} name="arrow-up-right" size={16} color={COLORS.blue} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity accessibilityRole="button" style={styles.menuLogin} onPress={() => { setMenuOpen(false); navigation.navigate('Login'); }}>
              <Text style={styles.menuLoginText}>Studio login</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  heroPhoto:{width:'43%',height:470,borderRadius:2},
  formLabel:{fontSize:12,color:COLORS.ink,marginBottom:8},
  screen: { flex: 1, backgroundColor: COLORS.cream },
  page: { paddingBottom: 36 },
  header: { maxWidth: 1180, width: '100%', alignSelf: 'center', paddingHorizontal: 28, paddingTop: 24, paddingBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: { width: 38, height: 38, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  logoLetters: { color: COLORS.white, fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  brandName: { color: COLORS.ink, fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  menuButton: { borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.white, borderRadius: 5, paddingHorizontal: 13, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuText: { color: COLORS.ink, fontWeight: '600', fontSize: 13 },
  hero: { maxWidth: 1180, width: '100%', alignSelf: 'center', marginTop: 24, padding: 28, gap:36, minHeight: 530, backgroundColor: COLORS.cream, flexDirection: 'row', alignItems: 'center' },
  heroCompact: { flexDirection: 'column', alignItems: 'stretch', minHeight: 0, padding: 24 },
  heroCopy: { flex: 1, maxWidth: 610, paddingVertical: 35, zIndex: 1 },
  eyebrow: { color: COLORS.muted, fontSize: 11, letterSpacing: 2, fontWeight: '700', marginBottom: 20 },
  heroTitle: { color: COLORS.ink, fontFamily:FONTS.heading, fontSize: 55, lineHeight: 61, fontWeight: '400', letterSpacing: -1.5 },
  heroTitleCompact: { fontSize: 38, lineHeight: 44 },
  heroText: { color: COLORS.muted, fontSize: 16, lineHeight: 25, maxWidth: 510, marginTop: 22 },
  heroButton: { alignSelf: 'flex-start', marginTop: 30, backgroundColor: COLORS.blue, paddingHorizontal: 17, paddingVertical: 13, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroButtonText: { color: COLORS.white, fontWeight: '700' },
  heroArtwork: { flex: 0.75, minHeight: 390, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  artCircle: { width: 280, height: 280, borderRadius: 140, backgroundColor: COLORS.peach, opacity: 0.92 },
  artCard: { position: 'absolute', backgroundColor: COLORS.cream, padding: 25, width: 190, minHeight: 170, justifyContent: 'space-between', alignSelf: 'center', transform: [{ rotate: '-7deg' }], shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  artLabel: { color: COLORS.navy, fontSize: 18, lineHeight: 22, fontWeight: '700' },
  artNumber: { position: 'absolute', right: 12, bottom: 10, color: '#aebbd8', fontSize: 44, fontWeight: '700' },
  introRow: { maxWidth: 1180, width: '100%', alignSelf: 'center', paddingHorizontal: 28, paddingVertical: 78, flexDirection: 'row', gap: 40 },
  introRowCompact: { flexDirection: 'column', paddingVertical: 52, gap: 18 },
  sectionKicker: { color: COLORS.blue, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  introText: { flex: 1, maxWidth: 650, color: COLORS.ink, fontSize: 25, lineHeight: 34, fontWeight: '600' },
  section: { maxWidth: 1180, width: '100%', alignSelf: 'center', paddingHorizontal: 28, paddingBottom: 80 },
  sectionHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, gap: 20 },
  sectionTitle: { fontFamily:FONTS.heading, color: COLORS.ink, fontSize: 31, lineHeight: 37, fontWeight: '700', letterSpacing: -0.7, marginTop: 10 },
  sectionAside: { color: COLORS.muted, fontSize: 13, maxWidth: 230, lineHeight: 20 },
  loader: { marginVertical: 36 },
  emptyPackage: { borderWidth: 1, borderColor: COLORS.line, padding: 24 },
  emptyText: { color: COLORS.muted },
  packageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  packageCard: { flexGrow: 1, flexBasis: 240, minWidth: 220, maxWidth: 380, minHeight: 240, padding: 22, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 5 },
  packageCardActive: { borderColor: COLORS.blue, borderWidth: 2, transform: [{ translateY: -4 }] },
  packageNumber: { color: COLORS.blue, fontSize: 12, fontWeight: '700', marginBottom: 28 },
  packageName: { color: COLORS.ink, fontSize: 22, fontWeight: '700' },
  packageDescription: { color: COLORS.muted, fontSize: 13, lineHeight: 20, minHeight: 60, marginTop: 10 },
  packagePrice: { color: COLORS.ink, fontSize: 19, fontWeight: '700', marginTop: 17 },
  packageLink: { color: COLORS.blue, fontSize: 12, fontWeight: '700', marginTop: 18 },
  calculator: { maxWidth: 1180, width: '100%', alignSelf: 'center', padding: 38, backgroundColor: COLORS.peach, borderRadius: 5, flexDirection: 'row', gap: 50, alignItems: 'center' },
  calculatorCompact: { flexDirection: 'column', alignItems: 'stretch', padding: 24, gap: 28 },
  calculatorCopy: { flex: 1 },
  calculatorTitle: { fontFamily:FONTS.heading, color: COLORS.navy, fontSize: 34, lineHeight: 39, fontWeight: '700', marginTop: 12 },
  calculatorText: { color: '#5d4e4b', lineHeight: 21, fontSize: 14, marginTop: 15, maxWidth: 480 },
  calculatorBox: { backgroundColor: COLORS.white, padding: 23, width: 330, maxWidth: '100%', borderRadius: 5 },
  calculatorLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  selectedName: { color: COLORS.ink, fontSize: 18, fontWeight: '700', marginTop: 7, minHeight: 25 },
  quantityRow: { borderTopWidth: 1, borderTopColor: '#eee8e0', marginTop: 20, paddingTop: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  stepperButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.cream, alignItems: 'center', justifyContent: 'center' },
  stepperText: { color: COLORS.ink, fontSize: 18 },
  quantityText: { color: COLORS.ink, fontWeight: '700' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#eee8e0', marginTop: 20, paddingTop: 17, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  totalLabel: { color: COLORS.muted, fontSize: 13 },
  totalValue: { color: COLORS.navy, fontSize: 25, fontWeight: '700' },
  enquirySection: { maxWidth: 1180, width: '100%', alignSelf: 'center', paddingHorizontal: 28, paddingTop: 90, paddingBottom: 90, flexDirection: 'row', gap: 60 },
  enquirySectionCompact: { flexDirection: 'column', paddingTop: 60, paddingBottom: 60, gap: 25 },
  enquiryIntro: { flex: 0.8 },
  enquiryText: { color: COLORS.muted, fontSize: 15, lineHeight: 23, maxWidth: 330, marginTop: 18 },
  formCard: { flex: 1.2, minWidth:0, backgroundColor: COLORS.white, padding: 24, borderRadius: 5 },
  formRow: { flexDirection: 'row', gap: 12 },
  formInput: { minHeight:46, borderBottomWidth: 1, borderBottomColor: COLORS.line, paddingVertical: 12, paddingHorizontal: 0, marginBottom: 13, color: COLORS.ink, fontSize: 16 },
  messageInput: { minHeight: 70, textAlignVertical: 'top' },
  submitButton: { backgroundColor: COLORS.navy, alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 17, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  submitText: { color: COLORS.white, fontWeight: '700' },
  successState: { alignItems: 'center', paddingVertical: 30 },
  successIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e1f1eb', alignItems: 'center', justifyContent: 'center' },
  successTitle: { color: COLORS.ink, fontSize: 20, fontWeight: '700', marginTop: 15 },
  successText: { color: COLORS.muted, marginTop: 8, textAlign: 'center' },
  formLink: { color: COLORS.blue, fontWeight: '700', marginTop: 18 },
  footer: { maxWidth: 1180, width: '100%', alignSelf: 'center', borderTopWidth: 1, borderTopColor: COLORS.line, paddingHorizontal: 28, paddingTop: 22, flexDirection: 'row', alignItems: 'center', gap: 14 },
  footerText: { color: COLORS.muted, fontSize: 12 },
  footerLink: { color: COLORS.blue, fontWeight: '700', fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(23,35,61,0.35)', alignItems: 'flex-end' },
  menuPanel: { width: 320, maxWidth: '88%', minHeight: '100%', backgroundColor: COLORS.cream, padding: 28, paddingTop: 40 },
  closeButton: { alignSelf: 'flex-end', padding: 6 },
  menuTitle: { color: COLORS.ink, fontSize: 25, lineHeight: 30, fontWeight: '700', marginTop: 36, marginBottom: 28 },
  menuItem: { borderTopWidth: 1, borderTopColor: COLORS.line, paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuItemText: { color: COLORS.ink, fontSize: 16, fontWeight: '600' },
  menuLogin: { marginTop: 24, backgroundColor: COLORS.navy, padding: 14, alignItems: 'center', borderRadius: 4 },
  menuLoginText: { color: COLORS.white, fontWeight: '700' },
});
