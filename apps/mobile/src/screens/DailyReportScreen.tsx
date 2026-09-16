import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
  Linking,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { useLanguage } from '../lib/language-context';
import { colors, radius, type } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type DailyReportRouteProp = RouteProp<RootStackParamList, 'DailyReport'>;

interface ActivityWithEntity {
  id: string;
  activity_type: 'visit' | 'email' | 'call' | 'meeting' | 'other';
  description: string | null;
  activity_date: string;
  latitude: number | null;
  longitude: number | null;
  outcome: string | null;
  entity_name: string;
  entity_type: 'lead' | 'customer';
}

export function DailyReportScreen() {
  const route = useRoute<DailyReportRouteProp>();
  const { user, profile } = useAuth();
  const { t, language, formatActivityType } = useLanguage();

  const [selectedDate, setSelectedDate] = useState<string>(
    route.params?.date || new Date().toISOString().split('T')[0]
  );
  const [activities, setActivities] = useState<ActivityWithEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDailyReport = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const startOfDay = `${selectedDate}T00:00:00.000Z`;
      const endOfDay = `${selectedDate}T23:59:59.999Z`;

      // 1. Fetch activities for selected date
      const { data: actsData, error: actsError } = await supabase
        .from('activities')
        .select('*')
        .gte('activity_date', startOfDay)
        .lte('activity_date', endOfDay)
        .order('activity_date', { ascending: true });

      if (actsError) throw actsError;

      const rawActs: any[] = (actsData as any[]) || [];

      // 2. Fetch related Leads and Customers to populate entity names
      const leadIds = rawActs.filter((a) => a.related_entity_type === 'lead').map((a) => a.related_entity_id);
      const custIds = rawActs.filter((a) => a.related_entity_type === 'customer').map((a) => a.related_entity_id);

      const entityMap: Record<string, string> = {};

      if (leadIds.length > 0) {
        const { data: leads } = await (supabase.from('leads') as any)
          .select('id, company_name')
          .in('id', leadIds);
        if (leads) {
          (leads as any[]).forEach((l) => {
            entityMap[l.id] = l.company_name;
          });
        }
      }

      if (custIds.length > 0) {
        const { data: custs } = await (supabase.from('customers') as any)
          .select('id, company_name')
          .in('id', custIds);
        if (custs) {
          (custs as any[]).forEach((c) => {
            entityMap[c.id] = c.company_name;
          });
        }
      }

      const formattedActs: ActivityWithEntity[] = rawActs.map((a) => ({
        id: a.id,
        activity_type: a.activity_type,
        description: a.description,
        activity_date: a.activity_date,
        latitude: a.latitude,
        longitude: a.longitude,
        outcome: a.outcome,
        entity_name: entityMap[a.related_entity_id] || (language === 'ar' ? 'حساب الشركة' : 'Company Account'),
        entity_type: a.related_entity_type,
      }));

      setActivities(formattedActs);
    } catch (err: any) {
      console.error('Error loading daily report:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDailyReport();
  }, [selectedDate, user]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadDailyReport();
  };

  // Date navigation helpers
  const handleShiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Counts by activity type
  const visitCount = activities.filter((a) => a.activity_type === 'visit').length;
  const callCount = activities.filter((a) => a.activity_type === 'call').length;
  const meetingCount = activities.filter((a) => a.activity_type === 'meeting').length;
  const emailCount = activities.filter((a) => a.activity_type === 'email').length;
  const otherCount = activities.filter((a) => a.activity_type === 'other').length;
  const totalCount = activities.length;

  // Format report text for WhatsApp / Sharing
  const generateReportText = () => {
    if (language === 'ar') {
      const employeeName = profile?.full_name || 'موظف CLC';
      const dateFormatted = new Date(selectedDate).toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      let text = `*تقرير الإنجاز الميداني اليومي — CLC CRM*\n`;
      text += `*الموظف:* ${employeeName}\n`;
      text += `*التاريخ:* ${dateFormatted} (${selectedDate})\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `*ملخص المهام والحركات:*\n`;
      text += `• الزيارات الميدانية: ${visitCount}\n`;
      text += `• المكالمات الهاتفية: ${callCount}\n`;
      text += `• الاجتماعات: ${meetingCount}\n`;
      text += `• البريد الإلكتروني: ${emailCount}\n`;
      if (otherCount > 0) text += `• مهام أخرى: ${otherCount}\n`;
      text += `*الإجمالي:* ${totalCount} حركات منجزة\n\n`;

      if (activities.length > 0) {
        text += `*تفاصيل الحركات الميدانية:*\n`;
        activities.forEach((act, index) => {
          const timeStr = new Date(act.activity_date).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          const typeLabel = formatActivityType(act.activity_type);

          text += `${index + 1}. [${timeStr}] *${act.entity_name}* — ${typeLabel}\n`;
          if (act.description) {
            text += `   ↳ الملاحظات: ${act.description.trim()}\n`;
          }
          if (act.outcome) {
            text += `   ↳ النتيجة: ${act.outcome.trim()}\n`;
          }
        });
      } else {
        text += `لا توجد حركات مسجلة في هذا التاريخ.\n`;
      }

      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `تم التصدير آلياً عبر تطبيق CLC CRM`;
      return text;
    }

    // English Report
    const employeeName = profile?.full_name || 'CLC Employee';
    const dateFormatted = new Date(selectedDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let text = `*Daily Field Activity Report — CLC CRM*\n`;
    text += `*Employee:* ${employeeName}\n`;
    text += `*Date:* ${dateFormatted} (${selectedDate})\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `*Summary of Activities:*\n`;
    text += `• Site Visits: ${visitCount}\n`;
    text += `• Phone Calls: ${callCount}\n`;
    text += `• Client Meetings: ${meetingCount}\n`;
    text += `• Emails & Comms: ${emailCount}\n`;
    if (otherCount > 0) text += `• Other Tasks: ${otherCount}\n`;
    text += `*Total:* ${totalCount} activities completed\n\n`;

    if (activities.length > 0) {
      text += `*Activity Details:*\n`;
      activities.forEach((act, index) => {
        const timeStr = new Date(act.activity_date).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        const typeLabel = formatActivityType(act.activity_type);

        text += `${index + 1}. [${timeStr}] *${act.entity_name}* — ${typeLabel}\n`;
        if (act.description) {
          text += `   ↳ Notes: ${act.description.trim()}\n`;
        }
        if (act.outcome) {
          text += `   ↳ Outcome: ${act.outcome.trim()}\n`;
        }
      });
    } else {
      text += `No activities recorded on this date.\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Exported automatically via CLC CRM App`;
    return text;
  };

  const handleShareReport = async () => {
    const reportText = generateReportText();
    try {
      await Share.share({
        message: reportText,
        title: language === 'ar' ? 'التقرير الميداني اليومي - CLC CRM' : 'Daily Field Report - CLC CRM',
      });
    } catch (err: any) {
      Alert.alert(t('error'), err.message || (language === 'ar' ? 'تعذر مشاركة التقرير.' : 'Could not share report.'));
    }
  };

  const handleSendWhatsApp = async () => {
    const reportText = generateReportText();
    const url = `whatsapp://send?text=${encodeURIComponent(reportText)}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
      } else {
        await Share.share({ message: reportText });
      }
    } catch (err) {
      await Share.share({ message: reportText });
    }
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <View style={styles.container}>
      {/* Date Header & Shift Bar */}
      <View style={styles.dateBar}>
        <TouchableOpacity
          style={styles.dateNavBtn}
          onPress={() => handleShiftDate(-1)}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={16} color={colors.ink} />
        </TouchableOpacity>

        <View style={styles.dateTitleContainer}>
          <Text style={styles.dateTitle}>
            {isToday ? (language === 'ar' ? 'اليوم' : 'Today') : selectedDate}
          </Text>
          <Text style={styles.dateSubtitle}>{selectedDate}</Text>
        </View>

        <TouchableOpacity
          style={[styles.dateNavBtn, isToday && styles.dateNavBtnDisabled]}
          onPress={() => handleShiftDate(1)}
          disabled={isToday}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chevron-forward"
            size={16}
            color={isToday ? colors.border : colors.ink}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.ink} />
        }
      >
        {/* Summary Panel - Cream Container per CLC CRM Design System */}
        <View style={styles.summaryPanel}>
          <View style={styles.summaryHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.summaryHeaderIconBox}>
                <Ionicons name="document-text-outline" size={17} color={colors.ink} />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.summaryTitle}>{t('report_title')}</Text>
              </View>
            </View>
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>
                {totalCount} {language === 'ar' ? 'إجمالي' : 'Total'}
              </Text>
            </View>
          </View>

          {/* Symmetrical 2x2 Balanced KPI Cards Grid */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiRow}>
              {/* Card 1: Visits */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiTopRow}>
                  <View style={styles.kpiIconBox}>
                    <Ionicons name="location-outline" size={18} color={colors.ink} />
                  </View>
                  <Text style={styles.kpiValue}>{visitCount}</Text>
                </View>
                <Text style={styles.kpiTitle}>{formatActivityType('visit')}</Text>
              </View>

              {/* Card 2: Calls */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiTopRow}>
                  <View style={styles.kpiIconBox}>
                    <Ionicons name="call-outline" size={18} color={colors.ink} />
                  </View>
                  <Text style={styles.kpiValue}>{callCount}</Text>
                </View>
                <Text style={styles.kpiTitle}>{formatActivityType('call')}</Text>
              </View>
            </View>

            <View style={styles.kpiRow}>
              {/* Card 3: Meetings */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiTopRow}>
                  <View style={styles.kpiIconBox}>
                    <Ionicons name="people-outline" size={18} color={colors.ink} />
                  </View>
                  <Text style={styles.kpiValue}>{meetingCount}</Text>
                </View>
                <Text style={styles.kpiTitle}>{formatActivityType('meeting')}</Text>
              </View>

              {/* Card 4: Emails & Comms */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiTopRow}>
                  <View style={styles.kpiIconBox}>
                    <Ionicons name="mail-outline" size={18} color={colors.ink} />
                  </View>
                  <Text style={styles.kpiValue}>{emailCount + otherCount}</Text>
                </View>
                <Text style={styles.kpiTitle}>{formatActivityType('email')}</Text>
              </View>
            </View>
          </View>

          {/* WhatsApp & Share CTAs */}
          <View style={styles.shareButtonsRow}>
            <TouchableOpacity
              style={styles.whatsappBtn}
              onPress={handleSendWhatsApp}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={16} color={colors.white} />
              <Text style={styles.whatsappBtnText}>{t('report_share_whatsapp')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.generalShareBtn}
              onPress={handleShareReport}
              activeOpacity={0.85}
            >
              <Ionicons name="share-outline" size={16} color={colors.ink} />
              <Text style={styles.generalShareBtnText}>
                {language === 'ar' ? 'تصدير التقرير' : 'Export Report'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chronological List of Activities */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>
              {language === 'ar' ? 'الجدول الزمني للأنشطة' : 'Touchpoints Timeline'}
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{activities.length}</Text>
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={colors.ink} />
          ) : activities.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="clipboard-outline" size={40} color={colors.textMuted} style={{ marginBottom: 10 }} />
              <Text style={styles.emptyTitle}>
                {language === 'ar' ? 'لا توجد أنشطة مسجلة' : 'No Activities Recorded'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {language === 'ar'
                  ? 'لم يتم تسجيل أي زيارات أو مكالمات أو اجتماعات في هذا اليوم.'
                  : 'No field visits, calls, or client meetings have been logged for this date yet.'}
              </Text>
            </View>
          ) : (
            activities.map((item) => {
              const timeFormatted = new Date(item.activity_date).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              const actIconName =
                item.activity_type === 'visit'
                  ? 'location-outline'
                  : item.activity_type === 'call'
                  ? 'call-outline'
                  : item.activity_type === 'meeting'
                  ? 'people-outline'
                  : item.activity_type === 'email'
                  ? 'mail-outline'
                  : 'document-text-outline';

              return (
                <View key={item.id} style={styles.activityCard}>
                  <View style={styles.actTopRow}>
                    <View style={styles.actTypeBadge}>
                      <Ionicons
                        name={actIconName}
                        size={13}
                        color={colors.ink}
                        style={{ marginRight: 5 }}
                      />
                      <Text style={styles.actTypeBadgeText}>
                        {formatActivityType(item.activity_type)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="time-outline" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                      <Text style={styles.actTimeText}>{timeFormatted}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="business-outline" size={14} color={colors.ink} style={{ marginRight: 6 }} />
                    <Text style={styles.actCompanyName}>{item.entity_name}</Text>
                  </View>

                  {item.description ? (
                    <Text style={styles.actDescription}>{item.description}</Text>
                  ) : null}

                  {item.outcome ? (
                    <View style={styles.outcomeRow}>
                      <Ionicons name="checkmark-done-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={styles.outcomeLabel}>
                        {language === 'ar' ? 'النتيجة:' : 'Outcome:'}
                      </Text>
                      <Text style={styles.outcomeText}>{item.outcome}</Text>
                    </View>
                  ) : null}

                  {item.latitude && item.longitude ? (
                    <View style={styles.gpsRow}>
                      <Ionicons name="navigate-outline" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={styles.gpsVerifiedText}>
                        GPS: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  dateBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
  },
  dateNavBtn: {
    padding: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNavBtnDisabled: {
    opacity: 0.3,
  },
  dateNavBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  dateNavBtnTextDisabled: {
    color: colors.textMuted,
  },
  dateTitleContainer: {
    alignItems: 'center',
  },
  dateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  dateSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  summaryPanel: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.panel,
    padding: 16,
    marginBottom: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryHeaderIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    ...type.heading,
    fontSize: 16,
    color: colors.ink,
  },
  summarySubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  totalBadge: {
    backgroundColor: colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  totalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  kpiGrid: {
    gap: 10,
    marginBottom: 16,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 12,
  },
  kpiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
  },
  kpiTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  kpiSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  shareButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  whatsappBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1EBE5D',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.button,
  },
  whatsappBtnText: {
    ...type.caption,
    fontWeight: '700',
    color: colors.white,
    fontSize: 12,
  },
  generalShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: radius.button,
  },
  generalShareBtnText: {
    ...type.caption,
    fontWeight: '600',
    color: colors.ink,
    fontSize: 12,
  },
  listSection: {
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeader: {
    ...type.heading,
    fontSize: 15,
    color: colors.ink,
  },
  countBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countBadgeText: {
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
    backgroundColor: colors.surfaceSubtle,
  },
  emptyTitle: {
    ...type.cardTitle,
    color: colors.ink,
  },
  emptySubtitle: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
    marginBottom: 10,
  },
  actTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  actTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.ink,
  },
  actTimeText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  actCompanyName: {
    ...type.cardTitle,
    fontSize: 15,
    color: colors.ink,
  },
  actDescription: {
    ...type.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 18,
  },
  outcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.button,
    alignSelf: 'flex-start',
  },
  outcomeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 4,
  },
  outcomeText: {
    fontSize: 11,
    color: colors.ink,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  gpsVerifiedText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
