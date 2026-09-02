import { useState } from 'react';
import type { PaintProject } from '@/types';
import { Dashboard } from '@/components/Dashboard';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from '@/components/useTheme';
import { demoProjects } from '@/demoData';

function App() {
  const [projects, setProjects] = useState<PaintProject[]>(demoProjects);
  const { theme, toggle } = useTheme();

  return (
    <div className="relative min-h-screen">
      <div className="absolute right-4 top-3 z-30">
        <ThemeToggle theme={theme} onToggle={toggle} />
      </div>
      <Dashboard
        projects={projects}
        onProjectsChange={setProjects}
      />
    </div>
  );
}

export default App;
