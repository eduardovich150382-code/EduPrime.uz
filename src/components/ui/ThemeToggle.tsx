'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950 transition-colors text-text-secondary"
      aria-label={theme === 'dark' ? "Light rejimga o'tish" : "Dark rejimga o'tish"}
      title={theme === 'dark' ? "Light rejim" : "Dark rejim"}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
