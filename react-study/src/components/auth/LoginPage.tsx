import { useEffect, useState } from 'react';
import GoogleLoginButton from './GoogleLoginButton';
import { s3Api } from '../../services/s3Api';
import '../../styles/LoginPage.css';

export default function LoginPage() {
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [mainImages, setMainImages] = useState<string[]>([]);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');

    if (error === 'unauthorized') {
      setShowErrorModal(true);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  return (
    <div className="login-page">
      {/* Main Content */}
      <div className="login-main">
        {/* Logo Section */}
        <div className="login-logo-section">
          <div className="login-logo-wrapper">
            <span className="login-logo-m">M</span>
            <span className="material-symbols-outlined login-logo-heart">favorite</span>
          </div>
          <h1 className="login-brand-name">Musahae</h1>
        </div>

        {/* Login Button */}
        <div className="login-button-wrapper">
          <GoogleLoginButton />
        </div>

        {/* Decorative Image Grid */}
        {mainImages.length > 0 && (
          <div className="login-image-grid-wrapper">
            <div className="login-image-grid">
              {mainImages.map((url, index) => (
                <div
                  key={index}
                  className={`login-image-item ${index === 1 ? 'login-image-item--middle' : ''}`}
                  style={{ backgroundImage: `url("${url}")` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* iOS Home Indicator */}
      <div className="login-home-indicator">
        <div className="login-home-indicator-bar" />
      </div>

      {/* 접근 불가 모달 */}
      {showErrorModal && (
        <div className="login-error-overlay" onClick={() => setShowErrorModal(false)}>
          <div className="login-error-modal" onClick={(e) => e.stopPropagation()}>
            <div className="login-error-icon">
              <span style={{ fontSize: '32px' }}>🔒</span>
            </div>
            <h2 className="login-error-title">접근이 제한되었습니다</h2>
            <p className="login-error-message">
              현재 허용된 사용자만 이용할 수 있습니다.
              <br />
              관리자에게 문의해주세요.
            </p>
            <button onClick={() => setShowErrorModal(false)} className="login-error-btn">
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
