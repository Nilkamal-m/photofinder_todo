import React, { useState, useEffect, useCallback } from 'react';
import Feather from '@expo/vector-icons/Feather';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Modal, TextInput, ActivityIndicator, ScrollView, Switch,
} from 'react-native';
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { totals, serviceCost } from '../utils/pricing';
import { useAuth } from '../context/AuthContext';
import { confirmDialog, notify } from '../utils/dialog';

import { COLORS, createStyles } from '../design/system';

export default function PackagesScreen({ navigation }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [priceItems, setPriceItems] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', items: [], isPublic:false });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [pkgRes, priceRes] = await Promise.all([
        api.get('/packages'),
        api.get('/prices'),
      ]);
      setPackages(pkgRes.data);
      setPriceItems(priceRes.data);
    } catch (err) {
      notify('Error', 'Failed to load packages or price list');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchAll();
  }, [fetchAll]));

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', items: [], isPublic:false });
    setFormError('');
    setModalVisible(true);
  };

  const openEdit = (pkg) => {
    setEditing(pkg);
    const existingItems = (pkg.items || []).map((i) => ({
      priceItem: i.priceItem?._id || i.priceItem,
      name: i.name,
      unit: i.unit,
      quantity: i.quantity || 1,
      sellingPrice: i.sellingPrice,
      costPrice: i.costPrice || 0,
    }));
    setForm({
      isPublic: !!pkg.isPublic,
      name: pkg.name || '',
      description: pkg.description || '',
      items: existingItems,
    });
    setFormError('');
    setModalVisible(true);
  };

  const toggleItem = (pi) => {
    const exists = form.items.find((i) => i.priceItem === pi._id);
    if (exists) {
      setForm({ ...form, items: form.items.filter((i) => i.priceItem !== pi._id) });
    } else {
      setForm({
        ...form,
        items: [
          ...form.items,
          {
            priceItem: pi._id,
            name: pi.name,
            unit: pi.unit,
            quantity: 1,
            sellingPrice: pi.sellingPrice,
            costPrice: serviceCost(pi),
          costComponents: pi.costComponents,
          },
        ],
      });
    }
  };

  const updateQty = (priceItemId, value) => {
    if (!/^\d*\.?\d*$/.test(value)) return;
    setForm(current=>({...current,items:current.items.map(item=>item.priceItem===priceItemId?{...item,quantity:value}:item)}));
  };

  const calculation = totals(form.items);
  const calcTotal = () => calculation.total;
  const calcProfit = () => calculation.profit;

  const save = async () => {
    setFormError('');
    const name = form.name.trim();
    if (!name) {
      setFormError('Package name is required');
      return;
    }
    if (form.items.length === 0) {
      setFormError('Please select at least one service for this package');
      return;
    }

    if (form.items.some(item=>!Number.isFinite(Number(item.quantity)) || Number(item.quantity)<=0)) {setFormError('Enter a positive quantity for each service');return;}
    setSaving(true);
    try {
      const payload = {
        name,
        description: form.description.trim(),
        items: form.items,
        isPublic:form.isPublic,
      };

      if (editing) {
        await api.put(`/packages/${editing._id}`, payload);
      } else {
        await api.post('/packages', payload);
      }
      setModalVisible(false);
      fetchAll();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save package');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (pkg) => {
    confirmDialog('Delete Package', `Are you sure you want to delete "${pkg.name}"?`, async () => {
      try {
        await api.delete(`/packages/${pkg._id}`);
        fetchAll();
      } catch (err) {
        notify('Error', err.response?.data?.message || 'Failed to delete package');
      }
    });
  };

  const renderPackage = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
        </View>
        <View style={styles.tagBadge}>
          <Text style={styles.tagText}>{item.items?.length || 0} items</Text>
        </View>
      </View>

      <View style={styles.cardItems}>
        {item.items?.map((i, idx) => (
          <View key={idx} style={styles.cardItemRow}>
            <Text style={styles.itemBullet}>•</Text>
            <Text style={styles.itemDetails}>
              {i.name} <Text style={styles.itemDim}>({i.quantity} × {i.unit})</Text>
            </Text>
            <Text style={styles.itemPrice}>₹{i.sellingPrice * i.quantity}</Text>
          </View>
        ))}
      </View>

      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.footerLabel}>Package Price</Text>
          <Text style={styles.cardTotal}>₹{item.totalSellingPrice}</Text>
        </View>
        {isAdmin && (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.footerLabel}>Est. Profit [Admin]</Text>
            <Text style={styles.cardProfit}>+₹{item.profit}</Text>
          </View>
        )}
      </View>

      {/* CRUD Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity accessibilityRole="button"
          style={styles.useBillBtn}
          onPress={() => navigation.navigate('CreateBill', { packageData: item })}
        >
          <Text style={styles.useBillText}>Create Bill</Text>
        </TouchableOpacity>

        <TouchableOpacity accessibilityRole="button" style={styles.editBtn} onPress={() => openEdit(item)}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity accessibilityRole="button" style={styles.delBtn} onPress={() => handleDelete(item)}>
          <Text style={styles.delBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather accessible={false} name="arrow-left" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={{flex:1,minWidth:140}}>
          <Text style={styles.heading}>Packages</Text>
          <Text style={styles.subheading}>Create & bundle photography packages</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ New Package</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Loading packages...</Text>
        </View>
      ) : (
        <FlatList
          data={packages}
          keyExtractor={(i) => i._id}
          renderItem={renderPackage}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.empty}>
              
              <Text style={styles.emptyText}>No packages created yet.</Text>
              <TouchableOpacity accessibilityRole="button" style={styles.emptyAddBtn} onPress={openCreate}>
                <Text style={styles.emptyAddBtnText}>+ Create Your First Package</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Create / Edit Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Package' : 'Create New Package'}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close dialog" onPress={() => setModalVisible(false)}>
                <Text style={styles.closeIcon}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {formError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>Package Name *</Text>
              <TextInput accessibilityLabel="Package Name *"
                style={styles.input}
                                value={form.name}
                onChangeText={(v) => { setForm({ ...form, name: v }); setFormError(''); }}
              />

              <Text style={styles.fieldLabel}>Package Description</Text>
              <TextInput accessibilityLabel="Package Description"
                style={styles.input}
                placeholder=""
                value={form.description}
                onChangeText={(v) => setForm({ ...form, description: v })}
              />

              <Text style={styles.fieldLabel}>Select Included Services ({form.items.length} selected):</Text>
              {priceItems.length === 0 ? (
                <Text style={styles.noPriceWarning}>
                  No price items available. Please add items in the Price List first!
                </Text>
              ) : (
                priceItems.map((pi) => {
                  const selected = form.items.find((i) => i.priceItem === pi._id);
                  return (
                    <View key={pi._id} style={[styles.piRow, selected && styles.piSelected]}>
                      <TouchableOpacity accessibilityRole="button" style={styles.piLeft} onPress={() => toggleItem(pi)}>
                        <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                          {selected && <Text style={{ color: '#fff', fontWeight: 'bold' }}>✓</Text>}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.piName}>{pi.name}</Text>
                          <Text style={styles.piPrice}>₹{pi.sellingPrice} / {pi.unit}</Text>
                        </View>
                      </TouchableOpacity>

                      {selected && (
                        <View style={styles.qtyContainer}>
                          <Text style={styles.qtyLabel}>Qty:</Text>
                          <TextInput accessibilityLabel="Qty:"
                            style={styles.qtyInput}
                            value={String(selected.quantity ?? '')}
                            onChangeText={(v) => updateQty(pi._id, v)}
                            keyboardType="numeric"
                          />
                        </View>
                      )}
                    </View>
                  );
                })
              )}

              {form.items.length > 0 && (
                <View style={styles.totalBox}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Package Price:</Text>
                    <Text style={styles.totalValue}>₹{calcTotal()}</Text>
                  </View>
                  {isAdmin && (
                    <View style={styles.totalRow}>
                      <Text style={styles.profitLabel}>Estimated Profit [Admin]:</Text>
                      <Text style={styles.profitValue}>+₹{calcProfit()}</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={{flexDirection:'row',gap:16,alignItems:'center',marginVertical:18}}><Switch accessibilityLabel="Show on studio page" value={form.isPublic} onValueChange={isPublic=>setForm({...form,isPublic})} trackColor={{true:COLORS.primary}} /><View style={{flex:1}}><Text style={styles.fieldLabel}>Show on studio page</Text><Text style={{color:COLORS.subtext,fontSize:12}}>Clients can view this package and estimate a budget.</Text></View></View>
              <View style={styles.modalBtns}>
                <TouchableOpacity accessibilityRole="button" style={styles.cancelBtn} accessibilityLabel="Close dialog" onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" style={styles.saveBtn} onPress={save} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>{editing ? 'Update Package' : 'Save Package'}</Text>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  cardDesc: { color: COLORS.subtext, fontSize: 13, marginTop: 3 },
  tagBadge: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagText: { fontSize: 11, color: COLORS.subtext, fontWeight: '600' },
  cardItems: { marginTop: 12, paddingLeft: 4 },
  cardItemRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  itemBullet: { color: COLORS.primary, fontSize: 14, marginRight: 6 },
  itemDetails: { flex: 1, color: COLORS.text, fontSize: 13 },
  itemDim: { color: COLORS.subtext, fontSize: 12 },
  itemPrice: { color: COLORS.text, fontWeight: '600', fontSize: 13 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerLabel: { fontSize: 11, color: COLORS.subtext, textTransform: 'uppercase' },
  cardTotal: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginTop: 2 },
  cardProfit: { fontSize: 15, color: COLORS.success, fontWeight: 'bold', marginTop: 2 },
  cardActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  useBillBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  useBillText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  editBtn: {
    flex: 1,
    backgroundColor: '#eff0e8',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2dfd6',
  },
  editBtnText: { color: '#4e5941', fontWeight: '600', fontSize: 13 },
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
    maxWidth: 560,
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
  noPriceWarning: { color: '#946546', fontSize: 13, marginVertical: 8 },
  piRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee',
  },
  piSelected: { borderColor: COLORS.primary, backgroundColor: '#eff0e8' },
  piLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#fff',
  },
  checkboxChecked: { backgroundColor: COLORS.primary },
  piName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  piPrice: { fontSize: 12, color: COLORS.subtext, marginTop: 1 },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  qtyLabel: { fontSize: 12, color: COLORS.subtext, marginRight: 4 },
  qtyInput: {
    width: 52,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingVertical: 4,
    textAlign: 'center',
    backgroundColor: '#fff',
    fontSize: 14,
  },
  totalBox: {
    backgroundColor: '#f5f9ff',
    borderRadius: 10,
    padding: 14,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#e2dfd6',
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  totalLabel: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  profitLabel: { fontSize: 13, fontWeight: '600', color: COLORS.success },
  profitValue: { fontSize: 14, fontWeight: 'bold', color: COLORS.success },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
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
