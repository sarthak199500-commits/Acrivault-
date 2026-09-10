import {
  Activity,
  Bell,
  BookOpen,
  Boxes,
  Building2,
  ClipboardCheck,
  Clock,
  Database,
  GitBranch,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  RefreshCw,
  ScrollText,
  Settings,
  ShieldHalf,
  ShieldX,
  Sparkles,
  UserRound,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  /**
   * Rail label. May be a shortened form of the canonical name where the rail
   * cannot hold it; when it is, `title` carries the canonical name.
   */
  label: string;
  /** Canonical screen name — the h1 and the document title. Defaults to `label`. */
  title?: string;
  /**
   * The module-spec name this screen sits inside (an FRS pillar). Omitted when
   * the screen *is* the pillar, which is what drops it from the eyebrow.
   */
  pillar?: string;
  icon: LucideIcon;
  concept?: boolean;
  end?: boolean;
}

export interface NavGroup {
  /** Layer label shown as an eyebrow. */
  layer: string;
  items: NavItem[];
}

/**
 * Act > Approvals. Named because the rail decorates this ONE destination with a
 * live pending count (see AppShell's SideNav), and a bare string literal
 * compared in a render path is the kind of coupling that silently stops matching
 * when a route moves.
 *
 * Deliberately not a general `NavItem.count` field: nav.ts is a plain data
 * module with no React in it, so it cannot express "fetch this number", and a
 * lookup table with one entry is machinery without a payer. A second counted
 * destination is when that changes.
 */
export const APPROVALS_ROUTE = '/act/approvals';

export const NAV: NavGroup[] = [
  {
    layer: 'See',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/discover', label: 'Identity Inventory', pillar: 'Discover', icon: Boxes },
    ],
  },
  {
    layer: 'Know',
    items: [
      // Rail label follows the h1: the screen is Policies, the pillar is Govern.
      { to: '/govern', label: 'Policies', pillar: 'Govern', icon: ListChecks },
      { to: '/monitor', label: 'Monitor', pillar: 'Monitor', icon: Activity },
      { to: '/intelligence', label: 'Agent Sessions', pillar: 'Intelligence', icon: Sparkles },
      { to: '/resilience/blast-radius', label: 'Blast Radius', pillar: 'Resilience', icon: GitBranch },
      // Shortened rail labels; `title` carries the canonical name.
      { to: '/resilience/rehearsals', label: 'Rehearsals', title: 'Recovery Rehearsals', pillar: 'Resilience', icon: ShieldHalf, concept: true },
      { to: '/resilience/copilot', label: 'Copilot', title: 'Defender Copilot', pillar: 'Resilience', icon: Workflow, concept: true },
    ],
  },
  {
    layer: 'Act',
    items: [
      { to: '/rotate', label: 'Rotate', pillar: 'Rotate', icon: RefreshCw },
      { to: '/act/quarantine', label: 'Quarantine', pillar: 'Quarantine', icon: ShieldX },
      // No `pillar`, unlike its two siblings: Rotate and Quarantine are named
      // FRS pillars, Approvals is a screen inside the Act layer and not one.
      // Both encodings produce the eyebrow 'Act'; this one doesn't claim a
      // pillar the spec has never defined.
      { to: APPROVALS_ROUTE, label: 'Approvals', icon: ClipboardCheck },
    ],
  },
  {
    layer: 'Platform',
    items: [
      // Users and Sources used to sit here as well as being /settings/* routes
      // AND cards inside /settings — three entry points to one screen, with the
      // hierarchy expressed nowhere. They are settings panes now, reachable from
      // SETTINGS_NAV below and still findable in the command palette.
      { to: '/settings', label: 'Settings', icon: Settings },
      // Audit Log stays a rail destination: it is an auditor's working surface
      // with an export, not something anyone configures.
      { to: '/audit', label: 'Audit Log', icon: ScrollText },
      { to: '/notifications', label: 'Notifications', icon: Bell },
      { to: '/design-system', label: 'Design System', icon: BookOpen },
    ],
  },
];

export interface SettingsNavItem {
  to: string;
  /**
   * Tab label. Short on purpose — seven of these share one row, and the pane's
   * own h1 carries the full name, so the tab does not have to.
   */
  label: string;
  /** Canonical screen name — the pane's h1 and document title. Defaults to `label`. */
  title?: string;
  /**
   * Extra wording the command palette should match. The tab says "Clouds" and
   * the h1 says "Sources"; someone hunting for it will type neither.
   */
  keywords?: string;
  icon: LucideIcon;
}

export interface SettingsNavGroup {
  /** Named for the screen-reader group label and the divider it draws. */
  category: string;
  items: SettingsNavItem[];
}

/**
 * The panes inside Settings, grouped.
 *
 * One list, read by three consumers: the settings sub-nav, the command palette
 * (so collapsing the Platform rail above does not make a pane unfindable), and
 * SCREEN_INDEX below (so no pane file types its own eyebrow). The palette used
 * to hand-append `/settings/sso` for exactly this reason; deriving it from here
 * means the next pane added is searchable without anyone remembering to.
 *
 * No capability gating: every role may VIEW every pane. What a role cannot
 * change is refused inside the pane, with the RoleRestricted sentence naming
 * the role and the remedy — a tab that vanishes tells the reader nothing.
 *
 * TWO groups, not four. The sub-nav is one tab row now, so a group buys a
 * divider and a screen-reader label rather than a heading — and the only split
 * that earns one is what is yours versus what is the organization's.
 */
