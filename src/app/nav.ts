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
  label: string;
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
      { to: '/discover', label: 'Identity Inventory', icon: Boxes },
    ],
  },
  {
    layer: 'Know',
    items: [
      { to: '/govern', label: 'Govern', icon: ListChecks },
      { to: '/monitor', label: 'Monitor', icon: Activity },
      { to: '/intelligence', label: 'Agent Sessions', icon: Sparkles },
      { to: '/resilience/blast-radius', label: 'Blast Radius', icon: GitBranch },
      // Shortened nav labels so the label + Concept badge fit the rail without truncating.
      // Full names ("Recovery Rehearsals", "Defender Copilot") are set in EXTRA_TITLES and on each page.
      { to: '/resilience/rehearsals', label: 'Rehearsals', icon: ShieldHalf, concept: true },
      { to: '/resilience/copilot', label: 'Copilot', icon: Workflow, concept: true },
    ],
  },
  {
    layer: 'Act',
    items: [{ to: '/rotate', label: 'Rotate', icon: RefreshCw }],
  },
  {
    layer: 'Platform',
    items: [
      { to: '/settings/users', label: 'Users', icon: Users },
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

export const EXTRA_TITLES: Record<string, string> = {
  '/onboarding': 'Onboarding & Connect',
  '/settings/sso': 'Sign-in & SSO',
  '/settings/users': 'Manage Users',
  '/resilience/rehearsals': 'Recovery Rehearsals',
  '/resilience/copilot': 'Defender Copilot',
  // Registration & authentication (AuthLayout, outside the app shell).
  '/register': 'Request Access',
  '/register/verify': 'Verify Email',
  '/register/domain': 'Verify Domain',
  '/register/terms': 'Legal Terms',
  '/register/complete': 'Welcome to Acrivault',
  '/register/password': 'Create your password',
  '/login': 'Sign in',
  '/accept-invite': 'Accept Invitation',
  '/mfa/setup': 'Set up authentication',
  '/mfa/challenge': 'Verify it’s you',
  '/forgot-password': 'Reset your password',
  // Explicit: the prefix fallback would otherwise title this "Reset your password".
  '/forgot-password/verify': 'Enter your recovery code',
  '/reset-password': 'Set a new password',
};
