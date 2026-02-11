import { useAuthStore } from '../store/userAuthStore';

let isHandlingExpiry = false;

function showSessionExpiredToast() {
  const existing = document.getElementById('session-expired-toast');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'session-expired-toast';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 99999;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 60px;
    pointer-events: none;
  `;

  const toast = document.createElement('div');
  toast.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 24px;
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1);
    opacity: 0;
    transform: translateY(-20px);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: auto;
    max-width: 340px;
  `;

  toast.innerHTML = `
    <div style="
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(255, 180, 168, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    ">
      <span style="font-size: 20px; font-family: 'Material Symbols Outlined'; color: #ffb4a8;">lock</span>
    </div>
    <div>
      <p style="margin: 0; font-size: 15px; font-weight: 700; color: #ffffff;">세션이 만료되었습니다</p>
      <p style="margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.6);">잠시 후 로그인 페이지로 이동합니다</p>
    </div>
  `;

  overlay.appendChild(toast);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });
  });
}

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status === 401 && !isHandlingExpiry) {
    isHandlingExpiry = true;

    // Show toast first
    showSessionExpiredToast();

    // Delay logout so toast is visible (React Router handles redirect when user becomes null)
    setTimeout(() => {
      useAuthStore.getState().logout();
      isHandlingExpiry = false;
    }, 2000);
  }

  return response;
}
