import type { ReactNode, FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/userAuthStore';
import '../styles/Layout.css';

export type TabType = 'timeline' | 'calendar' | 'space';

interface LayoutProps {
  children: ReactNode;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onAddClick: () => void;
  profileImageUrl?: string;
  onProfileClick: () => void;
  userName?: string;
  onLogoClick?: () => void;
}

const Layout: FC<LayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  onAddClick,
  profileImageUrl,
  onProfileClick,
  userName,
  onLogoClick,
}) => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navButton = (tab: TabType, icon: string, label: string) => (
    <button
      onClick={() => onTabChange(tab)}
      className="layout-nav-btn"
    >
      <span className={`layout-nav-btn-icon ${activeTab === tab ? 'layout-nav-btn-icon--active' : 'layout-nav-btn-icon--inactive'}`}>
        {icon}
      </span>
      <span className={`layout-nav-btn-label ${activeTab === tab ? 'layout-nav-btn-label--active' : 'layout-nav-btn-label--inactive'}`}>
        {label}
      </span>
    </button>
  );

  return (
    <div className="layout">
      {/* Fixed Header */}
      <header className="layout-header">
        <div className="layout-header-inner">
          <h1
            onClick={() => {
              if (onLogoClick) {
                onLogoClick();
              } else {
                navigate('/home');
              }
            }}
            className="layout-logo"
          >
            MUSAHAE
          </h1>

          <div className="layout-header-actions">
            <div
              onClick={onProfileClick}
              className={`layout-profile ${!profileImageUrl ? 'layout-profile--empty' : ''}`}
              style={profileImageUrl ? { backgroundImage: `url("${profileImageUrl}")` } : undefined}
            >
              {!profileImageUrl && (
                <span className="layout-profile-icon">person</span>
              )}
            </div>
            {userName && (
              <span className="layout-username">{userName}</span>
            )}
            <button onClick={handleLogout} className="layout-logout-btn">
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="layout-main">
        {children}
      </main>

      {/* Fixed Bottom Navigation */}
      <nav className="layout-nav">
        <div className="layout-nav-inner">
          {navButton('calendar', 'calendar_today', 'Calendar')}
          {navButton('timeline', 'auto_awesome_motion', 'Timeline')}
          {navButton('space', 'edit_note', 'Space')}
        </div>
      </nav>

      {/* Floating Add Button - Only show on Calendar and Timeline */}
      {(activeTab === 'calendar' || activeTab === 'timeline') && (
        <button onClick={onAddClick} className="layout-fab">
          <span className="layout-fab-icon">add</span>
        </button>
      )}
    </div>
  );
};

export default Layout;
