import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator,
} from 'react-native';
import api from '../services/api';
import { totals, serviceCost } from '../utils/pricing';
import { useAuth } from '../context/AuthContext';
import { notify } from '../utils/dialog';

import { COLORS, createStyles } from '../design/system';

export default function EstimationScreen({ navigation }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [priceItems, setPriceItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected items: { [priceItemId]: quantity }
  const [quantities, setQuantities] = useState({});

  // Discount options
  const [discountType, setDiscountType] = useState('amount'); // 'amount' (₹) or 'percent' (%)
  const [discountValue, setDiscountValue] = useState('0');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/prices');
        setPriceItems(data);
      } catch (err) {
        notify('Error', 'Failed to load price items for estimation');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleQtyChange = (id, delta) => {
    const current = quantities[id] || 0;
    const next = Math.max(0, current + delta);
    if (next === 0) {
      const copy = { ...quantities };
      delete copy[id];
      setQuantities(copy);
    } else {
      setQuantities({ ...quantities, [id]: next });
    }
  };

  const setDirectQty = (id, valStr) => {
    const val = Number(valStr);
    if (isNaN(val) || val <= 0) {
      const copy = { ...quantities };
      delete copy[id];
      setQuantities(copy);
    } else {
      setQuantities({ ...quantities, [id]: val });
    }
  };

  // Calculations
  const selectedList = priceItems
    .filter((pi) => quantities[pi._id] && quantities[pi._id] > 0)
    .map((pi) => ({
      ...pi,
      quantity: quantities[pi._id],
      lineTotal: pi.sellingPrice * quantities[pi._id],
      lineCost: serviceCost(pi) * quantities[pi._id],
    }));

  const {subtotal, cost:totalCost} = totals(selectedList);

  // Compute discount amount
  const rawDiscount = parseFloat(discountValue) || 0;
  let computedDiscount = 0;
  if (discountType === 'percent') {
    computedDiscount = (subtotal * rawDiscount) / 100;
  } else {
    computedDiscount = rawDiscount;
  }
  computedDiscount = Math.min(subtotal, Math.max(0, computedDiscount));

  const finalClientPrice = Math.max(0, subtotal - computedDiscount);
  const netProfit = finalClientPrice - totalCost;
  const profitMarginPercent =
    finalClientPrice > 0 ? ((netProfit / finalClientPrice) * 100).toFixed(1) : 0;

  // Maximum safe discount (so studio makes at least cost)
  const maxBreakevenDiscount = Math.max(0, subtotal - totalCost);
  // Recommended safe discount (leaving at least 20% margin)
  const recommendedMaxDiscount = Math.max(0, subtotal - totalCost * 1.25);

  const handleCreateBill = () => {
    if (selectedList.length === 0) {
      notify('No Items Selected', 'Please select at least one service to create a bill.');
      return;
    }
    const billItems = selectedList.map((i) => ({
      name: i.name,
      unit: i.unit,
      quantity: i.quantity,
      sellingPrice: i.sellingPrice,
      costPrice: i.costPrice || 0,
    }));

    navigation.navigate('CreateBill', {
      packageData: {
        items: billItems,
      },
    });
  };

  const handleReset = () => {
    setQuantities({});
    setDiscountValue('0');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Loading price catalog...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Bar with Back Button */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.heading}>Estimation Calculator</Text>
          <Text style={styles.subheading}>Interactive pricing, discount simulation & margins</Text>
        </View>
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
          <Text style={styles.resetBtnText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Main Grid: Left Services, Right Live Summary */}
        <View style={styles.layoutRow}>
          {/* Left Column: Services Catalog */}
          <View style={styles.leftCol}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>1. Select Services & Quantities</Text>
              <Text style={styles.itemCountText}>{selectedList.length} items chosen</Text>
            </View>

            {priceItems.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No price items found. Please add items in the Price List.</Text>
              </View>
            ) : (
              priceItems.map((pi) => {
                const qty = quantities[pi._id] || 0;
                const isSelected = qty > 0;
                return (
                  <View key={pi._id} style={[styles.itemCard, isSelected && styles.itemCardSelected]}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{pi.name}</Text>
                      <Text style={styles.itemRate}>
                        ₹{pi.sellingPrice} <Text style={styles.unitText}>/ {pi.unit}</Text>
                      </Text>
                      {isAdmin && pi.costPrice !== undefined ? (
                        <Text style={styles.costBadge}>Cost: ₹{pi.costPrice}</Text>
                      ) : null}
                    </View>

                    {/* Quantity Controls */}
                    <View style={styles.qtyControls}>
                      <TouchableOpacity
                        style={[styles.qtyBtn, qty === 0 && styles.qtyBtnDisabled]}
                        onPress={() => handleQtyChange(pi._id, -1)}
                        disabled={qty === 0}
                      >
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>

                      <TextInput
                        style={styles.qtyInput}
                        value={String(qty)}
                        onChangeText={(v) => setDirectQty(pi._id, v)}
                        keyboardType="numeric"
                      />

                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => handleQtyChange(pi._id, 1)}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Right Column: Calculations & Discount Simulator */}
          <View style={styles.rightCol}>
            <Text style={styles.sectionTitle}>2. Discount & Margins</Text>

            {/* Discount Control Card */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>DISCOUNT SIMULATOR</Text>

              {/* Toggle Flat ₹ vs % */}
              <View style={styles.discountToggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, discountType === 'amount' && styles.toggleBtnActive]}
                  onPress={() => setDiscountType('amount')}
                >
                  <Text style={[styles.toggleBtnText, discountType === 'amount' && styles.toggleBtnTextActive]}>
                    Flat ₹ Discount
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, discountType === 'percent' && styles.toggleBtnActive]}
                  onPress={() => setDiscountType('percent')}
                >
                  <Text style={[styles.toggleBtnText, discountType === 'percent' && styles.toggleBtnTextActive]}>
                    Percentage %
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>
                {discountType === 'amount' ? 'Discount Amount (₹)' : 'Discount Percentage (%)'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={discountValue}
                onChangeText={setDiscountValue}
                keyboardType="numeric"
              />

              {/* Quick discount chips */}
              <View style={styles.quickChipsRow}>
                {discountType === 'percent'
                  ? ['5%', '10%', '15%', '20%'].map((chip) => (
                      <TouchableOpacity
                        key={chip}
                        style={styles.quickChip}
                        onPress={() => setDiscountValue(chip.replace('%', ''))}
                      >
                        <Text style={styles.quickChipText}>{chip}</Text>
                      </TouchableOpacity>
                    ))
                  : [500, 1000, 2000, 5000].map((amt) => (
                      <TouchableOpacity
                        key={amt}
                        style={styles.quickChip}
                        onPress={() => setDiscountValue(String(amt))}
                      >
                        <Text style={styles.quickChipText}>₹{amt}</Text>
                      </TouchableOpacity>
                    ))}
              </View>

              {/* Admin Discount Safety Advisor */}
              {isAdmin && subtotal > 0 && (
                <View style={styles.safetyBox}>
                  <Text style={styles.safetyTitle}>Safe Discount Guidance [Admin]</Text>
                  <Text style={styles.safetyRow}>
                    • Max Breakeven Discount:{' '}
                    <Text style={{ fontWeight: 'bold' }}>₹{maxBreakevenDiscount.toFixed(0)}</Text>
                  </Text>
                  <Text style={styles.safetyRow}>
                    • Recommended Max (Leaves 20% margin):{' '}
                    <Text style={{ fontWeight: 'bold', color: COLORS.success }}>
                      ₹{recommendedMaxDiscount.toFixed(0)}
                    </Text>
                  </Text>
                </View>
              )}
            </View>

            {/* Live Estimation Output Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.cardHeader}>LIVE ESTIMATION SUMMARY</Text>

              <View style={styles.sumLine}>
                <Text style={styles.sumLabel}>Standard Subtotal:</Text>
                <Text style={styles.sumVal}>₹{subtotal}</Text>
              </View>

              <View style={styles.sumLine}>
                <Text style={styles.sumLabel}>Applied Discount:</Text>
                <Text style={[styles.sumVal, { color: COLORS.error }]}>
                  - ₹{computedDiscount.toFixed(0)}
                  {discountType === 'percent' && rawDiscount > 0 ? ` (${rawDiscount}%)` : ''}
                </Text>
              </View>

              <View style={[styles.sumLine, styles.totalLine]}>
                <Text style={styles.finalTotalLabel}>Client Quotation Price:</Text>
                <Text style={styles.finalTotalVal}>₹{finalClientPrice.toFixed(0)}</Text>
              </View>

              {/* Admin Cost & Profit Analytics */}
              {isAdmin && (
                <View style={styles.adminBreakdownBox}>
                  <View style={styles.sumLine}>
                    <Text style={styles.adminLabel}>Total Studio Direct Cost:</Text>
                    <Text style={styles.adminVal}>₹{totalCost.toFixed(0)}</Text>
                  </View>

                  <View style={styles.sumLine}>
                    <Text style={styles.adminLabel}>Estimated Net Profit:</Text>
                    <Text
                      style={[
                        styles.adminVal,
                        { color: netProfit >= 0 ? COLORS.success : COLORS.error, fontWeight: 'bold' },
                      ]}
                    >
                      {netProfit >= 0 ? `+₹${netProfit.toFixed(0)}` : `-₹${Math.abs(netProfit).toFixed(0)}`}
                    </Text>
                  </View>

                  <View style={styles.sumLine}>
                    <Text style={styles.adminLabel}>Net Profit Margin:</Text>
                    <Text
                      style={[
                        styles.adminVal,
                        { color: netProfit >= 0 ? COLORS.success : COLORS.error, fontWeight: 'bold' },
                      ]}
                    >
                      {profitMarginPercent}%
                    </Text>
                  </View>

                  {netProfit < 0 ? (
                    <View style={styles.lossWarningBox}>
                      <Text style={styles.lossWarningText}>
                        Warning: Discount exceeds profit! You will incur a loss of ₹{Math.abs(netProfit).toFixed(0)}.
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}

              {/* Export to Bill Button */}
              <TouchableOpacity
                style={[styles.exportBtn, selectedList.length === 0 && styles.exportBtnDisabled]}
                onPress={handleCreateBill}
                disabled={selectedList.length === 0}
              >
                <Text style={styles.exportBtnText}>Convert Estimation to Bill →</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ebebeb',
  },
  backBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  backBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },
  heading: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  subheading: { color: COLORS.subtext, fontSize: 11, marginTop: 2 },
  resetBtn: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resetBtnText: { color: COLORS.subtext, fontSize: 12, fontWeight: '600' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { color: COLORS.subtext, marginTop: 10 },
  scrollArea: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { padding: 20 },
  layoutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },
  leftCol: { flex: 1.3, minWidth: 320 },
  rightCol: { flex: 1, minWidth: 320 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  itemCountText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  emptyBox: { padding: 30, alignItems: 'center' },
  emptyText: { color: COLORS.subtext, fontSize: 14 },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dce3f1',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCardSelected: { borderColor: COLORS.primary, backgroundColor: '#edf2ff' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  itemRate: { fontSize: 13, color: COLORS.primary, fontWeight: 'bold', marginTop: 2 },
  unitText: { fontSize: 12, fontWeight: 'normal', color: COLORS.subtext },
  costBadge: { fontSize: 11, color: '#b85e19', marginTop: 2 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: { opacity: 0.3 },
  qtyBtnText: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  qtyInput: {
    width: 44,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingVertical: 4,
    textAlign: 'center',
    backgroundColor: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dce3f1',
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  discountToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  toggleBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  toggleBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  toggleBtnTextActive: { color: '#ffffff' },
  inputLabel: { fontSize: 12, color: COLORS.subtext, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#fafafa',
    marginBottom: 10,
  },
  quickChipsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  quickChip: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quickChipText: { fontSize: 12, color: COLORS.text, fontWeight: '500' },
  safetyBox: {
    backgroundColor: '#fff8e1',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#ffe082',
  },
  safetyTitle: { fontSize: 12, fontWeight: 'bold', color: '#f57f17', marginBottom: 4 },
  safetyRow: { fontSize: 11, color: '#5d4037', marginVertical: 1 },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  sumLine: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  sumLabel: { fontSize: 13, color: COLORS.text },
  sumVal: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  totalLine: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    marginTop: 6,
    marginBottom: 6,
  },
  finalTotalLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  finalTotalVal: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  adminBreakdownBox: {
    backgroundColor: '#f9fbe7',
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e6ee9c',
  },
  adminLabel: { fontSize: 12, color: '#33691e' },
  adminVal: { fontSize: 12, color: '#33691e', fontWeight: '500' },
  lossWarningBox: {
    backgroundColor: '#ffebee',
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  lossWarningText: { color: COLORS.error, fontSize: 11, fontWeight: 'bold' },
  exportBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  exportBtnDisabled: { opacity: 0.5 },
  exportBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
});

