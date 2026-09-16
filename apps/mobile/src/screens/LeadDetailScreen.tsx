import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
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
import type { Lead, Activity, District } from '../types/database';
import type { RootStackParamList } from '../navigation/types';

type LeadDetailRouteProp = RouteProp<RootStackParamList, 'LeadDetail'>;
type LeadDetailNavProp = NativeStackNavigationProp<RootStackParamList>;

const LEAD_STAGES: { key: Lead['status']; iconName: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'new', iconName: 'sparkles-outline' },
  { key: 'contacted', iconName: 'call-outline' },
  { key: 'qualified', iconName: 'checkmark-circle-outline' },
  { key: 'negotiation', iconName: 'chatbubbles-outline' },
  { key: 'won', iconName: 'trophy-outline' },
  { key: 'lost', iconName: 'close-circle-outline' },
];

export function LeadDetailScreen() {
  const route = useRoute<LeadDetailRouteProp>();
  const navigation = useNavigation<LeadDetailNavProp>();
  const { leadId } = route.params;
  const { t, formatDistrict, formatStatus, language } = useLanguage();

  const [lead, setLead] = useState<Lead | null>(null);
  const [district, setDistrict] = useState<District | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);

  const loadLeadDetails = async () => {
    try {
      // 1. Fetch Lead
      const { data: leadData, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (!error && leadData) {
        const l = leadData as Lead;
        setLead(l);

        // 2. Fetch District
        if (l.district_id) {
          const { data: distData } = await supabase
            .from('districts')
            .select('*')
            .eq('id', l.district_id)
            .single();

          if (distData) setDistrict(distData as District);
        }
      }

      // 3. Fetch Activity History
      const { data: actsData } = await supabase
        .from('activities')
        .select('*')
        .eq('related_entity_type', 'lead')
        .eq('related_entity_id', leadId)
        .order('activity_date', { ascending: false });

      if (actsData) {
        setActivities(actsData as Activity[]);
      }
    } catch (err) {
      console.error('Error loading lead details:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadLeadDetails();
  }, [leadId]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadLeadDetails();
  };

  // Status progression
  const handleStatusChange = async (newStatus: Lead['status']) => {
    if (!lead || lead.status === newStatus || isUpdatingStatus) return;

    setIsUpdatingStatus(true);
    try {
      const { error } = await (supabase.from('leads') as any)
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', lead.id);

      if (error) throw error;

      setLead((prev) => (prev ? { ...prev, status: newStatus } : null));

      if (newStatus === 'won') {
        Alert.alert(
          'Deal Won!',
          `Congratulations! Would you like to convert ${lead.company_name} to a permanent Customer account now?`,
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Convert Now', onPress: () => handleConvertToCustomer() },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Convert Lead to Customer
  const handleConvertToCustomer = () => {
    if (!lead || isConverting) return;

    Alert.alert(
      'Convert to Customer',
      `This will create a permanent Customer profile for "${lead.company_name}" with full activity history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Convert',
          style: 'default',
          onPress: async () => {
            setIsConverting(true);
            try {
              const custPayload = {
                company_name: lead.company_name,
                contact_person: lead.contact_person,
                phone: lead.phone,
                email: lead.email,
                district_id: lead.district_id,
                assigned_to: lead.assigned_to,
                converted_from_lead_id: lead.id,
                customer_since: new Date().toISOString().split('T')[0],
              };

              const { data: newCust, error: custError } = await (supabase.from('customers') as any)
                .insert(custPayload)
                .select()
                .single();

              if (custError) throw custError;

              // Ensure lead status is won
              await (supabase.from('leads') as any)
                .update({ status: 'won', updated_at: new Date().toISOString() })
                .eq('id', lead.id);

              setLead((prev) => (prev ? { ...prev, status: 'won' } : null));

              Alert.alert(
                'Customer Created!',
                `Successfully converted ${lead.company_name} to an active Customer.`,
                [
                  {
                    text: 'View Customer Page',
                    onPress: () => {
                      if (newCust) {
                        navigation.replace('CustomerDetail', { customerId: (newCust as any).id });
                      }
                    },
                  },
                  { text: 'Done', style: 'cancel' },
                ]
              );
            } catch (err: any) {
              Alert.alert('Conversion Failed', err.message || 'Could not convert to customer.');
            } finally {
              setIsConverting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.ink} size="large" />
      </View>
    );
  }

  if (!lead) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.notFoundText}>Lead record not found.</Text>
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
            <Text style={styles.companyName}>{lead.company_name}</Text>
            <View
              style={[
                styles.statusBadge,
                lead.status === 'won' && styles.statusBadgeWon,
                lead.status === 'lost' && styles.statusBadgeLost,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  lead.status === 'won' && styles.statusTextWon,
                  lead.status === 'lost' && styles.statusTextLost,
                ]}
              >
                {formatStatus(lead.status)}
              </Text>
            </View>
          </View>

          {lead.estimated_value ? (
            <View style={styles.detailRow}>
              <Ionicons name="cash-outline" size={15} color={colors.accentEmerald} style={{ marginRight: 6 }} />
              <Text style={styles.valueText}>
                {lead.estimated_value.toLocaleString()} SAR
              </Text>
            </View>
          ) : null}

          {lead.contact_person ? (
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={15} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.contactPersonText}>{lead.contact_person}</Text>
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

          {lead.notes ? (
            <Text style={styles.notesText}>{lead.notes}</Text>
          ) : null}

          {/* Quick Communication Grid (Call, WhatsApp, Email, Maps) */}
          <View style={styles.commGrid}>
            {lead.phone ? (
              <TouchableOpacity
                style={styles.commActionBtn}
                onPress={() => openPhoneCall(lead.phone!)}
                activeOpacity={0.8}
              >
                <Ionicons name="call-outline" size={16} color={colors.ink} />
                <Text style={styles.commActionLabel}>{t('comm_call')}</Text>
              </TouchableOpacity>
            ) : null}

            {lead.phone ? (
              <TouchableOpacity
                style={[styles.commActionBtn, styles.commActionBtnWhatsApp]}
                onPress={() =>
                  openWhatsApp(
                    lead.phone!,
                    `${t('whatsapp_message_prefix')} ${lead.company_name}.`
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

            {lead.email ? (
              <TouchableOpacity
                style={styles.commActionBtn}
                onPress={() => openEmail(lead.email!, `CLC Contracting - ${lead.company_name}`)}
                activeOpacity={0.8}
              >
                <Ionicons name="mail-outline" size={16} color={colors.ink} />
                <Text style={styles.commActionLabel}>{t('comm_email')}</Text>
              </TouchableOpacity>
            ) : null}

            {district ? (
              <TouchableOpacity
                style={styles.commActionBtn}
                onPress={() =>
                  openGoogleMaps({
                    lat: district.latitude ? Number(district.latitude) : undefined,
                    lng: district.longitude ? Number(district.longitude) : undefined,
                    query: formatDistrict(district),
                  })
                }
                activeOpacity={0.8}
              >
                <Ionicons name="navigate-outline" size={16} color={colors.ink} />
                <Text style={styles.commActionLabel}>{t('comm_maps')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Lead Stage Stepper */}
          <View style={styles.stageSection}>
            <View style={styles.stageHeader}>
              <Text style={styles.stageTitle}>{t('lead_stage_title')}</Text>
              {isUpdatingStatus && <ActivityIndicator size="small" color={colors.ink} />}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stageScroll}>
              <View style={styles.stageChipsRow}>
                {LEAD_STAGES.map((s) => {
                  const isActive = lead.status === s.key;
                  return (
                    <TouchableOpacity
                      key={s.key}
                      style={[
                        styles.stageChip,
                        isActive && styles.stageChipActive,
                        s.key === 'won' && isActive && styles.stageChipWon,
                        s.key === 'lost' && isActive && styles.stageChipLost,
                      ]}
                      onPress={() => handleStatusChange(s.key)}
                      activeOpacity={0.8}
                      disabled={isUpdatingStatus}
                    >
                      <Ionicons
                        name={s.iconName}
                        size={14}
                        color={isActive ? colors.white : colors.ink}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.stageChipText, isActive && styles.stageChipTextActive]}>
                        {formatStatus(s.key)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Convert to Customer CTA (if won or on demand) */}
          <View style={styles.actionButtonsCol}>
            <TouchableOpacity
              style={[styles.convertBtn, isConverting && { opacity: 0.6 }]}
              onPress={handleConvertToCustomer}
              disabled={isConverting}
              activeOpacity={0.85}
            >
              {isConverting ? (
                <ActivityIndicator size="small" color={colors.ink} />
              ) : (
                <>
                  <Ionicons name="trophy-outline" size={16} color={colors.ink} />
                  <Text style={styles.convertBtnText}>{t('convert_to_customer')}</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Log Touchpoint Button */}
            <TouchableOpacity
              style={styles.logTouchpointBtn}
              onPress={() =>
                (navigation as any).navigate('MainTabs', {
                  screen: 'QuickLog',
                  params: { entityType: 'lead', entityId: lead.id },
                })
              }
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={17} color={colors.white} />
              <Text style={styles.logTouchpointBtnText}>{t('log_activity_for_this_account')}</Text>
            </TouchableOpacity>

            {/* Transfer Lead to Colleague */}
            <TouchableOpacity
              style={styles.transferBtn}
              onPress={() => setIsTransferModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="swap-horizontal-outline" size={16} color={colors.ink} />
              <Text style={styles.transferBtnText}>{t('transfer_lead')}</Text>
            </TouchableOpacity>
          </View>
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

      {lead && (
        <TransferAccountModal
          visible={isTransferModalVisible}
          entityType="lead"
          entityId={lead.id}
          entityName={lead.company_name}
          currentAssigneeId={lead.assigned_to}
          onClose={() => setIsTransferModalVisible(false)}
          onSuccess={() => {
            loadLeadDetails();
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
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
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
  statusBadge: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeWon: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  statusBadgeLost: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.ink,
    textTransform: 'capitalize',
  },
  statusTextWon: {
    color: '#166534',
  },
  statusTextLost: {
    color: '#991B1B',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  valueText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  contactPersonText: {
    ...type.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  districtText: {
    ...type.caption,
    color: colors.textMuted,
  },
  notesText: {
    ...type.body,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
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
  stageSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stageTitle: {
    ...type.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    fontSize: 12,
  },
  stageScroll: {
    marginHorizontal: -4,
  },
  stageChipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  stageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    gap: 4,
  },
  stageChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  stageChipWon: {
    backgroundColor: '#166534',
    borderColor: '#166534',
  },
  stageChipLost: {
    backgroundColor: '#991B1B',
    borderColor: '#991B1B',
  },
  stageChipIcon: {
    fontSize: 12,
  },
  stageChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.ink,
  },
  stageChipTextActive: {
    color: colors.white,
  },
  actionButtonsCol: {
    marginTop: 16,
    gap: 8,
  },
  convertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radius.button,
    paddingVertical: 12,
  },
  convertBtnText: {
    ...type.caption,
    fontWeight: '700',
    color: colors.ink,
    fontSize: 13,
  },
  logTouchpointBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.ink,
    borderRadius: radius.button,
    paddingVertical: 12,
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
