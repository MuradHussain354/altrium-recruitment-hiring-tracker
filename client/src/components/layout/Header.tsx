import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { LogOut, User as UserIcon, Search } from 'lucide-react';
import { Role } from '../../types/auth';
import { quickSearch, SearchResultItem } from '../../api/batch2.api';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ── S2-30 GLOBAL SEARCH ───────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  // Global Ctrl+K / Cmd+K shortcut (S2-30)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await quickSearch(searchQuery.trim());
        setSearchResults(results || []);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const normalizeSearchUrl = (rawUrl: string): string => {
    let url = rawUrl;
    if (url.startsWith('/portal/')) {
      url = url.replace('/portal/', '/');
    }
    if (url.startsWith('/teamlead/')) {
      url = url.replace('/teamlead/', '/team-lead/');
    } else if (url === '/teamlead') {
      url = '/team-lead';
    }
    if (user?.role === 'Manager') {
      if (url === '/hr/positions') {
        return '/manager/reports/positions';
      }
      if (url === '/hr/teams') {
        return '/manager/teams';
      }
      if (url.startsWith('/hr/applications?')) {
        return url.replace('/hr/applications?', '/manager/reports/pipeline?');
      }
    }
    return url;
  };

  const handleResultClick = (item: SearchResultItem) => {
    const targetUrl = normalizeSearchUrl(item.url);
    navigate(targetUrl);
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
  };

  const getTypeColor = (type: SearchResultItem['type']) => {
    const map: Record<string, string> = {
      candidate: 'var(--accent-cyan)',
      position: 'var(--accent-emerald)',
      application: 'var(--primary)',
      interview: 'var(--accent-amber)',
      team: '#8B5CF6',
    };
    return map[type] || 'var(--text-muted)';
  };

  const getRoleBadgeClass = (role?: Role) => {
    switch (role) {
      case 'Manager': return 'badge badge-indigo';
      case 'HR': return 'badge badge-cyan';
      case 'TeamLead': return 'badge badge-emerald';
      default: return 'badge badge-indigo';
    }
  };

  return (
    <header
      style={{
        height: '64px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
          Recruitment &amp; Hiring Tracker
        </h2>
      </div>

      {/* Global Search Bar */}
      <div ref={searchRef} style={{ flex: 1, maxWidth: '440px', position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            ref={searchInputRef}
            id="global-search-input"
            type="text"
            placeholder="Search candidates, positions, applications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
            style={{
              width: '100%',
              height: '36px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '0 65px 0 38px',
              fontSize: '0.85rem',
              color: 'var(--text-main)',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocusCapture={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
            onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          />
          {isSearching ? (
            <div style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              border: '2px solid var(--primary)',
              borderTopColor: 'transparent',
              animation: 'spin 0.6s linear infinite',
            }} />
          ) : (
            <kbd
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '2px 6px',
                fontSize: '0.68rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.15)',
                pointerEvents: 'none',
                fontFamily: 'inherit',
              }}
              title="Press Ctrl+K or ⌘K to focus search"
            >
              {isMac ? '⌘ K' : 'Ctrl K'}
            </kbd>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div
            id="global-search-results"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              zIndex: 200,
              overflow: 'hidden',
              maxHeight: '320px',
              overflowY: 'auto',
            }}
          >
            {searchResults.map((item, idx) => (
              <div
                key={`${item.type}-${item.id}-${idx}`}
                onClick={() => handleResultClick(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: getTypeColor(item.type),
                  minWidth: '72px',
                }}>
                  {item.type}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.subtitle}
                  </div>
                </div>
                {item.badge && (
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'var(--text-muted)',
                    flexShrink: 0,
                  }}>
                    {item.badge}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {showResults && searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '16px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            zIndex: 200,
          }}>
            No results found for "{searchQuery}"
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <UserIcon size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: '1.2' }}>
                {user.name}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</span>
            </div>
            <span className={getRoleBadgeClass(user.role)} style={{ marginLeft: '6px' }}>
              {user.role}
            </span>
          </div>
        )}

        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-subtle)' }} />

        <button
          type="button"
          onClick={logout}
          className="btn btn-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            fontSize: '0.825rem',
            cursor: 'pointer',
          }}
          title="Sign out of your session"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
