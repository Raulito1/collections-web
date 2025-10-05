import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import {
  themeQuartz,
  type CellValueChangedEvent,
  type ColDef,
  type GridApi,
  type GridReadyEvent
} from 'ag-grid-community';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import logoUrl from '@/assets/seso-logo.svg';
import {
  useLazyGetQuickBooksArAgingReportQuery,
  useUpdateCustomerStatusMutation
} from '../svc/api';
import type {
  QuickBooksArAgingResponse,
  QuickBooksLoginResponse,
  UpdateCustomerStatusRequest
} from '../svc/api';
import { supabase } from '../lib/supaBaseClient';
import { useAuth } from '../auth/AuthProvider';

type GridRow = Record<string, string | number | boolean | null | undefined>;
type BucketMeta = { label: string; field: string; slug: string };

const bucketFieldName = (label: string) =>
  `bucket_${label.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`;

const bucketRouteSlug = (label: string) =>
  label
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-') || 'bucket';

export default function Dashboard() {
  const [triggerArReport, { isFetching: fetchingArReport }] = useLazyGetQuickBooksArAgingReportQuery();
  const { session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const gridApi = useRef<GridApi<GridRow> | null>(null);
  const [quickFilter, setQuickFilter] = useState('');
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [startingQuickBooksAuth, setStartingQuickBooksAuth] = useState(false);
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [quickBooksTable, setQuickBooksTable] = useState<{
    columns: ColDef<GridRow>[];
    rows: GridRow[];
    generatedAt: string;
    buckets: BucketMeta[];
  } | null>(null);

  const defaultColDef = useMemo<ColDef<GridRow>>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  const currency = (v: unknown): string => {
    if (typeof v === 'number') {
      return v.toLocaleString(undefined, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2
      });
    }
    if (v == null) return '';
    return String(v);
  };

  const actionTakenOptions = ['Not Started', 'Contacted', 'Followed Up', 'Resolved'];
  const statusFields = useMemo(
    () => new Set(['action_taken', 'slack_updated', 'follow_up', 'escalation']),
    []
  );
  const [updateCustomerStatus] = useUpdateCustomerStatusMutation();

  const createQuickBooksTable = (response: QuickBooksArAgingResponse) => {
    const bucketKeys = Object.keys(response.rows[0]?.buckets ?? {});
    const bucketMeta: BucketMeta[] = bucketKeys.map((key) => ({
      label: key,
      field: bucketFieldName(key),
      slug: bucketRouteSlug(key)
    }));

    const bucketColumns = bucketMeta.map<ColDef<GridRow>>(({ label, field }) => ({
      field,
      headerName: label,
      valueFormatter: (p) => currency(p.value),
      type: 'rightAligned',
      minWidth: 140
    }));

    const columns: ColDef<GridRow>[] = [
      { field: 'customer', headerName: 'Customer', minWidth: 220 },
      {
        field: 'total_balance',
        headerName: 'Total Balance',
        type: 'rightAligned',
        valueFormatter: (p) => currency(p.value),
        minWidth: 160
      },
      ...bucketColumns,
      {
        field: 'credits',
        headerName: 'Credits',
        type: 'rightAligned',
        valueFormatter: (p) => currency(p.value),
        minWidth: 140
      },
      { field: 'recommended_action', headerName: 'Recommended Action', minWidth: 220 },
      {
        field: 'action_taken',
        headerName: 'Action Taken',
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: actionTakenOptions },
        minWidth: 160
      },
      {
        field: 'slack_updated',
        headerName: 'Slack Updated',
        editable: true,
        cellDataType: 'boolean',
        cellRenderer: 'agCheckboxCellRenderer',
        cellEditor: 'agCheckboxCellEditor',
        minWidth: 140
      },
      {
        field: 'follow_up',
        headerName: 'Follow Up',
        editable: true,
        cellDataType: 'boolean',
        cellRenderer: 'agCheckboxCellRenderer',
        cellEditor: 'agCheckboxCellEditor',
        minWidth: 130
      },
      {
        field: 'escalation',
        headerName: 'Escalation',
        editable: true,
        cellDataType: 'boolean',
        cellRenderer: 'agCheckboxCellRenderer',
        cellEditor: 'agCheckboxCellEditor',
        minWidth: 130
      },
      {
        field: 'oldest_invoice_days_past_due',
        headerName: 'Days Past Due',
        minWidth: 150
      },
      {
        field: 'oldest_invoice_amount',
        headerName: 'Oldest Amount',
        type: 'rightAligned',
        valueFormatter: (p) => currency(p.value),
        minWidth: 160
      }
    ];

    const rows = response.rows.map<GridRow>((row) => {
      const status = row.status ?? undefined;
      const actionTaken = status?.action_taken ?? row.action_taken ?? 'Not Started';
      const slackUpdatedValue = status?.slack_updated ?? row.slack_updated ?? false;
      const followUpValue = status?.follow_up ?? row.follow_up ?? false;
      const escalationValue = status?.escalation ?? row.escalation ?? false;

      const flatRow: GridRow = {
        customer: row.customer,
        total_balance: row.total_balance,
        credits: row.credits,
        recommended_action: row.recommended_action,
        oldest_invoice_days_past_due: row.oldest_invoice?.days_past_due ?? null,
        oldest_invoice_amount: row.oldest_invoice?.amount ?? null,
        action_taken: actionTaken,
        slack_updated: Boolean(slackUpdatedValue),
        follow_up: Boolean(followUpValue),
        escalation: Boolean(escalationValue),
        customer_id: row.customer_id ?? null,
        external_ref: row.external_ref ?? null
      };

      bucketMeta.forEach(({ label, field }) => {
        flatRow[field] = row.buckets?.[label] ?? null;
      });

      return flatRow;
    });

    return {
      columns,
      rows,
      generatedAt: response.generated_at,
      buckets: bucketMeta
    };
  };

  const { bucketSlug: bucketSlugParam } = useParams<{ bucketSlug?: string }>();

  const bucketTabs = quickBooksTable?.buckets ?? [];

  const activeBucket = useMemo(() => {
    if (!bucketSlugParam) return null;
    return bucketTabs.find((bucket) => bucket.slug === bucketSlugParam) ?? null;
  }, [bucketSlugParam, bucketTabs]);

  const displayedColumns = useMemo(() => {
    if (!quickBooksTable) return [];
    const bucketFieldSet = new Set(bucketTabs.map((bucket) => bucket.field));

    return quickBooksTable.columns.filter((column) => {
      const field = typeof column.field === 'string' ? column.field : undefined;

      if (!field || !bucketFieldSet.has(field)) {
        return true;
      }

      if (!activeBucket) {
        return true;
      }

      return field === activeBucket.field;
    });
  }, [quickBooksTable, bucketTabs, activeBucket]);

  const displayedRows = useMemo(() => {
    if (!quickBooksTable) return [];
    if (!activeBucket) return quickBooksTable.rows;
    return quickBooksTable.rows.filter((row) => {
      const value = row[activeBucket.field];
      if (value == null) return false;
      const numeric = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(numeric) && numeric > 0;
    });
  }, [quickBooksTable, activeBucket]);

  const quickBooksGeneratedAtLabel = useMemo(() => {
    if (!quickBooksTable?.generatedAt) return null;
    const parsed = new Date(quickBooksTable.generatedAt);
    if (Number.isNaN(parsed.getTime())) return quickBooksTable.generatedAt;
    return parsed.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }, [quickBooksTable]);

  const onGridReady = (event: GridReadyEvent<GridRow>) => {
    gridApi.current = event.api;
    event.api.setGridOption('quickFilterText', quickFilter);
  };

  const handleCellValueChanged = useCallback(
    async (event: CellValueChangedEvent<GridRow>) => {
      const field = event.colDef.field;
      if (!field || !statusFields.has(field)) {
        return;
      }

      const newValue = event.newValue;
      const oldValue = event.oldValue;

      if (newValue === oldValue) {
        return;
      }

      const customerId = (event.data?.customer_id as string | undefined) ?? undefined;
      const externalRef = (event.data?.external_ref as string | undefined) ?? undefined;

      if (!customerId && !externalRef) {
        console.warn('Missing identifier for customer status update', event.data);
        setStatusError('Unable to update customer status: missing identifier.');
        event.node.setDataValue(field, oldValue);
        return;
      }

      const payload: UpdateCustomerStatusRequest = {
        customer_id: customerId,
        external_ref: externalRef
      };

      if (field === 'action_taken') {
        payload.action_taken = typeof newValue === 'string' && newValue.length > 0 ? newValue : null;
      } else if (field === 'slack_updated') {
        payload.slack_updated = Boolean(newValue);
      } else if (field === 'follow_up') {
        payload.follow_up = Boolean(newValue);
      } else if (field === 'escalation') {
        payload.escalation = Boolean(newValue);
      }

      try {
        setStatusError(null);
        setStatusMessage(null);
        await updateCustomerStatus(payload).unwrap();
        setStatusMessage('Customer status updated.');
      } catch (error) {
        console.error('Failed to update customer status', error);
        setStatusError('Unable to update customer status. Please try again.');
        event.node.setDataValue(field, oldValue);
      }
    },
    [statusFields, updateCustomerStatus]
  );

  useEffect(() => {
    gridApi.current?.setGridOption('quickFilterText', quickFilter);
  }, [quickFilter]);

  useEffect(() => {
    if (!quickBooksTable || !bucketSlugParam) return;
    if (!bucketTabs.some((bucket) => bucket.slug === bucketSlugParam)) {
      navigate('/', { replace: true });
    }
  }, [bucketSlugParam, bucketTabs, quickBooksTable, navigate]);

  useEffect(() => {
    const state = location.state as
      | { quickBooksConnected?: boolean; quickBooksMessage?: string }
      | null;

    if (!state || typeof state.quickBooksConnected === 'undefined') return;

    if (state.quickBooksConnected) {
      setConnectSuccess(state.quickBooksMessage ?? 'QuickBooks connected successfully.');
      setQuickBooksTable(null);
    } else {
      setConnectError(state.quickBooksMessage ?? 'QuickBooks connection was not completed.');
    }

    navigate('.', { replace: true });
  }, [location.state, navigate]);

  const exportCsv = () => {
    gridApi.current?.exportDataAsCsv({ fileName: 'ar-aging.csv' });
  };

  const connectQuickBooks = async () => {
    setConnectError(null);
    setConnectSuccess(null);
    setStartingQuickBooksAuth(true);
    try {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();

      let token = currentSession?.access_token ?? undefined;
      if (!token) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        token = refreshed.session?.access_token;
      }

      if (!token) {
        setConnectError('You need to sign in again before connecting QuickBooks.');
        setStartingQuickBooksAuth(false);
        return;
      }

      const loginUrl = new URL('/auth/quickbooks/login', import.meta.env.VITE_API_BASE_URL!);
      loginUrl.searchParams.set('return_url', 'true');
      loginUrl.searchParams.set('return_to', `${window.location.origin}/quickbooks/connected`);

      const response = await fetch(loginUrl.toString(), {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Login failed with status ${response.status}`);
      }

      const { redirect_url } = (await response.json()) as QuickBooksLoginResponse;
      setStartingQuickBooksAuth(false);
      window.location.assign(redirect_url);
    } catch (error) {
      console.error('Failed to initiate QuickBooks auth', error);
      setConnectError('Unable to start QuickBooks connection. Please try again.');
      setStartingQuickBooksAuth(false);
    }
  };

  const loadArAgingReport = async () => {
    setReportError(null);
    try {
      const queryString = reportDate ? `report_date=${reportDate}` : undefined;
      const response = await triggerArReport(queryString).unwrap();
      setQuickBooksTable(createQuickBooksTable(response));
      setStatusMessage(null);
      setStatusError(null);
    } catch (error) {
      console.error('Failed to load QuickBooks AR aging report', error);
      setReportError('Unable to load AR aging report.');
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3 py-1 text-sm font-medium transition ${
      isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
    }`;

  const user = session?.user;

  const userDisplayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    (user?.user_metadata?.user_name as string | undefined) ??
    user?.email ??
    'Signed in user';

  const userEmail =
    (user?.email as string | undefined) ??
    (user?.user_metadata?.email as string | undefined) ??
    undefined;

  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ??
    (user?.user_metadata?.picture as string | undefined) ??
    (user?.user_metadata?.avatar as string | undefined);

  const userInitials = useMemo(() => {
    const source = userDisplayName?.trim() || userEmail || '';
    if (!source) return '?';
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) {
      return parts[0]!.slice(0, 2).toUpperCase();
    }
    return (
      parts
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || '?'
    );
  }, [userDisplayName, userEmail]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="Seso Labor logo" className="h-10 w-10" />
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            Seso Labor Collections Tracker
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Avatar>
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={userDisplayName} /> : null}
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-sm font-medium text-slate-900">{userDisplayName}</span>
              {userEmail ? <span className="text-xs text-slate-500">{userEmail}</span> : null}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
            Sign out
          </Button>
        </div>
      </nav>
      <main className="flex-1 p-4">
        <div className="grid gap-4">
          <header className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h1 className="m-0 text-2xl font-semibold text-slate-900">Collections</h1>
            <button
              onClick={connectQuickBooks}
              disabled={startingQuickBooksAuth || !session}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {startingQuickBooksAuth ? 'Redirecting…' : 'Connect QuickBooks'}
            </button>
            <button
              onClick={loadArAgingReport}
              disabled={fetchingArReport}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {fetchingArReport ? 'Loading…' : 'Load AR Aging'}
            </button>
            <input
              type="date"
              value={reportDate}
              onChange={(event) => setReportDate(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/40"
            />

            <div className="ml-auto flex items-center gap-2">
              <input
                placeholder="Quick filter…"
                value={quickFilter}
                onChange={(e) => setQuickFilter(e.target.value)}
                className="min-w-[220px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/40"
              />
              <button
                onClick={exportCsv}
                disabled={!quickBooksTable || displayedRows.length === 0}
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Export CSV
              </button>
            </div>
          </header>

          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <NavLink to="/" end className={navLinkClass}>
              All
            </NavLink>
            {bucketTabs.map((bucket) => (
              <NavLink
                key={bucket.slug}
                to={`/bucket/${bucket.slug}`}
                className={navLinkClass}
              >
                {bucket.label}
              </NavLink>
            ))}
          </nav>

          {quickBooksGeneratedAtLabel && (
            <div className="text-xs text-slate-500">
              QuickBooks AR aging generated {quickBooksGeneratedAtLabel}
            </div>
          )}

          {connectError && <div className="text-sm text-red-500">{connectError}</div>}
          {connectSuccess && <div className="text-sm text-green-600">{connectSuccess}</div>}
          {statusMessage && <div className="text-sm text-green-600">{statusMessage}</div>}
          {statusError && <div className="text-sm text-red-500">{statusError}</div>}
          {reportError && <div className="text-sm text-red-500">{reportError}</div>}

          <div className="h-[70vh] w-full rounded-lg border border-slate-200 bg-white">
            <AgGridReact<GridRow>
              theme={themeQuartz}
              rowData={displayedRows}
              columnDefs={displayedColumns}
              defaultColDef={defaultColDef}
              pagination
              paginationPageSize={50}
              animateRows
              onGridReady={onGridReady}
              onCellValueChanged={handleCellValueChanged}
              className="h-full w-full"
            />
          </div>

          {!quickBooksTable && !fetchingArReport && (
            <div className="text-sm text-slate-500">Run the AR aging report to see results.</div>
          )}

          {quickBooksTable && displayedRows.length === 0 && !fetchingArReport && (
            <div className="text-sm text-slate-500">No customers found in this bucket.</div>
          )}
        </div>
      </main>
    </div>
  );
}
