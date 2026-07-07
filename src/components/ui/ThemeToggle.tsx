import { Moon, Sun } from 'lucide-react';
import { useUiStore } from '@/stores/ui';
import { announce } from '@/lib/a11y';
import { IconButton } from './IconButton';

export function ThemeToggle() {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <IconButton
      label={`Switch to ${next} theme`}
      onClick={() => {
        toggleTheme();
        announce(`${next.charAt(0).toUpperCase() + next.slice(1)} theme enabled`);
      }}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </IconButton>
  );
}
