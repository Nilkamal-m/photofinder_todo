import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Modal, TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import api from '../services/api';
import { confirmDialog, notify } from '../utils/dialog';

import { COLORS, createStyles } from '../design/system';

export default function ClientsScreen({ navigation }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    eventType: 'Wedding',
    eventDate: '',
    eventVenue: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/clients');
      setClients(data);
    } catch (err) {
      notify('Error', 'Failed to load clients list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      phone: '',
      email: '',
      address: '',
      eventType: 'Wedding',
      eventDate: '',
      eventVenue: '',
      notes: '',
    });
    setFormError('');
    setModalVisible(true);
  };

  const openEdit = (client) => {
    setEditing(client);
    setForm({
      name: client.name || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      eventType: client.eventType || 'Wedding',
      eventDate: client.eventDate ? client.eventDate.split('T')[0] : '',
      eventVenue: client.eventVenue || '',
      notes: client.notes || '',
    });
    setFormError('');
    setModalVisible(true);
  };

  const save = async () => {
    setFormError('');
    const name = form.name.trim();
    const phone = form.phone.trim();
    if (!name) {
      setFormError('Client name is required');
      return;
    }
    if (!phone) {
      setFormError('Phone number is required (used to share bills securely)');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        phone,
        email: form.email.trim(),
        address: form.address.trim(),
        eventType: form.eventType.trim(),
        eventDate: form.eventDate ? new Date(form.eventDate) : undefined,
        eventVenue: form.eventVenue.trim(),
        notes: form.notes.trim(),
      };

      if (editing) {
        await api.put(`/clients/${editing._id}`, payload);
      } else {
        await api.post('/clients', payload);
      }
      setModalVisible(false);
      fetchClients();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (client) => {
    confirmDialog('Delete Client', `Are you sure you want to delete client "${client.name}"?`, async () => {
      try {
        await api.delete(`/clients/${client._id}`);
        fetchClients();
      } catch (err) {
        notify('Error', err.response?.data?.message || 'Failed to delete client');
      }
    });
  };

  const renderClient = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(item.name[0] || 'C').toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.clientName}>{item.name}</Text>
          <Text style={styles.clientPhone}>{item.phone}</Text>
          {item.email ? <Text style={styles.clientSub}>{item.email}</Text> : null}
        </View>
        {item.eventType ? (
          <View style={styles.eventBadge}>
            <Text style={styles.eventBadgeText}>{item.eventType}</Text>
          </View>
        ) : null}
      </View>

      {(item.eventDate || item.eventVenue || item.address) && (
        <View style={styles.eventDetailsBox}>
          {item.eventDate && (
            <Text style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text> {new Date(item.eventDate).toDateString()}
            </Text>
          )}
          {item.eventVenue && (
            <Text style={styles.detailRow}>
              <Text style={styles.detailLabel}>Venue:</Text> {item.eventVenue}
            </Text>
          )}
          {item.address && (
            <Text style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address:</Text> {item.address}
            </Text>
          )}
        </View>
      )}

      {item.notes ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      ) : null}

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.billBtn}
          onPress={() => navigation.navigate('CreateBill', { preselectedClient: item })}
        >
          <Text style={styles.billBtnText}>Create Bill</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
          <Text style={styles.editBtnText}>Edit</Text>
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
          <Text style={styles.heading}>Clients</Text>
          <Text style={styles.subheading}>Manage client records & event schedules</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ Add Client</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Loading clients...</Text>
        </View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(i) => i._id}
          renderItem={renderClient}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.empty}>
              
              <Text style={styles.emptyText}>No clients added yet.</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={openCreate}>
                <Text style={styles.emptyAddBtnText}>+ Add First Client</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Create / Edit Client Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Client' : 'Add Client'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeIcon}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {formError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>Client Full Name *</Text>
              <TextInput
                style={styles.input}
                                value={form.name}
                onChangeText={(v) => { setForm({ ...form, name: v }); setFormError(''); }}
              />

              <Text style={styles.fieldLabel}>Phone Number * (Must be accurate for bill sharing)</Text>
              <TextInput
                style={styles.input}
                                value={form.phone}
                onChangeText={(v) => { setForm({ ...form, phone: v }); setFormError(''); }}
                keyboardType="phone-pad"
              />

              <Text style={styles.fieldLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                                value={form.email}
                onChangeText={(v) => setForm({ ...form, email: v })}
                keyboardType="email-address"
              />

              <Text style={styles.fieldLabel}>Event Type</Text>
              <TextInput
                style={styles.input}
                                value={form.eventType}
                onChangeText={(v) => setForm({ ...form, eventType: v })}
              />

              <Text style={styles.fieldLabel}>Event Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                                value={form.eventDate}
                onChangeText={(v) => setForm({ ...form, eventDate: v })}
              />

              <Text style={styles.fieldLabel}>Event Venue / Location</Text>
              <TextInput
                style={styles.input}
                                value={form.eventVenue}
                onChangeText={(v) => setForm({ ...form, eventVenue: v })}
              />

              <Text style={styles.fieldLabel}>Client Address</Text>
              <TextInput
                style={styles.input}
                                value={form.address}
                onChangeText={(v) => setForm({ ...form, address: v })}
              />

              <Text style={styles.fieldLabel}>Special Notes</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                                value={form.notes}
                onChangeText={(v) => setForm({ ...form, notes: v })}
                multiline
              />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>{editing ? 'Update Client' : 'Save Client'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: COLORS.primary, fontSize: 18, fontWeight: 'bold' },
  clientName: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },
  clientPhone: { fontSize: 13, color: COLORS.subtext, marginTop: 2 },
  clientSub: { fontSize: 12, color: COLORS.subtext, marginTop: 1 },
  eventBadge: {
    backgroundColor: '#edf2ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d9e3fa',
  },
  eventBadgeText: { color: COLORS.primary, fontSize: 11, fontWeight: 'bold' },
  eventDetailsBox: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
  },
  detailRow: { fontSize: 13, color: COLORS.text, marginVertical: 2 },
  detailLabel: { fontWeight: '600', color: COLORS.subtext },
  notesBox: {
    backgroundColor: '#fffde7',
    borderRadius: 8,
    padding: 8,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#fff9c4',
  },
  notesText: { fontSize: 12, color: '#795548', fontStyle: 'italic' },
  cardActions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  billBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  billBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  editBtn: {
    flex: 1,
    backgroundColor: '#edf2ff',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d9e3fa',
  },
  editBtnText: { color: '#2459d3', fontWeight: '600', fontSize: 13 },
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
    maxWidth: 540,
    maxHeight: '90%',
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
  modalScroll: { padding: 20 },
  errorBox: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: { color: COLORS.error, fontSize: 13, fontWeight: '500' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 11,
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.text, fontWeight: '600' },
  saveBtn: {
    flex: 1.5,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
});
