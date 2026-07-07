import {
  Accessibility, Activity, AlertCircle, AlertOctagon, AlertTriangle, ArrowDown,
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Ban,
  Bell, BellOff, BookOpen, Bookmark, BookmarkPlus, Bot,
  Boxes, Calendar, Check, CheckCheck, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, Circle, CircleCheck,
  Clock, Cloud, Copy, CornerDownLeft, Cpu, Database,
  Download, Eye, FileText, Filter, FilterX, FlaskConical,
  FolderPlus, GitBranch, GitCompareArrows, Home, Info, Key,
  KeyRound, Layers, LayoutDashboard, Lightbulb, Link2, ListChecks,
  Loader2, Lock, LogOut, MailCheck, Menu, MessageSquare,
  Minus, Moon, MoreHorizontal, Network, PanelLeftClose, PanelLeftOpen,
  Pencil, Play, Plus, Radar, RefreshCw, RotateCw,
  Rows3, Rows4, Save, ScrollText, Search, Send,
  Server, Settings, Settings2, Shield, ShieldAlert, ShieldCheck,
  ShieldHalf, ShieldX, SkipForward, Sparkles, Sun, Table,
  Ticket, Timer, Trash2, TriangleAlert, Unlink, Unlock,
  UserCheck, UserPlus, UserRound, Users, Workflow, Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';

/** The full scale-named type primitives, each shown in all four weights. */
export const TYPE_STEPS: { name: string; fs: string; lh: string; tracking?: string; spec: string }[] = [
  { name: 'Display 2xl', fs: '--fs-display-2xl', lh: '--lh-display-2xl', tracking: '--tracking-tighter', spec: '72 / 90 · -2%' },
  { name: 'Display xl', fs: '--fs-display-xl', lh: '--lh-display-xl', tracking: '--tracking-tighter', spec: '60 / 72 · -2%' },
  { name: 'Display lg', fs: '--fs-display-lg', lh: '--lh-display-lg', tracking: '--tracking-tighter', spec: '48 / 60 · -2%' },
  { name: 'Display md', fs: '--fs-display-md', lh: '--lh-display-md', tracking: '--tracking-tighter', spec: '36 / 44 · -2%' },
  { name: 'Display sm', fs: '--fs-display-sm', lh: '--lh-display-sm', spec: '30 / 38' },
  { name: 'Display xs', fs: '--fs-display-xs', lh: '--lh-display-xs', spec: '24 / 32' },
  { name: 'Text xl', fs: '--fs-text-xl', lh: '--lh-text-xl', spec: '20 / 30' },
  { name: 'Text lg', fs: '--fs-text-lg', lh: '--lh-text-lg', spec: '18 / 28' },
  { name: 'Text md', fs: '--fs-text-md', lh: '--lh-text-md', spec: '16 / 24' },
  { name: 'Text sm', fs: '--fs-text-sm', lh: '--lh-text-sm', spec: '14 / 20' },
  { name: 'Text xs', fs: '--fs-text-xs', lh: '--lh-text-xs', spec: '12 / 18' },
];

/** Role / product type tokens — the dense-console subset actually used in product
 *  (the full scale-named primitives live in TYPE_STEPS). */
export const PRODUCT_TYPE: { name: string; fs: string; lh?: string; spec: string; mono?: boolean }[] = [
  { name: 'Display', fs: '--fs-display', lh: '--lh-display', spec: '24 / 30' },
  { name: 'H1', fs: '--fs-h1', lh: '--lh-h1', spec: '20 / 28' },
  { name: 'H2', fs: '--fs-h2', lh: '--lh-h2', spec: '16 / 24' },
  { name: 'Body', fs: '--fs-body', lh: '--lh-body', spec: '14 / 20' },
  { name: 'Small', fs: '--fs-small', lh: '--lh-small', spec: '12 / 16' },
  { name: 'Micro', fs: '--fs-micro', lh: '--lh-micro', spec: '11 / 14' },
  { name: 'Code', fs: '--fs-code', spec: '13 · mono', mono: true },
];

/** Font-family tokens. */
export const FONT_FAMILIES: [string, string][] = [
  ['--font-ui', 'Inter · UI'],
  ['--font-mono', 'JetBrains Mono · code'],
];

/** Base semantic hues (theme-independent) that the badge triplets and charts build on. */
export const STATUS_HUES = ['success', 'warning', 'critical', 'info'] as const;

export const RADII: { name: string; varName: string }[] = [
  { name: 'none', varName: '--r-none' },
  { name: 'xs', varName: '--r-xs' },
  { name: 'sm', varName: '--r-sm' },
  { name: 'md', varName: '--r-md' },
  { name: 'lg', varName: '--r-lg' },
  { name: 'pill', varName: '--r-pill' },
];

export const RAMPS = [
  { name: 'green', label: 'Green · brand' },
  { name: 'neutral', label: 'Neutral · grayscale' },
  { name: 'red', label: 'Red · critical' },
  { name: 'amber', label: 'Amber · warning' },
  { name: 'blue', label: 'Blue · info' },
];
export const RAMP_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
export const SPACING: [string, number][] = [
  ['s-1', 4], ['s-2', 8], ['s-3', 12], ['s-4', 16], ['s-5', 20],
  ['s-6', 24], ['s-8', 32], ['s-10', 40], ['s-12', 48], ['s-16', 64],
];
export const SIZES: [string, number][] = [
  ['icon-sm', 14], ['icon-md', 16], ['icon-lg', 20],
  ['control-sm', 32], ['control-md', 36],
  ['avatar-sm', 28], ['avatar-md', 36], ['avatar-lg', 48],
  ['kpi-tile', 104],
];
export const SHADOWS = ['sm', 'md', 'lg', 'xl'];
export const BORDER_WIDTHS: [string, number][] = [['bw-1', 1], ['bw-2', 2]];
export const WEIGHTS: [string, number][] = [['regular', 400], ['medium', 500], ['semibold', 600], ['bold', 700]];
export const TRACKING: [string, string][] = [['tighter', '-0.02em'], ['tight', '-0.01em'], ['normal', '0'], ['wide', '0.02em'], ['eyebrow', '0.08em']];
export const MOTION: [string, string][] = [['dur-1', '120ms'], ['dur-2', '160ms'], ['dur-3', '240ms']];
export const ZINDEX: [string, number][] = [
  ['raised', 1], ['sticky', 1000], ['dropdown', 1100], ['overlay', 1200], ['modal', 1300],
  ['popover', 1400], ['toast', 1500], ['tooltip', 1600],
];
export const OPACITY: [string, number][] = [['faint', 0.4], ['disabled', 0.5], ['muted', 0.7]];
export const BLUR: [string, string][] = [['sm', '8px'], ['md', '16px']];
export const BREAKPOINTS: [string, number][] = [['sm', 640], ['md', 768], ['lg', 1024], ['xl', 1280], ['2xl', 1536]];
export const CATEGORICAL = ['cat-1', 'cat-2', 'cat-3', 'cat-4', 'cat-5', 'cat-6', 'cat-7', 'cat-8'];
export const LAYOUT_TOKENS: [string, string][] = [
  ['--sidebar-w', '248px'],
  ['--sidebar-collapsed-w', '64px'],
  ['--topbar-h', '56px'],
  ['--panel-w', '360px'],
  ['--rail-w', '320px'],
  ['--content-max', '1440px'],
];
export const ICON_SIZES: [string, number][] = [['icon-sm', 14], ['icon-md', 16], ['icon-lg', 20]];
/** Every Lucide glyph the app imports (auto-derived from src imports; keep in sync
 *  when new icons are used). Rendered as the iconography reference gallery. */
export const ICON_GALLERY: { name: string; Icon: LucideIcon }[] = [
  { name: 'Accessibility', Icon: Accessibility },
  { name: 'Activity', Icon: Activity },
  { name: 'AlertCircle', Icon: AlertCircle },
  { name: 'AlertOctagon', Icon: AlertOctagon },
  { name: 'AlertTriangle', Icon: AlertTriangle },
  { name: 'ArrowDown', Icon: ArrowDown },
  { name: 'ArrowDownRight', Icon: ArrowDownRight },
  { name: 'ArrowLeft', Icon: ArrowLeft },
  { name: 'ArrowRight', Icon: ArrowRight },
  { name: 'ArrowUp', Icon: ArrowUp },
  { name: 'ArrowUpRight', Icon: ArrowUpRight },
  { name: 'Ban', Icon: Ban },
  { name: 'Bell', Icon: Bell },
  { name: 'BellOff', Icon: BellOff },
  { name: 'BookOpen', Icon: BookOpen },
  { name: 'Bookmark', Icon: Bookmark },
  { name: 'BookmarkPlus', Icon: BookmarkPlus },
  { name: 'Bot', Icon: Bot },
  { name: 'Boxes', Icon: Boxes },
  { name: 'Calendar', Icon: Calendar },
  { name: 'Check', Icon: Check },
  { name: 'CheckCheck', Icon: CheckCheck },
  { name: 'CheckCircle2', Icon: CheckCircle2 },
  { name: 'ChevronDown', Icon: ChevronDown },
  { name: 'ChevronLeft', Icon: ChevronLeft },
  { name: 'ChevronRight', Icon: ChevronRight },
  { name: 'ChevronUp', Icon: ChevronUp },
  { name: 'ChevronsUpDown', Icon: ChevronsUpDown },
  { name: 'Circle', Icon: Circle },
  { name: 'CircleCheck', Icon: CircleCheck },
  { name: 'Clock', Icon: Clock },
  { name: 'Cloud', Icon: Cloud },
  { name: 'Copy', Icon: Copy },
  { name: 'CornerDownLeft', Icon: CornerDownLeft },
  { name: 'Cpu', Icon: Cpu },
  { name: 'Database', Icon: Database },
  { name: 'Download', Icon: Download },
  { name: 'Eye', Icon: Eye },
  { name: 'FileText', Icon: FileText },
  { name: 'Filter', Icon: Filter },
  { name: 'FilterX', Icon: FilterX },
  { name: 'FlaskConical', Icon: FlaskConical },
  { name: 'FolderPlus', Icon: FolderPlus },
  { name: 'GitBranch', Icon: GitBranch },
  { name: 'GitCompareArrows', Icon: GitCompareArrows },
  { name: 'Home', Icon: Home },
  { name: 'Info', Icon: Info },
  { name: 'Key', Icon: Key },
  { name: 'KeyRound', Icon: KeyRound },
  { name: 'Layers', Icon: Layers },
  { name: 'LayoutDashboard', Icon: LayoutDashboard },
  { name: 'Lightbulb', Icon: Lightbulb },
  { name: 'Link2', Icon: Link2 },
  { name: 'ListChecks', Icon: ListChecks },
  { name: 'Loader2', Icon: Loader2 },
  { name: 'Lock', Icon: Lock },
  { name: 'LogOut', Icon: LogOut },
  { name: 'MailCheck', Icon: MailCheck },
  { name: 'Menu', Icon: Menu },
  { name: 'MessageSquare', Icon: MessageSquare },
  { name: 'Minus', Icon: Minus },
  { name: 'Moon', Icon: Moon },
  { name: 'MoreHorizontal', Icon: MoreHorizontal },
  { name: 'Network', Icon: Network },
  { name: 'PanelLeftClose', Icon: PanelLeftClose },
  { name: 'PanelLeftOpen', Icon: PanelLeftOpen },
  { name: 'Pencil', Icon: Pencil },
  { name: 'Play', Icon: Play },
  { name: 'Plus', Icon: Plus },
  { name: 'Radar', Icon: Radar },
  { name: 'RefreshCw', Icon: RefreshCw },
  { name: 'RotateCw', Icon: RotateCw },
  { name: 'Rows3', Icon: Rows3 },
  { name: 'Rows4', Icon: Rows4 },
  { name: 'Save', Icon: Save },
  { name: 'ScrollText', Icon: ScrollText },
  { name: 'Search', Icon: Search },
  { name: 'Send', Icon: Send },
  { name: 'Server', Icon: Server },
  { name: 'Settings', Icon: Settings },
  { name: 'Settings2', Icon: Settings2 },
  { name: 'Shield', Icon: Shield },
  { name: 'ShieldAlert', Icon: ShieldAlert },
  { name: 'ShieldCheck', Icon: ShieldCheck },
  { name: 'ShieldHalf', Icon: ShieldHalf },
  { name: 'ShieldX', Icon: ShieldX },
  { name: 'SkipForward', Icon: SkipForward },
  { name: 'Sparkles', Icon: Sparkles },
  { name: 'Sun', Icon: Sun },
  { name: 'Table', Icon: Table },
  { name: 'Ticket', Icon: Ticket },
  { name: 'Timer', Icon: Timer },
  { name: 'Trash2', Icon: Trash2 },
  { name: 'TriangleAlert', Icon: TriangleAlert },
  { name: 'Unlink', Icon: Unlink },
  { name: 'Unlock', Icon: Unlock },
  { name: 'UserCheck', Icon: UserCheck },
  { name: 'UserPlus', Icon: UserPlus },
  { name: 'UserRound', Icon: UserRound },
  { name: 'Users', Icon: Users },
  { name: 'Workflow', Icon: Workflow },
  { name: 'Wrench', Icon: Wrench },
  { name: 'X', Icon: X },
];
