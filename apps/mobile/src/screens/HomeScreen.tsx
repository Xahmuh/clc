import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '../lib/auth-context';
import { useLanguage } from '../lib/language-context';
import { supabase } from '../lib/supabase';
import { colors, radius, type } from '../theme';
import type { Lead, Activity, District } from '../types/database';
import type { RootStackParamList, MainTabParamList } from '../navigation/types';

type HomeScreenNavProp = BottomTabNavigationProp<MainTabParamList, 'Home'> &
  NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavProp>();
  const { profile, user } = useAuth();
  const { t, formatDistrict, formatStatus, language } = useLanguage();

  const [followUps, setFollowUps] = useState<Lead[]>([]);
  const [todayActivities, setTodayActivities] = useState<Activity[]>([]);
  const [districts, setDistricts] = useState<Record<number, District>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadHomeData = async () => {
    if (!user) return;
    try {
      // 1. Fetch activities with follow_up_date <= today
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: followUpActs } = await supabase
        .from('activities')
        .select('*')
        .not('follow_up_date', 'is', null)
        .lte('follow_up_date', todayStr)
        .order('follow_up_date', { ascending: true });

      const acts = (followUpActs as unknown as Activity[]) || [];
      if (acts.length > 0) {
        const leadIds = [
          ...new Set(
            acts
              .filter((a) => a.related_entity_type === 'lead')
              .map((a) => a.related_entity_id)
          ),
        ];

        if (leadIds.length > 0) {
          const { data: leadsData } = await supabase
            .from('leads')
            .select('*')
            .in('id', leadIds);

          if (leadsData) {
            const actDateMap = new Map<string, string | null>(
              acts.map((a) => [a.related_entity_id, a.follow_up_date])
            );
            const enrichedLeads = (leadsData as Lead[]).map((l) => ({
              ...l,
              follow_up_date: actDateMap.get(l.id) || null,
            }));
            setFollowUps(enrichedLeads);
          } else {
            setFollowUps([]);
          }
        } else {
          setFollowUps([]);
        }
      } else {
        setFollowUps([]);
      }

      // 2. Fetch activities logged today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { data: actsData } = await supabase
        .from('activities')
        .select('*')
        .gte('activity_date', startOfDay.toISOString())
        .order('activity_date', { ascending: false });

      if (actsData) {
        setTodayActivities(actsData as Activity[]);
      }

      // 3. Fetch districts
      const { data: distData } = await supabase.from('districts').select('*');
      if (distData) {
        const dMap: Record<number, District> = {};
        ((distData as District[]) || []).forEach((d) => (dMap[d.id] = d));
        setDistricts(dMap);
      }
    } catch (err) {
      console.error('Error loading home data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadHomeData();
  }, [user]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadHomeData();
  };

  const todayFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.ink} />
        }
      >
        {/* Top Header */}
        <View style={styles.header}>
          <Text style={styles.dateText}>{todayFormatted}</Text>
          <Text style={styles.greetingText}>
            {t('home_hello')}, {profile?.full_name?.split(' ')[0] || (language === 'ar' ? 'الموظف' : 'Agent')}
          </Text>
        </View>

        {/* PROMINENT QUICK LOG ENTRY POINT */}
        <TouchableOpacity
          style={styles.quickLogBanner}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('QuickLog')}
        >
          <View style={styles.quickLogTop}>
            <View style={styles.quickLogBadge}>
              <Text style={styles.quickLogBadgeText}>{t('home_field_dispatch')}</Text>
            </View>
            <Ionicons name="add" size={20} color={colors.ink} />
          </View>
          <Text style={styles.quickLogTitle}>{t('home_quick_log_banner_title')}</Text>
          <Text style={styles.quickLogSubtext}>
            {t('home_quick_log_banner_sub')}
          </Text>
          <View style={styles.quickLogButton}>
            <Text style={styles.quickLogButtonText}>{t('home_quick_log_banner_btn')}</Text>
          </View>
        </TouchableOpacity>

        {/* TODAY'S ACTIVITY SUMMARY & DAILY REPORT LINK */}
        <TouchableOpacity
          style={styles.summaryBar}
          activeOpacity={0.85}
          onPress={() => (navigation as any).navigate('DailyReport')}
        >
          <View>
            <Text style={styles.summaryLabel}>{t('home_activities_today')}</Text>
            <Text style={styles.summarySubtext}>{t('home_view_daily_report')}</Text>
          </View>
          <View style={styles.summaryRight}>
            <Text style={styles.summaryCount}>{todayActivities.length}</Text>
            <Text style={styles.summaryArrow}>→</Text>
          </View>
        </TouchableOpacity>

        {/* TODAY'S FOLLOW-UPS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home_todays_followups')}</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{followUps.length}</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginVertical: 24 }} color={colors.ink} />
        ) : followUps.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t('home_no_followups')}</Text>
            <Text style={styles.emptySubtext}>
              {t('home_no_followups_sub')}
            </Text>
          </View>
        ) : (
          followUps.map((lead) => {
            const district = lead.district_id ? districts[lead.district_id] : null;
            return (
              <View key={lead.id} style={styles.followUpCard}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{lead.company_name}</Text>
                  <Text style={styles.leadStatus}>{formatStatus(lead.status)}</Text>
                </View>

                {lead.contact_person ? (
                  <Text style={styles.cardContact}>{lead.contact_person}</Text>
                ) : null}

                <View style={styles.cardMeta}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="location-outline" size={13} color={colors.textSecondary} style={{ marginRight: 3 }} />
                    <Text style={styles.cardDistrict}>
                      {district ? formatDistrict(district) : (language === 'ar' ? 'الرياض' : 'Riyadh')}
                    </Text>
                  </View>
                  {lead.follow_up_date ? (
                    <Text style={styles.dueDateText}>{t('field_follow_up')}: {lead.follow_up_date}</Text>
                  ) : null}
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionBtnOutline}
                    onPress={() => navigation.navigate('LeadDetail', { leadId: lead.id })}
                  >
                    <Text style={styles.actionBtnOutlineText}>{t('home_view_account')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtnSolid}
                    onPress={() =>
                      navigation.navigate('QuickLog', {
                        entityType: 'lead',
                        entityId: lead.id,
                      })
                    }
                  >
                    <Text style={styles.actionBtnSolidText}>{t('nav_quick_log')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 16,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  header: {
    marginBottom: 18,
  },
  dateText: {
    ...type.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  greetingText: {
    ...type.display,
    fontSize: 26,
    color: colors.ink,
    marginTop: 2,
  },
  quickLogBanner: {
    backgroundColor: colors.ink,
    borderRadius: radius.card,
    padding: 20,
    marginBottom: 20,
  },
  quickLogTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickLogBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.button,
  },
  quickLogBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.8,
  },
  quickLogIcon: {
    fontSize: 16,
    color: colors.white,
  },
  quickLogTitle: {
    ...type.cardTitle,
    fontSize: 18,
    color: colors.white,
  },
  quickLogSubtext: {
    ...type.body,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 6,
    lineHeight: 18,
  },
  quickLogButton: {
    backgroundColor: colors.white,
    borderRadius: radius.button,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    marginTop: 14,
  },
  quickLogButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  summaryLabel: {
    ...type.caption,
    fontWeight: '700',
    color: colors.ink,
    fontSize: 13,
  },
  summarySubtext: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryCount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  summaryArrow: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
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
  emptyTitle: {
    ...type.cardTitle,
    color: colors.ink,
  },
  emptySubtext: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  followUpCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    ...type.cardTitle,
    color: colors.ink,
    flex: 1,
    marginRight: 8,
  },
  leadStatus: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
    color: colors.textSecondary,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardContact: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cardDistrict: {
    ...type.caption,
    color: colors.textMuted,
  },
  dueDateText: {
    ...type.caption,
    fontWeight: '600',
    color: colors.ink,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtnOutline: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnOutlineText: {
    ...type.caption,
    fontWeight: '600',
    color: colors.ink,
  },
  actionBtnSolid: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.button,
    backgroundColor: colors.ink,
  },
  actionBtnSolidText: {
    ...type.caption,
    fontWeight: '600',
    color: colors.white,
  },
});
