import { useState, useEffect, useCallback } from 'react';
import MatchMap from './MatchMap';
import MatchHistoryList from './MatchHistoryList';
import MatchAddModal from './MatchAddModal';
import MatchHistoryDetailModal from './MatchHistoryDetailModal';
import MatchEditModal from './MatchEditModal';
import { matchHistoryApi } from '../../services/matchHistoryApi';
import type { MatchHistoryResponseDto, PlaceResponseDto } from '../../services/matchHistoryApi';
import '../../styles/MatchCenterContent.css';

// 지도에 표시할 장소 타입 (MatchHistory와 Place 정보 결합)
export interface MapPlace {
  placeId: number;
  matchHistoryId: number;
  address?: string;
  latitude: number;
  longitude: number;
  placeType: 'STADIUM' | 'RESTAURANT' | 'CAFE' | 'BAR' | 'ETC';
  matchDate?: string;
  opponent?: string;
}

interface MatchCenterContentProps {
  initialHistoryId?: number;
  initialMatchId?: number;
  onNavigated?: () => void;
  currentDisplayName?: string;
}

const MatchCenterContent: React.FC<MatchCenterContentProps> = ({
  initialHistoryId,
  initialMatchId,
  onNavigated,
  currentDisplayName,
}) => {
  const [matchHistories, setMatchHistories] = useState<MatchHistoryResponseDto[]>([]);
  const [mapPlaces, setMapPlaces] = useState<MapPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<MatchHistoryResponseDto | null>(null);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [detailHistory, setDetailHistory] = useState<MatchHistoryResponseDto | null>(null);

  // MatchHistory에서 MapPlace 목록 추출
  const extractMapPlaces = (histories: MatchHistoryResponseDto[]): MapPlace[] => {
    const places: MapPlace[] = [];
    histories.forEach(history => {
      if (history.places) {
        history.places.forEach((place: PlaceResponseDto) => {
          places.push({
            placeId: place.id,
            matchHistoryId: history.id,
            address: place.address,
            latitude: place.latitude,
            longitude: place.longitude,
            placeType: place.placeType,
            matchDate: history.matchInfo?.kickOffTime || history.createdAt,
            opponent: history.matchInfo?.awayTeam,
          });
        });
      }
    });
    return places;
  };

  // 데이터 로드
  const fetchMatchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await matchHistoryApi.getAll();
      setMatchHistories(response.content);
      setMapPlaces(extractMapPlaces(response.content));
      return response.content;
    } catch (error) {
      console.error('직관 기록 로드 실패:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatchHistory().then(histories => {
      if (initialHistoryId && histories.length > 0) {
        const target = histories.find(h => h.id === initialHistoryId);
        if (target) {
          setSelectedHistory(target);
          setDetailHistory(target);
          setIsDetailModalVisible(true);
        }
        onNavigated?.();
      } else if (initialMatchId) {
        setIsAddModalVisible(true);
        onNavigated?.();
      }
    });
  }, [fetchMatchHistory]); // eslint-disable-line react-hooks/exhaustive-deps

  // 지도 마커 클릭
  const handleMarkerClick = (place: MapPlace) => {
    setSelectedPlace(place);
    // 해당 place가 속한 history 찾기
    const history = matchHistories.find(h => h.id === place.matchHistoryId);
    if (history) {
      setSelectedHistory(history);
    }
  };

  // 리스트 아이템 클릭 - 상세 모달 열기
  const handleListItemClick = (history: MatchHistoryResponseDto) => {
    setSelectedHistory(history);
    setDetailHistory(history);
    setIsDetailModalVisible(true);
    // 해당 history의 첫 번째 place 선택 (지도 이동용)
    if (history.places && history.places.length > 0) {
      const place = history.places[0];
      setSelectedPlace({
        placeId: place.id,
        matchHistoryId: history.id,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        placeType: place.placeType,
        matchDate: history.matchInfo?.kickOffTime || history.createdAt,
        opponent: history.matchInfo?.awayTeam,
      });
    }
  };

  // 상세 모달에서 수정 클릭
  const handleEditClick = (history: MatchHistoryResponseDto) => {
    setDetailHistory(history);
    setIsDetailModalVisible(false);
    setIsEditModalVisible(true);
  };

  // 삭제 완료
  const handleDeleted = async () => {
    setIsDetailModalVisible(false);
    setDetailHistory(null);
    setSelectedHistory(null);
    await fetchMatchHistory();
  };

  // 수정 완료
  const handleEditComplete = async () => {
    setIsEditModalVisible(false);
    setDetailHistory(null);
    await fetchMatchHistory();
  };

  const handleAddClick = () => {
    setIsAddModalVisible(true);
  };

  const handleAddComplete = async () => {
    setIsAddModalVisible(false);
    await fetchMatchHistory();
  };

  return (
    <div className="match-center">
      {/* 지도 영역 */}
      <div className="match-center-map">
        <MatchMap
          places={mapPlaces}
          selectedPlace={selectedPlace}
          onMarkerClick={handleMarkerClick}
          loading={loading}
        />
      </div>

      {/* 경기 히스토리 리스트 */}
      <div className="match-center-list">
        <MatchHistoryList
          histories={matchHistories}
          selectedHistory={selectedHistory}
          onItemClick={handleListItemClick}
          loading={loading}
        />
      </div>

      {/* FAB 버튼 */}
      <button onClick={handleAddClick} className="match-center-fab">
        <span className="match-center-fab-icon">add</span>
      </button>

      {/* 추가 모달 */}
      <MatchAddModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onCreated={handleAddComplete}
        initialMatchId={initialMatchId}
      />

      {/* 상세 모달 */}
      <MatchHistoryDetailModal
        visible={isDetailModalVisible}
        history={detailHistory}
        onClose={() => setIsDetailModalVisible(false)}
        onEdit={handleEditClick}
        onDeleted={handleDeleted}
        currentDisplayName={currentDisplayName}
      />

      {/* 수정 모달 */}
      <MatchEditModal
        visible={isEditModalVisible}
        history={detailHistory}
        onClose={() => setIsEditModalVisible(false)}
        onUpdated={handleEditComplete}
      />
    </div>
  );
};

export default MatchCenterContent;
