import { SessionAccessCard } from '../SessionAccessCard';
import { screenHeaderProps } from '@/app/nav';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

export function SessionsPane() {
  return (
    <div>
      <ScreenHeader
        {...screenHeaderProps('/settings/sessions')}
        description="How long a session lives, and what it takes to act inside one."
      />
      <SessionAccessCard />
    </div>
  );
}
