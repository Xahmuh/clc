import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/language-context';
import { colors, radius, type } from '../theme';
import { ActivityItem } from '../components/ActivityItem';
import { TransferAccountModal } from '../components/TransferAccountModal';
import { openWhatsApp, openPhoneCall, openEmail, openGoogleMaps } from '../lib/communication';
import type { Customer, Activity, District } from '../types/database';
import type { RootStackParamList } from '../navigation/types';

type CustomerDetailRouteProp = RouteProp<RootStackParamList, 'CustomerDetail'>;
type CustomerDetailNavProp = NativeStackNavigationProp<RootStackParamList>;

export function CustomerDetailScreen() {
  const route = useRoute<CustomerDetailRouteProp>();
  const navigation = useNavigation<CustomerDetailNavProp>();
  const { customerId } = route.params;
  const { t, formatDistrict, language } = useLanguage();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [district, setDistrict] = useState<District | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);

  const loadCustomerDetails = async () => {
    try {
      // 1. Fetch Customer
      const { data: custData, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (!error && custData) {
        const c = custData as Customer;
        setCustomer(c);

        // 2. Fetch District
        if (c.district_id) {
          const { data: distData } = await supabase
            .from('districts')
            .select('*')
            .eq('id', c.district_id)
            .single();

          if (distData) setDistrict(distData as District);
        }
      }

      // 3. Fetch Activity History
      const { data: actsData } = await supabase
        .from('activities')
        .select('*')
        .eq('related_entity_type', 'customer')
        .eq('related_entity_id', customerId)
        .order('activity_date', { ascending: false });

      if (actsData) {
        setActivities(actsData as Activity[]);
      }
    } catch (err) {
      console.error('Error loading customer details:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadCustomerDetails();
  }, [customerId]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadCustomerDetails();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.ink} size="large" />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.notFoundText}>Customer record not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.ink} />
        }
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.topRow}>
            <Text style={styles.companyName}>{customer.company_name}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('dir_customers_tab')}</Text>
            </View>
          </View>

          {customer.contact_person ? (
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={15} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.contactText}>{customer.contact_person}</Text>
            </View>
          ) : null}

          {district ? (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={15} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.districtText}>
                {formatDistrict(district)}
              </Text>
            </View>
          ) : null}

          {customer.address ? (
            <View style={styles.detailRow}>
              <Ionicons name="business-outline" size={15} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.addressText}>{customer.address}</Text>
            </View>
          ) : null}

          <Text style={styles.sinceText}>
            {t('th_customer_since')}: {new Date(customer.customer_since).toLocaleDateString()}
          </Text>

          {/* Quick Contact & Navigation Grid */}
          <View style={styles.commGrid}>
            {customer.phone ? (
              <TouchableOpacity
                style={styles.commActionBtn}
                onPress={() => openPhoneCall(customer.phone!)}
                activeOpacity={0.8}
              >
                <Ionicons name="call-outline" size={16} color={colors.ink} />
                <Text style={styles.commActionLabel}>{t('comm_call')}</Text>
              </TouchableOpacity>
            ) : null}

            {customer.phone ? (
              <TouchableOpacity
                style={[styles.commActionBtn, styles.commActionBtnWhatsApp]}
                onPress={() =>
                  openWhatsApp(
                    customer.phone!,
                    `${t('whatsapp_message_prefix')} ${customer.company_name}.`
                  )
                }
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={16} color="#15803D" />
                <Text style={[styles.commActionLabel, styles.commActionLabelWhatsApp]}>
                  {t('comm_whatsapp')}
                </Text>
              </TouchableOpacity>
            ) : null}

            {customer.email ? (
              <TouchableOpacity
                style={styles.commActionBtn}
                onPress={() => openEmail(customer.email!, `CLC Contracting - ${customer.company_name}`)}
                activeOpacity={0.8}
              >
                <Ionicons name="mail-outline" size={16} color={colors.ink} />
                <Text style={styles.commActionLabel}>{t('comm_email')}</Text>
              </TouchableOpacity>
            ) : null}

            {district || customer.address ? (
              <TouchableOpacity
                style={styles.commActionBtn}
                onPress={() =>
                  openGoogleMaps({
                    lat: district?.latitude ? Number(district.latitude) : undefined,
                    lng: district?.longitude ? Number(district.longitude) : undefined,
                    query: customer.address || formatDistrict(district),
                  })
                }
                activeOpacity={0.8}
              >
                <Ionicons name="navigate-outline" size={16} color={colors.ink} />
                <Text style={styles.commActionLabel}>{t('comm_maps')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Log Touchpoint Button */}
          <TouchableOpacity
            style={styles.logTouchpointBtn}
            onPress={() =>
              (navigation as any).navigate('MainTabs', {
                screen: 'QuickLog',
                params: { entityType: 'customer', entityId: customer.id },
              })
            }
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={17} color={colors.white} />
            <Text style={styles.logTouchpointBtnText}>{t('log_activity_for_this_account')}</Text>
          </TouchableOpacity>

          {/* Transfer Customer to Colleague */}
          <TouchableOpacity
            style={styles.transferBtn}
            onPress={() => setIsTransferModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="swap-horizontal-outline" size={16} color={colors.ink} />
            <Text style={styles.transferBtnText}>{t('transfer_customer')}</Text>
          </TouchableOpacity>
        </View>

        {/* Activity Timeline Section */}
        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('activity_history')}</Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{activities.length}</Text>
            </View>
          </View>

          {activities.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t('no_activities_yet')}</Text>
              <Text style={styles.emptySubtext}>
                {t('log_first_activity_hint')}
              </Text>
            </View>
          ) : (
            activities.map((act) => <ActivityItem key={act.id} activity={act} />)
          )}
        </View>
      </ScrollView>

      {customer && (
        <TransferAccountModal
          visible={isTransferModalVisible}
          entityType="customer"
          entityId={customer.id}
          entityName={customer.company_name}
          currentAssigneeId={customer.assigned_to}
          onClose={() => setIsTransferModalVisible(false)}
          onSuccess={() => {
            loadCustomerDetails();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  notFoundText: {
    ...type.body,
    color: colors.textSecondary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 18,
    backgroundColor: colors.white,
    marginBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  companyName: {
    ...type.heading,
    fontSize: 20,
    color: colors.ink,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.ink,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  contactText: {
    ...type.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  districtText: {
    ...type.caption,
    color: colors.textMuted,
  },
  addressText: {
    ...type.caption,
    color: colors.textSecondary,
  },
  sinceText: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 6,
    fontSize: 11,
  },
  commGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  commActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radius.button,
    gap: 5,
  },
  commActionBtnWhatsApp: {
    backgroundColor: '#E8F5E9',
    borderColor: '#A5D6A7',
  },
  commActionIcon: {
    fontSize: 14,
  },
  commActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  commActionLabelWhatsApp: {
    color: '#1B5E20',
  },
  logTouchpointBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.ink,
    borderRadius: radius.button,
    paddingVertical: 12,
    marginTop: 14,
  },
  logTouchpointBtnText: {
    ...type.caption,
    fontWeight: '600',
    color: colors.white,
    fontSize: 13,
  },
  transferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingVertical: 12,
    marginTop: 8,
  },
  transferBtnText: {
    ...type.caption,
    fontWeight: '600',
    color: colors.ink,
    fontSize: 13,
  },
  historySection: {
    marginTop: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    ...type.heading,
    fontSize: 16,
    color: colors.ink,
  },
  countPill: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.ink,
  },
  emptyCard: {
    padding: 24,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  emptyText: {
    ...type.cardTitle,
    color: colors.ink,
  },
  emptySubtext: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});
