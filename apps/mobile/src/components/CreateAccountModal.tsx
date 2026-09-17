import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { useLanguage } from '../lib/language-context';
import { Ionicons } from '@expo/vector-icons';
import { captureLocationAndSuggestDistrict } from '../lib/location';
import { colors, radius, type } from '../theme';
import type { Lead, Customer, District } from '../types/database';

interface CreateAccountModalProps {
  visible: boolean;
  initialType?: 'lead' | 'customer';
  onClose: () => void;
  onSuccess: () => void;
}

const COMMON_PROJECT_TYPES = ['Contracting', 'Commercial', 'Residential', 'Fit-out', 'Infrastructure'];

export function CreateAccountModal({
  visible,
  initialType = 'lead',
  onClose,
  onSuccess,
}: CreateAccountModalProps) {
  const { user } = useAuth();
  const { t, formatDistrict, language } = useLanguage();

  const [accountType, setAccountType] = useState<'lead' | 'customer'>(initialType);
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [projectType, setProjectType] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [notes, setNotes] = useState('');
  const [recordDate, setRecordDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // District Selection
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [isDistrictPickerOpen, setIsDistrictPickerOpen] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // Custom District Mode (for unregistered/new districts)
  const [isCustomDistrictMode, setIsCustomDistrictMode] = useState(false);
  const [customDistrictNameEn, setCustomDistrictNameEn] = useState('');
  const [customDistrictNameAr, setCustomDistrictNameAr] = useState('');
  const [customCity, setCustomCity] = useState('Riyadh');
  const [customLat, setCustomLat] = useState<number | null>(null);
  const [customLng, setCustomLng] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial type when opened
  useEffect(() => {
    if (visible) {
      setAccountType(initialType);
      setErrorMessage(null);
    }
  }, [visible, initialType]);

  // Load districts list once
  useEffect(() => {
    const loadDistricts = async () => {
      const { data } = await supabase
        .from('districts')
        .select('*')
        .order('name_en');
      if (data) setDistricts(data as District[]);
    };
    loadDistricts();
  }, []);

  const resetForm = () => {
    setCompanyName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setProjectType('');
    setEstimatedValue('');
    setNotes('');
    setRecordDate(new Date().toISOString().split('T')[0]);
    setSelectedDistrict(null);
    setDistrictSearch('');
    setIsDistrictPickerOpen(false);
    setIsCustomDistrictMode(false);
    setCustomDistrictNameEn('');
    setCustomDistrictNameAr('');
    setCustomCity('Riyadh');
    setCustomLat(null);
    setCustomLng(null);
    setErrorMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // GPS Auto-detect district for standard selector
  const handleAutoDetectDistrict = async () => {
    setIsDetectingGps(true);
    setErrorMessage(null);
    try {
      const res = await captureLocationAndSuggestDistrict();
      if (res.district) {
        setSelectedDistrict(res.district);
        Alert.alert(
          t('gps_detected'),
          formatDistrict(res.district)
        );
      } else if (res.latitude && res.longitude) {
        // If nearest_district didn't find one, suggest entering as custom
        setCustomLat(res.latitude);
        setCustomLng(res.longitude);
        setIsCustomDistrictMode(true);
        Alert.alert('GPS Location Captured', 'Coordinates saved. You can type the district name now.');
      } else if (res.error) {
        Alert.alert('GPS Notice', res.error);
      }
    } catch (err: any) {
      Alert.alert('GPS Error', err.message || 'Could not detect location');
    } finally {
      setIsDetectingGps(false);
    }
  };

  // Capture GPS for custom district
  const handleCaptureCustomGps = async () => {
    setIsDetectingGps(true);
    try {
      const res = await captureLocationAndSuggestDistrict();
      if (res.latitude && res.longitude) {
        setCustomLat(res.latitude);
        setCustomLng(res.longitude);
        Alert.alert(
          'Location Pinned',
          `GPS coordinates recorded: ${res.latitude.toFixed(4)}, ${res.longitude.toFixed(4)}`
        );
      } else {
        Alert.alert('GPS Notice', res.error || 'Failed to get location');
      }
    } catch (err: any) {
      Alert.alert('GPS Error', err.message || 'Could not fetch location');
    } finally {
      setIsDetectingGps(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      setErrorMessage('You must be signed in to create accounts.');
      return;
    }

    if (!companyName.trim()) {
      setErrorMessage('Company name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Resolve district if custom district was entered
      let resolvedDistrictId = selectedDistrict?.id || null;

      if (isCustomDistrictMode && (customDistrictNameAr.trim() || customDistrictNameEn.trim())) {
        const nameEn = customDistrictNameEn.trim() || customDistrictNameAr.trim();
        const nameAr = customDistrictNameAr.trim() || customDistrictNameEn.trim();

        const { data: createdDist, error: distErr } = await (supabase.rpc as any)('create_custom_district', {
          p_name_en: nameEn,
          p_name_ar: nameAr,
          p_city: customCity.trim() || 'Riyadh',
          p_lat: customLat || 24.7136,
          p_lng: customLng || 46.6753,
        });

        if (distErr) {
          console.error('Error creating custom district:', distErr);
          throw new Error('Failed to save new district: ' + distErr.message);
        }

        if (createdDist) {
          resolvedDistrictId = (createdDist as District).id;
          // Prepend to local districts list so it's instantly available
          setDistricts((prev) => [createdDist as District, ...prev.filter((d) => d.id !== (createdDist as District).id)]);
        }
      }

      // 2. Insert Lead or Customer
      if (accountType === 'lead') {
        const customCreatedAt = recordDate
          ? new Date(recordDate + 'T12:00:00Z').toISOString()
          : new Date().toISOString();

        const payload = {
          company_name: companyName.trim(),
          contact_person: contactPerson.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          source: 'mobile_field',
          status: 'new' as const,
          estimated_value: estimatedValue.trim() ? parseFloat(estimatedValue) : null,
          project_type: projectType.trim() || null,
          district_id: resolvedDistrictId,
          assigned_to: user.id,
          notes: notes.trim() || null,
          created_at: customCreatedAt,
        };

        const { error: insertError } = await supabase.from('leads').insert(payload as any);
        if (insertError) throw insertError;

        Alert.alert('Lead Created', `Successfully added ${companyName.trim()} to your leads.`);
      } else {
        const dateVal = recordDate || new Date().toISOString().split('T')[0];
        const customCreatedAt = new Date(dateVal + 'T12:00:00Z').toISOString();

        const payload = {
          company_name: companyName.trim(),
          contact_person: contactPerson.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          district_id: resolvedDistrictId,
          assigned_to: user.id,
          customer_since: dateVal,
          created_at: customCreatedAt,
        };

        const { error: insertError } = await supabase.from('customers').insert(payload as any);
        if (insertError) throw insertError;

        Alert.alert('Customer Created', `Successfully added ${companyName.trim()} to your customers.`);
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating account:', err);
      setErrorMessage(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDistricts = districts.filter((d) => {
    if (!districtSearch.trim()) return true;
    const q = districtSearch.toLowerCase();
    return d.name_en.toLowerCase().includes(q) || d.name_ar.includes(q);
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {accountType === 'lead' ? t('dir_add_lead') : t('dir_add_customer')}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.ink} />
            </TouchableOpacity>
          </View>

          {/* Type Toggle */}
          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[
                styles.typeBtn,
                accountType === 'lead' && styles.typeBtnActive,
              ]}
              onPress={() => setAccountType('lead')}
            >
              <Text
                style={[
                  styles.typeBtnText,
                  accountType === 'lead' && styles.typeBtnTextActive,
                ]}
              >
                {t('dir_leads_tab')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeBtn,
                accountType === 'customer' && styles.typeBtnActive,
              ]}
              onPress={() => setAccountType('customer')}
            >
              <Text
                style={[
                  styles.typeBtnText,
                  accountType === 'customer' && styles.typeBtnTextActive,
                ]}
              >
                {t('dir_customers_tab')}
              </Text>
            </TouchableOpacity>
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <ScrollView
            style={styles.formScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Company Name */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('field_company_name')} *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Al-Fahad Contracting"
                placeholderTextColor={colors.textMuted}
                value={companyName}
                onChangeText={setCompanyName}
              />
            </View>

            {/* Contact Person */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('field_contact_person')}</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Tariq Al-Otaibi"
                placeholderTextColor={colors.textMuted}
                value={contactPerson}
                onChangeText={setContactPerson}
              />
            </View>

            {/* Phone & Email Row */}
            <View style={styles.fieldRow}>
              <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.fieldLabel}>{t('field_phone')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="050 123 4567"
                  placeholderTextColor={colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>{t('field_email')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="info@company.sa"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Riyadh District Selection (Standard Picker or Custom District) */}
            <View style={styles.field}>
              <View style={styles.labelWithAction}>
                <Text style={styles.fieldLabel}>{t('field_district')}</Text>
                {!isCustomDistrictMode && (
                  <TouchableOpacity
                    onPress={handleAutoDetectDistrict}
                    disabled={isDetectingGps}
                    style={styles.gpsBtn}
                  >
                    {isDetectingGps ? (
                      <ActivityIndicator size="small" color={colors.ink} />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="location-outline" size={13} color={colors.ink} style={{ marginRight: 4 }} />
                        <Text style={styles.gpsBtnText}>{t('use_gps_location')}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Mode Switch Pills */}
              <View style={styles.districtModeRow}>
                <TouchableOpacity
                  style={[
                    styles.districtModePill,
                    !isCustomDistrictMode && styles.districtModePillActive,
                  ]}
                  onPress={() => setIsCustomDistrictMode(false)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons
                      name="list-outline"
                      size={13}
                      color={!isCustomDistrictMode ? colors.ink : colors.textMuted}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.districtModeText,
                        !isCustomDistrictMode && styles.districtModeTextActive,
                      ]}
                    >
                      {t('select_district')}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.districtModePill,
                    isCustomDistrictMode && styles.districtModePillActive,
                  ]}
                  onPress={() => {
                    setIsCustomDistrictMode(true);
                    setIsDistrictPickerOpen(false);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons
                      name="add-outline"
                      size={14}
                      color={isCustomDistrictMode ? colors.ink : colors.textMuted}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.districtModeText,
                        isCustomDistrictMode && styles.districtModeTextActive,
                      ]}
                    >
                      {t('custom_district_title')}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {isCustomDistrictMode ? (
                /* Custom District Entry Form */
                <View style={styles.customDistrictBox}>
                  <Text style={styles.customDistrictHint}>
                    {language === 'ar'
                      ? 'أدخل اسم الحي الجديد غير المسجل في القائمة. سيتم حفظه بشكل دائم.'
                      : 'Enter a new district name not found in the list. It will be saved permanently.'}
                  </Text>
                  <View style={styles.field}>
                    <Text style={styles.customFieldLabel}>{t('custom_district_name_ar')} *</Text>
                    <TextInput
                      style={styles.customInput}
                      placeholder={language === 'ar' ? 'مثال: حي الياسمين الشمالي، قرطبة الشرقية...' : 'e.g., Al-Yasmin North, Qurtubah East...'}
                      placeholderTextColor={colors.textMuted}
                      value={customDistrictNameAr}
                      onChangeText={setCustomDistrictNameAr}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.customFieldLabel}>{t('custom_district_name_en')}</Text>
                    <TextInput
                      style={styles.customInput}
                      placeholder="e.g. Al-Yasmin North"
                      placeholderTextColor={colors.textMuted}
                      value={customDistrictNameEn}
                      onChangeText={setCustomDistrictNameEn}
                    />
                  </View>
                  <View style={styles.fieldRow}>
                    <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.customFieldLabel}>{t('custom_district_city')}</Text>
                      <TextInput
                        style={styles.customInput}
                        placeholder={language === 'ar' ? 'الرياض' : 'Riyadh'}
                        placeholderTextColor={colors.textMuted}
                        value={customCity}
                        onChangeText={setCustomCity}
                      />
                    </View>
                    <View style={[styles.field, { flex: 1, justifyContent: 'flex-end' }]}>
                      <TouchableOpacity
                        style={styles.customGpsBtn}
                        onPress={handleCaptureCustomGps}
                        disabled={isDetectingGps}
                      >
                        {isDetectingGps ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons
                              name={customLat ? "checkmark-circle-outline" : "location-outline"}
                              size={13}
                              color={colors.white}
                              style={{ marginRight: 4 }}
                            />
                            <Text style={styles.customGpsBtnText}>
                              {customLat
                                ? (language === 'ar' ? 'تم تثبيت الموقع' : 'GPS Pinned')
                                : (language === 'ar' ? 'تثبيت الموقع' : 'Pin Location')}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                  {customLat && customLng ? (
                    <Text style={styles.coordinatesBadge}>
                      {language === 'ar' ? 'الإحداثيات:' : 'Pinned GPS:'} {customLat.toFixed(4)}, {customLng.toFixed(4)}
                    </Text>
                  ) : null}
                </View>
              ) : (
                /* Standard Dropdown Picker */
                <>
                  <TouchableOpacity
                    style={styles.districtSelector}
                    onPress={() => setIsDistrictPickerOpen(!isDistrictPickerOpen)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.districtSelectorText,
                        !selectedDistrict && { color: colors.textMuted },
                      ]}
                    >
                      {selectedDistrict
                        ? formatDistrict(selectedDistrict)
                        : t('select_district')}
                    </Text>
                    <Ionicons
                      name={isDistrictPickerOpen ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {/* District Picker Dropdown List */}
                  {isDistrictPickerOpen && (
                    <View style={styles.districtPickerBox}>
                      <TextInput
                        style={styles.districtSearchInput}
                        placeholder={t('search_district_placeholder')}
                        placeholderTextColor={colors.textMuted}
                        value={districtSearch}
                        onChangeText={setDistrictSearch}
                        autoFocus={false}
                      />
                      <ScrollView
                        style={styles.districtListScroll}
                        nestedScrollEnabled={true}
                      >
                        {filteredDistricts.length === 0 ? (
                          <View style={styles.noDistrictMatch}>
                            <Text style={styles.noDistrictText}>{t('filter_by_district')}</Text>
                            <TouchableOpacity
                              style={styles.switchCustomBtn}
                              onPress={() => {
                                setIsCustomDistrictMode(true);
                                setIsDistrictPickerOpen(false);
                                setCustomDistrictNameAr(districtSearch);
                                setCustomDistrictNameEn(districtSearch);
                              }}
                            >
                              <Text style={styles.switchCustomBtnText}>
                                ＋ {t('custom_district_title')} ({districtSearch})
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          filteredDistricts.slice(0, 50).map((d) => {
                            const isSelected = selectedDistrict?.id === d.id;
                            return (
                              <TouchableOpacity
                                key={d.id}
                                style={[
                                  styles.districtItem,
                                  isSelected && styles.districtItemActive,
                                ]}
                                onPress={() => {
                                  setSelectedDistrict(d);
                                  setIsDistrictPickerOpen(false);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.districtItemText,
                                    isSelected && styles.districtItemTextActive,
                                  ]}
                                >
                                  {formatDistrict(d)}
                                </Text>
                              </TouchableOpacity>
                            );
                          })
                        )}

                        {/* Always visible quick shortcut to custom mode at bottom */}
                        <TouchableOpacity
                          style={styles.quickAddCustomDistItem}
                          onPress={() => {
                            setIsCustomDistrictMode(true);
                            setIsDistrictPickerOpen(false);
                            if (districtSearch.trim()) {
                              setCustomDistrictNameAr(districtSearch);
                              setCustomDistrictNameEn(districtSearch);
                            }
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="add-circle-outline" size={15} color={colors.ink} style={{ marginRight: 6 }} />
                            <Text style={styles.quickAddCustomDistText}>
                              {t('custom_district_prompt')}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </ScrollView>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Lead Specific Fields */}
            {accountType === 'lead' ? (
              <>
                {/* Project Type */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('field_project_type')}</Text>
                  <View style={styles.chipsRow}>
                    {COMMON_PROJECT_TYPES.map((pt) => (
                      <TouchableOpacity
                        key={pt}
                        style={[
                          styles.chip,
                          projectType === pt && styles.chipActive,
                        ]}
                        onPress={() => setProjectType(projectType === pt ? '' : pt)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            projectType === pt && styles.chipTextActive,
                          ]}
                        >
                          {pt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={[styles.input, { marginTop: 6 }]}
                    placeholder="Or type custom project type..."
                    placeholderTextColor={colors.textMuted}
                    value={projectType}
                    onChangeText={setProjectType}
                  />
                </View>

                {/* Estimated Value */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('field_estimated_value')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 500000"
                    placeholderTextColor={colors.textMuted}
                    value={estimatedValue}
                    onChangeText={setEstimatedValue}
                    keyboardType="numeric"
                  />
                </View>

                {/* Notes */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('field_notes')}</Text>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Initial conversation notes, requirements, or next steps..."
                    placeholderTextColor={colors.textMuted}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </>
            ) : (
              /* Customer Specific Fields */
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t('field_address')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Building, street, landmark in Riyadh..."
                  placeholderTextColor={colors.textMuted}
                  value={address}
                  onChangeText={setAddress}
                />
              </View>
            )}

            {/* Record / Registration Date (Supports retroactive recording باثر رجعي) */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                {accountType === 'lead' ? t('field_registration_date') : t('field_customer_since')}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                value={recordDate}
                onChangeText={setRecordDate}
              />
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                {t('backdated_date_hint')} (YYYY-MM-DD)
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleClose}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {isSubmitting ? t('saving') : t('save')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.panel,
    borderTopRightRadius: radius.panel,
    maxHeight: '90%',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    ...type.cardTitle,
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.ink,
    fontWeight: '600',
  },
  typeToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
  },
  typeBtnActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  typeBtnText: {
    ...type.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typeBtnTextActive: {
    color: colors.white,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.button,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    ...type.caption,
    color: '#DC2626',
  },
  formScroll: {
    flexShrink: 1,
  },
  field: {
    marginBottom: 14,
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  fieldLabel: {
    ...type.caption,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 6,
  },
  labelWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  gpsBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.button,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gpsBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.ink,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.white,
    textAlignVertical: 'top',
    minHeight: 75,
  },
  districtSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  districtSelectorText: {
    fontSize: 14,
    color: colors.ink,
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 8,
  },
  districtPickerBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    backgroundColor: colors.surfaceSubtle,
    padding: 8,
    marginTop: 6,
  },
  districtSearchInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.ink,
    marginBottom: 6,
  },
  districtListScroll: {
    maxHeight: 160,
  },
  districtItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  districtItemActive: {
    backgroundColor: colors.ink,
    borderRadius: 6,
  },
  districtItemText: {
    fontSize: 13,
    color: colors.ink,
  },
  districtItemTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  districtModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  districtModePill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
  },
  districtModePillActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  districtModeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  districtModeTextActive: {
    color: colors.white,
  },
  customDistrictBox: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 12,
  },
  customDistrictHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 10,
    lineHeight: 16,
  },
  customFieldLabel: {
    ...type.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    fontSize: 12,
  },
  customInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.ink,
  },
  customGpsBtn: {
    backgroundColor: colors.ink,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customGpsBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  coordinatesBadge: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  noDistrictMatch: {
    padding: 12,
    alignItems: 'center',
  },
  noDistrictText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
  },
  switchCustomBtn: {
    backgroundColor: colors.ink,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.button,
  },
  switchCustomBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  quickAddCustomDistItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    marginTop: 4,
  },
  quickAddCustomDistText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipText: {
    fontSize: 12,
    color: colors.ink,
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    marginBottom: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  cancelBtnText: {
    ...type.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    fontSize: 14,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: radius.button,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    ...type.caption,
    fontWeight: '700',
    color: colors.white,
    fontSize: 14,
  },
});
