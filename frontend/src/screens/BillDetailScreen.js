import React, { useState, useEffect, useCallback } from 'react';
import Feather from '@expo/vector-icons/Feather';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, useWindowDimensions,
} from 'react-native';
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { confirmDialog, notify } from '../utils/dialog';

import { COLORS, createStyles } from '../design/system';

export default function BillDetailScreen({ route, navigation }) {
  const compact = useWindowDimensions().width < 600;
  const { billId } = route.params;
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staff,setStaff]=useState([]);
  const [updating,setUpdating]=useState(false);
  const updateStatus=async status=>{setUpdating(true);try{const {data}=await api.put(`/bills/${billId}`,{status,...(status==='paid'?{advancePaid:bill.totalAmount}:{})});setBill(data);}catch(e){notify('Unable to update',e.response?.data?.message || 'Please try again');}finally{setUpdating(false);}};

  const setDelivery=async(item,status)=>{setUpdating(true);try{const {data}=await api.put(`/bills/${billId}/items/${item._id}/delivery`,{deliveryStatus:status});setBill(data);}catch(e){notify('Unable to update delivery',e.response?.data?.message || 'Try again');}finally{setUpdating(false);}};
  const fetchBill = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/bills/${billId}`);
      setBill(data);
      setStaff((await api.get('/team/users')).data);
    } catch (err) {
      notify('Error', 'Failed to load bill details');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchBill(); }, [billId]));

  const handleDelete = () => {
    confirmDialog(
      'Delete Bill',
      `Are you sure you want to delete bill #${bill?.billNumber}?`,
      async () => {
        try {
          await api.delete(`/bills/${billId}`);
          notify('Deleted', 'Bill has been deleted successfully');
          navigation.navigate('Bills');
        } catch (err) {
          notify('Delete Failed', err.response?.data?.message || 'Could not delete bill');
        }
      }
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Loading bill...</Text>
      </View>
    );
  }

  if (!bill) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Bill not found</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather accessible={false} name="arrow-left" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather accessible={false} name="arrow-left" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Invoice #{bill.billNumber}</Text>
        <View style={styles.topBarActions}>
          <TouchableOpacity accessibilityRole="button"
            style={styles.editBtn}
            onPress={() => navigation.navigate('CreateBill', { editBillId: bill._id })}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.delBtn} onPress={handleDelete}>
            <Text style={styles.delBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:24}}>
          {bill.status !== 'paid' && bill.status !== 'cancelled' && <TouchableOpacity accessibilityRole="button" disabled={updating} style={styles.editBtn} onPress={()=>confirmDialog('Record full payment','Confirm that the full invoice amount has been received.',()=>updateStatus('paid'))}><Text style={styles.editBtnText}>Mark as paid</Text></TouchableOpacity>}
          {bill.status !== 'cancelled' && <TouchableOpacity accessibilityRole="button" disabled={updating} style={styles.delBtn} onPress={()=>confirmDialog('Cancel bill','This will exclude its costs from team earnings.',()=>updateStatus('cancelled'))}><Text style={styles.delBtnText}>Cancel bill</Text></TouchableOpacity>}
          {bill.status === 'cancelled' && <TouchableOpacity accessibilityRole="button" disabled={updating} style={styles.editBtn} onPress={()=>updateStatus('draft')}><Text style={styles.editBtnText}>Reopen bill</Text></TouchableOpacity>}
        </View>
        {/* Printable Invoice Header */}
        <View style={[styles.invoiceHeader,compact&&{flexDirection:'column',gap:18}]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandName}>PhotoFinder Studio</Text>
            <Text style={styles.brandSub}>Professional Photography & Cinematic Videography</Text>
            <Text style={styles.brandMeta}>Invoice / Agreement Document</Text>
          </View>
          <View style={[styles.invoiceMetaRight,compact&&{alignItems:'flex-start'}]}>
            <Text style={styles.invoiceNumber}>#{bill.billNumber}</Text>
            <Text style={styles.invoiceDate}>{new Date(bill.createdAt).toLocaleDateString()}</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{(bill.status || 'draft').toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Client & Event Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>CLIENT & EVENT DETAILS</Text>
          <View style={styles.clientGrid}>
            <View style={styles.clientCol}>
              <Text style={styles.metaLabel}>Client Name</Text>
              <Text style={styles.metaValue}>{bill.client?.name || 'N/A'}</Text>
            </View>
            <View style={styles.clientCol}>
              <Text style={styles.metaLabel}>Phone Number</Text>
              <Text style={styles.metaValue}>{bill.client?.phone || 'N/A'}</Text>
            </View>
            {bill.client?.email ? (
              <View style={styles.clientCol}>
                <Text style={styles.metaLabel}>Email Address</Text>
                <Text style={styles.metaValue}>{bill.client.email}</Text>
              </View>
            ) : null}
            {bill.client?.eventType ? (
              <View style={styles.clientCol}>
                <Text style={styles.metaLabel}>Event Type</Text>
                <Text style={styles.metaValue}>{bill.client.eventType}</Text>
              </View>
            ) : null}
            {bill.client?.eventDate ? (
              <View style={styles.clientCol}>
                <Text style={styles.metaLabel}>Event Date</Text>
                <Text style={styles.metaValue}>{new Date(bill.client.eventDate).toDateString()}</Text>
              </View>
            ) : null}
            {bill.client?.eventVenue ? (
              <View style={styles.clientCol}>
                <Text style={styles.metaLabel}>Venue / Location</Text>
                <Text style={styles.metaValue}>{bill.client.eventVenue}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Services Table */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>ITEMIZED SERVICES</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.colService, styles.thText]}>Service</Text>
            <Text style={[styles.colQty, styles.thText]}>Qty</Text>
            <Text style={[styles.colRate, styles.thText]}>Rate (₹)</Text>
            <Text style={[styles.colTotal, styles.thText]}>Amount (₹)</Text>
          </View>
          {bill.items?.map((item, idx) => (
            <View key={idx} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}>
              <View style={styles.colService}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                {item.unit ? <Text style={styles.itemUnit}>Unit: {item.unit}</Text> : null}
              </View>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colRate}>₹{item.sellingPrice}</Text>
              <Text style={styles.colTotal}>₹{(item.lineTotal ?? item.sellingPrice * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>SERVICE DELIVERY · INTERNAL</Text>
          {bill.items.map(item=><View key={item._id} style={{borderBottomWidth:1,borderColor:COLORS.border,paddingVertical:16}}>
            <Text style={styles.itemTitle}>{item.name}</Text>
            <Text style={{fontSize:13,color:COLORS.subtext,lineHeight:21,marginTop:6}}>{staff.find(member=>member._id===item.assignedTo)?.label || 'Unassigned'} · {item.deliveryStatus==='delivered'?'Delivered · settled':'Awaiting delivery · pending'} · ₹{Number(item.lineTotal).toFixed(2)}</Text>
            <TouchableOpacity accessibilityRole="button" disabled={updating || bill.status==='cancelled'} style={[styles.editBtn,{alignSelf:'flex-start',marginTop:12}]} onPress={()=>confirmDialog(item.deliveryStatus==='delivered'?'Reopen delivery':'Confirm delivery',item.deliveryStatus==='delivered'?'Move this service amount back to the pending wallet?':'Mark this service fully delivered and move its amount to the settled wallet?',()=>setDelivery(item,item.deliveryStatus==='delivered'?'pending':'delivered'))}><Text style={styles.editBtnText}>{item.deliveryStatus==='delivered'?'Reopen delivery':'Mark delivered'}</Text></TouchableOpacity>
          </View>)}
        </View>
        {/* Bill Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>PAYMENT SUMMARY</Text>
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
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.totalVal}>₹{bill.totalAmount}</Text>
          </View>
          <View style={styles.summaryLine}>
            <Text style={styles.sumLabel}>Advance Received</Text>
            <Text style={[styles.sumVal, { color: COLORS.success }]}>₹{bill.advancePaid}</Text>
          </View>
          <View style={[styles.summaryLine, styles.balanceLine]}>
            <Text style={styles.balanceLabel}>Balance Due</Text>
            <Text style={styles.balanceVal}>₹{bill.balanceDue}</Text>
          </View>

        </View>

        {/* Agreement Text & Terms */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>SERVICE AGREEMENT & CONTRACT</Text>
          {bill.agreementText ? (
            <Text style={styles.agreementBody}>{bill.agreementText}</Text>
          ) : null}

          {bill.agreementTerms && bill.agreementTerms.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={[styles.sectionHeader, { fontSize: 11, marginBottom: 6 }]}>
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
        <View style={styles.signSection}>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>Client Signature & Date</Text>
          </View>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>Authorized Studio Signatory</Text>
          </View>
        </View>

        <View style={styles.footerNote}>
          <Text style={styles.footerText}>Thank you for choosing PhotoFinder Studio!</Text>
          <Text style={styles.footerSub}>This invoice and agreement is electronically generated.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = createStyles({
  container: { flex: 1, backgroundColor: '#ffffff' },
  topBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ebebeb',
  },
  backBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  backBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },
  topBarTitle: { color: COLORS.text, fontSize: 17, fontWeight: 'bold' },
  topBarActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    backgroundColor: '#eff0e8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2dfd6',
  },
  editBtnText: { color: '#4e5941', fontWeight: 'bold', fontSize: 13 },
  delBtn: {
    backgroundColor: '#fff5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffd5d5',
  },
  delBtnText: { color: COLORS.error, fontSize: 14 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { color: COLORS.subtext, marginTop: 10 },
  emptyText: { color: COLORS.subtext, fontSize: 16, marginBottom: 12 },
  scrollArea: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { padding: 20, maxWidth: 760, alignSelf: 'center', width: '100%' },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 20,
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#4e5941',
  },
  brandName: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary },
  brandSub: { fontSize: 13, color: COLORS.subtext, marginTop: 2 },
  brandMeta: { fontSize: 11, color: COLORS.subtext, marginTop: 4, textTransform: 'uppercase' },
  invoiceMetaRight: { alignItems: 'flex-end' },
  invoiceNumber: { fontSize: 20, fontWeight: 'bold', color: COLORS.accent },
  invoiceDate: { fontSize: 12, color: COLORS.subtext, marginTop: 2 },
  statusPill: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 6,
  },
  statusPillText: { fontSize: 11, fontWeight: 'bold', color: COLORS.success },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dce3f1',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 0.8,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  clientGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  clientCol: { width: '48%' },
  metaLabel: { fontSize: 11, color: COLORS.subtext, textTransform: 'uppercase' },
  metaValue: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 2 },
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
  itemTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
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
  agreementBody: { fontSize: 13, color: COLORS.text, lineHeight: 20 },
  termRow: { flexDirection: 'row', marginVertical: 3 },
  termNum: { width: 22, fontSize: 12, fontWeight: 'bold', color: COLORS.primary },
  termText: { flex: 1, fontSize: 12, color: COLORS.text, lineHeight: 18 },
  signSection: { flexDirection: 'row', gap: 20, marginVertical: 24 },
  signBox: { flex: 1, alignItems: 'center' },
  signLine: { width: '80%', height: 1, backgroundColor: '#bdbdbd', marginBottom: 8, marginTop: 40 },
  signLabel: { fontSize: 12, color: COLORS.subtext },
  footerNote: { alignItems: 'center', paddingVertical: 20 },
  footerText: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary },
  footerSub: { fontSize: 12, color: COLORS.subtext, marginTop: 4 },
});
