import { Bot, KeyRound, Server, Ticket, Cpu } from 'lucide-react';
import type { NhiType } from '@/mocks/types';

const ICONS: Record<NhiType, typeof Bot> = {
  'ai-agent': Bot,
  'service-account': Server,
  'api-key': KeyRound,
  'oauth-token': Ticket,
  'workload-identity': Cpu,
};

/** A glyph for each NHI type. AI agents lead the product, so Bot reads first. */
export function NhiTypeIcon({ type, className }: { type: NhiType; className?: string }) {
  const Icon = ICONS[type];
  return <Icon className={className ?? 'h-4 w-4'} aria-hidden="true" />;
}
