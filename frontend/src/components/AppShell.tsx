'use client';

import {
  Dumbbell,
  LayoutGrid,
  LogOut,
  UserSquare2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface AppShellProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  backAction?: React.ReactNode;
  children: React.ReactNode;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/trainers', label: 'Trainers', icon: UserSquare2 },
  { href: '/exercise-library', label: 'Exercise library', icon: Dumbbell },
];

export function AppShell({
  title,
  description,
  action,
  backAction,
  children,
}: AppShellProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border/60 bg-card/60 backdrop-blur-lg">
        <div className="px-6 py-5 border-b border-border/60">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image 
              src="/milo-logo-gold.png" 
              alt="Milo" 
              width={40} 
              height={40}
              className="flex-shrink-0"
            />
            <div>
              <div className="text-lg font-semibold leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                Milo
              </div>
              <div className="text-xs text-muted-foreground">
                AI Training Companion
              </div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                  active
                    ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-border/60">
          <div className="rounded-lg bg-muted/10 border border-border/60 p-3">
            <div className="text-sm font-semibold">
              {user?.name || user?.email || 'Coach'}
            </div>
            <div className="text-xs text-muted-foreground">Admin</div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 w-full justify-start text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <header className="lg:hidden sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image 
              src="/milo-logo-gold.png" 
              alt="Milo" 
              width={32} 
              height={32}
              className="flex-shrink-0"
            />
            <span className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Milo</span>
          </Link>
          <Button size="sm" variant="ghost" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </header>

        <main className="flex-1 p-6 lg:p-8">
          {(title || description || action || backAction) && (
            <div className="mb-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  {backAction && <div className="mb-2">{backAction}</div>}
                  {title && (
                    <h1 className="text-3xl font-semibold tracking-tight">
                      {title}
                    </h1>
                  )}
                  {description && (
                    <p className="text-sm text-muted-foreground">
                      {description}
                    </p>
                  )}
                </div>
                {action && <div className="sm:ml-4">{action}</div>}
              </div>
            </div>
          )}
          <div className="space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
