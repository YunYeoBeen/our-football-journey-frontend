import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/userAuthStore';

const styles = {
  colors: {
    primary: '#ffb4a8',
    backgroundLight: '#fdfcfc',
    textDark: '#181110',
    textMuted: '#8d645e',
    gray100: '#f1f1f1',
    gray400: '#9ca3af',
  },
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};

export type TabType = 'feed' | 'timeline' | 'calendar';

interface LayoutProps {
  children: ReactNode;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onAddClick: () => void;
  profileImageUrl?: string;
  onProfileClick: () => void;
  userName?: string;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  onAddClick,
  profileImageUrl,
  onProfileClick,
  userName,
}) => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: styles.colors.backgroundLight,
      fontFamily: styles.fontFamily,
    }}>
      {/* Fixed Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: 'rgba(253, 252, 252, 0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${styles.colors.gray100}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: 16,
          justifyContent: 'space-between',
          maxWidth: 448,
          margin: '0 auto',
        }}>
          {/* 왼쪽: 무사해 로고 */}
          <h1
            onClick={() => navigate('/home')}
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: styles.colors.primary,
              margin: 0,
              cursor: 'pointer',
              letterSpacing: '-0.5px',
            }}
          >
            MUSAHAE
          </h1>

          {/* 오른쪽: 프로필사진 + 이름 + 로그아웃 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              onClick={onProfileClick}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: `2px solid ${styles.colors.primary}`,
                backgroundImage: profileImageUrl ? `url("${profileImageUrl}")` : 'none',
                backgroundColor: profileImageUrl ? 'transparent' : styles.colors.gray100,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.2s',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {!profileImageUrl && (
                <span style={{
                  fontSize: 18,
                  color: styles.colors.gray400,
                  fontFamily: 'Material Symbols Outlined',
                }}>person</span>
              )}
            </div>
            {userName && (
              <span style={{
                fontSize: 14,
                fontWeight: 600,
                color: styles.colors.textDark,
                maxWidth: 80,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {userName}
              </span>
            )}
            <button
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                color: styles.colors.textMuted,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - with padding for fixed header/footer */}
      <main style={{
        maxWidth: 448,
        margin: '0 auto',
        paddingTop: 72,
        paddingBottom: 80,
        minHeight: '100vh',
      }}>
        {children}
      </main>

      {/* Fixed Bottom Navigation */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: `1px solid ${styles.colors.gray100}`,
        padding: '12px 24px',
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: 448,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {/* Feed Tab */}
          <button
            onClick={() => onTabChange('feed')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
            }}
          >
            <span style={{
              fontSize: 24,
              color: activeTab === 'feed' ? styles.colors.primary : styles.colors.gray400,
              fontFamily: 'Material Symbols Outlined',
              fontVariationSettings: activeTab === 'feed' ? "'FILL' 1" : "'FILL' 0",
            }}>grid_view</span>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: activeTab === 'feed' ? styles.colors.primary : styles.colors.gray400,
            }}>Feed</span>
          </button>

          {/* Timeline Tab */}
          <button
            onClick={() => onTabChange('timeline')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
            }}
          >
            <span style={{
              fontSize: 24,
              color: activeTab === 'timeline' ? styles.colors.primary : styles.colors.gray400,
              fontFamily: 'Material Symbols Outlined',
              fontVariationSettings: activeTab === 'timeline' ? "'FILL' 1" : "'FILL' 0",
            }}>auto_awesome_motion</span>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: activeTab === 'timeline' ? styles.colors.primary : styles.colors.gray400,
            }}>Timeline</span>
          </button>

          {/* Add Button */}
          <div style={{ position: 'relative', top: -24 }}>
            <button
              onClick={onAddClick}
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: styles.colors.primary,
                color: 'white',
                border: '4px solid white',
                boxShadow: `0 8px 24px ${styles.colors.primary}50`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{ fontSize: 30, fontFamily: 'Material Symbols Outlined' }}>add</span>
            </button>
          </div>

          {/* Calendar Tab */}
          <button
            onClick={() => onTabChange('calendar')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
            }}
          >
            <span style={{
              fontSize: 24,
              color: activeTab === 'calendar' ? styles.colors.primary : styles.colors.gray400,
              fontFamily: 'Material Symbols Outlined',
              fontVariationSettings: activeTab === 'calendar' ? "'FILL' 1" : "'FILL' 0",
            }}>calendar_today</span>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: activeTab === 'calendar' ? styles.colors.primary : styles.colors.gray400,
            }}>Calendar</span>
          </button>

          {/* Settings Tab */}
          <button
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
            }}
          >
            <span style={{
              fontSize: 24,
              color: styles.colors.gray400,
              fontFamily: 'Material Symbols Outlined',
            }}>settings</span>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: styles.colors.gray400,
            }}>Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
