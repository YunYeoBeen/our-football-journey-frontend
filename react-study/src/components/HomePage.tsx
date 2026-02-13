import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from './Layout';
import NotificationPermissionModal from './NotificationPermissionModal';
import type { TabType } from './Layout';
import TimelineContent from './TimelineContent';
import CalendarContent from './CalendarContent';
import AddMemoryModal from './AddMemoryModal';
import MemoryDetailModal from './MemoryDetailModal';
import ProfileImageModal from './ProfileImageModal';
import SpaceContent from './SpaceContent';
import { boardApi } from '../services/boardApi';
import type { BoardListItem } from '../services/boardApi';
import { s3Api } from '../services/s3Api';
import { userApi } from '../services/userApi';
import { useAuthStore } from '../store/userAuthStore';

// 썸네일 URL 캐시
const thumbnailCache = new Map<string, string>();

interface BoardItemWithUrl extends BoardListItem {
  thumbnailUrl?: string;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Profile state
  const [profileImageKey, setProfileImageKey] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>(undefined);

  // Data state
  const [items, setItems] = useState<BoardItemWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/');
    }
  }, [navigate]);

  // Show notification permission modal after login
  useEffect(() => {
    const state = location.state as { showNotificationModal?: boolean } | null;
    if (state?.showNotificationModal) {
      setIsNotificationModalVisible(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // 알림 클릭으로 특정 게시글 열기 (URL ?boardId=xxx 또는 sessionStorage)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const boardId = params.get('boardId') || sessionStorage.getItem('pendingBoardId');
    if (boardId) {
      sessionStorage.removeItem('pendingBoardId');
      setSelectedBoardId(Number(boardId));
      setIsDetailModalVisible(true);
      navigate('/home', { replace: true });
    }
  }, [navigate]);

  // 포그라운드 알림 토스트 클릭 시 게시글 열기 (커스텀 이벤트)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.boardId) {
        setSelectedBoardId(Number(detail.boardId));
        setIsDetailModalVisible(true);
      }
    };
    window.addEventListener('open-board', handler);
    return () => window.removeEventListener('open-board', handler);
  }, []);

  // Load profile image from server on mount
  useEffect(() => {
    const fetchMyProfile = async () => {
      try {
        const profile = await userApi.getMyProfile();
        if (profile.imageKey) {
          setProfileImageKey(profile.imageKey);
          localStorage.setItem('profileImageKey', profile.imageKey);
        }
      } catch {
        const savedProfileKey = localStorage.getItem('profileImageKey');
        if (savedProfileKey) {
          setProfileImageKey(savedProfileKey);
        }
        // 프로필 조회 실패
      }
    };
    fetchMyProfile();
  }, []);

  // Get presigned URL for profile image
  useEffect(() => {
    const fetchProfileImageUrl = async () => {
      if (profileImageKey) {
        try {
          const url = await s3Api.getPresignedViewUrl(profileImageKey, 'PROFILE');
          setProfileImageUrl(url);
        } catch {
          // 프로필 이미지 URL 조회 실패
        }
      }
    };
    fetchProfileImageUrl();
  }, [profileImageKey]);

  // 전체 아이템 로드 (캘린더 썸네일 누락 방지)
  const fetchAllItems = useCallback(async () => {
    setLoading(true);
    try {
      let allItems: BoardListItem[] = [];
      let pageNum = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await boardApi.getAllList(pageNum, 50);
        allItems = [...allItems, ...response.content];
        hasMore = response.hasNext;
        pageNum++;
      }

      const itemsWithKeys = allItems.filter(
        (item): item is BoardListItem & { thumbnail: string } => item.thumbnail !== null
      );
      const urlMap: Record<string, string> = {};

      if (itemsWithKeys.length > 0) {
        const keysToFetch = itemsWithKeys
          .filter(item => !thumbnailCache.has(item.thumbnail))
          .map(item => item.thumbnail);

        if (keysToFetch.length > 0) {
          const urls = await s3Api.getPresignedViewUrls(keysToFetch);
          keysToFetch.forEach((key, idx) => {
            thumbnailCache.set(key, urls[idx]);
            urlMap[key] = urls[idx];
          });
        }

        itemsWithKeys.forEach(item => {
          if (thumbnailCache.has(item.thumbnail)) {
            urlMap[item.thumbnail] = thumbnailCache.get(item.thumbnail)!;
          }
        });
      }

      const itemsWithUrls: BoardItemWithUrl[] = allItems.map(item => ({
        ...item,
        thumbnailUrl: item.thumbnail ? (urlMap[item.thumbnail] || thumbnailCache.get(item.thumbnail)) : undefined
      }));

      setItems(itemsWithUrls);
    } catch {
      // 게시물 조회 실패
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAllItems();
  }, [fetchAllItems]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleAddClick = () => {
    setIsAddModalVisible(true);
  };

  const handleProfileClick = () => {
    setIsProfileModalVisible(true);
  };

  const handleProfileUpdated = async (newImageKey: string) => {
    setProfileImageKey(newImageKey);
    localStorage.setItem('profileImageKey', newImageKey);

    try {
      const url = await s3Api.getPresignedViewUrl(newImageKey, 'PROFILE');
      setProfileImageUrl(url);
    } catch {
      // 새 프로필 이미지 URL 조회 실패
    }
  };

  const handleItemClick = (boardId: number) => {
    setSelectedBoardId(boardId);
    setIsDetailModalVisible(true);
  };

  const refreshList = async () => {
    thumbnailCache.clear();
    setRefreshKey(prev => prev + 1);
    await fetchAllItems();
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'timeline':
        return (
          <TimelineContent
            items={items}
            loading={loading}
            loadingMore={false}
            hasNext={false}
            onItemClick={handleItemClick}
            onLoadMore={() => {}}
            profileImageUrl={profileImageUrl}
          />
        );
      case 'calendar':
        return (
          <CalendarContent
            items={items}
            loading={loading}
            onItemClick={handleItemClick}
            onDateSelect={setSelectedCalendarDate}
            refreshKey={refreshKey}
          />
        );
      case 'space':
        return <SpaceContent />;
      default:
        return null;
    }
  };

  return (
    <>
      <Layout
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onAddClick={handleAddClick}
        profileImageUrl={profileImageUrl}
        onProfileClick={handleProfileClick}
        userName={user?.name}
        onLogoClick={() => setActiveTab('calendar')}
      >
        {renderContent()}
      </Layout>

      <AddMemoryModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onCreated={refreshList}
        initialDate={selectedCalendarDate}
      />

      <MemoryDetailModal
        visible={isDetailModalVisible}
        boardId={selectedBoardId}
        onClose={() => setIsDetailModalVisible(false)}
        onDeleted={refreshList}
        onUpdated={refreshList}
      />

      <ProfileImageModal
        visible={isProfileModalVisible}
        currentImageUrl={profileImageUrl}
        onClose={() => setIsProfileModalVisible(false)}
        onUpdated={handleProfileUpdated}
      />

      <NotificationPermissionModal
        isOpen={isNotificationModalVisible}
        onClose={() => setIsNotificationModalVisible(false)}
      />
    </>
  );
};

export default HomePage;
