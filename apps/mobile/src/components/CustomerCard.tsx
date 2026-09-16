import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../lib/language-context';
import { colors, radius, type } from '../theme';
import { openWhatsApp, openPhoneCall } from '../lib/communication';
import type { Customer } from '../types/database';

interface CustomerCardProps {
  customer: Customer;
  districtName?: string;
}

export function CustomerCard({ customer, districtName }: CustomerCardProps) {
  const { t, language } = useLanguage();
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{customer.company_name}</Text>
        <Text style={styles.badge}>{t('dir_customers_tab')}</Text>
      </View>

      {customer.contact_person ? (
        <View style={styles.contactRow}>
          <Ionicons
            name="person-outline"
            size={12}
            color={colors.textSecondary}
            style={styles.inlineIcon}
          />
          <Text style={styles.contact}>{customer.contact_person}</Text>
        </View>
      ) : null}

      <View style={styles.footerRow}>
        <View style={styles.districtRow}>
          <Ionicons
            name="location-outline"
            size={12}
            color={colors.textMuted}
            style={styles.inlineIcon}
          />
          <Text style={styles.districtText}>
            {districtName || (language === 'ar' ? 'الرياض' : 'Riyadh')}
          </Text>
        </View>

        <View style={styles.rightFooter}>
          {customer.phone ? (
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.miniActionBtn}
                onPress={() => openPhoneCall(customer.phone!)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Ionicons name="call-outline" size={13} color={colors.ink} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.miniActionBtn, styles.miniActionWhatsApp]}
                onPress={() => openWhatsApp(customer.phone!)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-whatsapp" size={13} color="#2E7D32" />
              </TouchableOpacity>
            </View>
          ) : null}

          <Text style={styles.sinceText}>
            {t('th_customer_since')}: {new Date(customer.customer_since).toLocaleDateString()}
          </Text>
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
  badge: {
    ...type.caption,
    fontSize: 11,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.button,
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
    ...type.body,
    color: colors.textSecondary,
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
  sinceText: {
    ...type.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
});
