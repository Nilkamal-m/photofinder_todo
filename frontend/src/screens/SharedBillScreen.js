import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

import { COLORS, createStyles } from '../design/system';

export default function SharedBillScreen({ route, navigation }) {
  const compact = useWindowDimensions().width < 600;
  const { user } = useAuth();
  // Token from route params or browser URL (on web)
  let initialToken = route?.params?.token;
  let initialPhone = '';
  if (typeof window !== 'undefined' && window.location) {
    const urlParams = new URLSearchParams(window.location.search);
    if (!initialToken) initialToken = urlParams.get('token');
    initialPhone = urlParams.get('phone') || '';
  }

  const [tokenInput, setTokenInput] = useState(initialToken || '');
  const [phone, setPhone] = useState(initialPhone);
  const [verified, setVerified] = useState(false);
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const effectiveToken = route?.params?.token || tokenInput;

  const verify = async () => {
    const trimmedToken = (effectiveToken || '').trim();
    const trimmedPhone = (phone || '').trim();

    if (!trimmedToken) {
      setError('Missing bill share token');
      return;
    }
    if (!trimmedPhone) {
      setError('Please enter your phone number to access this bill');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(
        `/bills/shared/${encodeURIComponent(trimmedToken)}?phone=${encodeURIComponent(trimmedPhone)}`
      );
      setBill(data);
      setVerified(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Access denied. Please check your phone number.');
    } finally {
      setLoading(false);
    }
  };

  if (!verified) {
    return (
      <View style={styles.container}>
        <View style={styles.verifyBox}>
          <View style={styles.logoBadge}>
            <Text style={styles.logo}>PF</Text>
          </View>
          <Text style={styles.verifyTitle}>Your invoice</Text>
          <Text style={styles.verifySubtitle}>
            Enter the phone number this invoice was shared with.
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {!route?.params?.token && !initialToken && (
            <>
              <Text style={styles.label}>Bill Share Token</Text>
              <TextInput accessibilityLabel="Bill Share Token"
                style={styles.input}
                placeholder="Enter bill share token"
                value={tokenInput}
                onChangeText={(v) => { setTokenInput(v); setError(''); }}
              />
            </>
          )}

          <Text style={styles.label}>Your Phone Number</Text>
          <TextInput accessibilityLabel="Your Phone Number"
            style={styles.input}
                        value={phone}
            onChangeText={(v) => { setPhone(v); setError(''); }}
            keyboardType="phone-pad"
          />

          <TouchableOpacity accessibilityRole="button" style={styles.verifyBtn} onPress={verify} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.verifyBtnText}>View invoice</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity accessibilityRole="button" style={styles.backLink} onPress={() => navigation?.navigate(user ? 'Home' : 'Login')}>
            <Text style={styles.backLinkText}>← Back to studio</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Invoice Banner */}
      <View style={[styles.invoiceHeader,compact&&{flexDirection:'column',gap:18}]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.studioName}>PhotoFinder Studio</Text>
          <Text style={styles.studioSub}>Professional Photography & Videography</Text>
          <Text style={styles.docType}>Verified Client Invoice & Agreement</Text>
        </View>
        <View style={[styles.metaRight,compact&&{alignItems:'flex-start'}]}>
          <Text style={styles.billNum}>#{bill.billNumber}</Text>
          <Text style={styles.billDate}>{new Date(bill.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>

      {/* Client Details */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>CLIENT & EVENT INFORMATION</Text>
        <View style={styles.grid}>
          <View style={styles.col}>
            <Text style={styles.fieldLabel}>Client Name</Text>
            <Text style={styles.fieldValue}>{bill.client?.name}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.fieldLabel}>Verified Phone</Text>
            <Text style={styles.fieldValue}>{bill.client?.phone}</Text>
          </View>
          {bill.client?.eventType ? (
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Event</Text>
              <Text style={styles.fieldValue}>{bill.client.eventType}</Text>
            </View>
          ) : null}
          {bill.client?.eventDate ? (
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Event Date</Text>
              <Text style={styles.fieldValue}>{new Date(bill.client.eventDate).toDateString()}</Text>
            </View>
          ) : null}
          {bill.client?.eventVenue ? (
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Venue</Text>
              <Text style={styles.fieldValue}>{bill.client.eventVenue}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Services Table */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>ITEMIZED SERVICES</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.colService, styles.thText]}>Service</Text>
          <Text style={[styles.colQty, styles.thText]}>Qty</Text>
          <Text style={[styles.colRate, styles.thText]}>Rate (₹)</Text>
          <Text style={[styles.colTotal, styles.thText]}>Amount (₹)</Text>
        </View>
        {bill.items?.map((item, idx) => (
          <View key={idx} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}>
            <View style={styles.colService}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.unit ? <Text style={styles.itemUnit}>Unit: {item.unit}</Text> : null}
            </View>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colRate}>₹{item.sellingPrice}</Text>
            <Text style={styles.colTotal}>₹{(item.lineTotal ?? item.sellingPrice * item.quantity).toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Summary */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>PAYMENT SUMMARY</Text>
        <View style={styles.summaryLine}>
          <Text style={styles.sumLabel}>Subtotal</Text>
          <Text style={styles.sumVal}>₹{bill.subtotal}</Text>
        </View>
        {bill.discount > 0 && (
          <View style={styles.summaryLine}>
            <Text style={styles.sumLabel}>Discount</Text>
            <Text style={[styles.sumVal, { color: COLORS.error }]}>- ₹{bill.discount}</Text>
          </View>
        )}
        <View style={[styles.summaryLine, styles.totalLine]}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalVal}>₹{bill.totalAmount}</Text>
        </View>
        <View style={styles.summaryLine}>
          <Text style={styles.sumLabel}>Advance Paid</Text>
          <Text style={[styles.sumVal, { color: COLORS.success }]}>₹{bill.advancePaid}</Text>
        </View>
        <View style={[styles.summaryLine, styles.balanceLine]}>
          <Text style={styles.balanceLabel}>Balance Due</Text>
          <Text style={styles.balanceVal}>₹{bill.balanceDue}</Text>
        </View>
      </View>

      {/* Agreement Terms */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>SERVICE AGREEMENT & TERMS</Text>
        {bill.agreementText ? (
          <Text style={styles.agreementText}>{bill.agreementText}</Text>
        ) : null}

        {bill.agreementTerms && bill.agreementTerms.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.sectionTitle, { fontSize: 11, marginBottom: 6 }]}>
              TERMS & CONDITIONS
            </Text>
            {bill.agreementTerms.map((t, i) => (
              <View key={i} style={styles.termRow}>
                <Text style={styles.termNum}>{i + 1}.</Text>
                <Text style={styles.termText}>{t}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Signatures */}
      <View style={styles.signatureRow}>
        <View style={styles.signatureBox}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>Client Signature & Acceptance</Text>
        </View>
        <View style={styles.signatureBox}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>PhotoFinder Studio Signatory</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Thank you for choosing PhotoFinder Studio! </Text>
        <Text style={styles.footerSub}>This invoice is verified and electronically delivered.</Text>
      </View>
    </ScrollView>
  );
}

const styles = createStyles({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { padding: 20, maxWidth: 740, alignSelf: 'center', width: '100%' },
  verifyBox: {
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    marginTop: 80,
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dce3f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#eff0e8',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  logo: { fontSize: 32 },
  verifyTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  verifySubtitle: {
    color: COLORS.subtext,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
    fontSize: 13,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: { color: COLORS.error, fontSize: 13, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  verifyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  verifyBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  backLink: { marginTop: 16, alignItems: 'center' },
  backLinkText: { color: COLORS.primary, fontSize: 13, fontWeight: '500' },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 20,
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#4e5941',
  },
  studioName: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary },
  studioSub: { fontSize: 13, color: COLORS.subtext, marginTop: 2 },
  docType: { fontSize: 11, color: COLORS.subtext, marginTop: 4, textTransform: 'uppercase' },
  metaRight: { alignItems: 'flex-end' },
  billNum: { fontSize: 20, fontWeight: 'bold', color: COLORS.accent },
  billDate: { fontSize: 12, color: COLORS.subtext, marginTop: 2 },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dce3f1',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 0.8,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  col: { width: '48%' },
  fieldLabel: { fontSize: 11, color: COLORS.subtext, textTransform: 'uppercase' },
  fieldValue: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginBottom: 4,
  },
  thText: { fontSize: 12, fontWeight: 'bold', color: COLORS.text },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6 },
  tableRowAlt: { backgroundColor: '#fafafa' },
  colService: { flex: 2 },
  colQty: { flex: 0.6, textAlign: 'center', color: COLORS.text },
  colRate: { flex: 1, textAlign: 'right', color: COLORS.text },
  colTotal: { flex: 1.2, textAlign: 'right', fontWeight: 'bold', color: COLORS.text },
  itemName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  itemUnit: { fontSize: 11, color: COLORS.subtext, marginTop: 1 },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  sumLabel: { fontSize: 13, color: COLORS.text },
  sumVal: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  totalLine: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  totalVal: { fontSize: 17, fontWeight: 'bold', color: COLORS.primary },
  balanceLine: {
    backgroundColor: '#fff3e0',
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  balanceLabel: { fontSize: 14, fontWeight: 'bold', color: COLORS.error },
  balanceVal: { fontSize: 15, fontWeight: 'bold', color: COLORS.error },
  agreementText: { fontSize: 13, color: COLORS.text, lineHeight: 20 },
  termRow: { flexDirection: 'row', marginVertical: 3 },
  termNum: { width: 22, fontSize: 12, fontWeight: 'bold', color: COLORS.primary },
  termText: { flex: 1, fontSize: 12, color: COLORS.text, lineHeight: 18 },
  signatureRow: { flexDirection: 'row', gap: 20, marginVertical: 24 },
  signatureBox: { flex: 1, alignItems: 'center' },
  signatureLine: { width: '80%', height: 1, backgroundColor: '#bdbdbd', marginBottom: 8, marginTop: 40 },
  signatureLabel: { fontSize: 12, color: COLORS.subtext },
  footer: { alignItems: 'center', paddingVertical: 24 },
  footerText: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary },
  footerSub: { color: COLORS.subtext, fontSize: 12, marginTop: 4 },
});
