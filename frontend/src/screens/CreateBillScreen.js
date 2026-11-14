import React, { useState, useEffect, useCallback } from 'react';
import Feather from '@expo/vector-icons/Feather';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, TextInput, ActivityIndicator, FlatList,
} from 'react-native';
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import SelectField from '../components/SelectField';
import { totals } from '../utils/pricing';
import { notify } from '../utils/dialog';

import { COLORS, createStyles } from '../design/system';

const DEFAULT_TERMS = [
  'Advance payment is non-refundable in case of client cancellation.',
  'Remaining balance must be paid before or upon final delivery of edited content.',
  'All raw media files remain property of the studio until full invoice settlement.',
  'Client must inform the studio about special requirements at least 24 hours prior to event.',
  'Delivery of edited photographs and highlight video within 15 to 20 working days.',
];

export default function CreateBillScreen({ route, navigation }) {
  const { packageData, preselectedClient, editBillId } = route.params || {};

  const isEditing = !!editBillId;

  const [clients, setClients] = useState([]);
  const [priceItems, setPriceItems] = useState([]);
  const [staff,setStaff]=useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [step, setStep] = useState(1); // 1=Client, 2=Items, 3=Agreement, 4=Review

  const [selectedClient, setSelectedClient] = useState(preselectedClient || null);
  const [clientModal, setClientModal] = useState(false);

  const [items, setItems] = useState(
    packageData?.items?.map((i) => ({
      ...i,
      name: i.name,
      unit: i.unit,
      quantity: i.quantity || 1,
      sellingPrice: i.sellingPrice,
      costPrice: i.costPrice || 0,
    })) || []
  );

  const [discount, setDiscount] = useState(String(route.params?.initialDiscount || 0));
  const [advance, setAdvance] = useState('0');
  const [agreementText, setAgreementText] = useState(
    'This photography and videography agreement is made between PhotoFinder Studio and the client. The client agrees to the following terms and conditions for photography and videography services.'
  );
  const [terms, setTerms] = useState([...DEFAULT_TERMS]);
  const [newTerm, setNewTerm] = useState('');

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        setLoading(true);
        const [cRes,pRes,uRes] = await Promise.all([api.get('/clients'),api.get('/prices'),api.get('/team/users')]);
        setStaff(uRes.data);
        setClients(cRes.data);
        setPriceItems(pRes.data);

        // If editing an existing bill, fetch its details
        if (editBillId) {
          const { data: bill } = await api.get(`/bills/${editBillId}`);
          setSelectedClient(bill.client);
          setItems(
            (bill.items || []).map((i) => ({
              ...i,
      name: i.name,
              unit: i.unit,
              quantity: i.quantity || 1,
              sellingPrice: i.sellingPrice,
              costPrice: i.costPrice || 0,
            }))
          );
          setDiscount(String(bill.discount || 0));
          setAdvance(String(bill.advancePaid || 0));
          if (bill.agreementText) setAgreementText(bill.agreementText);
          if (bill.agreementTerms && bill.agreementTerms.length > 0) {
            setTerms(bill.agreementTerms);
          }
        }
      } catch (err) {
        notify('Error', 'Failed to load bill data');
      } finally {
        setLoading(false);
      }
    })();
  }, [editBillId]));

  const calculation = totals(items, discount, advance);
  const {subtotal, total:totalAmount, balance, discount:discNum} = calculation;
  const advNum = Math.max(0,Number(advance) || 0);

  const toggleItem = (pi) => {
    const exists = items.find((i) => i.name === pi.name);
    if (exists) {
      setItems(items.filter((i) => i.name !== pi.name));
    } else {
      setItems([
        ...items,
        {
          priceItem: pi._id,
          name: pi.name,
          unit: pi.unit,
          quantity: 1,
          sellingPrice: pi.sellingPrice,
          costPrice: pi.costPrice || 0,
        },
      ]);
    }
  };

  const updateQty = (name, value) => {
    if (!/^\d*\.?\d*$/.test(value)) return;
    setItems(current => current.map(item => item.name === name ? {...item,quantity:value} : item));
  };

  const addTerm = () => {
    if (newTerm.trim()) {
      setTerms([...terms, newTerm.trim()]);
      setNewTerm('');
    }
  };

  const removeTerm = (idx) => {
    setTerms(terms.filter((_, i) => i !== idx));
  };

  const submitBill = async () => {
    if (!selectedClient) {
      notify('Client Missing', 'Please select a client for this bill');
      setStep(1);
      return;
    }
    if (items.length === 0) {
      notify('Services Missing', 'Please select at least one service item');
      setStep(2);
      return;
    }

    if (items.some(item=>!Number.isFinite(Number(item.quantity)) || Number(item.quantity)<=0)) {notify('Quantity required','Enter a positive quantity for each service');setStep(2);return;}
    if (![discount,advance].every(value=>Number.isFinite(Number(value)) && Number(value)>=0)) {notify('Check payment amounts','Discount and advance must be valid amounts');setStep(2);return;}
    setSaving(true);
    try {
      const payload = {
        client: selectedClient._id,
        package: packageData?._id,
        items,
        discount: discNum,
        advancePaid: advNum,
        agreementText,
        agreementTerms: terms,
      };

      if (isEditing) {
        const { data } = await api.put(`/bills/${editBillId}`, payload);
        notify('Success', `Bill ${data.billNumber} updated successfully!`);
        navigation.replace('BillDetail', { billId: data._id });
      } else {
        const { data } = await api.post('/bills', payload);
        notify('Success', `Bill ${data.billNumber} created successfully!`);
        navigation.replace('BillDetail', { billId: data._id });
      }
    } catch (err) {
      notify('Save Failed', err.response?.data?.message || 'Failed to save bill');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather accessible={false} name="arrow-left" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={{flex:1,minWidth:140}}>
          <Text style={styles.heading}>{isEditing ? 'Edit Bill' : 'New bill'}</Text>
          <Text style={styles.subheading}>Step {step} of 4</Text>
        </View>
        <View style={styles.stepIndicator}>
          {[1, 2, 3, 4].map((s) => (
            <View key={s} style={[styles.stepDot, step >= s && styles.stepActive]}>
              <Text style={[styles.stepNum, step >= s && styles.stepNumActive]}>{s}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: 20 }}>
        {step===1 && clients.length===0 && <TouchableOpacity accessibilityRole="button" style={styles.prevBtn} onPress={()=>navigation.navigate('Clients')}><Text style={styles.prevBtnText}>Add your first client →</Text></TouchableOpacity>}
        {step===2 && priceItems.length===0 && <TouchableOpacity accessibilityRole="button" style={styles.prevBtn} onPress={()=>navigation.navigate('PriceList')}><Text style={styles.prevBtnText}>Add a service →</Text></TouchableOpacity>}
        {/* STEP 1: CLIENT */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 1: Client Information</Text>
            <Text style={styles.stepDesc}>Choose the client who will receive this bill & agreement.</Text>

            {selectedClient ? (
              <View style={styles.selectedClientCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(selectedClient.name[0] || 'C').toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scName}>{selectedClient.name}</Text>
                  <Text style={styles.scPhone}>{selectedClient.phone}</Text>
                  {selectedClient.eventType && (
                    <Text style={styles.scEvent}>{selectedClient.eventType}</Text>
                  )}
                  {selectedClient.eventVenue && (
                    <Text style={styles.scEvent}>{selectedClient.eventVenue}</Text>
                  )}
                </View>
                <TouchableOpacity accessibilityRole="button" style={styles.changeBtn} onPress={() => setClientModal(true)}>
                  <Text style={styles.changeBtnText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity accessibilityRole="button" style={styles.selectClientBtn} onPress={() => setClientModal(true)}>
                
                <Text style={styles.selectClientText}>Select Existing Client</Text>
                
              </TouchableOpacity>
            )}

            <View style={styles.navRow}>
              <TouchableOpacity accessibilityRole="button"
                style={[styles.nextBtn, !selectedClient && styles.disabledBtn]}
                onPress={() => {
                  if (!selectedClient) {
                    notify('Select Client', 'Please select a client to proceed');
                    return;
                  }
                  setStep(2);
                }}
              >
                <Text style={styles.nextBtnText}>Next: Services & Pricing →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 2: ITEMS */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 2: Services & Pricing</Text>
            <Text style={styles.stepDesc}>Select the services for this job and adjust quantities.</Text>

            <View style={styles.itemsListContainer}>
              {priceItems.map((pi) => {
                const sel = items.find((i) => i.name === pi.name);
                return (
                  <View key={pi._id} style={[styles.piRow, sel && styles.piSelected]}>
                    <TouchableOpacity accessibilityRole="button" style={styles.piLeft} onPress={() => toggleItem(pi)}>
                      <View style={[styles.checkbox, sel && styles.checkboxChecked]}>
                        {sel && <Text style={{ color: '#fff', fontWeight: 'bold' }}>✓</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.piName}>{pi.name}</Text>
                        <Text style={styles.piPrice}>₹{pi.sellingPrice} / {pi.unit}</Text>
                      </View>
                    </TouchableOpacity>

                    {sel && (
                      <View style={styles.qtyContainer}>
                        <Text style={styles.qtyLabel}>Qty:</Text>
                        <TextInput accessibilityLabel="Qty:"
                          style={styles.qtyInput}
                          value={String(sel.quantity ?? '')}
                          onChangeText={(v) => updateQty(pi.name, v)}
                          keyboardType="numeric"
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Discount & Advance Payment</Text>
            <View style={styles.discAdvRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.inputLabel}>Discount (₹)</Text>
                <TextInput accessibilityLabel="Discount (₹)"
                  style={styles.input}
                  placeholder="0"
                  value={discount}
                  onChangeText={setDiscount}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.inputLabel}>Advance Received (₹)</Text>
                <TextInput accessibilityLabel="Advance Received (₹)"
                  style={styles.input}
                  placeholder="0"
                  value={advance}
                  onChangeText={setAdvance}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Calculations Box */}
            <View style={styles.calcBox}>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Subtotal ({items.length} items):</Text>
                <Text style={styles.calcVal}>₹{subtotal}</Text>
              </View>
              {discNum > 0 && (
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Discount:</Text>
                  <Text style={[styles.calcVal, { color: COLORS.error }]}>- ₹{discNum}</Text>
                </View>
              )}
              <View style={[styles.calcRow, styles.calcRowTotal]}>
                <Text style={styles.calcTotalLabel}>Total Amount:</Text>
                <Text style={styles.calcTotalVal}>₹{totalAmount}</Text>
              </View>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Advance Paid:</Text>
                <Text style={styles.calcVal}>₹{advNum}</Text>
              </View>
              <View style={[styles.calcRow, { backgroundColor: '#fff3e0', padding: 6, borderRadius: 6 }]}>
                <Text style={{ fontWeight: 'bold', color: balance > 0 ? COLORS.error : COLORS.success }}>
                  Balance Due:
                </Text>
                <Text style={{ fontWeight: 'bold', color: balance > 0 ? COLORS.error : COLORS.success }}>
                  ₹{balance}
                </Text>
              </View>
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity accessibilityRole="button" style={styles.prevBtn} onPress={() => setStep(1)}>
                <Text style={styles.prevBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button"
                style={[styles.nextBtn, items.length === 0 && styles.disabledBtn]}
                onPress={() => {
                  if (items.length === 0) {
                    notify('Items Required', 'Please select at least one service');
                    return;
                  }
                  setStep(3);
                }}
              >
                <Text style={styles.nextBtnText}>Next: Agreement & Terms →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 3: AGREEMENT */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 3: Agreement & Terms</Text>
            <Text style={styles.stepDesc}>Review the agreement before sharing.</Text>

            <Text style={styles.fieldLabel}>Agreement</Text>
            <TextInput accessibilityLabel="Agreement"
              style={[styles.input, { height: 90 }]}
              multiline
              value={agreementText}
              onChangeText={setAgreementText}
            />

            <Text style={styles.fieldLabel}>Terms & Conditions ({terms.length})</Text>
            {terms.map((t, idx) => (
              <View key={idx} style={styles.termRow}>
                <Text style={styles.termNum}>{idx + 1}.</Text>
                <Text style={styles.termText}>{t}</Text>
                <TouchableOpacity accessibilityRole="button" onPress={() => removeTerm(idx)}>
                  <Text style={styles.termDel}>×</Text>
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.addTermRow}>
              <TextInput accessibilityLabel="×"
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="New term"
                value={newTerm}
                onChangeText={setNewTerm}
              />
              <TouchableOpacity accessibilityRole="button" style={styles.addTermBtn} onPress={addTerm}>
                <Text style={styles.addTermBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity accessibilityRole="button" style={styles.prevBtn} onPress={() => setStep(2)}>
                <Text style={styles.prevBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" style={styles.nextBtn} onPress={() => setStep(4)}>
                <Text style={styles.nextBtnText}>Next: Review →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 4: REVIEW */}
        {step === 4 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Review & assign</Text>
            <Text style={styles.stepDesc}>Check the details before saving.</Text>

            <View style={styles.reviewCard}>
              <Text style={styles.reviewHeading}>CLIENT</Text>
              <Text style={styles.reviewMain}>{selectedClient?.name}</Text>
              <Text style={styles.reviewSub}>{selectedClient?.phone}</Text>
              {selectedClient?.eventType && (
                <Text style={styles.reviewSub}>Event: {selectedClient?.eventType}</Text>
              )}
            </View>

            <View style={styles.reviewCard}>
              <Text style={styles.reviewHeading}>SELECTED SERVICES ({items.length})</Text>
              {items.map((i, idx) => (
                <View key={idx} style={styles.reviewItemRow}>
                  <Text style={styles.reviewItemName}>
                    {i.name} <Text style={{ color: COLORS.subtext }}>({i.quantity} × {i.unit})</Text>
                  </Text>
                  <Text style={styles.reviewItemPrice}>₹{(i.sellingPrice * i.quantity).toFixed(2)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.reviewCard}>
              <Text style={styles.reviewHeading}>ASSIGN SERVICES</Text>
              <Text style={{color:COLORS.subtext,fontSize:13,lineHeight:20,marginBottom:18}}>Each assigned service adds its full amount to the user’s pending wallet. Delivery moves it to their main balance.</Text>
              {items.map((item,index)=><View key={item._id || item.name} style={{marginBottom:12}}>
                <SelectField label={item.name+' · ₹'+(item.sellingPrice*Number(item.quantity)).toFixed(2)} value={item.assignedTo || ''} disabled={item.deliveryStatus==='delivered'} options={[{label:'Unassigned',value:''},...staff.map(member=>({label:member.label||member.name,value:member._id}))]} onChange={assignedTo=>setItems(current=>current.map((entry,i)=>i===index?{...entry,assignedTo:assignedTo || null}:entry))}/>
                {item.deliveryStatus==='delivered'&&<Text style={{fontSize:12,color:COLORS.subtext}}>Reopen delivery on the invoice before reassigning this service.</Text>}
              </View>)}
              <Text style={{fontSize:12,color:COLORS.subtext}}>Wallet amounts use the service total before bill-level discounts.</Text>
            </View>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewHeading}>TOTALS</Text>
              <View style={styles.reviewItemRow}>
                <Text>Subtotal</Text>
                <Text>₹{subtotal}</Text>
              </View>
              {discNum > 0 && (
                <View style={styles.reviewItemRow}>
                  <Text>Discount</Text>
                  <Text style={{ color: COLORS.error }}>- ₹{discNum}</Text>
                </View>
              )}
              <View style={[styles.reviewItemRow, styles.reviewTotalRow]}>
                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Total Amount</Text>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: COLORS.primary }}>₹{totalAmount}</Text>
              </View>
              <View style={styles.reviewItemRow}>
                <Text>Advance Received</Text>
                <Text>₹{advNum}</Text>
              </View>
              <View style={[styles.reviewItemRow, { backgroundColor: '#fff3e0', padding: 6, borderRadius: 6 }]}>
                <Text style={{ fontWeight: 'bold', color: balance > 0 ? COLORS.error : COLORS.success }}>
                  Balance Due
                </Text>
                <Text style={{ fontWeight: 'bold', color: balance > 0 ? COLORS.error : COLORS.success }}>
                  ₹{balance}
                </Text>
              </View>
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity accessibilityRole="button" style={styles.prevBtn} onPress={() => setStep(3)}>
                <Text style={styles.prevBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button"
                style={styles.createBtn}
                onPress={submitBill}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.createBtnText}>
                    {isEditing ? 'Update Bill' : 'Generate Bill'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Client Picker Modal */}
      <Modal visible={clientModal} animationType="fade" transparent onRequestClose={()=>setClientModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Client</Text>
              <TouchableOpacity accessibilityRole="button" onPress={() => setClientModal(false)}>
                <Text style={styles.closeIcon}>×</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={clients}
              keyExtractor={(i) => i._id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity accessibilityRole="button"
                  style={styles.clientPickRow}
                  onPress={() => {
                    setSelectedClient(item);
                    setClientModal(false);
                  }}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(item.name[0] || 'C').toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clientPickName}>{item.name}</Text>
                    <Text style={styles.clientPickPhone}>{item.phone}</Text>
                    {item.eventType && (
                      <Text style={styles.clientPickEvent}>{item.eventType}</Text>
                    )}
                  </View>
                  <Text style={styles.pickChevron}>Select →</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: COLORS.subtext }}>No clients found. Please create a client first!</Text>
                </View>
              }
            />
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
  backBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  backBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },
  heading: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  subheading: { color: COLORS.subtext, fontSize: 12 },
  stepIndicator: { flexDirection: 'row', gap: 6 },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepNum: { color: COLORS.subtext, fontSize: 12, fontWeight: 'bold' },
  stepNumActive: { color: '#ffffff' },
  body: { flex: 1, backgroundColor: '#ffffff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: COLORS.subtext, marginTop: 10 },
  stepContent: { maxWidth: 640, alignSelf: 'center', width: '100%' },
  stepTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  stepDesc: { fontSize: 13, color: COLORS.subtext, marginBottom: 16 },
  selectedClientCard: {
    flexDirection: 'row',
    backgroundColor: '#eff0e8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2dfd6',
    marginBottom: 20,
  },
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
  scName: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },
  scPhone: { fontSize: 13, color: COLORS.subtext, marginTop: 2 },
  scEvent: { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  changeBtn: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2dfd6',
  },
  changeBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 12 },
  selectClientBtn: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  selectClientIcon: { fontSize: 36, marginBottom: 8 },
  selectClientText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 16 },
  selectClientSub: { color: COLORS.subtext, fontSize: 12, marginTop: 4 },
  itemsListContainer: { marginBottom: 14 },
  piRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 11,
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
    width: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingVertical: 4,
    textAlign: 'center',
    backgroundColor: '#fff',
    fontSize: 14,
  },
  discAdvRow: { flexDirection: 'row', marginBottom: 14 },
  inputLabel: { fontSize: 12, color: COLORS.subtext, marginBottom: 4, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 11,
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  calcBox: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 20,
  },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 3 },
  calcLabel: { fontSize: 13, color: COLORS.text },
  calcVal: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  calcRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  calcTotalLabel: { fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  calcTotalVal: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  termRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  termNum: { width: 22, fontWeight: 'bold', color: COLORS.primary, fontSize: 13 },
  termText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 18 },
  termDel: { color: COLORS.error, fontSize: 16, paddingLeft: 8, fontWeight: 'bold' },
  addTermRow: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 20 },
  addTermBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addTermBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  reviewCard: {
    backgroundColor: '#fafafa',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#dce3f1',
  },
  reviewHeading: { fontSize: 11, fontWeight: 'bold', color: COLORS.subtext, letterSpacing: 0.8, marginBottom: 6 },
  reviewMain: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  reviewSub: { fontSize: 13, color: COLORS.subtext, marginTop: 2 },
  reviewItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  reviewItemName: { fontSize: 13, color: COLORS.text },
  reviewItemPrice: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  reviewTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  navRow: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 30 },
  prevBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  prevBtnText: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  nextBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  nextBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  createBtn: {
    flex: 2,
    backgroundColor: COLORS.success,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  createBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  disabledBtn: { opacity: 0.5 },
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
    maxWidth: 520,
    maxHeight: '80%',
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
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  closeIcon: { fontSize: 20, color: COLORS.subtext, padding: 4 },
  clientPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  clientPickName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  clientPickPhone: { fontSize: 13, color: COLORS.subtext, marginTop: 2 },
  clientPickEvent: { fontSize: 12, color: COLORS.primary, marginTop: 1 },
  pickChevron: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary },
});
