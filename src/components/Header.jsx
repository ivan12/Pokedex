import { useEffect, useState } from 'react';
import { Menu, X, Sun, Moon, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isActive = (path) => location.pathname === path;
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const themeIcon = theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />;

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

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 bg-primary rounded-full"></div>
              <div className="absolute inset-0 bg-card rounded-full top-0 left-0 right-0 bottom-1/2 border-2 border-foreground"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-card rounded-full border-2 border-foreground"></div>
            </div>
            <span className="text-2xl font-bold text-gradient">{'Pok\u00e9dex'}</span>
          </a>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <NavButton to="/" label="Home" />
            <NavButton to="/types" label="Types" />
            <NavButton to="/generations" label="Generations" />
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
          </nav>
          
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>
        
        {/* Mobile Menu */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 animate-slide-up">
            <div className="bg-card border rounded-xl shadow-lg p-3 space-y-2">
              <NavButton to="/" label="Home" closeOnClick variant="solid" />
              <NavButton to="/types" label="Types" closeOnClick variant="solid" />
              <NavButton to="/generations" label="Generations" closeOnClick variant="solid" />
              <NavButton to="/battle" label="Battle" closeOnClick variant="solid" />
              <NavButton to="/favorites" label="Favorites" closeOnClick variant="solid" />
              <a
                href="https://github.com/ivan12"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 w-full px-3 py-2 rounded-md border border-border text-left hover:bg-muted"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
              {mounted && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    toggleTheme();
                    setIsMenuOpen(false);
                  }}
                >
                  {themeIcon}
                  Toggle theme
                </Button>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
