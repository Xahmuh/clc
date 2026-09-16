import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Directory: { initialTab?: 'leads' | 'customers' } | undefined;
  QuickLog: { entityType?: 'lead' | 'customer'; entityId?: string } | undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  LeadDetail: { leadId: string };
  CustomerDetail: { customerId: string };
  DailyReport: { date?: string } | undefined;
};
