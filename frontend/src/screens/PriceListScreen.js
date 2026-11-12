import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Modal, TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import api from '../services/api';
import { serviceCost } from '../utils/pricing';
import { useAuth } from '../context/AuthContext';
import { confirmDialog, notify } from '../utils/dialog';

import { COLORS, createStyles } from '../design/system';

const CATEGORIES = ['video', 'photography', 'editing', 'equipment', 'travel', 'other'];

const UNIT_OPTIONS = [
  'per minute',
  'per hour',
  'per day',
  'per person',
  'per unit',
  'per piece',
];

export default function PriceListScreen({ navigation }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyForm = () => ({name:'', description:'', unit:'per minute', sellingPrice:'', costComponents:[], category:'video'});
  const [form, setForm] = useState(emptyForm);
  const totalCost = serviceCost(form);
  const margin = (Number(form.sellingPrice) || 0) - totalCost;
  const updateCost = (index, field, value) => setForm(current => ({...current, costComponents:current.costComponents.map((part,i) => i === index ? {...part,[field]:value} : part)}));
  const addCost = name => setForm(current => ({...current,costComponents:[...current.costComponents,{name,amount:'',person:''}]}));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/prices');
      setItems(data);
    } catch (err) {
      notify('Error', err.response?.data?.message || 'Failed to load prices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setModalVisible(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description || '',
      unit: item.unit || 'per hour',
      sellingPrice: String(item.sellingPrice || ''),
      costComponents: (item.costComponents?.length ? item.costComponents : item.costPrice ? [{name:'Service cost',amount:item.costPrice,person:''}] : []).map(p => ({...p, amount: String(p.amount)})),
      category: item.category || 'other',
    });
    setFormError('');
    setModalVisible(true);
  };

  const save = async () => {
    setFormError('');
    const name = form.name.trim();
    if (!name) {
      setFormError('Item name is required');
      return;
    }
    if (!form.unit) {
      setFormError('Please select or specify a unit');
      return;
    }
    const sellingPrice = Number(form.sellingPrice);
    if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      setFormError('Selling price must be a valid positive number');
      return;
    }

    if (form.costComponents.some(p => !p.name.trim() || !p.amount.trim() || !Number.isFinite(Number(p.amount)) || Number(p.amount) < 0)) { setFormError('Enter a name and valid amount for each cost'); return; }
    setSaving(true);
    try {
      const payload = {
        name,
        description: form.description.trim(),
        unit: form.unit.trim(),
        sellingPrice,
        costPrice: totalCost,
        category: form.category,
        costComponents: form.costComponents.map(p => ({...p, amount: Number(p.amount)})),
      };

      if (editing) {
        await api.put(`/prices/${editing._id}`, payload);
      } else {
        await api.post('/prices', payload);
      }
      setModalVisible(false);
      fetchItems();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item) => {
    confirmDialog('Delete Price Item', `Are you sure you want to delete "${item.name}"?`, async () => {
      try {
        await api.delete(`/prices/${item._id}`);
        fetchItems();
      } catch (err) {
        notify('Error', err.response?.data?.message || 'Failed to delete price item');
      }
    });
  };

  const catColors = {
    video: '#626f89',
    photography: '#2459d3',
    editing: '#00695c',
    equipment: '#b85e19',
    travel: '#37474f',
    other: '#546e7a',
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemCard}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={[styles.catBadge, { backgroundColor: catColors[item.category] || '#546e7a' }]}>
            <Text style={styles.catText}>{item.category}</Text>
          </View>
        </View>
        {item.description ? <Text style={styles.itemDesc}>{item.description}</Text> : null}
      </View>

      <View style={styles.priceRow}>
        <View>
          <Text style={styles.rateLabel}>Selling Rate</Text>
          <Text style={styles.priceTag}>₹{item.sellingPrice} <Text style={styles.unitText}>/ {item.unit}</Text></Text>
        </View>

        {isAdmin && item.costPrice !== undefined && (
          <View style={styles.adminStats}>
            <Text style={styles.statLabel}>Cost: ₹{item.costPrice}</Text>
            <Text style={styles.statProfit}>Profit: +₹{item.sellingPrice - item.costPrice}</Text>
          </View>
        )}
      </View>

      {isAdmin && (
        <View style={styles.itemActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
            <Text style={styles.delBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.heading}>Price List</Text>
          <Text style={styles.subheading}>Service rates and costs</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
            <Text style={styles.addBtnText}>+ Add Item</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Loading price list...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.empty}>
              
              <Text style={styles.emptyText}>No price items yet.</Text>
              {isAdmin && (
                <TouchableOpacity style={styles.emptyAddBtn} onPress={openCreate}>
                  <Text style={styles.emptyAddBtnText}>Add service</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Price Item' : 'New Price Item'}</Text>
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

              <Text style={styles.fieldLabel}>Service name *</Text>
              <TextInput
                style={styles.input}
                                value={form.name}
                onChangeText={(v) => { setForm({ ...form, name: v }); setFormError(''); }}
              />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={styles.input}
                                value={form.description}
                onChangeText={(v) => setForm({ ...form, description: v })}
              />

              <Text style={styles.fieldLabel}>Select Unit *</Text>
              <View style={styles.chipRow}>
                {UNIT_OPTIONS.map((unit) => {
                  const selected = form.unit === unit;
                  return (
                    <TouchableOpacity
                      key={unit}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setForm({ ...form, unit })}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{unit}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {!UNIT_OPTIONS.includes(form.unit) && <TextInput accessibilityLabel="Custom unit" style={styles.input} value={form.unit} onChangeText={unit => setForm({...form,unit})} />}
              <Text style={styles.fieldLabel}>Client rate (₹) *</Text>
              <TextInput accessibilityLabel="Client rate" style={styles.input} keyboardType="decimal-pad" value={form.sellingPrice} onChangeText={sellingPrice => setForm({...form,sellingPrice})} />
              {isAdmin && <View>
                <Text style={styles.fieldLabel}>Costs · {form.unit}</Text>
                <Text style={styles.itemDesc}>Choose an expense, enter its amount, and assign a person if needed.</Text>
                <View style={[styles.chipRow,{marginTop:12}]}>{['Editing','Equipment','Electricity','Other'].map(name => <TouchableOpacity key={name} style={styles.chip} onPress={() => addCost(name)}><Text style={styles.chipText}>+ {name}</Text></TouchableOpacity>)}</View>
                {form.costComponents.map((part,index) => <View key={index} style={styles.costRow}>
                  <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
                    <TextInput accessibilityLabel="Cost name" style={[styles.input,{flex:1}]} value={part.name} onChangeText={v => updateCost(index,'name',v)} />
                    <TouchableOpacity accessibilityLabel={'Remove '+part.name} style={styles.removeCost} onPress={() => setForm(current => ({...current,costComponents:current.costComponents.filter((_,i) => i !== index)}))}><Text style={{color:COLORS.error,fontSize:22}}>×</Text></TouchableOpacity>
                  </View>
                  <View style={{flexDirection:'row',gap:12}}>
                    <View style={{flex:1}}><Text style={styles.fieldLabel}>Amount (₹)</Text><TextInput accessibilityLabel={part.name+' amount'} style={styles.input} keyboardType="decimal-pad" value={part.amount} onChangeText={v => updateCost(index,'amount',v)} /></View>
                    <View style={{flex:1}}><Text style={styles.fieldLabel}>Person (optional)</Text><TextInput accessibilityLabel={part.name+' person'} style={styles.input} value={part.person} onChangeText={v => updateCost(index,'person',v)} /></View>
                  </View>
                </View>)}
                <View style={styles.liveSummary} accessibilityLiveRegion="polite">
                  <Text style={styles.fieldLabel}>Per {form.unit.replace('per ','')}</Text>
                  <View style={styles.summaryLine}><Text>Client rate</Text><Text style={styles.summaryNumber}>₹{(Number(form.sellingPrice)||0).toFixed(2)}</Text></View>
                  <View style={styles.summaryLine}><Text>Total cost</Text><Text style={styles.summaryNumber}>₹{totalCost.toFixed(2)}</Text></View>
                  <View style={styles.summaryLine}><Text>Profit</Text><Text style={[styles.summaryNumber,{color:margin<0?COLORS.error:COLORS.success}]}>₹{margin.toFixed(2)}</Text></View>
                </View>
              </View>}

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map((cat) => {
                  const selected = form.category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setForm({ ...form, category: cat })}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>{editing ? 'Update Item' : 'Create Item'}</Text>
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
  costRow:{padding:14,backgroundColor:'#f3f6fd',borderRadius:10,marginBottom:10},
  removeCost:{width:44,height:44,alignItems:'center',justifyContent:'center'},
  liveSummary:{backgroundColor:COLORS.primaryLight,padding:18,borderRadius:10,marginVertical:16},
  summaryLine:{flexDirection:'row',justifyContent:'space-between',paddingVertical:7},
  summaryNumber:{fontWeight:'600',fontSize:16,color:COLORS.primary},
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
  itemCard: {
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
  cardHeader: { marginBottom: 10 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: 17, fontWeight: 'bold', color: COLORS.text, flex: 1 },
  catBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  catText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  itemDesc: { color: COLORS.subtext, fontSize: 13, marginTop: 4 },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  rateLabel: { fontSize: 11, color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5 },
  priceTag: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginTop: 2 },
  unitText: { fontSize: 14, fontWeight: 'normal', color: COLORS.subtext },
  adminStats: { alignItems: 'flex-end' },
  statLabel: { fontSize: 13, color: '#b85e19', fontWeight: '500' },
  statProfit: { fontSize: 13, color: COLORS.success, fontWeight: 'bold', marginTop: 2 },
  itemActions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  editBtn: {
    flex: 1,
    backgroundColor: '#edf2ff',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d9e3fa',
  },
  editBtnText: { color: '#2459d3', fontWeight: '600', fontSize: 14 },
  delBtn: {
    flex: 1,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffd5d5',
  },
  delBtnText: { color: COLORS.error, fontWeight: '600', fontSize: 14 },
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fafafa',
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: { color: COLORS.text, fontSize: 12, fontWeight: '500' },
  chipTextSelected: { color: '#ffffff', fontWeight: 'bold' },
  priceInputsRow: { flexDirection: 'row' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 16 },
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
