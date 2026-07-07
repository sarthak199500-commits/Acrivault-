import { Rows3, Rows4 } from 'lucide-react';
import { useUiStore } from '@/stores/ui';
import { IconButton } from './IconButton';

export function DensityToggle() {
  const density = useUiStore((s) => s.density);
  const setDensity = useUiStore((s) => s.setDensity);
  const next = density === 'comfortable' ? 'compact' : 'comfortable';
  return (
    <IconButton label={`Switch to ${next} density`} onClick={() => setDensity(next)}>
      {density === 'comfortable' ? <Rows3 className="h-4 w-4" /> : <Rows4 className="h-4 w-4" />}
    </IconButton>
  );
}
