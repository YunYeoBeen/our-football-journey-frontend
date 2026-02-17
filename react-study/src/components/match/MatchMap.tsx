import { useEffect, useRef, useCallback, useState } from 'react';
import type { MapPlace } from './MatchCenterContent';
import type { PlaceType } from '../../services/matchHistoryApi';

interface MatchMapProps {
  places: MapPlace[];
  selectedPlace: MapPlace | null;
  onMarkerClick: (place: MapPlace) => void;
  loading?: boolean;
}

// PlaceType별 색상
const placeTypeColors: Record<PlaceType, string> = {
  STADIUM: '#004A9F',    // 울산 블루
  RESTAURANT: '#ef4444', // 레드
  CAFE: '#f97316',       // 오렌지
  BAR: '#8b5cf6',        // 퍼플
  ETC: '#ffb4a8',        // 기본 핑크
};

// PlaceType별 아이콘
const placeTypeIcons: Record<PlaceType, string> = {
  STADIUM: 'sports_soccer',
  RESTAURANT: 'restaurant',
  CAFE: 'local_cafe',
  BAR: 'sports_bar',
  ETC: 'place',
};

const MatchMap: React.FC<MatchMapProps> = ({
  places,
  selectedPlace,
  onMarkerClick,
  loading,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<Map<number, naver.maps.Marker>>(new Map());
  const [isMapReady, setIsMapReady] = useState(false);

  // 커스텀 마커 아이콘 생성 (하트 모양 핀)
  const createMarkerIcon = useCallback((isSelected: boolean, placeType: PlaceType) => {
    const color = placeTypeColors[placeType] || placeTypeColors.ETC;
    const icon = placeTypeIcons[placeType] || placeTypeIcons.ETC;
    const size = isSelected ? 48 : 36;

    return {
      content: `
        <div style="
          position: relative;
          width: ${size}px;
          height: ${size + 12}px;
          display: flex;
          flex-direction: column;
          align-items: center;
        ">
          <div style="
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            ${isSelected ? 'animation: bounce 0.3s ease-out;' : ''}
          ">
            <span style="
              transform: rotate(45deg);
              color: white;
              font-family: 'Material Symbols Outlined';
              font-size: ${size * 0.5}px;
            ">${icon}</span>
          </div>
          <div style="
            width: 8px;
            height: 8px;
            background: ${color};
            border-radius: 50%;
            margin-top: -4px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          "></div>
        </div>
      `,
      anchor: new naver.maps.Point(size / 2, size + 8),
    };
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const initMap = () => {
      if (cancelled || !mapRef.current) return;

      // 기본 위치: 울산
      const defaultLat = 36.5;
      const defaultLng = 127.8;

      const map = new naver.maps.Map(mapRef.current, {
        center: new naver.maps.LatLng(defaultLat, defaultLng),
        zoom: 7,
        zoomControl: true,
        zoomControlOptions: { position: 3 },
        mapTypeControl: false,
        scaleControl: false,
      });

      mapInstanceRef.current = map;
      setIsMapReady(true);
    };

    // naver.maps가 준비될 때까지 폴링
    const waitForNaverMaps = () => {
      if (cancelled) return;
      if (typeof naver !== 'undefined' && naver.maps && typeof naver.maps.Map === 'function') {
        initMap();
        return;
      }
      timer = setTimeout(waitForNaverMaps, 100);
    };

    const loadAndInit = () => {
      // 이미 로드됨
      if (typeof naver !== 'undefined' && naver.maps && typeof naver.maps.Map === 'function') {
        initMap();
        return;
      }

      // 스크립트가 이미 있으면 로드 대기
      const existingScript = document.querySelector('script[src*="oapi.map.naver.com"]');
      if (existingScript) {
        waitForNaverMaps();
        return;
      }

      // 새로 스크립트 로드
      const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;
      const script = document.createElement('script');
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
      script.async = true;
      script.onload = () => {
        if (!cancelled) waitForNaverMaps();
      };
      document.head.appendChild(script);
    };

    loadAndInit();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      // 마커 정리
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current.clear();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
      setIsMapReady(false);
    };
  }, []);

  // 마커 생성/업데이트
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // 기존 마커 중 더 이상 존재하지 않는 것들 제거
    const currentIds = new Set(places.map(p => p.placeId));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    });

    // 마커 생성 또는 업데이트
    places.forEach(place => {
      const isSelected = selectedPlace?.placeId === place.placeId;
      const existingMarker = markersRef.current.get(place.placeId);

      if (existingMarker) {
        // 기존 마커 제거 후 새로 생성 (타입 문제 우회)
        existingMarker.setMap(null);
        markersRef.current.delete(place.placeId);
      }

      // 새 마커 생성
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(place.latitude, place.longitude),
        map,
        icon: createMarkerIcon(isSelected, place.placeType),
      });

      naver.maps.Event.addListener(marker, 'click', () => {
        onMarkerClick(place);
      });

      markersRef.current.set(place.placeId, marker);
    });

    // 선택된 마커로 지도 이동
    if (selectedPlace) {
      const position = new naver.maps.LatLng(
        selectedPlace.latitude,
        selectedPlace.longitude
      );
      map.panTo(position, { duration: 300 } as any);
    }
  }, [isMapReady, places, selectedPlace, onMarkerClick, createMarkerIcon]);

  return (
    <div className="match-map">
      <div ref={mapRef} className="match-map-container" />
      {(!isMapReady || loading) && (
        <div className="match-map-loading">
          <span className="match-map-loading-icon">progress_activity</span>
          <span>지도를 불러오는 중...</span>
        </div>
      )}

      {/* 범례 */}
      <div className="match-map-legend">
        {Object.entries(placeTypeColors).map(([type, color]) => (
          <div key={type} className="match-map-legend-item">
            <span
              className="match-map-legend-dot"
              style={{ backgroundColor: color }}
            />
            <span className="match-map-legend-label">
              {type === 'STADIUM' && '경기장'}
              {type === 'RESTAURANT' && '맛집'}
              {type === 'CAFE' && '카페'}
              {type === 'BAR' && '술집'}
              {type === 'ETC' && '기타'}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: rotate(-45deg) scale(1); }
          50% { transform: rotate(-45deg) scale(1.1); }
        }
        .match-map-legend {
          position: absolute;
          bottom: 16px;
          left: 16px;
          background: white;
          padding: 8px 12px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 12px;
          z-index: 10;
        }
        .match-map-legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .match-map-legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .match-map-legend-label {
          color: #666;
        }
      `}</style>
    </div>
  );
};

export default MatchMap;
