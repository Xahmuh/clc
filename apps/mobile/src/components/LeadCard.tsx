import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../lib/language-context';
import { colors, radius, type } from '../theme';
import { openWhatsApp, openPhoneCall } from '../lib/communication';
import type { Lead } from '../types/database';

interface LeadCardProps {
  lead: Lead;
  districtName?: string;
  featured?: boolean;
}

export function LeadCard({ lead, districtName, featured = false }: LeadCardProps) {
  const { formatStatus, language } = useLanguage();
  return (
    <View style={[styles.card, featured && styles.cardFeatured]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, featured && styles.textInverse]}>
          {lead.company_name}
        </Text>
        {lead.estimated_value ? (
          <Text style={[styles.value, featured && styles.textInverse]}>
            {lead.estimated_value.toLocaleString()} SAR
          </Text>
        ) : null}
      </View>

      {lead.contact_person ? (
        <View style={styles.contactRow}>
          <Ionicons
            name="person-outline"
            size={12}
            color={featured ? 'rgba(255, 255, 255, 0.7)' : colors.textSecondary}
            style={styles.inlineIcon}
          />
          <Text style={[styles.contact, featured && styles.textInverseMuted]}>
            {lead.contact_person}
          </Text>
        </View>
      ) : null}

      {lead.notes ? (
        <Text style={[styles.body, featured && styles.textInverseMuted]} numberOfLines={2}>
          {lead.notes}
        </Text>
      ) : null}

      <View style={styles.footerRow}>
        <View style={styles.districtRow}>
          <Ionicons
            name="location-outline"
            size={12}
            color={featured ? 'rgba(255, 255, 255, 0.7)' : colors.textMuted}
            style={styles.inlineIcon}
          />
          <Text style={[styles.districtText, featured && styles.textInverseMuted]}>
            {districtName || (language === 'ar' ? 'الرياض' : 'Riyadh')}
          </Text>
        </View>

        <View style={styles.rightFooter}>
          {lead.phone ? (
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.miniActionBtn}
                onPress={() => openPhoneCall(lead.phone!)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Ionicons name="call-outline" size={13} color={colors.ink} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.miniActionBtn, styles.miniActionWhatsApp]}
                onPress={() => openWhatsApp(lead.phone!)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-whatsapp" size={13} color="#2E7D32" />
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={[styles.statusBadge, featured && styles.statusBadgeFeatured]}>
            <Text style={[styles.statusText, featured && styles.statusTextFeatured]}>
              {formatStatus(lead.status)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  cardFeatured: {
    backgroundColor: colors.ink,
    borderColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...type.cardTitle,
    color: colors.ink,
    flex: 1,
    marginRight: 8,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  inlineIcon: {
    marginRight: 4,
  },
  contact: {
    ...type.caption,
    color: colors.textSecondary,
  },
  body: {
    ...type.body,
    color: colors.textSecondary,
    marginTop: 6,
  },
  districtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  districtText: {
    ...type.caption,
    color: colors.textMuted,
    flex: 1,
    marginRight: 8,
  },
  rightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  miniActionBtn: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniActionWhatsApp: {
    backgroundColor: '#E8F5E9',
    borderColor: '#A5D6A7',
  },
  miniActionIcon: {
    fontSize: 12,
  },
  statusBadge: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeFeatured: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'transparent',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.ink,
    textTransform: 'capitalize',
  },
  statusTextFeatured: {
    color: colors.white,
  },
  textInverse: {
    color: colors.white,
  },
  textInverseMuted: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
