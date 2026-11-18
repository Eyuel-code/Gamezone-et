import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  ShieldAlert,
  Package,
  ShoppingBag,
  Trophy,
  Gamepad2,
  Newspaper,
  Users,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  Sparkles,
  BarChart3,
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileJson,
  CheckCircle2,
  Check,
  MessageSquare,
  Radio,
  Zap,
  Pause,
  Play,
  KeyRound,
  Lock,
  Unlock,
  ShieldCheck,
  Cpu,
  Activity,
  Ban,
  Fingerprint,
  Eye,
  EyeOff,
  FileCheck2,
} from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import ResilientImage from '@/components/ResilientImage';
import {
  db,
  type ProductItem,
  type OrderItem,
  type TournamentEntity,
  type NewsArticle,
  type UserAccount,
  type SupportTicket,
  type TournamentDispute,
  type HwidRegistryRecord,
  type IdentityBindingRecord,
  type AdminAuditLogEntry,
} from '@/services/db';
import { ADMIN_EMAIL } from '@/lib/env';
import { isAuthorizedAdminUser } from '@/services/authService';
import {
  securityEngine,
  type SecurityThreatEvent,
  type SecurityPosture,
  type SecurityThreatCategory,
} from '@/services/securityEngine';
import { maskPhoneNumber, maskEmailAddress, formatShortHash } from '@/utils/masking';
import { ONLINE_GAMES } from '@/data/gamesCatalog';
import { formatETB, liveActivity } from '@/data/catalog';

type AdminTab =
  | 'overview'
  | 'security'
  | 'reports'
  | 'products'
  | 'orders'
  | 'tournaments'
  | 'games'
  | 'news'
  | 'users';

