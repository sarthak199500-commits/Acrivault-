import {
  Activity,
  Bell,
  BookOpen,
  Boxes,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  RefreshCw,
  ScrollText,
  Settings,
  ShieldHalf,
  Sparkles,
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
    items: [{ to: '/rotate', label: 'Rotate', pillar: 'Rotate', icon: RefreshCw }],
  },
  {
    layer: 'Platform',
    items: [
      { to: '/settings/users', label: 'Users', title: 'Manage Users', icon: Users },
      { to: '/settings', label: 'Settings', icon: Settings, end: true },
      { to: '/audit', label: 'Audit Log', icon: ScrollText },
      { to: '/notifications', label: 'Notifications', icon: Bell },
      { to: '/design-system', label: 'Design System', icon: BookOpen },
    ],
  },
];

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
  '/settings/sso': { layer: 'Platform', pillar: 'Settings', title: 'Sign-in & SSO' },
  '/govern/builder': { layer: 'Know', pillar: 'Govern', title: 'Policy Builder' },
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
