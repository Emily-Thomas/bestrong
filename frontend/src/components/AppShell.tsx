'use client';

import { Dumbbell, LogOut, Menu, UserSquare2, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { ScoutMark, ScoutWordmark } from '@/components/ScoutLogoMark';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type AuthUser = {
  id: number;
  email: string;
  name: string;
} | null;

const navItems = [
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/trainers', label: 'Trainers', icon: UserSquare2 },
  { href: '/exercise-library', label: 'Exercise library', icon: Dumbbell },
] as const;

type NavLinkListProps = {
  pathname: string;
  onNavigate?: () => void;
  className?: string;
};

function NavLinkList({ pathname, onNavigate, className }: NavLinkListProps) {
  return (
    <ul className={cn('flex list-none flex-col gap-0.5 p-0 m-0', className)}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href ||
          (item.href === '/clients' && pathname?.startsWith('/clients')) ||
          (item.href !== '/clients' && pathname?.startsWith(item.href));
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                'outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                active
                  ? 'bg-primary/20 font-semibold text-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/80 hover:text-foreground'
              )}
            >
              {active ? (
                <span
                  className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                  aria-hidden
                />
              ) : null}
              <span className="flex h-5 w-5 items-center justify-center pl-0.5">
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-transform duration-200',
                    active
                      ? 'text-foreground'
                      : 'text-scout-fog-3 group-hover:text-foreground/90'
                  )}
                />
              </span>
              <span className="pl-0.5">{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function UserPanel({
  user,
  onLogout,
  className,
}: {
  user: AuthUser;
  onLogout: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-sidebar-accent/60 p-3 shadow-sm',
        className
      )}
    >
      <p className="text-sm font-semibold leading-snug text-foreground">
        {user?.name || user?.email || 'Coach'}
      </p>
      <p className="text-xs text-muted-foreground">Admin</p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-2 h-8 w-full justify-start px-2 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
        onClick={onLogout}
      >
        <LogOut className="mr-2 h-3.5 w-3.5" />
        Logout
      </Button>
    </div>
  );
}

function BrandLockup({
  className,
  compact = false,
  onNavigate,
}: {
  className?: string;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href="/clients"
      onClick={onNavigate}
      className={cn(
        'group flex min-w-0 items-center gap-2 rounded-xl outline-offset-2 transition-opacity hover:opacity-95',
        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className
      )}
    >
      {compact ? (
        <ScoutMark size="sm" withAlt={false} />
      ) : (
        <ScoutWordmark
          withAlt={false}
          heightClass="h-7 sm:h-8"
          className="max-w-[min(100%,14rem)]"
        />
      )}
    </Link>
  );
}

interface AppShellProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  backAction?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({
  title,
  description,
  action,
  backAction,
  children,
}: AppShellProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = useCallback(() => {
    setMobileOpen(false);
    logout();
    router.push('/login');
  }, [logout, router]);

  const closeMenu = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const hasPageHeader = Boolean(title || description || action || backAction);

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-row overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden h-full min-h-0 w-[17.5rem] shrink-0 flex-col',
          'border-r border-sidebar-border bg-sidebar shadow-lg',
          'lg:flex'
        )}
      >
        <div className="shrink-0 border-b border-sidebar-border px-4 py-5">
          <BrandLockup />
        </div>

        <nav
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-3"
          aria-label="Main navigation"
        >
          <NavLinkList pathname={pathname} />
        </nav>

        <div className="shrink-0 border-t border-sidebar-border bg-sidebar p-3">
          <UserPanel user={user} onLogout={handleLogout} />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-background to-scout-ink-soft/80">
        <header
          className={cn(
            'grid shrink-0 grid-cols-[2.5rem,1fr,2.5rem] items-center gap-1',
            'border-b border-border bg-background/90 px-2 py-2.5 backdrop-blur-md',
            'pt-[max(0.5rem,env(safe-area-inset-top))] lg:hidden'
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-foreground hover:bg-sidebar-accent"
            onClick={() => {
              setMobileOpen(true);
            }}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex min-w-0 justify-center">
            <BrandLockup className="gap-2" compact />
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-6 lg:px-10 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">
            {hasPageHeader && (
              <div className="mb-6 border-b border-border/70 pb-6 sm:mb-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    {backAction && <div>{backAction}</div>}
                    {title && (
                      <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
                        {title}
                      </h1>
                    )}
                    {description && (
                      <p className="text-sm text-muted-foreground">
                        {description}
                      </p>
                    )}
                  </div>
                  {action && (
                    <div className="shrink-0 sm:ml-2 sm:pt-0.5">{action}</div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-6 text-foreground">{children}</div>
          </div>
        </main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="flex h-dvh max-h-dvh min-h-0 w-[min(100%,20rem)] flex-col border-border bg-sidebar p-0 sm:max-w-sm"
        >
          <div className="shrink-0 border-b border-sidebar-border px-4 py-4">
            <SheetTitle className="sr-only">Main menu</SheetTitle>
            <BrandLockup onNavigate={closeMenu} />
          </div>
          <nav
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-2"
            aria-label="Main navigation"
          >
            <NavLinkList pathname={pathname} onNavigate={closeMenu} />
          </nav>
          <div className="shrink-0 border-t border-sidebar-border bg-sidebar p-3">
            <UserPanel user={user} onLogout={handleLogout} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
