import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { supabase } from '../lib/supaBaseClient';

export type QuickBooksLoginResponse = { redirect_url: string; state: string };

export type QuickBooksArAgingRow = {
  customer: string;
  total_balance: number;
  buckets: Record<string, number>;
  credits: number;
  recommended_bucket: string;
  recommended_action: string;
  oldest_invoice?: {
    doc_num?: string;
    txn_type?: string;
    due_date?: string;
    days_past_due?: number;
    amount?: number;
  } | null;
};

export type QuickBooksArAgingResponse = {
  generated_at: string;
  rows: QuickBooksArAgingRow[];
};

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL!,
  credentials: 'include',
  prepareHeaders: async (headers) => {
    const { data } = await supabase.auth.getSession();
    console.log('Session data in prepareHeaders', data);
    const token = data.session?.access_token;
    if (token) headers.set('authorization', `Bearer ${token}`);
    headers.set('content-type', 'application/json');
    return headers;
  }
});

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Invoices'],
  endpoints: (build) => ({
    getInvoices: build.query<unknown[], void>({
      query: () => '/api/v1/invoices/',
      providesTags: ['Invoices']
    }),
    syncQuickBooks: build.mutation<{ ok: boolean; imported?: number }, void>({
      query: () => ({ url: '/api/v1/quickbooks/sync', method: 'POST' }),
      invalidatesTags: ['Invoices']
    }),
    getQuickBooksArAgingReport: build.query<QuickBooksArAgingResponse, string | void>({
      query: (queryString) =>
        queryString
          ? `/qbo/reports/ar-aging-detail/simplified?${queryString}`
          : '/qbo/reports/ar-aging-detail/simplified'
    })
  })
});

export const {
  useGetInvoicesQuery,
  useSyncQuickBooksMutation,
  useGetQuickBooksArAgingReportQuery,
  useLazyGetQuickBooksArAgingReportQuery
} = api;
