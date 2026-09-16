import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Platform,
  Image,
  TouchableOpacity,
  StatusBar as RNStatusBar,
  I18nManager,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackHeaderProps,
} from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../lib/auth-context';
import { useLanguage } from '../lib/language-context';
import { colors } from '../theme';

import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { DirectoryScreen } from '../screens/DirectoryScreen';
import { QuickLogScreen } from '../screens/QuickLogScreen';
import { LeadDetailScreen } from '../screens/LeadDetailScreen';
import { CustomerDetailScreen } from '../screens/CustomerDetailScreen';
import { DailyReportScreen } from '../screens/DailyReportScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

import type { RootStackParamList, MainTabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function HeaderLogo() {
  return (
    <Image
      source={require('../../assets/logo.webp')}
      style={{ width: 160, height: 42 }}
      resizeMode="contain"
    />
  );
}

function LanguageToggleBtn() {
  const { language, toggleLanguage } = useLanguage();
  return (
    <TouchableOpacity
      onPress={toggleLanguage}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
        backgroundColor: colors.cream,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: 14,
      }}
      activeOpacity={0.7}
    >
      <Ionicons name="globe-outline" size={13} color={colors.ink} style={{ marginRight: 4 }} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink }}>
        {language === 'ar' ? 'English' : 'عربي'}
      </Text>
    </TouchableOpacity>
  );
}

function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const isAndroid = Platform.OS === 'android';
  const bottomInset = insets.bottom;
  const bottomPadding = bottomInset > 0 ? bottomInset : (isAndroid ? 10 : 8);
  const tabHeight = 58 + (bottomInset > 0 ? bottomInset : (isAndroid ? 10 : 8));

  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: any }) => ({
        headerShown: true,
        headerRight: () => <LanguageToggleBtn />,
        headerStyle: {
          backgroundColor: colors.white,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTitleStyle: {
          fontSize: 16,
          fontWeight: '700',
          color: colors.ink,
        },
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help-circle-outline';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Directory') {
            iconName = focused ? 'business' : 'business-outline';
          } else if (route.name === 'QuickLog') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('nav_home'),
          headerTitle: () => <HeaderLogo />,
        }}
      />
      <Tab.Screen
        name="Directory"
        component={DirectoryScreen}
        options={{
          title: t('nav_directory'),
          tabBarLabel: t('nav_directory'),
        }}
      />
      <Tab.Screen
        name="QuickLog"
        component={QuickLogScreen}
        options={{
          title: t('nav_quick_log'),
          tabBarLabel: t('nav_quick_log'),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t('nav_profile'),
          tabBarLabel: t('nav_profile'),
        }}
      />
    </Tab.Navigator>
  );
}

function CustomStackHeader({ navigation, route, options, back }: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();
  const isAndroid = Platform.OS === 'android';

  // Dynamic top calculation:
  // insets.top handles iPhone notch (47px) / Dynamic Island (59px) / Android window insets.
  // RNStatusBar.currentHeight acts as an immediate fallback on Android to prevent edge-to-edge overlap.
  const rawTop = Math.max(
    insets.top,
    isAndroid ? (RNStatusBar.currentHeight || 24) : 20
  );
  // Add 10px extra spacing so the back button and title sit comfortably lower than the phone's hardware bar
  const headerPaddingTop = rawTop + 10;

  const title =
    typeof options.title === 'string'
      ? options.title
      : typeof options.headerTitle === 'string'
      ? options.headerTitle
      : route.name;

  return (
    <View
      style={{
        backgroundColor: colors.white,
        paddingTop: headerPaddingTop,
        paddingBottom: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {back ? (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{
            marginRight: 12,
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: colors.cream,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isRTL ? 'arrow-forward' : 'arrow-back'}
            size={20}
            color={colors.ink}
          />
        </TouchableOpacity>
      ) : null}

      <Text
        style={{
          fontSize: 16,
          fontWeight: '700',
          color: colors.ink,
          flex: 1,
        }}
        numberOfLines={1}
      >
        {title}
      </Text>

      {options.headerRight ? (
        <View style={{ marginLeft: 8 }}>
          {typeof options.headerRight === 'function'
            ? (options.headerRight as any)({ canGoBack: !!back, tintColor: colors.ink })
            : options.headerRight}
        </View>
      ) : null}
    </View>
  );
}

export function AppNavigator() {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.white,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.ink} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          header: (props) => <CustomStackHeader {...props} />,
          animation: 'slide_from_right',
        }}
      >
        {!user ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="LeadDetail"
              component={LeadDetailScreen}
              options={{ title: t('lead_details') }}
            />
            <Stack.Screen
              name="CustomerDetail"
              component={CustomerDetailScreen}
              options={{ title: t('customer_details') }}
            />
            <Stack.Screen
              name="DailyReport"
              component={DailyReportScreen}
              options={{ title: t('report_title') }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
