import { useEffect, useMemo, useRef, useState } from 'react';
import { Sun, Moon, Github, LogIn, LogOut, Pencil, Home, Shapes, Milestone, Swords, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { onValue, ref, update } from 'firebase/database';
import { toast } from 'sonner';

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user, authLoading, loginWithGoogle, logout, updateDisplayName } = useAuth();
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const isLogged = useMemo(() => {
    const uid = user?.uid;
    return typeof uid === 'string' && uid.trim().length > 0;
  }, [user]);
  const [pendingInviteIds, setPendingInviteIds] = useState([]);
  const lastInviteToastRef = useRef(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!user) {
      setPendingInviteIds([]);
      return;
    }
    const invitesRef = ref(db, `invites/${user.uid}`);
    const unsub = onValue(invitesRef, (snap) => {
      if (!snap.exists()) {
        setPendingInviteIds([]);
        return;
      }
      const pending = [];
      snap.forEach((child) => {
        const val = child.val();
        if (val?.status === 'pending') pending.push({ id: child.key, createdAt: val.createdAt ?? Date.now() });
      });
      setPendingInviteIds(pending);
      const newest = pending[0];
      if (newest && lastInviteToastRef.current !== newest.id && location.pathname !== '/battle') {
        lastInviteToastRef.current = newest.id;
        toast.message('Novo convite!', {
          description: 'Abra Player vs Player em Battle para aceitar.',
        });
      }
      const now = Date.now();
      pending.forEach((inv) => {
        if (now - (inv.createdAt ?? now) > 60000) {
          update(ref(db, `invites/${user.uid}/${inv.id}`), { status: 'declined' }).catch(() => {});
        }
      });
    });
    return () => unsub();
  }, [user, location.pathname]);

  const isActive = (path) => location.pathname === path;
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const themeIcon = theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />;
  const initials = useMemo(() => user?.displayName?.slice(0, 2)?.toUpperCase() ?? 'T', [user]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Failed to login', err);
    }
  };

  useEffect(() => {
    if (user?.displayName) {
      setNameInput(user.displayName);
    }
  }, [user]);

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    try {
      setSavingName(true);
      await updateDisplayName(nameInput.trim());
      setEditNameOpen(false);
    } catch (err) {
      console.error('Failed to update display name', err);
    } finally {
      setSavingName(false);
    }
  };

  useEffect(() => {
    if (!user || location.pathname.startsWith('/battle')) return;
    const presenceRef = ref(db, `presence/${user.uid}`);
    update(presenceRef, {
      status: 'online',
      lastSeen: Date.now(),
      roomId: null,
      name: user.displayName ?? 'Trainer',
      photoURL: user.photoURL ?? '',
    }).catch(() => {});
  }, [user, location.pathname]);

  const mobileLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/types', label: 'Types', icon: Shapes },
    { to: '/generations', label: 'Regions', icon: Milestone },
    { to: '/battle', label: 'Battles', icon: Swords },
    { to: '/favorites', label: 'Favorites', icon: Heart },
  ];

  const NavButton = ({ to, label, closeOnClick = false, variant = 'ghost' }) => {
    const common =
      variant === 'solid'
        ? 'w-full text-left px-3 py-2 rounded-md border border-border bg-card hover:bg-muted font-semibold'
        : '';
    return (
      <button
        onClick={() => {
          navigate(to);
          if (closeOnClick) setIsMenuOpen(false);
        }}
        className={`${
          variant === 'ghost'
            ? `font-semibold transition-colors ${isActive(to) ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`
            : common
        }`}
      >
        {label}
      </button>
    );
  };

  const AccountButton = ({ inlineLabel = false }) => {
    if (authLoading && mounted) {
      return (
        <div className={`${inlineLabel ? 'w-full' : 'w-10'} h-10 rounded-md border border-border animate-pulse`} />
      );
    }

    if (isLogged) {
      return (
        <div className={`flex items-center ${inlineLabel ? 'w-full justify-between' : 'gap-2'}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`${inlineLabel ? 'px-3 w-auto gap-2' : 'w-10 px-0'} h-10 border border-border`}
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'Trainer'} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold truncate max-w-[120px]">
                  {user.displayName ?? 'Trainer'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'Trainer'} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold leading-tight">{user.displayName ?? 'Trainer'}</div>
                    {user.email && <div className="text-xs text-muted-foreground truncate">{user.email}</div>}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setEditNameOpen(true)} className="gap-2">
                <Pencil className="h-4 w-4" />
                Editar nome
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="gap-2">
                <a href="https://www.ivanamorim.com.br" target="_blank" rel="noreferrer" className="flex items-center gap-2 w-full">
                  <Github className="h-4 w-4" />
                  Build by Ivan Amorim
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant={inlineLabel ? 'outline' : 'ghost'}
            size={inlineLabel ? 'sm' : 'icon'}
            onClick={() => logout()}
            className={`${inlineLabel ? 'gap-2 border-border' : ''}`}
          >
            <LogOut className="h-4 w-4" />
            {inlineLabel && <span>Sair</span>}
          </Button>
        </div>
      );
    }

    if (!mounted) return null;

    return (
      <Button
        variant={inlineLabel ? 'outline' : 'ghost'}
        size={inlineLabel ? 'sm' : 'icon'}
        onClick={handleLogin}
        className={`${inlineLabel ? 'gap-2 border-border w-full justify-start' : 'border border-border'}`}
      >
        <LogIn className="h-4 w-4" />
        {inlineLabel && <span>Login</span>}
      </Button>
    );
  };

  return (
    <>
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-3 group"
          >
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 bg-primary rounded-full"></div>
              <div className="absolute inset-0 bg-card rounded-full top-0 left-0 right-0 bottom-1/2 border-2 border-foreground"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-card rounded-full border-2 border-foreground"></div>
            </div>
            <span className="text-2xl font-bold text-gradient">{'Pok\u00e9dex'}</span>
          </button>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            <NavButton to="/" label="Home" />
            <NavButton to="/types" label="Types" />
            <NavButton to="/generations" label="Regions" />
            <NavButton to="/battle" label="Battle" />
            <NavButton to="/favorites" label="Favorites" />
            <a
              href="https://github.com/ivan12"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-border hover:bg-muted transition-colors"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9 border border-border"
                aria-label="Toggle theme"
              >
                {themeIcon}
              </Button>
            )}
            <AccountButton />
          </nav>
          
          {/* Mobile actions (icons only) */}
          <div className="md:hidden flex items-center gap-2">
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9 border border-border"
                aria-label="Toggle theme"
              >
                {themeIcon}
              </Button>
            )}
            <a
              href="https://github.com/ivan12"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-border hover:bg-muted transition-colors"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
            <AccountButton />
          </div>
        </div>
        
        {/* Mobile menu removed: bottom nav will handle links */}
      </div>
      <Dialog open={editNameOpen} onOpenChange={setEditNameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar nome de exibicao</DialogTitle>
            <DialogDescription>Esse nome aparece para outros jogadores.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Seu nome" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditNameOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveName} disabled={savingName || !nameInput.trim()} className="gap-2">
                {savingName && <span className="animate-pulse">...</span>}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
    {/* Mobile bottom nav */}
    <nav className="md:hidden fixed bottom-2 left-2 right-2 z-40">
      <div className="bg-card/95 backdrop-blur border rounded-2xl shadow-xl p-2 flex items-center justify-between gap-1">
        {mobileLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.to);
          return (
            <button
              key={link.to}
              onClick={() => navigate(link.to)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all ${active ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted text-foreground'}`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-semibold">{link.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
    </>
  );
};

export default Header;
