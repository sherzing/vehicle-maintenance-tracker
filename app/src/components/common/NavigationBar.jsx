import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function NavigationBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      localStorage.removeItem('selectedTeamId');
      navigate('/login');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const getUserInitials = () => {
    if (user.displayName) {
      const nameParts = user.displayName.trim().split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
      }
      return nameParts[0].substring(0, 2).toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  };

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/vehicles') return 'Vehicles';
    if (path === '/teams') return 'Teams';
    return '';
  };

  if (!user) {
    return null;
  }

  return (
    <header className="minimalist-header">
      <div className="minimalist-header-content">
        <Link to="/dashboard" className="minimalist-logo">
          VMT
        </Link>

        <nav className="minimalist-breadcrumb">
          <Link to="/dashboard">Home</Link>
          {getBreadcrumb() && getBreadcrumb() !== 'Dashboard' && (
            <>
              <span> / </span>
              <span>{getBreadcrumb()}</span>
            </>
          )}
        </nav>

        <div className="minimalist-user-menu">
          <div
            className="minimalist-user-avatar"
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{ position: 'relative' }}
          >
            {getUserInitials()}

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '50px',
                  right: '0',
                  background: 'white',
                  border: '1px solid var(--gray-200)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-md)',
                  minWidth: '200px',
                  zIndex: 1000,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {user.displayName && (
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--gray-100)' }}>
                    <div style={{ fontWeight: '600', color: 'var(--gray-900)', marginBottom: '0.25rem' }}>
                      {user.displayName}
                    </div>
                    <div style={{ fontSize: '0.813rem', color: 'var(--gray-500)' }}>
                      {user.email}
                    </div>
                  </div>
                )}
                {!user.displayName && (
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--gray-100)' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-700)' }}>
                      {user.email}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    navigate('/teams');
                    setShowUserMenu(false);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: 'var(--gray-700)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'var(--gray-50)'}
                  onMouseLeave={(e) => e.target.style.background = 'none'}
                >
                  Manage Teams
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    handleSignOut();
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: 'var(--gray-700)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'var(--gray-50)'}
                  onMouseLeave={(e) => e.target.style.background = 'none'}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showUserMenu && (
        <div
          onClick={() => setShowUserMenu(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
        />
      )}
    </header>
  );
}
