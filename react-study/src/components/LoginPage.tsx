import { useEffect, useState } from 'react';
import GoogleLoginButton from './GoogleLoginButton';
import { s3Api } from '../services/s3Api';

export default function LoginPage() {
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [mainImages, setMainImages] = useState<string[]>([]);

  // 메인 이미지 로드
  useEffect(() => {
    const fetchMainImages = async () => {
      try {
        const urls = await s3Api.getMainImages();
        setMainImages(urls);
      } catch {
        // 이미지 로드 실패 시 빈 배열 유지
      }
    };
    fetchMainImages();
  }, []);

  // 허용되지 않은 사용자 체크
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');

    if (error === 'unauthorized') {
      setShowErrorModal(true);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-off-white)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
        }}
      >
        {/* Logo Section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '64px',
          }}
        >
          {/* M + Heart Logo */}
          <div
            style={{
              position: 'relative',
              marginBottom: '24px',
            }}
          >
            <span
              style={{
                fontSize: '64px',
                fontWeight: 300,
                letterSpacing: '-0.05em',
                color: 'var(--color-brand-gray)',
                lineHeight: 1,
              }}
            >
              M
            </span>
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-12px',
                fontSize: '28px',
                color: 'var(--color-primary)',
              }}
            >
              favorite
            </span>
          </div>

          {/* Brand Name */}
          <h1
            style={{
              color: 'var(--color-brand-gray)',
              letterSpacing: '0.25em',
              fontSize: '20px',
              fontWeight: 500,
              textAlign: 'center',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            Musahae
          </h1>
        </div>

        {/* Login Button */}
        <div style={{ width: '100%', maxWidth: '280px' }}>
          <GoogleLoginButton />
        </div>

        {/* Decorative Image Grid */}
        {mainImages.length > 0 && (
          <div
            style={{
              marginTop: '64px',
              width: '100%',
              maxWidth: '320px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                opacity: 0.4,
                filter: 'grayscale(100%)',
                transition: 'all 0.7s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'grayscale(0%)';
                e.currentTarget.style.opacity = '0.7';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'grayscale(100%)';
                e.currentTarget.style.opacity = '0.4';
              }}
            >
              {mainImages.map((url, index) => (
                <div
                  key={index}
                  style={{
                    aspectRatio: '1',
                    backgroundImage: `url("${url}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    transform: index === 1 ? 'translateY(8px)' : undefined,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* iOS Home Indicator */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          paddingBottom: '12px',
        }}
      >
        <div
          style={{
            width: '128px',
            height: '6px',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            borderRadius: '9999px',
          }}
        />
      </div>

      {/* 접근 불가 모달 */}
      {showErrorModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowErrorModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              padding: '32px 24px',
              maxWidth: '320px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 113, 154, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <span style={{ fontSize: '32px' }}>🔒</span>
            </div>

            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--color-brand-gray)',
                margin: '0 0 12px 0',
              }}
            >
              접근이 제한되었습니다
            </h2>

            <p
              style={{
                fontSize: '14px',
                color: '#666666',
                margin: '0 0 24px 0',
                lineHeight: 1.6,
              }}
            >
              현재 허용된 사용자만 이용할 수 있습니다.
              <br />
              관리자에게 문의해주세요.
            </p>

            <button
              onClick={() => setShowErrorModal(false)}
              style={{
                width: '100%',
                padding: '14px 24px',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