export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    category: 'Account',
    items: [
      {
        to: '/settings/account',
        label: 'Account',
        title: 'Your account',
        keywords: 'profile me my password mfa authenticator sign-in method',
        icon: UserRound,
      },
      {
        to: '/settings/notifications',
        label: 'Notifications',
        title: 'Notification Preferences',
        keywords: 'preferences email digest routing alerts delivery',
        icon: Bell,
      },
    ],
  },
  {
    category: 'Organization',
    items: [
      {
        to: '/settings/general',
        label: 'General',
        title: 'Organization',
        keywords: 'tenant organisation domains retention ownership transfer',
        icon: Building2,
      },
      {
        to: '/settings/sso',
        label: 'Sign-in',
        title: 'Sign-in & SSO',
        keywords: 'sso saml scim entra single sign-on federation',
        icon: KeyRound,
      },
      {
        to: '/settings/sessions',
        label: 'Sessions',
        title: 'Sessions & Access',
        keywords: 'sessions access idle timeout step-up mfa by role',
        icon: Clock,
      },
      {
        to: '/settings/users',
        label: 'Users',
        title: 'Manage Users',
        keywords: 'people roles suspend invite',
        icon: Users,
      },
      {
        to: '/settings/sources',
        label: 'Clouds',
        title: 'Sources',
        keywords: 'connected clouds sources aws azure gcp connectors sync',
        icon: Database,
      },
    ],
  },
];

/** Flat list of settings panes, for the command palette and the screen index. */
export const ALL_SETTINGS_ITEMS: SettingsNavItem[] = SETTINGS_NAV.flatMap((g) => g.items);

/** The pane a bare /settings lands on. */
export const SETTINGS_INDEX_ROUTE = '/settings/account';

/** Flat list used by the command palette and the route announcer. */
export const ALL_NAV_ITEMS: (NavItem & { layer: string })[] = NAV.flatMap((g) =>
  g.items.map((i) => ({ ...i, layer: g.layer })),
);

export interface ScreenIdentity {
  layer: string;
  pillar?: string;
  /** Canonical screen name — the h1 and the document title. */
  title: string;
  /** `Layer · Pillar`, with the pillar dropped when the screen is its own pillar. */
  eyebrow: string;
}

/**
 * In-shell screens that are not rail destinations. Same shape as a NavItem's
 * identity, so one rule covers them too and no screen file types its own eyebrow.
 */
const EXTRA_SCREENS: Record<string, { layer: string; pillar?: string; title: string }> = {
  // Deliberately outside the four layers: onboarding is a one-time setup flow,
  // not a place in the product.
  '/onboarding': { layer: 'Get started', title: 'Onboarding & Connect' },
  '/govern/builder': { layer: 'Know', pillar: 'Govern', title: 'Policy Builder' },
  // Every settings pane is folded in below, derived from SETTINGS_NAV. Adding
  // one there gives it an eyebrow, a document title and a palette entry at once.
  ...Object.fromEntries(
    SETTINGS_NAV.flatMap((group) =>
      group.items.map((item) => [
        item.to,
        { layer: 'Platform', pillar: 'Settings', title: item.title ?? item.label },
      ]),
    ),
  ),
};

function identityOf(v: { layer: string; pillar?: string; title: string }): ScreenIdentity {
  return { ...v, eyebrow: v.pillar && v.pillar !== v.title ? `${v.layer} · ${v.pillar}` : v.layer };
}

const SCREEN_INDEX: Record<string, ScreenIdentity> = {
  ...Object.fromEntries(Object.entries(EXTRA_SCREENS).map(([to, v]) => [to, identityOf(v)])),
  ...Object.fromEntries(
    ALL_NAV_ITEMS.map((i) => [
      i.to,
      identityOf({ layer: i.layer, pillar: i.pillar, title: i.title ?? i.label }),
    ]),
  ),
};

const FALLBACK: ScreenIdentity = { layer: 'Acrivault', title: 'Acrivault', eyebrow: 'Acrivault' };

/** The canonical identity of the screen at `pathname`, resolving children to their parent. */
export function screenIdentity(pathname: string): ScreenIdentity {
  const exact = SCREEN_INDEX[pathname];
  if (exact) return exact;
  const prefix = Object.keys(SCREEN_INDEX)
    .filter((to) => to !== '/' && pathname.startsWith(to))
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? SCREEN_INDEX[prefix] : FALLBACK;
}

/** Eyebrow + title to spread onto ScreenHeader for an index screen. */
export function screenHeaderProps(route: string): { eyebrow: string; title: string } {
  const { eyebrow, title } = screenIdentity(route);
  return { eyebrow, title };
}

/**
 * Eyebrow for a detail screen: the layer plus the parent screen's name. A detail
 * h1 names the record, so the pillar is dropped to keep the trail two deep.
 */
export function detailEyebrow(parentRoute: string): string {
  const parent = screenIdentity(parentRoute);
  return `${parent.layer} · ${parent.title}`;
}

/**
 * Document titles for the public registration and authentication routes, which
 * live outside the app shell and so have no place in the layer taxonomy.
 */
export const AUTH_TITLES: Record<string, string> = {
  '/register': 'Request Access',
  '/register/verify': 'Verify Email',
  '/register/domain': 'Verify Domain',
  '/register/terms': 'Legal Terms',
  '/register/complete': 'Welcome to Acrivault',
  '/register/password': 'Create your password',
  '/login': 'Sign in',
  '/mfa/setup': 'Set up authentication',
  '/mfa/challenge': 'Verify it’s you',
  '/forgot-password': 'Reset your password',
  // Explicit: the prefix fallback would otherwise title this "Reset your password".
  '/forgot-password/verify': 'Enter your recovery code',
  '/reset-password': 'Set a new password',
};
