import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import type { TabType } from './Layout';
import TimelineContent from './TimelineContent';
import CalendarContent from './CalendarContent';
import AddMemoryModal from './AddMemoryModal';
import MemoryDetailModal from './MemoryDetailModal';
import ProfileImageModal from './ProfileImageModal';
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
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Profile state
  const [profileImageKey, setProfileImageKey] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>(undefined);

  // Data state
  const [items, setItems] = useState<BoardItemWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(true);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/');
    }
  }, [navigate]);

  // Load profile image from server on mount
  useEffect(() => {
    const fetchMyProfile = async () => {
      try {
        const profile = await userApi.getMyProfile();
        if (profile.imageKey) {
          setProfileImageKey(profile.imageKey);
          localStorage.setItem('profileImageKey', profile.imageKey);
        }
      } catch (error) {
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

  // Fetch items
  const fetchItems = useCallback(async (pageNum: number, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await boardApi.getAllList(pageNum, 12);

      const itemsWithKeys = response.content.filter(
        (item): item is BoardListItem & { thumbnail: string } => item.thumbnail !== null
      );
      let urlMap: Record<string, string> = {};

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

      const itemsWithUrls: BoardItemWithUrl[] = response.content.map(item => ({
        ...item,
        thumbnailUrl: item.thumbnail ? urlMap[item.thumbnail] : undefined
      }));

      if (isLoadMore) {
        setItems(prev => [...prev, ...itemsWithUrls]);
      } else {
        setItems(itemsWithUrls);
      }

      setHasNext(response.hasNext);
      setPage(pageNum);
    } catch {
      // 게시물 조회 실패
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchItems(0);
  }, [fetchItems]);

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

  const handleLoadMore = () => {
    if (!loadingMore && hasNext) {
      fetchItems(page + 1, true);
    }
  };

  const refreshList = async () => {
    thumbnailCache.clear();
    await fetchItems(0);
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'timeline':
        return (
          <TimelineContent
            items={items}
            loading={loading}
            loadingMore={loadingMore}
            hasNext={hasNext}
            onItemClick={handleItemClick}
            onLoadMore={handleLoadMore}
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
          />
        );
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
    </>
  );
};

export default HomePage;
