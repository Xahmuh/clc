'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Building2, MapPin, Phone, Mail, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CreateCustomerModal } from '@/components/CreateCustomerModal';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import type { Customer, District, Profile } from '@clc/shared';

export default function CustomersPage() {
  const { isManager } = useAuth();
  const { t, formatDistrict, formatRole } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [districts, setDistricts] = useState<Record<number, District>>({});
  const [employees, setEmployees] = useState<Record<string, Profile>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [executiveFilter, setExecutiveFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: custList, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && custList) {
        setCustomers(custList as Customer[]);
      }

      const { data: distData } = await supabase.from('districts').select('*');
      if (distData) {
        const dMap: Record<number, District> = {};
        ((distData as unknown as District[]) || []).forEach((d) => {
          dMap[d.id] = d;
        });
        setDistricts(dMap);
      }

      const { data: profData } = await supabase.from('profiles').select('*');
      if (profData) {
        const pMap: Record<string, Profile> = {};
        ((profData as unknown as Profile[]) || []).forEach((p) => {
          pMap[p.id] = p;
        });
        setEmployees(pMap);
      }
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCustomers = customers.filter((cust) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      cust.company_name.toLowerCase().includes(query) ||
      (cust.contact_person && cust.contact_person.toLowerCase().includes(query)) ||
      (cust.email && cust.email.toLowerCase().includes(query)) ||
      (cust.phone && cust.phone.includes(query));

    const matchesExecutive =
      executiveFilter === 'all' || cust.assigned_to === executiveFilter;

    return matchesSearch && matchesExecutive;
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      {/* Top Header */}
      <header className="px-4 sm:px-8 py-4 sm:py-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-ink-900 tracking-tight">
              {t('nav_customers')}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('customers_subtitle')}
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-ink-900 text-white rounded-button text-xs font-semibold hover:bg-black transition-colors self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>{t('dir_add_customer')}</span>
          </button>
        </div>

        {/* Search Input & Executive Filter */}
        <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('dir_search_customers')}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-gray-200 rounded-button text-ink-900 placeholder:text-gray-400 focus:outline-none focus:border-ink-900"
            />
          </div>

          {isManager && (
            <CustomSelect
              value={executiveFilter}
              onChange={(val) => setExecutiveFilter(val)}
              size="sm"
              fullWidth={false}
              className="w-full sm:w-auto min-w-[180px]"
              options={[
                { value: 'all', label: t('filter_all_executives') },
                ...Object.values(employees).map((emp) => ({
                  value: emp.id,
                  label: emp.full_name,
                  sublabel: formatRole(emp.role),
                })),
              ]}
            />
          )}
        </div>
      </header>

      {/* Main Customers Table */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-xs text-gray-400">
            {t('loading_customers')}
          </div>
        ) : (
          <div className="bg-white rounded-panel border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50 text-gray-500 font-semibold uppercase tracking-wider text-start">
                    <th className="py-3 px-4">{t('th_company')}</th>
                    <th className="py-3 px-4">{t('th_contact')}</th>
                    <th className="py-3 px-4">{t('th_contact_info')}</th>
                    <th className="py-3 px-4">{t('th_district')}</th>
                    <th className="py-3 px-4">{t('th_account_manager')}</th>
                    <th className="py-3 px-4">{t('th_customer_since')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((cust) => {
                  const district = cust.district_id ? districts[cust.district_id] : null;
                  const employee = cust.assigned_to ? employees[cust.assigned_to] : null;

                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-gray-50/60 transition-colors group cursor-pointer"
                    >
                      <td className="py-3 px-4 font-semibold text-ink-900">
                        <Link
                          href={`/customers/${cust.id}`}
                          className="hover:underline flex items-center gap-1.5"
                        >
                          <Building2 className="h-3.5 w-3.5 text-gray-400" />
                          <span>{cust.company_name}</span>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {cust.contact_person || '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        <div className="flex flex-col gap-0.5">
                          {cust.phone && <span>{cust.phone}</span>}
                          {cust.email && <span className="text-gray-400">{cust.email}</span>}
                          {!cust.phone && !cust.email && '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {district ? formatDistrict(district) : '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {employee ? employee.full_name : t('unassigned')}
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {cust.customer_since || new Date(cust.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-xs text-gray-400"
                    >
                      {t('dir_no_customers_found')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </main>

      <CreateCustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={loadData}
      />
    </div>
  );
}
