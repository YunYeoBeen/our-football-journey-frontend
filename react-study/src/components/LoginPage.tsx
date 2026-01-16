import React from 'react';
import GoogleLoginButton from './GoogleLoginButton';

// 공통 스타일
const styles = {
  // 색상
  colors: {
    primary: '#ffb4a8',
    backgroundLight: '#fdfcfc',
    textDark: '#333333',
    textMuted: '#666666',
    textLight: '#999999',
    border: '#F3F3F3',
  },
  // 폰트
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: styles.colors.backgroundLight,
        fontFamily: styles.fontFamily,
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
          padding: '24px',
          paddingBottom: '80px',
        }}
      >
        {/* Branding Section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '48px',
          }}
        >
          {/* Decorative Icon */}
          <div
            style={{
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: `${styles.colors.primary}33`,
            }}
          >
            <span
              style={{
                fontSize: '24px',
                color: styles.colors.primary,
              }}
            >
              ❤️
            </span>
          </div>

          {/* Logo */}
          <h1
            style={{
              color: styles.colors.textDark,
              letterSpacing: '0.15em',
              fontSize: '42px',
              fontWeight: 800,
              lineHeight: 1.2,
              textAlign: 'center',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            Musahae
          </h1>

          {/* Sub-caption */}
          <p
            style={{
              color: styles.colors.textMuted,
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: 1.5,
              paddingTop: '8px',
              textAlign: 'center',
              margin: 0,
            }}
          >
            Our shared journey starts here
          </p>
        </div>

        {/* Login Section */}
        <div
          style={{
            width: '100%',
            maxWidth: '340px',
          }}
        >
          <GoogleLoginButton />
        </div>

        {/* Decorative Image Grid */}
        <div
          style={{
            marginTop: '64px',
            width: '100%',
            maxWidth: '384px',
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
            <div
              style={{
                aspectRatio: '1',
                backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBM8Kxr-yEHTAwKFC0ByATQbtATyspGGNPHhiQ5BaEKbyx0F8x_NTRWDVMAXuw3RhE1J6fjWqRprDaluNxgAZwauGDDlVOew2GUtcLGFtTIqHAd6WglvzZKwtqF78CO3JndFFK4SsFy-BTZXCMMmwvWmQYlkQHGcN4_F7nd4qimwhbAxwtm5R8zO5VTcJckuEOegfuLXpFk_U_Il-EqE3tpPepcQQpk-6UGJgfoIUkJkodZJQqbuM7kn4ons0WF_AuLikYTSF_dI0pp")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            />
            <div
              style={{
                aspectRatio: '1',
                backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCIC7rh_llBisJ8qGOiXFu8oywQOlkW-PzROiAwWZMHy63_T72DoZcezwFRZWawOuH9xzemTHtqmbEE0tbKsYpHDFRzEXhHsLp4-B4qsC2BtQ914Uu--tq1_XSB5SVqsu_Yz5yQaeVDjU1vbmwVOgK66qnROD5UtJpjjihGAXE7MTA6PKQYqNaXI3CsLavM6Uwdz2LhshKDUPvkndj-AdLWDSmfrcheHKZME8RdYSL--fChxI6Kg6flqA2zYIY9mTTzq3-Ooqq4IIXk")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transform: 'translateY(8px)',
              }}
            />
            <div
              style={{
                aspectRatio: '1',
                backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAmAr6IFm3guPytQCFJzG5ci9ktfp_Um0lPUCKnkD4_g4dO6raFHfCRxyFzjNtREQImgtwDvr2bQGcZkpcmKnMvYh0GjT4uPYbqE-mrunDPM4iI-0IwA6Xyp5p2QMjwy_0EhrcpbxZko8z2GV1SqOnsMJYf2CNE_OrOX2kyXmgt1M__s6u173KgS05O5NvMYZQ_nfXRKeZos_C8H1fVFpBz9PVY50fzN8Pyu3qbvo6k062BrNcbPkE32ISmnZfUgLiCKiRxsUkosLB0")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', gap: '24px' }}>
          <a
            href="#"
            style={{
              color: styles.colors.textMuted,
              fontSize: '12px',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Terms
          </a>
          <a
            href="#"
            style={{
              color: styles.colors.textMuted,
              fontSize: '12px',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Privacy
          </a>
          <a
            href="#"
            style={{
              color: styles.colors.textMuted,
              fontSize: '12px',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Help
          </a>
        </div>
        <span
          style={{
            color: styles.colors.textLight,
            fontSize: '10px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Version 1.0.4
        </span>
      </div>

      {/* iOS Home Indicator */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          paddingBottom: '8px',
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
    </div>
  );
}
