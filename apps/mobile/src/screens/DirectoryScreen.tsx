import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { useLanguage } from '../lib/language-context';
import { colors, radius, type } from '../theme';
import { LeadCard } from '../components/LeadCard';
import { CustomerCard } from '../components/CustomerCard';
import { CreateAccountModal } from '../components/CreateAccountModal';
import type { Lead, Customer, District, Profile, LeadStatus } from '../types/database';
import type { RootStackParamList, MainTabParamList } from '../navigation/types';

type DirectoryRouteProp = RouteProp<MainTabParamList, 'Directory'>;
type DirectoryNavProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_KEYS: ('all' | LeadStatus)[] = [
  'all',
  'new',
  'contacted',
  'qualified',
  'negotiation',
  'won',
  'lost',
];

export function DirectoryScreen() {
  const navigation = useNavigation<DirectoryNavProp>();
  const route = useRoute<DirectoryRouteProp>();
  const { user, isManager } = useAuth();
  const { t, formatDistrict, formatStatus, language } = useLanguage();

  const [activeTab, setActiveTab] = useState<'leads' | 'customers'>(
    route.params?.initialTab || 'leads'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
  const [selectedExecutiveId, setSelectedExecutiveId] = useState<string | null>(null);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [districts, setDistricts] = useState<Record<number, District>>({});
  const [executives, setExecutives] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      // 1. Leads (RLS automatically restricts employee to own leads)
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (leadsData) {
        setLeads(leadsData as Lead[]);
      }

      // 2. Customers (RLS automatically restricts employee to own customers)
      const { data: custList } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (custList) {
        setCustomers(custList as Customer[]);
      }

      // 3. Districts
      const { data: distData } = await supabase.from('districts').select('*');
      if (distData) {
        const dMap: Record<number, District> = {};
        ((distData as District[]) || []).forEach((d) => (dMap[d.id] = d));
        setDistricts(dMap);
      }

      // 4. Team Members / Executives (if Manager)
      if (isManager) {
        const { data: teamData } = await supabase
          .from('profiles')
          .select('*')
          .eq('is_active', true)
          .order('full_name');
        if (teamData) {
          setExecutives(teamData as Profile[]);
        }
      }
    } catch (err) {
      console.error('Error loading directory data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, isManager]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  // Distinct districts present in active tab
  const activeList = activeTab === 'leads' ? leads : customers;
  const activeDistrictIds = [
    ...new Set(
      activeList
        .map((x) => x.district_id)
        .filter((id): id is number => typeof id === 'number')
    ),
  ];

  // Filtering leads
  const filteredLeads = leads.filter((l) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      l.company_name.toLowerCase().includes(q) ||
      (l.contact_person && l.contact_person.toLowerCase().includes(q));

    const matchesStatus = selectedStatus === 'all' || l.status === selectedStatus;
    const matchesDistrict = selectedDistrictId === null || l.district_id === selectedDistrictId;
    const matchesExecutive = !selectedExecutiveId || l.assigned_to === selectedExecutiveId;

    return matchesSearch && matchesStatus && matchesDistrict && matchesExecutive;
  });

  // Filtering customers
  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.company_name.toLowerCase().includes(q) ||
      (c.contact_person && c.contact_person.toLowerCase().includes(q));

    const matchesDistrict = selectedDistrictId === null || c.district_id === selectedDistrictId;
    const matchesExecutive = !selectedExecutiveId || c.assigned_to === selectedExecutiveId;

    return matchesSearch && matchesDistrict && matchesExecutive;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedDistrictId(null);
    setSelectedExecutiveId(null);
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedStatus !== 'all' ||
    selectedDistrictId !== null ||
    selectedExecutiveId !== null;

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        {/* Segmented Tab Switch */}
        <View style={styles.tabBar}>
          <TouchableOpacity
          style={[styles.tabButton, activeTab === 'leads' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('leads');
            setSelectedDistrictId(null);
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'leads' && styles.tabTextActive]}>
            {isManager ? t('dir_leads_tab') : t('my_leads')} ({leads.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'customers' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('customers');
            setSelectedDistrictId(null);
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'customers' && styles.tabTextActive]}>
            {isManager ? t('dir_customers_tab') : t('my_customers')} ({customers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'leads' ? t('dir_search_leads') : t('dir_search_customers')}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Filter Chips Bars */}
      <View style={styles.filtersSection}>
        {/* Executive Filter Chips (Manager / Supervisor / Admin) */}
        {isManager && executives.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.executiveChipsScroll}
            contentContainerStyle={styles.chipsScrollContent}
          >
            <TouchableOpacity
              style={[
                styles.executiveChip,
                selectedExecutiveId === null && styles.executiveChipActive,
              ]}
              onPress={() => setSelectedExecutiveId(null)}
              activeOpacity={0.75}
            >
              <Ionicons
                name="people-outline"
                size={13}
                color={selectedExecutiveId === null ? colors.white : colors.ink}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.executiveChipText,
                  selectedExecutiveId === null && styles.executiveChipTextActive,
                ]}
              >
                {t('all')} ({activeList.length})
              </Text>
            </TouchableOpacity>

            {executives.map((emp) => {
              const isSelected = selectedExecutiveId === emp.id;
              const count = activeList.filter((x) => x.assigned_to === emp.id).length;

              return (
                <TouchableOpacity
                  key={emp.id}
                  style={[
                    styles.executiveChip,
                    isSelected && styles.executiveChipActive,
                  ]}
                  onPress={() => setSelectedExecutiveId(isSelected ? null : emp.id)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="person-outline"
                    size={13}
                    color={isSelected ? colors.white : colors.ink}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.executiveChipText,
                      isSelected && styles.executiveChipTextActive,
                    ]}
                  >
                    {emp.full_name?.split(' ')[0] || 'User'} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Lead Status Filter (Leads tab only) */}
        {activeTab === 'leads' ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.statusChipsScroll}
            contentContainerStyle={styles.chipsScrollContent}
          >
            {STATUS_KEYS.map((key) => {
              const isSelected = selectedStatus === key;
              const count =
                key === 'all'
                  ? leads.length
                  : leads.filter((l) => l.status === key).length;
              const label = key === 'all' ? t('all') : formatStatus(key);

              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  onPress={() => setSelectedStatus(key)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected && styles.filterChipTextActive,
                    ]}
                  >
                    {label} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        {/* District Filter Chips (Only if there are multiple districts) */}
        {activeDistrictIds.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.districtChipsScroll}
            contentContainerStyle={styles.chipsScrollContent}
          >
            <TouchableOpacity
              style={[
                styles.districtChip,
                selectedDistrictId === null && styles.districtChipActive,
              ]}
              onPress={() => setSelectedDistrictId(null)}
              activeOpacity={0.75}
            >
              <Ionicons
                name="location-outline"
                size={13}
                color={selectedDistrictId === null ? colors.white : colors.ink}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.districtChipText,
                  selectedDistrictId === null && styles.districtChipTextActive,
                ]}
              >
                {t('filter_all_areas')}
              </Text>
            </TouchableOpacity>

            {activeDistrictIds.map((dId) => {
              const d = districts[dId];
              if (!d) return null;
              const isSelected = selectedDistrictId === dId;
              const count = activeList.filter((x) => x.district_id === dId).length;

              return (
                <TouchableOpacity
                  key={dId}
                  style={[styles.districtChip, isSelected && styles.districtChipActive]}
                  onPress={() => setSelectedDistrictId(isSelected ? null : dId)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="location-outline"
                    size={13}
                    color={isSelected ? colors.white : colors.ink}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.districtChipText,
                      isSelected && styles.districtChipTextActive,
                    ]}
                  >
                    {formatDistrict(d)} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Clear Filters Reset Line if active */}
        {hasActiveFilters && (
          <View style={styles.resetFilterRow}>
            <Text style={styles.filterMatchCount}>
              {t('showing_matches')} {activeTab === 'leads' ? filteredLeads.length : filteredCustomers.length} {t('results')}
            </Text>
            <TouchableOpacity onPress={clearFilters} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="close-circle-outline" size={13} color={colors.ink} style={{ marginRight: 3 }} />
              <Text style={styles.clearFiltersText}>{t('clear_filters')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content List */}
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.ink} />
      ) : activeTab === 'leads' ? (
        <FlatList<Lead>
          data={filteredLeads}
          keyExtractor={(item: Lead) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.ink} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {hasActiveFilters ? t('dir_no_leads_found') : t('no_leads_assigned_yet')}
              </Text>
              {hasActiveFilters ? (
                <TouchableOpacity style={styles.emptyAddBtn} onPress={clearFilters}>
                  <Text style={styles.emptyAddBtnText}>{t('clear_filters')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => setIsCreateModalOpen(true)}
                >
                  <Ionicons name="add" size={15} color={colors.white} style={{ marginRight: 4 }} />
                  <Text style={styles.emptyAddBtnText}>{t('create_first_lead')}</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }: { item: Lead }) => {
            const district = item.district_id ? districts[item.district_id] : null;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('LeadDetail', { leadId: item.id })}
              >
                <LeadCard
                  lead={item}
                  districtName={district ? formatDistrict(district) : undefined}
                />
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <FlatList<Customer>
          data={filteredCustomers}
          keyExtractor={(item: Customer) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.ink} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {hasActiveFilters ? t('dir_no_customers_found') : t('no_customers_assigned_yet')}
              </Text>
              {hasActiveFilters ? (
                <TouchableOpacity style={styles.emptyAddBtn} onPress={clearFilters}>
                  <Text style={styles.emptyAddBtnText}>{t('clear_filters')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => setIsCreateModalOpen(true)}
                >
                  <Ionicons name="add" size={15} color={colors.white} style={{ marginRight: 4 }} />
                  <Text style={styles.emptyAddBtnText}>{t('create_first_customer')}</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }: { item: Customer }) => {
            const district = item.district_id ? districts[item.district_id] : null;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
              >
                <CustomerCard
                  customer={item}
                  districtName={district ? formatDistrict(district) : undefined}
                />
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsCreateModalOpen(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>＋</Text>
        <Text style={styles.fabLabel}>
          {activeTab === 'leads' ? t('dir_add_lead') : t('dir_add_customer')}
        </Text>
      </TouchableOpacity>
      </View>

      {/* Create Lead / Customer Modal */}
      <CreateAccountModal
        visible={isCreateModalOpen}
        initialType={activeTab === 'leads' ? 'lead' : 'customer'}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.button,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButtonActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  tabText: {
    ...type.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.white,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.surfaceSubtle,
  },
  filtersSection: {
    paddingBottom: 4,
  },
  statusChipsScroll: {
    marginVertical: 4,
  },
  executiveChipsScroll: {
    marginVertical: 4,
  },
  districtChipsScroll: {
    marginVertical: 2,
  },
  chipsScrollContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  executiveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: colors.surfaceSubtle,
  },
  executiveChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  executiveChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.ink,
  },
  executiveChipTextActive: {
    color: colors.white,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  filterChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  districtChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
  },
  districtChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  districtChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  districtChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  resetFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  filterMatchCount: {
    fontSize: 11,
    color: colors.textMuted,
  },
  clearFiltersText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.ink,
  },
  listContent: {
    padding: 16,
    paddingTop: 6,
    paddingBottom: 80,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.button,
  },
  emptyAddBtnText: {
    ...type.caption,
    fontWeight: '600',
    color: colors.white,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ink,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    gap: 6,
  },
  fabIcon: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  fabLabel: {
    ...type.caption,
    fontWeight: '700',
    color: colors.white,
    fontSize: 13,
  },
});
