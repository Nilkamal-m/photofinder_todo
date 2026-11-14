import React, { useState, useCallback } from 'react';
import Feather from '@expo/vector-icons/Feather';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Modal, ActivityIndicator,
} from 'react-native';
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import ServiceForm from '../components/ServiceForm';
import { useAuth } from '../context/AuthContext';
import { confirmDialog, notify } from '../utils/dialog';

import { COLORS, createStyles } from '../design/system';

export default function PriceListScreen({ navigation }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [types,setTypes]=useState([]);
  const loadTypes=useCallback(async()=>{const {data}=await api.get('/prices/types');setTypes(data);},[]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/prices');
      await loadTypes();
      setItems(data);
    } catch (err) {
      notify('Error', err.response?.data?.message || 'Failed to load prices');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchItems();
  }, [fetchItems]));

  const openCreate = () => {setEditing(null);setFormError('');setModalVisible(true);};
  const openEdit = item => {setEditing(item);setFormError('');setModalVisible(true);};
  const save = async payload => {
    setSaving(true);setFormError('');
    try {if(editing)await api.put(`/prices/${editing._id}`,payload);else await api.post('/prices',payload);setModalVisible(false);await fetchItems();}
    catch(err){setFormError(err.response?.data?.message || 'Unable to save service');}
    finally{setSaving(false);}
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
    video: '#72766c',
    photography: '#4e5941',
    editing: '#00695c',
    equipment: '#946546',
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
          <TouchableOpacity accessibilityRole="button" style={styles.editBtn} onPress={() => openEdit(item)}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.delBtn} onPress={() => handleDelete(item)}>
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
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather accessible={false} name="arrow-left" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={{flex:1,minWidth:140}}>
          <Text style={styles.heading}>Services</Text>
          <Text style={styles.subheading}>Service rates and costs</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity accessibilityRole="button" style={styles.addBtn} onPress={openCreate}>
            <Text style={styles.addBtnText}>Add service</Text>
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
                <TouchableOpacity accessibilityRole="button" style={styles.emptyAddBtn} onPress={openCreate}>
                  <Text style={styles.emptyAddBtnText}>Add service</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit service' : 'New service'}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close dialog" onPress={() => setModalVisible(false)}>
                <Text style={styles.closeIcon}>×</Text>
              </TouchableOpacity>
            </View>

            {modalVisible&&<ServiceForm initial={editing} types={types} onSave={save} onCancel={()=>setModalVisible(false)} saving={saving} error={formError} onTypesUpdated={loadTypes}/>}

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
  statLabel: { fontSize: 13, color: '#946546', fontWeight: '500' },
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
    backgroundColor: '#eff0e8',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2dfd6',
  },
  editBtnText: { color: '#4e5941', fontWeight: '600', fontSize: 14 },
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
  closeIcon: { fontSize: 20, color: COLORS.subtext, padding: 4 }
});
