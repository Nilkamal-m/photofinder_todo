import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Modal, TextInput, ActivityIndicator,
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { confirmDialog, notify } from '../utils/dialog';

import { COLORS, createStyles } from '../design/system';

const statusColors = {
  draft: '#757575',
  sent: '#2459d3',
  paid: '#2e7d32',
  cancelled: '#d32f2f',
};

export default function BillsScreen({ navigation }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareModal, setShareModal] = useState(null);
  const [sharePhone, setSharePhone] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareResult, setShareResult] = useState(null);

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/bills');
      setBills(data);
    } catch (err) {
      notify('Error', 'Failed to load bills list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const openShare = (bill) => {
    setShareModal(bill);
    setSharePhone(bill.client?.phone || '');
    setShareResult(null);
  };

  const handleShare = async () => {
    const phone = sharePhone.trim();
    if (!phone) {
      notify('Phone Required', 'Please enter the client phone number to share the bill with.');
      return;
    }
    setSharing(true);
    try {
      const { data } = await api.post(`/bills/${shareModal._id}/share`, { phone });
      setShareResult(data);
      fetchBills();
    } catch (err) {
      notify('Share Error', err.response?.data?.message || 'Failed to share bill');
    } finally {
      setSharing(false);
    }
  };

  const handleDelete = (bill) => {
    confirmDialog(
      'Delete Bill',
      `Are you sure you want to delete bill ${bill.billNumber} for ${bill.client?.name || 'client'}?`,
      async () => {
        try {
          await api.delete(`/bills/${bill._id}`);
          fetchBills();
        } catch (err) {
          notify('Error', err.response?.data?.message || 'Failed to delete bill');
        }
      }
    );
  };

  const renderBill = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <View style={styles.billNumberRow}>
            <Text style={styles.billNum}>{item.billNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] || '#757575' }]}>
              <Text style={styles.statusText}>{(item.status || 'draft').toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.clientName}>{item.client?.name || 'Unknown Client'}</Text>
          <Text style={styles.clientPhone}>{item.client?.phone || 'No phone'}</Text>
        </View>
      </View>

      <View style={styles.amtRow}>
        <View style={styles.amtCol}>
          <Text style={styles.amtLabel}>Total</Text>
          <Text style={styles.amtValue}>₹{item.totalAmount}</Text>
        </View>
        <View style={styles.amtCol}>
          <Text style={styles.amtLabel}>Advance</Text>
          <Text style={styles.amtValue}>₹{item.advancePaid}</Text>
        </View>
        <View style={styles.amtCol}>
          <Text style={styles.amtLabel}>Balance Due</Text>
          <Text style={[styles.amtValue, { color: item.balanceDue > 0 ? COLORS.error : COLORS.success }]}>
            ₹{item.balanceDue}
          </Text>
        </View>
        {isAdmin && (
          <View style={styles.amtCol}>
            <Text style={styles.amtLabel}>Profit [Admin]</Text>
            <Text style={[styles.amtValue, { color: COLORS.success }]}>₹{item.profit}</Text>
          </View>
        )}
      </View>

      {item.sharedWithPhone ? (
        <View style={styles.sharedInfoBox}>
          <Text style={styles.sharedInfoText}>
            Shared with phone: <Text style={{ fontWeight: 'bold' }}>{item.sharedWithPhone}</Text>
          </Text>
        </View>
      ) : null}

      {/* CRUD Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => navigation.navigate('BillDetail', { billId: item._id })}
        >
          <Text style={styles.viewBtnText}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('CreateBill', { editBillId: item._id })}
        >
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareBtn} onPress={() => openShare(item)}>
          <Text style={styles.shareBtnText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
          <Text style={styles.delBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.heading}>Bills & Agreements</Text>
          <Text style={styles.subheading}>Generate, customize agreements & share bills</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('CreateBill', {})}
        >
          <Text style={styles.addBtnText}>+ New Bill</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Loading bills...</Text>
        </View>
      ) : (
        <FlatList
          data={bills}
          keyExtractor={(i) => i._id}
          renderItem={renderBill}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.empty}>
              
              <Text style={styles.emptyText}>No bills generated yet.</Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => navigation.navigate('CreateBill', {})}
              >
                <Text style={styles.emptyAddBtnText}>+ Generate Your First Bill</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Share Modal */}
      <Modal visible={!!shareModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share Bill & Agreement</Text>
              <TouchableOpacity onPress={() => setShareModal(null)}>
                <Text style={styles.closeIcon}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.shareDesc}>
                Bill <Text style={{ fontWeight: 'bold' }}>#{shareModal?.billNumber}</Text> for{' '}
                <Text style={{ fontWeight: 'bold' }}>{shareModal?.client?.name}</Text>.
              </Text>
              <Text style={styles.shareNote}>
                Security Guarantee: Only the recipient phone number entered below will be permitted to unlock and view the bill & agreement!
              </Text>

              <Text style={styles.fieldLabel}>Client Phone Number *</Text>
              <TextInput
                style={styles.input}
                                value={sharePhone}
                onChangeText={setSharePhone}
                keyboardType="phone-pad"
              />

              {shareResult && (
                <View style={styles.resultBox}>
                  <Text style={styles.resultTitle}>Bill Shared Successfully!</Text>
                  <Text style={styles.resultSub}>Share Link (Phone-Gated):</Text>
                  <TextInput
                    style={styles.linkBox}
                    value={`http://localhost:8085/?token=${shareResult.shareToken}&phone=${sharePhone}`}
                    editable={false}
                    selectTextOnFocus
                  />
                  <Text style={styles.resultHint}>
                    Only phone <Text style={{ fontWeight: 'bold' }}>{sharePhone}</Text> can unlock this bill.
                  </Text>
                </View>
              )}

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShareModal(null)}>
                  <Text style={styles.cancelBtnText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmShareBtn}
                  onPress={handleShare}
                  disabled={sharing}
                >
                  {sharing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.confirmShareBtnText}>Share with Number</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
  heading: { color: COLORS.text, fontSize: 22, fontWeight: 'bold' },
  subheading: { color: COLORS.subtext, fontSize: 13, marginTop: 2 },
  backBtn: { paddingVertical: 8, paddingRight: 14 },
  backBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: COLORS.subtext, marginTop: 10 },
  listContainer: { padding: 16, backgroundColor: '#ffffff' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#dce3f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  billNumberRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  billNum: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  statusBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  clientName: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },
  clientPhone: { fontSize: 13, color: COLORS.subtext },
  amtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  amtCol: { flex: 1, alignItems: 'center' },
  amtLabel: { fontSize: 11, color: COLORS.subtext, textTransform: 'uppercase' },
  amtValue: { fontSize: 15, fontWeight: 'bold', color: COLORS.text, marginTop: 2 },
  sharedInfoBox: {
    backgroundColor: '#edf2ff',
    borderRadius: 6,
    padding: 8,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#d9e3fa',
  },
  sharedInfoText: { fontSize: 12, color: COLORS.primary },
  cardActions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
    paddingTop: 8,
  },
  viewBtn: {
    flex: 1.2,
    backgroundColor: '#edf2ff',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d9e3fa',
  },
  viewBtnText: { color: '#2459d3', fontWeight: 'bold', fontSize: 13 },
  editBtn: {
    flex: 1,
    backgroundColor: '#fafafa',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  editBtnText: { color: COLORS.text, fontWeight: '600', fontSize: 13 },
  shareBtn: {
    flex: 1.2,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  shareBtnText: { color: COLORS.success, fontWeight: 'bold', fontSize: 13 },
  delBtn: {
    flex: 1,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffd5d5',
  },
  delBtnText: { color: COLORS.error, fontWeight: '600', fontSize: 13 },
  empty: { alignItems: 'center', marginTop: 80, padding: 20 },
  emptyIcon: { fontSize: 48, marginBottom: 10 },
  emptyText: { color: COLORS.subtext, fontSize: 16, marginBottom: 16 },
  emptyAddBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyAddBtnText: { color: '#ffffff', fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  closeIcon: { fontSize: 20, color: COLORS.subtext, padding: 4 },
  modalBody: { padding: 20 },
  shareDesc: { fontSize: 14, color: COLORS.text, marginBottom: 4 },
  shareNote: { fontSize: 12, color: COLORS.subtext, lineHeight: 18, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 11,
    marginBottom: 14,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  resultBox: {
    backgroundColor: '#f1f8e9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#c5e1a5',
  },
  resultTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.success, marginBottom: 4 },
  resultSub: { fontSize: 12, color: COLORS.subtext, marginBottom: 4 },
  linkBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#aed581',
    borderRadius: 6,
    padding: 8,
    fontSize: 12,
    color: COLORS.text,
  },
  resultHint: { fontSize: 11, color: COLORS.subtext, marginTop: 4 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 6 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.text, fontWeight: '600' },
  confirmShareBtn: {
    flex: 1.5,
    backgroundColor: COLORS.success,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  confirmShareBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
});