export default function AdminPage({
  currentUser,
  onOpenAuth,
}: {
  currentUser: UserAccount | null;
  onOpenAuth?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // DB States
  const [products, setProducts] = useState<ProductItem[]>(() => db.getProducts());
  const [orders, setOrders] = useState<OrderItem[]>(() => db.getOrders());
  const [tournaments, setTournaments] = useState<TournamentEntity[]>(() => db.getTournaments());
  const [news, setNews] = useState<NewsArticle[]>(() => db.getNews());
  const [users, setUsers] = useState<UserAccount[]>(() => db.getUsers());
  const [disputes, setDisputes] = useState<TournamentDispute[]>(() => db.getDisputes());
  const [tickets, setTickets] = useState<SupportTicket[]>(() => db.getSupportTickets());

  // Firestore Sync & Reports State
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState('');
  const [exportingKey, setExportingKey] = useState<string | null>(null);

  // Ticket / Dispute Filter & Notes State
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [ticketCategoryFilter, setTicketCategoryFilter] = useState<'all' | 'support' | 'payment' | 'bug' | 'abuse'>('all');
  const [ticketNotesDraft, setTicketNotesDraft] = useState<Record<string, string>>({});
  const [disputeNotesDraft, setDisputeNotesDraft] = useState<Record<string, string>>({});

  // Product / News / Tournament Modals & Room Code Drafts
  const [newProductModal, setNewProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [editPriceValue, setEditPriceValue] = useState('');
  const [newArticleModal, setNewArticleModal] = useState(false);
  const [newTournamentModal, setNewTournamentModal] = useState(false);
  const [roomDrafts, setRoomDrafts] = useState<
    Record<
      string,
      {
        roomId: string;
        roomPassword: string;
        server: string;
        notes: string;
        unlockMode: 'immediate' | 'at_start';
        currentMatchLabel: string;
        lobbyStatus: 'waiting' | 'lobby_open' | 'in_progress' | 'completed';
      }
    >
  >({});
  const [roomSavedFlash, setRoomSavedFlash] = useState<string | null>(null);
  const [confirmDeleteTourneyId, setConfirmDeleteTourneyId] = useState<string | null>(null);

  // Admin-only live feed ticker state
  const [liveFeedPaused, setLiveFeedPaused] = useState(false);
  const [liveFeedIdx, setLiveFeedIdx] = useState(0);

  // Cybersecurity, HWID, Anti-Smurf & Audit State
  const [hwidRecords, setHwidRecords] = useState<HwidRegistryRecord[]>(() => db.getHwidRegistry());
  const [identityBindings, setIdentityBindings] = useState<IdentityBindingRecord[]>(() => db.getIdentityBindings());
  const [securityEvents, setSecurityEvents] = useState<SecurityThreatEvent[]>(() => db.getSecurityEvents());
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogEntry[]>(() => db.getAuditLogs());
  const [clientRateStats, setClientRateStats] = useState(() => securityEngine.getRateStats());
  const [serverSecStatus, setServerSecStatus] = useState<{
    posture: SecurityPosture;
    inspectedRequests: number;
    blockedRequests: number;
    windowMs: number;
  }>({
    posture: securityEngine.getPosture(),
    inspectedRequests: 0,
    blockedRequests: 0,
    windowMs: 60000,
  });
  const [switchingPosture, setSwitchingPosture] = useState(false);
  const [threatCategoryFilter, setThreatCategoryFilter] = useState<'all' | SecurityThreatCategory>('all');
  const [revealOrderPhones, setRevealOrderPhones] = useState<Record<string, boolean>>({});
  const [confirmBanUserId, setConfirmBanUserId] = useState<string | null>(null);
  const [banReasonDraft, setBanReasonDraft] = useState('');

  const isAdmin = isAuthorizedAdminUser(currentUser);

  // Sync with reactive local DB store & client security engine
  useEffect(() => {
    const unsubDb = db.subscribe(() => {
      setProducts(db.getProducts());
      setOrders(db.getOrders());
      setTournaments(db.getTournaments());
      setNews(db.getNews());
      setUsers(db.getUsers());
      setDisputes(db.getDisputes());
      setTickets(db.getSupportTickets());
      setHwidRecords(db.getHwidRegistry());
      setIdentityBindings(db.getIdentityBindings());
      setSecurityEvents(db.getSecurityEvents());
      setAuditLogs(db.getAuditLogs());
    });
    const unsubSec = securityEngine.subscribe(() => {
      setClientRateStats(securityEngine.getRateStats());
    });
    return () => {
      unsubDb();
      unsubSec();
    };
  }, []);

  const refreshServerSecurityStatus = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/security/status');
      if (res.ok) {
        const data = await res.json();
        const nextPosture = (data.posture || 'normal') as SecurityPosture;
        securityEngine.setPosture(nextPosture);
        setServerSecStatus({
          posture: nextPosture,
          inspectedRequests: Number(data.inspectedRequests ?? data.totalApiRequests) || 0,
          blockedRequests: Number(data.blockedRequests ?? data.blockedApiRequests) || 0,
          windowMs: Number(data.windowMs) || 60000,
        });
      }
    } catch {
      // Keep client snapshot if offline
    }
  }, [isAdmin]);

  const syncFromFirestore = useCallback(async () => {
    if (!isAdmin) return;
    setSyncing(true);
    setSyncError('');
    try {
      await Promise.all([
        db.syncAdminCollectionsFromFirestore(),
        db.syncTournamentsFromFirestore(currentUser?.id, true),
        refreshServerSecurityStatus(),
      ]);
      setLastSyncedAt(
        new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch (err) {
      setSyncError(
        err instanceof Error
          ? err.message
          : 'Could not load collections from Firestore. Verify your account email is verified as admin.'
      );
    } finally {
      setSyncing(false);
    }
  }, [isAdmin, currentUser?.id, refreshServerSecurityStatus]);

  useEffect(() => {
    if (isAdmin) {
      void syncFromFirestore();
    }
  }, [isAdmin, syncFromFirestore]);

  useEffect(() => {
    if (!isAdmin || liveFeedPaused) return;
    const timer = window.setInterval(() => {
      setLiveFeedIdx((i) => (i + 1) % liveActivity.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [isAdmin, liveFeedPaused]);

  if (!isAdmin) {
    return null;
  }

  const handleChangeSecurityPosture = async (nextPosture: SecurityPosture) => {
    setSwitchingPosture(true);
    securityEngine.setPosture(nextPosture);
    try {
      const res = await fetch('/api/security/posture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          posture: nextPosture,
          adminEmail: currentUser?.email || ADMIN_EMAIL,
        }),
      });
      if (res.ok) {
        await refreshServerSecurityStatus();
      } else {
        setServerSecStatus((prev) => ({ ...prev, posture: nextPosture }));
      }
    } catch {
      setServerSecStatus((prev) => ({ ...prev, posture: nextPosture }));
    } finally {
      db.logSecurityPostureChange(nextPosture);
      setSwitchingPosture(false);
    }
  };

  const handleExportAuditLogs = (format: 'json' | 'csv') => {
    const filename = `gamezoneet-audit-logs.${format}`;
    const content =
      format === 'json'
        ? JSON.stringify(auditLogs, null, 2)
        : [
            'ID,Timestamp,Admin Email,Action,Target Type,Target ID,IP Masked,Prev Hash,Entry Hash,Summary',
            ...auditLogs.map((l) =>
              [
                l.id,
                l.timestamp,
                l.adminEmail,
                l.action,
                l.targetType,
                l.targetId,
                l.ipMasked,
                l.prevHash,
                l.entryHash,
                l.summary,
              ]
                .map((v) => `"${String(v || '').replace(/"/g, '""')}"`)
                .join(',')
            ),
          ].join('\n');
    const blob = new Blob([content], {
      type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleUpdateOrderStatus = (
    orderId: string,
    pStatus: OrderItem['paymentStatus'],
    dStatus: OrderItem['deliveryStatus']
  ) => {
    db.updateOrderStatus(orderId, pStatus, dStatus);
  };

  const handleUpdateTicket = (ticketId: string, status: SupportTicket['status']) => {
    const draft = ticketNotesDraft[ticketId];
    const existing = tickets.find((t) => t.id === ticketId)?.adminNotes || '';
    const notes = typeof draft === 'string' ? draft : existing;
    db.updateSupportTicketStatus(ticketId, status, notes);
  };

  const handleResolveDispute = (dispId: string, status: 'resolved' | 'dismissed' = 'resolved') => {
    const draft = disputeNotesDraft[dispId];
    const existing = disputes.find((d) => d.id === dispId)?.adminNotes || '';
    const notes =
      typeof draft === 'string' && draft.trim()
        ? draft.trim()
        : existing ||
          (status === 'resolved'
            ? 'Admin reviewed lobby logs. Match validated.'
            : 'Dispute dismissed after log review.');
    db.resolveDispute(dispId, status, notes);
  };

  const handleExportReport = async (
    reportType: 'summary' | 'tickets' | 'disputes',
    format: 'csv' | 'json'
  ) => {
    const key = `${reportType}-${format}`;
    setExportingKey(key);
    setExportStatus('');

    const filename = `gamezoneet-${reportType}-report.${format}`;
    try {
      const res = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          reportType,
          orders,
          tickets,
          disputes,
          users,
        }),
      });
      if (!res.ok) {
        throw new Error(`Export failed with HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setExportStatus(`Downloaded ${filename} from GameZoneET backend.`);
    } catch {
      // Client-side export fallback so reports work even if backend middleware isn't running
      const fallbackContent =
        format === 'json'
          ? JSON.stringify({ generatedAt: new Date().toISOString(), reportType, orders, tickets, disputes }, null, 2)
          : [
              'Report Type,Generated At,Orders,Tickets,Disputes',
              `${reportType},${new Date().toISOString()},${orders.length},${tickets.length},${disputes.length}`,
            ].join('\n');
      const blob = new Blob([fallbackContent], {
        type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setExportStatus(`Downloaded ${filename} (local snapshot fallback).`);
    } finally {
      setExportingKey(null);
    }
  };

  // Report Calculations
  const successfulOrders = orders.filter((o) => o.paymentStatus === 'success');
  const pendingOrders = orders.filter((o) => o.paymentStatus === 'pending');
  const failedOrders = orders.filter((o) => o.paymentStatus === 'failed');
  const totalRevenueETB = successfulOrders.reduce((sum, o) => sum + (Number(o.amountETB) || 0), 0);
  const telebirrRevenueETB = successfulOrders
    .filter((o) => o.paymentMethod === 'telebirr')
    .reduce((sum, o) => sum + (Number(o.amountETB) || 0), 0);
  const cbeRevenueETB = successfulOrders
    .filter((o) => o.paymentMethod === 'cbe')
    .reduce((sum, o) => sum + (Number(o.amountETB) || 0), 0);
  const telebirrPct = totalRevenueETB > 0 ? Math.round((telebirrRevenueETB / totalRevenueETB) * 100) : 50;

  const openTickets = tickets.filter((t) => t.status !== 'resolved');
  const openDisputes = disputes.filter((d) => d.status === 'open');
  const attentionCount = openTickets.length + openDisputes.length;

  const filteredTickets = tickets.filter((t) => {
    const matchStatus = ticketStatusFilter === 'all' || t.status === ticketStatusFilter;
    const matchCategory = ticketCategoryFilter === 'all' || t.category === ticketCategoryFilter;
    return matchStatus && matchCategory;
  });

  return (
    <div className="relative min-h-screen pt-24 pb-16">
      <div className="container-x max-w-7xl">
        {/* Top Admin Status */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-ink-900 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-500/20 text-accent-400">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display font-bold text-white text-lg">GameZoneET Admin Portal</h1>
                <span className="rounded-full bg-accent-500/20 text-accent-300 text-[10px] font-bold px-2 py-0.5">
                  Role: ADMIN
                </span>
                {lastSyncedAt && (
                  <span className="rounded-full bg-success-500/15 text-success-300 text-[10px] font-mono px-2 py-0.5">
                    Synced {lastSyncedAt}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Manage products, top-up orders, tournaments, support tickets, disputes, and financial reports.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void syncFromFirestore()}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 disabled:opacity-60 cursor-pointer transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing Firestore...' : 'Sync Firestore'}
          </button>
        </div>

        {syncError && (
          <div className="mb-5 flex items-center gap-2 rounded-2xl border border-error-500/30 bg-error-500/10 p-4 text-xs text-error-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-error-400" />
            <span>{syncError}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-6 border-b border-white/10">
          {[
            { id: 'overview', label: 'Overview', icon: Sparkles },
            {
              id: 'security',
              label:
                securityEvents.length > 0
                  ? `Security & Audit (${securityEvents.length})`
                  : 'Security & Audit',
              icon: ShieldCheck,
            },
            {
              id: 'reports',
              label: attentionCount > 0 ? `Reports & Analytics (${attentionCount})` : 'Reports & Analytics',
              icon: BarChart3,
            },
            { id: 'products', label: `Products (${products.length})`, icon: Package },
            { id: 'orders', label: `Orders (${orders.length})`, icon: ShoppingBag },
            { id: 'tournaments', label: `Tournaments (${tournaments.length})`, icon: Trophy },
            { id: 'games', label: `HTML5 Games (${ONLINE_GAMES.length})`, icon: Gamepad2 },
            { id: 'news', label: `News (${news.length})`, icon: Newspaper },
            { id: 'users', label: `Users (${users.length})`, icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`relative z-0 nav-luminous-item flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'text-ink-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="admin-active-tab"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="absolute inset-0 -z-10 rounded-xl bg-primary-500 shadow-glow"
                  />
                )}
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <span className="text-xs text-slate-400 block">Registered Gamers</span>
                <span className="font-mono text-2xl font-bold text-white mt-1 block">{users.length}</span>
                <span className="text-[10px] text-primary-400 mt-2 block">Active leaderboard profiles</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <span className="text-xs text-slate-400 block">Verified Revenue</span>
                <span className="font-mono text-2xl font-bold text-white mt-1 block">
                  {formatETB(totalRevenueETB)}
                </span>
                <span className="text-[10px] text-success-400 mt-2 block">
                  {orders.length} orders • Telebirr &amp; CBE Birr
                </span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <span className="text-xs text-slate-400 block">Open Support Reports</span>
                <span className="font-mono text-2xl font-bold text-white mt-1 block">{openTickets.length}</span>
                <span className="text-[10px] text-gold-400 mt-2 block">
                  {tickets.length} total tickets logged
                </span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <span className="text-xs text-slate-400 block">Open Match Disputes</span>
                <span className="font-mono text-2xl font-bold text-white mt-1 block">{openDisputes.length}</span>
                <span className="text-[10px] text-accent-400 mt-2 block">
                  {ONLINE_GAMES.length} active HTML5 games
                </span>
              </div>
            </div>

            {/* Live Platform Activity Feed (Exclusive to Admin Portal) */}
            <div className="rounded-2xl border border-primary-400/25 bg-ink-900 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-500/20 text-primary-300">
                    <Radio className="h-4 w-4 text-rose-400 animate-pulse" />
                  </span>
                  <div>
                    <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
                      Live Platform Activity Stream
                      <span className="rounded bg-primary-500/20 border border-primary-400/40 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary-300">
                        Admin Only
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Continuous user pack openings, top-up purchases, and tournament registrations routed exclusively to Admin Portal.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLiveFeedPaused((p) => !p)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 cursor-pointer"
                >
                  {liveFeedPaused ? (
                    <>
                      <Play className="h-3.5 w-3.5 text-primary-400" /> Resume Stream
                    </>
                  ) : (
                    <>
                      <Pause className="h-3.5 w-3.5 text-amber-400" /> Pause Stream
                    </>
                  )}
                </button>
              </div>

              {liveActivity[liveFeedIdx] && (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-center gap-3 rounded-xl border border-primary-400/30 bg-primary-500/10 p-3 text-xs"
                >
                  <Zap className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="font-bold text-white">{liveActivity[liveFeedIdx].user}</span>
                  <span className="text-slate-200">{liveActivity[liveFeedIdx].action}</span>
                  <span className="ml-auto font-mono text-[11px] text-primary-300">
                    {liveActivity[liveFeedIdx].game} &middot; {liveActivity[liveFeedIdx].time}
                  </span>
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                {liveActivity.map((item, idx) => (
                  <div
                    key={`${item.user}-${idx}`}
                    className={`rounded-xl border p-2.5 transition-colors ${
                      idx === liveFeedIdx
                        ? 'border-primary-400/45 bg-white/[0.06]'
                        : 'border-white/10 bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-white">{item.user}</span>
                      <span className="text-slate-400">{item.time}</span>
                    </div>
                    <p className="text-slate-300 mt-0.5 truncate">{item.action}</p>
                    <span className="text-[10px] font-semibold text-primary-300">{item.game}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Orders Overview */}
            <div className="rounded-2xl border border-white/10 bg-ink-900 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-white text-base">Recent Orders</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('reports')}
                  className="text-xs font-semibold text-primary-300 hover:underline cursor-pointer"
                >
                  Open Full Reports &rarr;
                </button>
              </div>
              {orders.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">No top-up orders recorded yet.</p>
              ) : (
                <div className="divide-y divide-white/5 text-xs">
                  {orders.slice(0, 5).map((o) => (
                    <div key={o.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white">{o.customerName}</span>
                        <span className="text-slate-400 ml-2">
                          ({o.gameName} — {o.productName})
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-white">{formatETB(o.amountETB)}</span>
                        <span className="rounded bg-success-500/20 text-success-400 text-[10px] font-bold px-2 py-0.5">
                          {o.deliveryStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Disputes if any */}
            {openDisputes.length > 0 && (
              <div className="rounded-2xl border border-error-500/30 bg-error-500/5 p-5">
                <h3 className="font-display font-bold text-white text-base mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-error-400" /> Open Tournament Disputes ({openDisputes.length})
                </h3>
                <div className="space-y-2">
                  {openDisputes.map((d) => (
                    <div
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-ink-950 border border-white/10 text-xs"
                    >
                      <div>
                        <span className="font-bold text-white">{d.reportedBy}</span>
                        <span className="text-error-300 ml-2">Reason: {d.reason}</span>
                        <p className="text-slate-400 text-[11px] mt-0.5">{d.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleResolveDispute(d.id, 'resolved')}
                          className="rounded-lg bg-success-500 px-3 py-1 text-ink-950 font-bold hover:bg-success-400 cursor-pointer"
                        >
                          Resolve Dispute
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CYBERSECURITY, ANTI-SMURF & AUDIT LOGS */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Rate Limiting & DDoS Defense Control Card */}
            <div className="rounded-2xl border border-primary-400/30 bg-ink-900 p-5 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-500/20 text-primary-300 shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display font-bold text-white text-base">
                        DDoS Shield &amp; Sliding-Window Rate Limiter
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                          serverSecStatus.posture === 'lockdown'
                            ? 'bg-error-500/20 text-error-300 border border-error-400/40'
                            : serverSecStatus.posture === 'elevated'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                        }`}
                      >
                        Posture: {serverSecStatus.posture}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Real-time protection across `/api/*` endpoints, Telebirr checkout, room code reveals, tournament registration, and AI chat.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(['normal', 'elevated', 'lockdown'] as SecurityPosture[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      disabled={switchingPosture}
                      onClick={() => void handleChangeSecurityPosture(mode)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold uppercase cursor-pointer transition-all ${
                        serverSecStatus.posture === mode
                          ? mode === 'lockdown'
                            ? 'bg-error-500 text-white'
                            : mode === 'elevated'
                            ? 'bg-amber-400 text-ink-950'
                            : 'bg-emerald-400 text-ink-950'
                          : 'border border-white/15 bg-white/5 text-slate-300 hover:text-white'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => void refreshServerSecurityStatus()}
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-primary-300 hover:bg-white/10 cursor-pointer"
                  >
                    Refresh Telemetry
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                  <span className="text-slate-400 block">Backend Inspected</span>
                  <span className="font-mono text-xl font-extrabold text-white mt-1 block tabular-nums">
                    {serverSecStatus.inspectedRequests.toLocaleString()}
                  </span>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                  <span className="text-slate-400 block">Backend HTTP 429 Blocked</span>
                  <span className="font-mono text-xl font-extrabold text-rose-400 mt-1 block tabular-nums">
                    {serverSecStatus.blockedRequests.toLocaleString()}
                  </span>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                  <span className="text-slate-400 block">Client Guard Checks</span>
                  <span className="font-mono text-xl font-extrabold text-primary-300 mt-1 block tabular-nums">
                    {clientRateStats.inspectedRequests.toLocaleString()}
                  </span>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                  <span className="text-slate-400 block">Verified ID Hashes</span>
                  <span className="font-mono text-xl font-extrabold text-emerald-300 mt-1 block tabular-nums">
                    {identityBindings.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Hardware Fingerprinting (HWID) Anti-Smurf Registry */}
            <div className="rounded-2xl border border-white/10 bg-ink-900 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-accent-400" /> HWID Anti-Smurf &amp; Device Registry ({hwidRecords.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Canvas + WebGL SHA-256 hardware fingerprints. Flagged devices with &gt;1 account are blocked from multi-entering active brackets.
                  </p>
                </div>
              </div>

              {hwidRecords.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-xs text-slate-400">
                  No hardware fingerprints recorded in this session yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3">HWID Hash</th>
                        <th className="p-3">Device Metadata</th>
                        <th className="p-3">Accounts Linked</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {hwidRecords.map((rec) => (
                        <tr key={rec.hwidHash} className="hover:bg-white/[0.02]">
                          <td className="p-3 font-mono font-bold text-primary-300">
                            {formatShortHash(rec.hwidHash)}
                          </td>
                          <td className="p-3 max-w-xs truncate" title={rec.deviceSummary}>
                            <div className="text-white font-medium truncate">{rec.deviceSummary}</div>
                            {rec.flaggedReason && (
                              <div className="text-[11px] text-amber-300 truncate">{rec.flaggedReason}</div>
                            )}
                          </td>
                          <td className="p-3 font-mono font-bold text-white">
                            {rec.associatedUserIds.length} account(s)
                          </td>
                          <td className="p-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                rec.blocked
                                  ? 'bg-error-500/20 text-error-300'
                                  : rec.flagged
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {rec.blocked ? 'Blocked' : rec.flagged ? 'Smurf Flagged' : 'Clean'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => db.setHwidBlockStatus(rec.hwidHash, !rec.blocked)}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                                rec.blocked
                                  ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/35'
                                  : 'bg-error-500/20 text-error-300 hover:bg-error-500/35'
                              }`}
                            >
                              {rec.blocked ? 'Unblock HWID' : 'Block HWID'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Real-Time Behavioral Integrity & Anti-Tamper Threat Telemetry */}
            <div className="rounded-2xl border border-white/10 bg-ink-900 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-rose-400" /> Behavioral Integrity &amp; Threat Telemetry ({securityEvents.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Detects duplicate National ID/FIDO bindings, HWID smurf attempts, rapid macro-clicks, WebDriver bots, and DOM injection tampering.
                  </p>
                </div>
                <select
                  value={threatCategoryFilter}
                  aria-label="Filter threat telemetry by category"
                  onChange={(e) => setThreatCategoryFilter(e.target.value as any)}
                  className="rounded-xl border border-white/15 bg-ink-950 px-3 py-1.5 text-xs text-white"
                >
                  <option value="all">All Threat Categories</option>
                  <option value="anti_smurf_id">Duplicate ID (Anti-Smurf)</option>
                  <option value="anti_smurf_hwid">Multi-Account HWID</option>
                  <option value="name_mismatch">ID Name Mismatch</option>
                  <option value="rate_limit">Rate Limit / DDoS Shield</option>
                  <option value="macro_click">Macro Click Burst</option>
                  <option value="automation_probe">Automation / WebDriver</option>
                  <option value="dom_tamper">DOM Script Tampering</option>
                  <option value="devtools_checkin">Bracket DevTools Delta</option>
                </select>
              </div>

              {securityEvents.filter((ev) => threatCategoryFilter === 'all' || ev.category === threatCategoryFilter)
                .length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-xs text-slate-400">
                  No security events recorded for this filter. All platform surfaces nominal.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {securityEvents
                    .filter((ev) => threatCategoryFilter === 'all' || ev.category === threatCategoryFilter)
                    .map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                                ev.severity === 'critical'
                                  ? 'bg-error-500/25 text-error-300'
                                  : ev.severity === 'high'
                                  ? 'bg-amber-500/25 text-amber-300'
                                  : 'bg-primary-500/20 text-primary-300'
                              }`}
                            >
                              {ev.severity} • {ev.category.replace(/_/g, ' ')}
                            </span>
                            <span className="font-bold text-white">{ev.gamerTag}</span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {ev.endpointOrSurface}
                            </span>
                          </div>
                          <p className="text-slate-300">{ev.summary}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              ev.blocked
                                ? 'bg-error-500/20 text-error-300'
                                : 'bg-white/10 text-slate-300'
                            }`}
                          >
                            {ev.blocked ? 'Blocked' : 'Observed'}
                          </span>
                          <span className="block font-mono text-[10px] text-slate-500 mt-1">
                            {ev.timestamp}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Cryptographically Chained Immutable Admin Audit Logs */}
            <div className="rounded-2xl border border-white/10 bg-ink-900 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-emerald-400" /> Chained Admin Audit Logs ({auditLogs.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Append-only SHA-256 hash-chained records capturing admin email, masked IP/session metadata, action, and timestamp.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportAuditLogs('csv')}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary-500/20 hover:bg-primary-500/35 px-3 py-1.5 text-xs font-bold text-primary-200 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportAuditLogs('json')}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                  >
                    <FileJson className="h-3.5 w-3.5" /> JSON
                  </button>
                </div>
              </div>

              {auditLogs.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-xs text-slate-400">
                  No administrative audit entries logged yet. Order updates, bans, tournament approvals, and security changes appear here automatically.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Admin &amp; Masked IP</th>
                        <th className="p-3">Action / Target</th>
                        <th className="p-3">Summary</th>
                        <th className="p-3">SHA-256 Chain</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/[0.02]">
                          <td className="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                            {log.timestamp}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-white">{log.adminEmail}</div>
                            <div className="font-mono text-[10px] text-slate-500">IP: {log.ipMasked}</div>
                          </td>
                          <td className="p-3">
                            <span className="rounded bg-primary-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-primary-300">
                              {log.action}
                            </span>
                            <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                              {log.targetType}:{log.targetId}
                            </div>
                          </td>
                          <td className="p-3 max-w-xs text-slate-200">{log.summary}</td>
                          <td className="p-3 font-mono text-[10px] text-emerald-300 whitespace-nowrap">
                            <div>{formatShortHash(log.entryHash)}</div>
                            <div className="text-slate-500">&larr; {formatShortHash(log.prevHash)}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: REPORTS & ANALYTICS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Revenue & Channel Analytics */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-2">
                <span className="text-xs text-slate-400">Total Verified Revenue</span>
                <p className="font-mono text-3xl font-extrabold text-white">{formatETB(totalRevenueETB)}</p>
                <div className="flex items-center gap-3 text-[11px] pt-1">
                  <span className="text-success-400 font-semibold">{successfulOrders.length} Paid</span>
                  <span className="text-gold-400 font-semibold">{pendingOrders.length} Pending</span>
                  <span className="text-error-400 font-semibold">{failedOrders.length} Failed</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Payment Channel Split</span>
                  <span className="font-mono text-slate-300">{telebirrPct}% / {100 - telebirrPct}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-primary-300 font-semibold">Telebirr: {formatETB(telebirrRevenueETB)}</span>
                  <span className="text-gold-300 font-semibold">CBE Birr: {formatETB(cbeRevenueETB)}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gold-500/30">
                  <div
                    className="h-full bg-primary-500 transition-all duration-300"
                    style={{ width: `${telebirrPct}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-2">
                <span className="text-xs text-slate-400">Reports &amp; Moderation Queue</span>
                <p className="font-mono text-3xl font-extrabold text-white">{attentionCount} Open</p>
                <p className="text-[11px] text-slate-400">
                  {openTickets.length} support tickets &bull; {openDisputes.length} tournament disputes
                </p>
              </div>
            </div>

            {/* Server-side Export Reports Card */}
            <div className="rounded-2xl border border-white/10 bg-ink-900 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
                    <Download className="h-4 w-4 text-primary-400" /> Export Platform Reports
                  </h3>
                  <p className="text-xs text-slate-400">
                    Generate CSV spreadsheets or JSON audit snapshots via the Express reporting API.
                  </p>
                </div>
                {exportStatus && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success-500/15 px-3 py-1 text-xs text-success-300">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {exportStatus}
                  </span>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { type: 'summary' as const, title: 'Orders & Revenue Summary', count: `${orders.length} orders` },
                  { type: 'tickets' as const, title: 'Support & Bug Reports', count: `${tickets.length} tickets` },
                  { type: 'disputes' as const, title: 'Tournament Match Disputes', count: `${disputes.length} disputes` },
                ].map((item) => (
                  <div
                    key={item.type}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{item.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.count}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={exportingKey === `${item.type}-csv`}
                        onClick={() => void handleExportReport(item.type, 'csv')}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-500/20 hover:bg-primary-500/30 px-3 py-1.5 text-xs font-bold text-primary-200 cursor-pointer"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
                      </button>
                      <button
                        type="button"
                        disabled={exportingKey === `${item.type}-json`}
                        onClick={() => void handleExportReport(item.type, 'json')}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                      >
                        <FileJson className="h-3.5 w-3.5" /> JSON
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Support Tickets & Incident Reports */}
            <div className="rounded-2xl border border-white/10 bg-ink-900 p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary-400" /> Support Tickets &amp; Incident Reports ({filteredTickets.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Review user-submitted payment issues, bug reports, and player conduct tickets.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <select
                    value={ticketCategoryFilter}
                    aria-label="Filter support tickets by category"
                    onChange={(e) => setTicketCategoryFilter(e.target.value as any)}
                    className="rounded-xl border border-white/15 bg-ink-950 px-3 py-1.5 text-white"
                  >
                    <option value="all">All Categories</option>
                    <option value="support">Support</option>
                    <option value="payment">Payment</option>
                    <option value="bug">Bug</option>
                    <option value="abuse">Abuse / Conduct</option>
                  </select>
                  <select
                    value={ticketStatusFilter}
                    aria-label="Filter support tickets by status"
                    onChange={(e) => setTicketStatusFilter(e.target.value as any)}
                    className="rounded-xl border border-white/15 bg-ink-950 px-3 py-1.5 text-white"
                  >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {filteredTickets.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-xs text-slate-400">
                  No support tickets or reports match the selected filters.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTickets.map((t) => {
                    const noteValue = ticketNotesDraft[t.id] ?? t.adminNotes ?? '';
                    return (
                      <div
                        key={t.id}
                        className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-primary-300">{t.id}</span>
                            <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-300">
                              {t.category}
                            </span>
                            <span className="font-bold text-white">{t.userName}</span>
                            <span className="text-slate-400">({t.email})</span>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              t.status === 'resolved'
                                ? 'bg-success-500/20 text-success-300'
                                : t.status === 'in_progress'
                                ? 'bg-gold-500/20 text-gold-300'
                                : 'bg-primary-500/20 text-primary-300'
                            }`}
                          >
                            {t.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div>
                          <p className="font-bold text-white text-sm">{t.subject}</p>
                          <p className="text-slate-300 mt-1 leading-relaxed">{t.message}</p>
                          <p className="text-[11px] text-slate-500 mt-1">{t.createdAt}</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-white/10">
                          <input
                            type="text"
                            aria-label={`Admin note for ticket ${t.id}`}
                            value={noteValue}
                            onChange={(e) =>
                              setTicketNotesDraft((prev) => ({ ...prev, [t.id]: e.target.value }))
                            }
                            maxLength={500}
                            placeholder="Write admin response or internal note..."
                            className="flex-1 rounded-lg border border-white/15 bg-ink-950 px-3 py-1.5 text-xs text-white placeholder:text-slate-500"
                          />
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateTicket(t.id, 'in_progress')}
                              className="rounded-lg bg-gold-500/20 hover:bg-gold-500/35 px-3 py-1.5 font-bold text-gold-300 cursor-pointer"
                            >
                              In Progress
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateTicket(t.id, 'resolved')}
                              className="rounded-lg bg-success-500/20 hover:bg-success-500/35 px-3 py-1.5 font-bold text-success-300 cursor-pointer"
                            >
                              Resolve
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tournament Match Disputes Queue */}
            <div className="rounded-2xl border border-white/10 bg-ink-900 p-5 space-y-4">
              <div>
                <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-accent-400" /> Tournament Match Disputes ({disputes.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Adjudicate reported bracket disputes and persist outcomes to Firestore.
                </p>
              </div>

              {disputes.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-xs text-slate-400">
                  No tournament disputes submitted yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {disputes.map((d) => {
                    const noteValue = disputeNotesDraft[d.id] ?? d.adminNotes ?? '';
                    return (
                      <div
                        key={d.id}
                        className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-mono font-bold text-primary-300">{d.id}</span>
                            <span className="ml-2 font-bold text-white">{d.reportedBy}</span>
                            <span className="ml-2 text-error-300">({d.reason})</span>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              d.status === 'resolved'
                                ? 'bg-success-500/20 text-success-300'
                                : d.status === 'dismissed'
                                ? 'bg-slate-500/20 text-slate-300'
                                : 'bg-error-500/20 text-error-300'
                            }`}
                          >
                            {d.status}
                          </span>
                        </div>
                        <p className="text-slate-300">{d.description}</p>
                        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-white/10">
                          <input
                            type="text"
                            aria-label={`Dispute resolution notes for ${d.id}`}
                            value={noteValue}
                            onChange={(e) =>
                              setDisputeNotesDraft((prev) => ({ ...prev, [d.id]: e.target.value }))
                            }
                            maxLength={500}
                            placeholder="Resolution notes..."
                            className="flex-1 rounded-lg border border-white/15 bg-ink-950 px-3 py-1.5 text-xs text-white placeholder:text-slate-500"
                          />
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleResolveDispute(d.id, 'resolved')}
                              className="rounded-lg bg-success-500/20 hover:bg-success-500/35 px-3 py-1.5 font-bold text-success-300 cursor-pointer"
                            >
                              Resolve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResolveDispute(d.id, 'dismissed')}
                              className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 font-bold text-slate-200 cursor-pointer"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PRODUCTS CRUD */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-white text-lg">Top-Up Product Catalog</h3>
                <p className="text-xs text-slate-400">
                  Add or edit Free Fire, PUBG Mobile, and EA SPORTS FC packages.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNewProductModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2 text-xs font-bold text-ink-950 hover:bg-primary-400 shadow-glow cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Add Package
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Game</th>
                    <th className="p-3.5">Package Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Price (ETB)</th>
                    <th className="p-3.5">In Stock</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="p-3.5 font-bold text-white">{p.gameName}</td>
                      <td className="p-3.5">{p.name}</td>
                      <td className="p-3.5">
                        <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">
                          {p.category}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-white">{formatETB(p.priceETB)}</td>
                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={() => db.updateProduct({ ...p, inStock: !p.inStock })}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold cursor-pointer ${
                            p.inStock
                              ? 'bg-success-500/20 text-success-400'
                              : 'bg-error-500/20 text-error-400'
                          }`}
                        >
                          {p.inStock ? 'Available' : 'Out of Stock'}
                        </button>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(p);
                            setEditPriceValue(String(p.priceETB));
                          }}
                          className="rounded p-1 text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                          title="Edit Price"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => db.deleteProduct(p.id)}
                          className="rounded p-1 text-slate-400 hover:text-error-400 hover:bg-white/10 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: ORDERS MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-display font-bold text-white text-lg">Orders Management</h3>
              <p className="text-xs text-slate-400">
                Inspect top-up transactions and update delivery progress across Firestore.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Order ID</th>
                    <th className="p-3.5">Customer &amp; Player ID</th>
                    <th className="p-3.5">Game / Item</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Method</th>
                    <th className="p-3.5">Delivery Status</th>
                    <th className="p-3.5 text-right">Update Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        No orders found yet.
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.id} className="hover:bg-white/[0.02]">
                        <td className="p-3.5 font-mono text-primary-300 font-bold">{o.id}</td>
                        <td className="p-3.5">
                          <div className="font-bold text-white">{o.customerName}</div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                            <span>ID: {o.playerId}</span>
                            <span>&bull;</span>
                            <span>
                              {revealOrderPhones[o.id]
                                ? o.customerPhone
                                : maskPhoneNumber(o.customerPhone)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setRevealOrderPhones((prev) => ({
                                  ...prev,
                                  [o.id]: !prev[o.id],
                                }))
                              }
                              aria-label={revealOrderPhones[o.id] ? 'Hide phone' : 'Reveal phone'}
                              className="text-slate-400 hover:text-white cursor-pointer"
                            >
                              {revealOrderPhones[o.id] ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="p-3.5">
                          {o.gameName} — {o.productName}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-white">{formatETB(o.amountETB)}</td>
                        <td className="p-3.5 uppercase">{o.paymentMethod}</td>
                        <td className="p-3.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              o.deliveryStatus === 'completed'
                                ? 'bg-success-500/20 text-success-400'
                                : 'bg-gold-500/20 text-gold-300'
                            }`}
                          >
                            {o.deliveryStatus}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(o.id, 'success', 'completed')}
                            className="rounded bg-success-500/20 hover:bg-success-500/40 text-success-300 px-2 py-1 text-[10px] font-bold cursor-pointer"
                          >
                            Mark Delivered
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(o.id, 'success', 'processing')}
                            className="rounded bg-gold-500/20 hover:bg-gold-500/40 text-gold-300 px-2 py-1 text-[10px] font-bold cursor-pointer"
                          >
                            Processing
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: TOURNAMENTS */}
        {activeTab === 'tournaments' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display font-bold text-white text-lg">Tournaments, Lobby Codes &amp; Brackets</h3>
                <p className="text-xs text-slate-400">
                  Launch free competitions, distribute verified Room IDs &amp; Passwords, and approve bracket match winners.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNewTournamentModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2 text-xs font-bold text-ink-950 hover:bg-primary-400 shadow-glow cursor-pointer self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" /> Create Free Tournament
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {tournaments.map((t) => {
                const pendingMatches = (t.matches || []).filter(
                  (m) => m.status === 'pending_approval' || m.status === 'disputed'
                );
                const draft = roomDrafts[t.id] || {
                  roomId: t.roomCredentials?.roomId || `GZ-${t.gameId.toUpperCase()}-409`,
                  roomPassword: t.roomCredentials?.roomPassword || 'ET2026',
                  server: t.roomCredentials?.server || 'Africa (Addis Ababa)',
                  notes: t.roomCredentials?.notes || '',
                  unlockMode: t.roomCredentials?.unlockMode || 'at_start',
                  currentMatchLabel: t.currentMatchLabel || 'Round 1 · Registration Open',
                  lobbyStatus: t.lobbyStatus || 'waiting',
                };
                const isPublished = Boolean(t.roomCredentials?.published);

                const updateDraft = (patch: Partial<typeof draft>) => {
                  setRoomDrafts((prev) => ({
                    ...prev,
                    [t.id]: { ...draft, ...patch },
                  }));
                };

                const saveLobby = (publishState?: boolean) => {
                  const nextPublished = typeof publishState === 'boolean' ? publishState : isPublished;
                  const nextLobbyStatus = !nextPublished
                    ? 'waiting'
                    : draft.unlockMode === 'immediate' && draft.lobbyStatus === 'waiting'
                    ? 'lobby_open'
                    : draft.lobbyStatus;

                  db.updateTournamentLobby(t.id, {
                    roomId: draft.roomId.trim() || `GZ-${t.gameId.toUpperCase()}-409`,
                    roomPassword: draft.roomPassword.trim() || 'ET2026',
                    server: draft.server.trim() || 'Africa (Addis Ababa)',
                    notes: draft.notes.trim(),
                    unlockMode: draft.unlockMode,
                    currentMatchLabel: draft.currentMatchLabel.trim(),
                    lobbyStatus: nextLobbyStatus,
                    published: nextPublished,
                  });
                  setRoomSavedFlash(t.id);
                  window.setTimeout(() => setRoomSavedFlash((prev) => (prev === t.id ? null : prev)), 2200);
                };

                return (
                <div
                  key={t.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-primary-400">
                        {t.gameName} &bull; {t.format}
                      </span>
                      <h4 className="font-bold text-white text-base mt-0.5">{t.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {t.date} &bull; {t.startTime}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary-500/20 text-primary-300 text-xs px-2.5 py-0.5 font-bold shrink-0">
                      {t.registeredCount}/{t.capacity} Slots
                    </span>
                  </div>

                  {/* Custom Room Code Distribution & Live Lobby Controls */}
                  <div className="rounded-xl border border-primary-400/25 bg-ink-950/70 p-3.5 space-y-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 font-bold text-primary-300">
                        <KeyRound className="h-3.5 w-3.5" /> Custom Room Credentials
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          isPublished
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-400/30'
                        }`}
                      >
                        {isPublished ? <Unlock className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                        {isPublished ? 'Published to Registered Players' : 'Hidden / Unpublished'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Room ID</label>
                        <input
                          type="text"
                          value={draft.roomId}
                          onChange={(e) => updateDraft({ roomId: e.target.value })}
                          className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Room Password</label>
                        <input
                          type="text"
                          value={draft.roomPassword}
                          onChange={(e) => updateDraft({ roomPassword: e.target.value })}
                          className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 font-mono text-amber-300"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Server / Region</label>
                        <input
                          type="text"
                          value={draft.server}
                          onChange={(e) => updateDraft({ server: e.target.value })}
                          className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Unlock Rule</label>
                        <select
                          value={draft.unlockMode}
                          onChange={(e) => updateDraft({ unlockMode: e.target.value as 'immediate' | 'at_start' })}
                          className="w-full rounded-lg border border-white/15 bg-ink-950 px-2.5 py-1.5 text-white"
                        >
                          <option value="immediate">Immediate (Once Published)</option>
                          <option value="at_start">At Match Start / Lobby Open</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Live Round / Match Label</label>
                          <input
                            type="text"
                            value={draft.currentMatchLabel}
                            onChange={(e) => updateDraft({ currentMatchLabel: e.target.value })}
                            placeholder="e.g. In Progress · Semifinal 2"
                            className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Lobby Status</label>
                          <select
                            value={draft.lobbyStatus}
                            onChange={(e) => updateDraft({ lobbyStatus: e.target.value as any })}
                            className="w-full rounded-lg border border-white/15 bg-ink-950 px-2.5 py-1.5 text-white"
                          >
                            <option value="waiting">Waiting for Kickoff</option>
                            <option value="lobby_open">Lobby Open (Room Active)</option>
                            <option value="in_progress">Match In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => saveLobby(true)}
                          className="rounded-lg bg-emerald-500/20 border border-emerald-400/40 px-3 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/35 cursor-pointer"
                        >
                          Publish &amp; Save Room
                        </button>
                        {isPublished && (
                          <button
                            type="button"
                            onClick={() => saveLobby(false)}
                            className="rounded-lg bg-white/10 border border-white/15 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-white/20 cursor-pointer"
                          >
                            Lock / Hide Room
                          </button>
                        )}
                      </div>
                      {roomSavedFlash === t.id && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Synced to Firestore
                        </span>
                      )}
                    </div>
                  </div>

                  {pendingMatches.length > 0 && (
                    <div className="rounded-xl border border-gold-400/25 bg-gold-500/5 p-3 space-y-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gold-300 block">
                        Pending Match Approvals ({pendingMatches.length})
                      </span>
                      {pendingMatches.map((m) => {
                        const scoreMatch = (m.submittedScore || '').match(/(\d+)\s*[-:]\s*(\d+)/);
                        const p1Score = scoreMatch ? Number(scoreMatch[1]) : 1;
                        const p2Score = scoreMatch ? Number(scoreMatch[2]) : 0;
                        return (
                          <div
                            key={m.id}
                            className="rounded-lg border border-white/10 bg-ink-950/60 p-2.5 text-xs space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-white">
                                {m.player1.name} vs {m.player2.name}
                              </span>
                              <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono text-gold-300">
                                {m.submittedScore || m.status.replace('_', ' ')}
                              </span>
                            </div>
                            {m.proofNote && (
                              <p className="text-[11px] text-slate-400">{m.proofNote}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  db.approveMatchResult(
                                    t.id,
                                    m.id,
                                    m.player1.id,
                                    Math.max(p1Score, p2Score + 1),
                                    Math.min(p1Score, p2Score)
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg bg-success-500/20 hover:bg-success-500/35 border border-success-500/30 px-2.5 py-1 text-[11px] font-bold text-success-300 cursor-pointer"
                              >
                                <Check className="h-3 w-3" /> Approve {m.player1.name}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  db.approveMatchResult(
                                    t.id,
                                    m.id,
                                    m.player2.id,
                                    Math.min(p1Score, p2Score),
                                    Math.max(p2Score, p1Score + 1)
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg bg-primary-500/20 hover:bg-primary-500/35 border border-primary-500/30 px-2.5 py-1 text-[11px] font-bold text-primary-300 cursor-pointer"
                              >
                                <Check className="h-3 w-3" /> Approve {m.player2.name}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400">
                      Status: <strong className="text-white capitalize">{t.status}</strong> &bull; Entry:{' '}
                      <strong className="text-emerald-300">0 ETB (Free)</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const newStatus =
                            t.status === 'open' ? 'live' : t.status === 'live' ? 'completed' : 'open';
                          db.updateTournament({ ...t, status: newStatus });
                        }}
                        className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1 text-xs font-bold text-white cursor-pointer"
                      >
                        Cycle Status ({t.status})
                      </button>

                      {confirmDeleteTourneyId === t.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              db.deleteTournament(t.id);
                              setConfirmDeleteTourneyId(null);
                            }}
                            className="rounded-lg bg-error-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-error-400 cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteTourneyId(null)}
                            className="rounded-lg border border-white/15 px-2 py-1 text-[11px] text-slate-300 hover:text-white cursor-pointer"
                          >
                            Keep
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteTourneyId(t.id)}
                          aria-label={`Delete tournament ${t.title}`}
                          title="Delete Tournament"
                          className="rounded-lg p-1.5 text-slate-400 hover:text-error-400 hover:bg-white/10 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 6: HTML5 GAMES */}
        {activeTab === 'games' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-display font-bold text-white text-lg">Playable HTML5 Game Catalog</h3>
              <p className="text-xs text-slate-400">
                {ONLINE_GAMES.length} browser games verified for low-spec Ethiopian devices.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ONLINE_GAMES.slice(0, 15).map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.02]"
                >
                  <ResilientImage src={g.coverImage} alt={g.title} className="h-12 w-12 rounded-lg object-cover shrink-0" />
                  <div className="truncate flex-1">
                    <span className="font-bold text-white text-xs block truncate">{g.title}</span>
                    <span className="text-[10px] text-slate-400">
                      {g.category} &bull; {g.genre}
                    </span>
                  </div>
                  <span className="rounded bg-success-500/20 text-success-300 text-[10px] font-bold px-2 py-0.5">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: NEWS */}
        {activeTab === 'news' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-white text-lg">Gaming News Articles</h3>
                <p className="text-xs text-slate-400">Publish patch notes and announcements.</p>
              </div>
              <button
                type="button"
                onClick={() => setNewArticleModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2 text-xs font-bold text-ink-950 hover:bg-primary-400 shadow-glow cursor-pointer"
              >
                <Plus className="h-4 w-4" /> New Article
              </button>
            </div>

            <div className="space-y-3">
              {news.map((n) => (
                <div
                  key={n.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.02] text-xs"
                >
                  <div>
                    <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-slate-400">
                      {n.category}
                    </span>
                    <h4 className="font-bold text-white text-sm mt-1">{n.title}</h4>
                    <span className="text-[11px] text-slate-500">{n.publishedAt}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => db.deleteNews(n.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-error-400 hover:bg-white/10 cursor-pointer"
                    title="Delete Article"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: USERS */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-display font-bold text-white text-lg">Registered Users, Verified IDs &amp; Enforcement</h3>
              <p className="text-xs text-slate-400">
                Inspect Ethiopian Fayda/FIDO verification status, bound HWID hashes, and apply fair-play account suspensions.
              </p>
            </div>

            <div className="space-y-3">
              {users.map((u) => {
                const isSelfAdmin =
                  u.id === currentUser?.id || (u.email || '').trim().toLowerCase() === ADMIN_EMAIL;
                return (
                  <div
                    key={u.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.02] text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        src={u.avatar}
                        name={u.gamerTag}
                        size="md"
                        className="rounded-full"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-white text-sm">{u.gamerTag}</span>
                          {u.identityVerified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                              <Fingerprint className="h-3 w-3" /> {u.identityType === 'passport' ? 'Passport' : 'Ethiopian ID'}: {u.identityMasked || 'Verified'}
                            </span>
                          ) : (
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-400">
                              Unverified ID
                            </span>
                          )}
                          {(u.isFlaggedForReview || (u.identityMismatchWarnings || 0) > 0) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                              <AlertTriangle className="h-3 w-3" /> Flagged ({u.identityMismatchWarnings || 0}/3 Mismatch)
                            </span>
                          )}
                          {u.isBanned && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-error-500/25 border border-error-400/40 px-2 py-0.5 text-[10px] font-bold text-error-200">
                              <Ban className="h-3 w-3" /> Banned
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          {maskEmailAddress(u.email || u.username)} &bull; {u.loyaltyPoints.toLocaleString()} XP &bull; HWID:{' '}
                          <span className="text-primary-300">{formatShortHash(u.hwidHash)}</span>
                        </div>
                        {u.isBanned && u.banReason && (
                          <div className="text-[11px] text-error-300 mt-0.5">Reason: {u.banReason}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-accent-500/20 text-accent-300'
                            : 'bg-primary-500/20 text-primary-300'
                        }`}
                      >
                        {u.role}
                      </span>

                      {u.identityVerified && (
                        <button
                          type="button"
                          onClick={() => db.revokeUserIdentity(u.id)}
                          className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/25 cursor-pointer"
                        >
                          Revoke ID
                        </button>
                      )}

                      {!isSelfAdmin && (
                        u.isBanned ? (
                          <button
                            type="button"
                            onClick={() => db.setUserBanStatus(u.id, false)}
                            className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25 cursor-pointer"
                          >
                            Unban User
                          </button>
                        ) : confirmBanUserId === u.id ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <input
                              type="text"
                              aria-label={`Ban reason for ${u.gamerTag}`}
                              value={banReasonDraft}
                              onChange={(e) => setBanReasonDraft(e.target.value)}
                              placeholder="Ban reason..."
                              className="rounded-lg border border-error-400/40 bg-ink-950 px-2.5 py-1 text-[11px] text-white"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                db.setUserBanStatus(u.id, true, banReasonDraft);
                                setConfirmBanUserId(null);
                                setBanReasonDraft('');
                              }}
                              className="rounded-lg bg-error-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-error-400 cursor-pointer"
                            >
                              Confirm Ban
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmBanUserId(null);
                                setBanReasonDraft('');
                              }}
                              className="rounded-lg border border-white/15 px-2 py-1 text-[11px] text-slate-300 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmBanUserId(u.id);
                              setBanReasonDraft('Multi-account smurfing / fair-play violation');
                            }}
                            className="rounded-lg border border-error-500/40 bg-error-500/15 px-2.5 py-1 text-[11px] font-bold text-error-300 hover:bg-error-500/25 cursor-pointer"
                          >
                            Ban User
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Edit Product Price Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-ink-950/80 backdrop-blur-md"
            aria-hidden="true"
            onClick={() => setEditingProduct(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-edit-price-title"
            className="relative z-10 w-full max-w-sm max-h-[90vh] overflow-y-auto my-auto rounded-2xl border border-white/15 bg-ink-900 shadow-2xl p-4 sm:p-6 space-y-4"
          >
            <h3 id="admin-edit-price-title" className="font-display font-bold text-white text-base">
              Update Price — {editingProduct.name}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const parsed = Number(editPriceValue);
                if (Number.isFinite(parsed) && parsed > 0) {
                  db.updateProduct({ ...editingProduct, priceETB: parsed });
                }
                setEditingProduct(null);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label htmlFor="admin-edit-price-input" className="block text-slate-300 font-semibold mb-1">Price (ETB)</label>
                <input
                  id="admin-edit-price-input"
                  type="number"
                  min={1}
                  required
                  value={editPriceValue}
                  onChange={(e) => setEditPriceValue(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/15 p-2.5 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-3 py-1.5 text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary-500 font-bold text-ink-950 cursor-pointer"
                >
                  Save Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Product Modal */}
      {newProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-ink-950/80 backdrop-blur-md"
            aria-hidden="true"
            onClick={() => setNewProductModal(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-new-product-title"
            className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto my-auto rounded-2xl border border-white/15 bg-ink-900 shadow-2xl p-4 sm:p-6 space-y-4"
          >
            <h3 id="admin-new-product-title" className="font-display font-bold text-white text-base">Add New Top-Up Package</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement & {
                  gameId: { value: string };
                  name: { value: string };
                  category: { value: ProductItem['category'] };
                  amount: { value: string };
                  unit: { value: string };
                  price: { value: string };
                  desc: { value: string };
                };
                db.createProduct({
                  gameId: form.gameId.value,
                  gameName:
                    form.gameId.value === 'freefire'
                      ? 'Free Fire'
                      : form.gameId.value === 'pubg'
                      ? 'PUBG Mobile'
                      : 'EA SPORTS FC',
                  name: form.name.value,
                  category: form.category.value,
                  amount: Number(form.amount.value),
                  unit: form.unit.value,
                  priceETB: Number(form.price.value),
                  inStock: true,
                  description: form.desc.value,
                });
                setNewProductModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label htmlFor="admin-np-game" className="block text-slate-300 font-semibold mb-1">Game</label>
                <select id="admin-np-game" name="gameId" className="w-full rounded-xl bg-ink-950 border border-white/15 p-2 text-white">
                  <option value="freefire">Free Fire</option>
                  <option value="pubg">PUBG Mobile</option>
                  <option value="eafc">EA SPORTS FC</option>
                </select>
              </div>
              <div>
                <label htmlFor="admin-np-name" className="block text-slate-300 font-semibold mb-1">Package Name</label>
                <input
                  id="admin-np-name"
                  name="name"
                  required
                  placeholder="e.g. 1,060 Diamonds"
                  className="w-full rounded-xl bg-white/5 border border-white/15 p-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="admin-np-cat" className="block text-slate-300 font-semibold mb-1">Category</label>
                  <select id="admin-np-cat" name="category" className="w-full rounded-xl bg-ink-950 border border-white/15 p-2 text-white">
                    <option value="Diamonds">Diamonds</option>
                    <option value="UC">UC</option>
                    <option value="FC Points">FC Points</option>
                    <option value="Membership">Membership</option>
                    <option value="Pass">Pass</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="admin-np-amount" className="block text-slate-300 font-semibold mb-1">Amount</label>
                  <input
                    id="admin-np-amount"
                    name="amount"
                    type="number"
                    defaultValue={100}
                    className="w-full rounded-xl bg-white/5 border border-white/15 p-2 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="admin-np-unit" className="block text-slate-300 font-semibold mb-1">Unit</label>
                  <input
                    id="admin-np-unit"
                    name="unit"
                    defaultValue="Diamonds"
                    className="w-full rounded-xl bg-white/5 border border-white/15 p-2 text-white"
                  />
                </div>
                <div>
                  <label htmlFor="admin-np-price" className="block text-slate-300 font-semibold mb-1">Price in ETB</label>
                  <input
                    id="admin-np-price"
                    name="price"
                    type="number"
                    defaultValue={130}
                    className="w-full rounded-xl bg-white/5 border border-white/15 p-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="admin-np-desc" className="block text-slate-300 font-semibold mb-1">Description</label>
                <input
                  id="admin-np-desc"
                  name="desc"
                  defaultValue="Instant delivery to player ID"
                  className="w-full rounded-xl bg-white/5 border border-white/15 p-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewProductModal(false)}
                  className="px-3 py-1.5 text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary-500 font-bold text-ink-950 cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New News Article Modal */}
      {newArticleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-ink-950/80 backdrop-blur-md"
            aria-hidden="true"
            onClick={() => setNewArticleModal(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-new-article-title"
            className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto my-auto rounded-2xl border border-white/15 bg-ink-900 shadow-2xl p-4 sm:p-6 space-y-4"
          >
            <h3 id="admin-new-article-title" className="font-display font-bold text-white text-base">Publish News Article</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement & {
                  title: { value: string };
                  category: { value: NewsArticle['category'] };
                  summary: { value: string };
                };
                db.createNews({
                  title: form.title.value.trim(),
                  category: form.category.value,
                  summary: form.summary.value.trim(),
                  content: form.summary.value.trim(),
                  image:
                    'https://images.pexels.com/photos/7862508/pexels-photo-7862508.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                  source: 'GameZoneET Admin Desk',
                  sourceUrl: 'https://gamezone.et',
                  publishedAt: new Date().toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }),
                  readTime: '2 min read',
                });
                setNewArticleModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label htmlFor="admin-na-title" className="block text-slate-300 font-semibold mb-1">Article Title</label>
                <input
                  id="admin-na-title"
                  name="title"
                  required
                  placeholder="e.g. Addis Clash Squad Qualifier Schedule"
                  className="w-full rounded-xl bg-white/5 border border-white/15 p-2 text-white"
                />
              </div>
              <div>
                <label htmlFor="admin-na-cat" className="block text-slate-300 font-semibold mb-1">Category</label>
                <select id="admin-na-cat" name="category" className="w-full rounded-xl bg-ink-950 border border-white/15 p-2 text-white">
                  <option value="Ethiopian Esports">Ethiopian Esports</option>
                  <option value="Free Fire">Free Fire</option>
                  <option value="PUBG Mobile">PUBG Mobile</option>
                  <option value="EA SPORTS FC">EA SPORTS FC</option>
                  <option value="Platform Update">Platform Update</option>
                </select>
              </div>
              <div>
                <label htmlFor="admin-na-summary" className="block text-slate-300 font-semibold mb-1">Summary</label>
                <textarea
                  id="admin-na-summary"
                  name="summary"
                  required
                  rows={3}
                  defaultValue="New competitive announcement for Ethiopian players."
                  className="w-full rounded-xl bg-white/5 border border-white/15 p-2 text-white resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewArticleModal(false)}
                  className="px-3 py-1.5 text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary-500 font-bold text-ink-950 cursor-pointer"
                >
                  Publish Article
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Free Tournament Modal */}
      {newTournamentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-ink-950/80 backdrop-blur-md"
            aria-hidden="true"
            onClick={() => setNewTournamentModal(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-new-tourney-title"
            className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto my-auto rounded-2xl border border-white/15 bg-ink-900 shadow-2xl p-4 sm:p-6 space-y-4"
          >
            <h3 id="admin-new-tourney-title" className="font-display font-bold text-white text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-gold-400" aria-hidden="true" /> Create Free Esports Tournament
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement & {
                  gameId: { value: 'freefire' | 'pubg' | 'eafc' };
                  title: { value: string };
                  format: { value: TournamentEntity['format'] };
                  entryMode: { value: 'solo' | 'squad' | 'either' };
                  capacity: { value: string };
                  date: { value: string };
                  startTime: { value: string };
                  prizeRecognition: { value: string };
                  description: { value: string };
                  roomId: { value: string };
                  roomPassword: { value: string };
                  server: { value: string };
                  unlockMode: { value: 'immediate' | 'at_start' };
                  publishImmediately: { checked: boolean };
                };
                const gameId = form.gameId.value;
                const gameName =
                  gameId === 'freefire'
                    ? 'Free Fire'
                    : gameId === 'pubg'
                    ? 'PUBG Mobile'
                    : 'EA SPORTS FC';
                const bannerMap: Record<'freefire' | 'pubg' | 'eafc', string> = {
                  freefire:
                    'https://images.pexels.com/photos/7862508/pexels-photo-7862508.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                  pubg:
                    'https://images.pexels.com/photos/36899796/pexels-photo-36899796.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                  eafc:
                    'https://images.pexels.com/photos/30651230/pexels-photo-30651230.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                };
                const cap = Math.max(4, Math.min(128, Number(form.capacity.value) || 16));
                const publishNow = Boolean(form.publishImmediately?.checked);
                const unlockRule = form.unlockMode?.value === 'immediate' ? 'immediate' : 'at_start';
                db.createTournament({
                  gameId,
                  gameName,
                  title: form.title.value.trim(),
                  banner: bannerMap[gameId],
                  format: form.format.value,
                  entryMode: form.entryMode.value,
                  date: form.date.value.trim() || 'April 4, 2026',
                  startTime: form.startTime.value.trim() || '7:30 PM (EAT Addis Ababa)',
                  capacity: cap,
                  registeredCount: 0,
                  status: 'open',
                  lobbyStatus: publishNow && unlockRule === 'immediate' ? 'lobby_open' : 'waiting',
                  currentMatchLabel: 'Round 1 · Registration Open',
                  prizeRecognition:
                    form.prizeRecognition.value.trim() ||
                    'Champion Trophy Badge + 3,000 Platform XP',
                  organizer: 'GameZoneET Esports Committee',
                  description:
                    form.description.value.trim() ||
                    '100% Free Ethiopian community cup with automatic bracket progression.',
                  rules: [
                    '100% Free entry — zero fees and zero wagering.',
                    'Mobile & verified accounts only. No third-party mods or emulators.',
                    'Check in 15 minutes prior to start time EAT for Room ID unlock.',
                  ],
                  schedule: [
                    `${form.date.value.trim() || 'Match Day'} — Lobby Check-In & Seed Lock`,
                    `${form.startTime.value.trim() || '7:30 PM EAT'} — Bracket Kickoff`,
                  ],
                  faqs: [
                    {
                      q: 'Is there any entry fee?',
                      a: 'No! All GameZoneET tournaments are 100% free.',
                    },
                  ],
                  roomCredentials: {
                    roomId: form.roomId.value.trim() || `GZ-${gameId.toUpperCase()}-512`,
                    roomPassword: form.roomPassword.value.trim() || 'ET2026',
                    server: form.server.value.trim() || 'Africa (Addis Ababa)',
                    published: publishNow,
                    unlockMode: unlockRule,
                    unlockAt: `${form.date.value.trim() || 'Match Day'} ${form.startTime.value.trim() || '7:30 PM EAT'}`,
                    publishedAt: publishNow ? 'Published at Launch' : undefined,
                  },
                });
                setNewTournamentModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-300">Entry Fee: 0 ETB (100% Free)</span>
                <span className="text-[11px] text-slate-300">No payment gateway required</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="admin-nt-game" className="block text-slate-300 font-semibold mb-1">Game Title</label>
                  <select id="admin-nt-game" name="gameId" className="w-full rounded-xl bg-ink-950 border border-white/15 p-2 text-white">
                    <option value="freefire">Free Fire</option>
                    <option value="pubg">PUBG Mobile</option>
                    <option value="eafc">EA SPORTS FC</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="admin-nt-format" className="block text-slate-300 font-semibold mb-1">Format</label>
                  <select id="admin-nt-format" name="format" className="w-full rounded-xl bg-ink-950 border border-white/15 p-2 text-white">
                    <option value="Single Elimination 1v1">Single Elimination 1v1</option>
                    <option value="Squad Battle Royale">Squad Battle Royale</option>
                    <option value="Double Elimination">Double Elimination</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="admin-nt-title" className="block text-slate-300 font-semibold mb-1">Tournament Name</label>
                <input
                  id="admin-nt-title"
                  name="title"
                  required
                  placeholder="e.g. Addis Weekend Clash Cup"
                  className="w-full rounded-xl bg-white/5 border border-white/15 p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label htmlFor="admin-nt-mode" className="block text-slate-300 font-semibold mb-1">Entry Mode</label>
                  <select id="admin-nt-mode" name="entryMode" className="w-full rounded-xl bg-ink-950 border border-white/15 p-2 text-white">
                    <option value="either">Solo or Squad</option>
                    <option value="solo">Solo Only</option>
                    <option value="squad">Squad Only</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="admin-nt-capacity" className="block text-slate-300 font-semibold mb-1">Capacity (Slots)</label>
                  <input
                    id="admin-nt-capacity"
                    name="capacity"
                    type="number"
                    min={4}
                    max={128}
                    defaultValue={16}
                    className="w-full rounded-xl bg-white/5 border border-white/15 p-2 text-white"
                  />
                </div>
                <div>
                  <label htmlFor="admin-nt-date" className="block text-slate-300 font-semibold mb-1">Date</label>
                  <input
                    id="admin-nt-date"
                    name="date"
                    defaultValue="April 12, 2026"
                    className="w-full rounded-xl bg-white/5 border border-white/15 p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="admin-nt-start" className="block text-slate-300 font-semibold mb-1">Start Time (EAT)</label>
                  <input
                    id="admin-nt-start"
                    name="startTime"
                    defaultValue="7:30 PM (EAT Addis Ababa)"
                    className="w-full rounded-xl bg-white/5 border border-white/15 p-2 text-white"
                  />
                </div>
                <div>
                  <label htmlFor="admin-nt-prize" className="block text-slate-300 font-semibold mb-1">Prize Recognition</label>
                  <input
                    id="admin-nt-prize"
                    name="prizeRecognition"
                    defaultValue="Champion Trophy Badge + 4,000 XP"
                    className="w-full rounded-xl bg-white/5 border border-white/15 p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label htmlFor="admin-nt-roomid" className="block text-slate-300 font-semibold mb-1">Initial Room ID</label>
                  <input
                    id="admin-nt-roomid"
                    name="roomId"
                    defaultValue="GZ-CUP-2026"
                    className="w-full rounded-xl bg-white/5 border border-white/15 p-2 font-mono text-white"
                  />
                </div>
                <div>
                  <label htmlFor="admin-nt-roompw" className="block text-slate-300 font-semibold mb-1">Room Password</label>
                  <input
                    id="admin-nt-roompw"
                    name="roomPassword"
                    defaultValue="ET2026"
                    className="w-full rounded-xl bg-white/5 border border-white/15 p-2 font-mono text-white"
                  />
                </div>
                <div>
                  <label htmlFor="admin-nt-server" className="block text-slate-300 font-semibold mb-1">Server Region</label>
                  <input
                    id="admin-nt-server"
                    name="server"
                    defaultValue="Africa (Addis Ababa)"
                    className="w-full rounded-xl bg-white/5 border border-white/15 p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
                <div>
                  <label htmlFor="admin-nt-unlock" className="block text-slate-300 font-semibold mb-1">Room Unlock Rule</label>
                  <select id="admin-nt-unlock" name="unlockMode" defaultValue="immediate" className="w-full rounded-xl bg-ink-950 border border-white/15 p-2 text-white">
                    <option value="immediate">Immediate (Once Published)</option>
                    <option value="at_start">At Match Start / Lobby Open</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 cursor-pointer text-slate-200">
                  <input
                    type="checkbox"
                    name="publishImmediately"
                    className="h-4 w-4 rounded border-white/30 bg-ink-950 accent-primary-500"
                  />
                  <span className="font-semibold">Publish Room Code Immediately</span>
                </label>
              </div>

              <div>
                <label htmlFor="admin-nt-desc" className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  id="admin-nt-desc"
                  name="description"
                  rows={2}
                  defaultValue="Zero-fee community competition for Ethiopian gamers with automatic bracket tracking."
                  className="w-full rounded-xl bg-white/5 border border-white/15 p-2 text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewTournamentModal(false)}
                  className="px-3 py-1.5 text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary-500 font-bold text-ink-950 cursor-pointer shadow-glow"
                >
                  Launch Free Tournament
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
