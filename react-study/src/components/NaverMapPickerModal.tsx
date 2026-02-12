import { useEffect, useRef, useState, useCallback } from 'react';

const modalStyles = {
  colors: {
    primary: '#ffb4a8',
    primaryDark: '#ff9a8b',
    textDark: '#333333',
    textMuted: '#666666',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray500: '#6b7280',
    white: '#ffffff',
  },
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};

interface SearchResultItem {
  title: string;
  address: string;
  roadAddress: string;
  mapx: string; // TM128 x
  mapy: string; // TM128 y
}

interface NaverMapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (place: string, latitude: number, longitude: number) => void;
  initialLat?: number;
  initialLng?: number;
}

export default function NaverMapPickerModal({
  isOpen,
  onClose,
  onConfirm,
  initialLat,
  initialLng,
}: NaverMapPickerModalProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<naver.maps.Map | null>(null);
  const markerRef = useRef<naver.maps.Marker | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selectedPlace, setSelectedPlace] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);

  // 핀 이동 공통 헬퍼
  const movePin = useCallback((lat: number, lng: number, placeName: string, address?: string) => {
    if (!mapInstanceRef.current) return;
    const position = new naver.maps.LatLng(lat, lng);
    if (markerRef.current) {
      markerRef.current.setPosition(position);
    } else {
      markerRef.current = new naver.maps.Marker({
        position,
        map: mapInstanceRef.current,
      });
    }
    setSelectedLat(lat);
    setSelectedLng(lng);
    mapInstanceRef.current.panTo(position, { duration: 300 } as any);
    setSelectedPlace(placeName);
    setSelectedAddress(address || '');
  }, []);

  // 리버스 지오코딩으로 주소 가져오기 (지도 클릭 시 사용)
  const reverseGeocode = useCallback((lat: number, lng: number) => {
    if (!naver?.maps?.Service) {
      setSelectedPlace(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      setSelectedAddress('');
      return;
    }

    const coord = new naver.maps.LatLng(lat, lng);
    naver.maps.Service.reverseGeocode(
      { coords: coord, orders: 'roadaddr,addr' },
      (status, response) => {
        if (status !== 200 || !response.v2) {
          setSelectedPlace(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          setSelectedAddress('');
          return;
        }

        const result = response.v2;
        const roadAddr = result.address?.roadAddress || '';
        const jibunAddr = result.address?.jibunAddress || '';
        const address = roadAddr || jibunAddr;

        let placeName = '';
        if (result.results && result.results.length > 0) {
          const r = result.results[0];
          const region = r.region;
          const parts = [
            region.area1?.name,
            region.area2?.name,
            region.area3?.name,
          ].filter(Boolean);

          if (r.land?.name) {
            placeName = r.land.name;
          } else if (r.land?.addition0?.value) {
            placeName = r.land.addition0.value;
          } else {
            placeName = parts.join(' ');
          }
        }

        setSelectedPlace(placeName || address);
        setSelectedAddress(address);
      }
    );
  }, []);

  // 지도 클릭 시 마커 이동
  const setMarkerPosition = useCallback((lat: number, lng: number) => {
    if (!mapInstanceRef.current) return;
    const position = new naver.maps.LatLng(lat, lng);
    if (markerRef.current) {
      markerRef.current.setPosition(position);
    } else {
      markerRef.current = new naver.maps.Marker({
        position,
        map: mapInstanceRef.current,
      });
    }
    setSelectedLat(lat);
    setSelectedLng(lng);
    mapInstanceRef.current.panTo(position, { duration: 300 } as any);
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  // SDK 동적 로딩 + 지도 초기화
  useEffect(() => {
    if (!isOpen || !mapRef.current) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const initMap = () => {
      if (cancelled || !mapRef.current) return;

      const defaultLat = initialLat || 37.5665;
      const defaultLng = initialLng || 126.978;

      const map = new naver.maps.Map(mapRef.current, {
        center: new naver.maps.LatLng(defaultLat, defaultLng),
        zoom: 15,
        zoomControl: true,
        zoomControlOptions: { position: 3 },
        mapTypeControl: false,
        scaleControl: false,
      });

      mapInstanceRef.current = map;

      if (initialLat && initialLng) {
        const pos = new naver.maps.LatLng(initialLat, initialLng);
        markerRef.current = new naver.maps.Marker({ position: pos, map });
        setSelectedLat(initialLat);
        setSelectedLng(initialLng);
        reverseGeocode(initialLat, initialLng);
      }

      naver.maps.Event.addListener(map, 'click', (e: any) => {
        setSearchResults([]);
        setMarkerPosition(e.coord.lat(), e.coord.lng());
      });

      setIsMapReady(true);
    };

    const loadAndInit = () => {
      if (typeof naver !== 'undefined' && naver.maps && typeof naver.maps.Map === 'function') {
        timer = setTimeout(initMap, 100);
        return;
      }
      const existingScript = document.querySelector('script[src*="oapi.map.naver.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => { timer = setTimeout(initMap, 100); });
        return;
      }
      const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;
      const script = document.createElement('script');
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=geocoder`;
      script.async = true;
      script.onload = () => { if (!cancelled) timer = setTimeout(initMap, 100); };
      document.head.appendChild(script);
    };

    loadAndInit();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (markerRef.current) { markerRef.current.setMap(null); markerRef.current = null; }
      if (mapInstanceRef.current) { mapInstanceRef.current.destroy(); mapInstanceRef.current = null; }
      setIsMapReady(false);
    };
  }, [isOpen, initialLat, initialLng, reverseGeocode, setMarkerPosition]);

  // 검색 실행: 백엔드 프록시 → NCP Geocoding API
  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query) return;

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL;
      const res = await fetch(
        `${apiBase}/api/v1/naver-search/places?query=${encodeURIComponent(query)}`
      );
      if (!res.ok) throw new Error('검색 실패');

      const data = await res.json();
      const items: SearchResultItem[] = data.items || [];
      if (items.length === 0) {
        alert('검색 결과가 없습니다.');
        return;
      }

      if (items.length === 1) {
        const item = items[0];
        const name = item.title;
        const lat = parseInt(item.mapy) / 10000000;
        const lng = parseInt(item.mapx) / 10000000;
        movePin(lat, lng, name, item.roadAddress || item.address);
        setSearchResults([]);
      } else {
        setSearchResults(items);
      }
    } catch (err) {
      console.error('[NaverMap] 장소 검색 오류:', err);
      alert('검색에 실패했습니다.');
    }
  }, [searchQuery, movePin]);

  // 검색 결과 선택
  const handleSelectResult = useCallback((item: SearchResultItem) => {
    const name = item.title;
    const lat = parseInt(item.mapy) / 10000000;
    const lng = parseInt(item.mapx) / 10000000;
    movePin(lat, lng, name, item.roadAddress || item.address);
    setSearchResults([]);
  }, [movePin]);

  // 확인 버튼
  const handleConfirm = () => {
    if (selectedLat === null || selectedLng === null) {
      alert('지도에서 위치를 선택해주세요.');
      return;
    }
    onConfirm(selectedPlace, selectedLat, selectedLng);
    handleClose();
  };

  // 닫기
  const handleClose = () => {
    setSelectedPlace('');
    setSelectedAddress('');
    setSelectedLat(null);
    setSelectedLng(null);
    setSearchQuery('');
    setSearchResults([]);
    onClose();
  };

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        fontFamily: modalStyles.fontFamily,
      }}
    >
      {/* 배경 오버레이 */}
      <div
        onClick={handleClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* 모달 바텀 시트 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 500,
          height: '85vh',
          backgroundColor: modalStyles.colors.white,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        {/* 드래그 핸들 */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: modalStyles.colors.gray200,
            }}
          />
        </div>

        {/* 헤더 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px 12px',
            borderBottom: `1px solid ${modalStyles.colors.gray100}`,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: modalStyles.colors.textDark,
            }}
          >
            장소 선택
          </h3>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              color: modalStyles.colors.gray500,
              cursor: 'pointer',
              padding: 4,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* 검색 바 */}
        <div style={{ padding: '12px 16px', display: 'flex', gap: 8, position: 'relative' }}>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="장소명을 검색하세요 (예: 건대입구역)"
            style={{
              flex: 1,
              padding: '10px 12px',
              fontSize: 14,
              border: `1px solid ${modalStyles.colors.gray200}`,
              borderRadius: 8,
              outline: 'none',
              fontFamily: modalStyles.fontFamily,
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: modalStyles.colors.primary,
              color: modalStyles.colors.white,
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: modalStyles.fontFamily,
            }}
          >
            검색
          </button>
        </div>

        {/* 검색 결과 목록 */}
        {searchResults.length > 0 && (
          <div
            style={{
              maxHeight: 200,
              overflowY: 'auto',
              borderBottom: `1px solid ${modalStyles.colors.gray200}`,
              backgroundColor: modalStyles.colors.white,
            }}
          >
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectResult(item)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 16px',
                  border: 'none',
                  borderBottom: idx < searchResults.length - 1 ? `1px solid ${modalStyles.colors.gray100}` : 'none',
                  backgroundColor: modalStyles.colors.white,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: modalStyles.fontFamily,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: modalStyles.colors.textDark, marginBottom: 2 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 12, color: modalStyles.colors.textMuted }}>
                  {item.roadAddress || item.address}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 지도 영역 */}
        <div
          ref={mapRef}
          style={{
            flex: 1,
            minHeight: 0,
            backgroundColor: modalStyles.colors.gray100,
            position: 'relative',
          }}
        >
          {!isMapReady && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: modalStyles.colors.textMuted,
                fontSize: 14,
              }}
            >
              지도를 불러오는 중...
            </div>
          )}
        </div>

        {/* 선택된 장소 정보 + 확인 버튼 */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: `1px solid ${modalStyles.colors.gray100}`,
            backgroundColor: modalStyles.colors.white,
          }}
        >
          {selectedLat !== null ? (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: modalStyles.colors.textDark,
                  marginBottom: 2,
                }}
              >
                {selectedPlace}
              </div>
              {selectedAddress && selectedAddress !== selectedPlace && (
                <div style={{ fontSize: 12, color: modalStyles.colors.textMuted }}>
                  {selectedAddress}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                fontSize: 13,
                color: modalStyles.colors.textMuted,
                marginBottom: 12,
                textAlign: 'center',
              }}
            >
              지도를 탭하여 위치를 선택하세요
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={selectedLat === null}
            style={{
              width: '100%',
              padding: '12px 0',
              fontSize: 15,
              fontWeight: 700,
              backgroundColor:
                selectedLat !== null
                  ? modalStyles.colors.primary
                  : modalStyles.colors.gray200,
              color:
                selectedLat !== null
                  ? modalStyles.colors.white
                  : modalStyles.colors.gray500,
              border: 'none',
              borderRadius: 10,
              cursor: selectedLat !== null ? 'pointer' : 'default',
              fontFamily: modalStyles.fontFamily,
              transition: 'background-color 0.2s',
            }}
          >
            이 위치로 선택
          </button>

          <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
