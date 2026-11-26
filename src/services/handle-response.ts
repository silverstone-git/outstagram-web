
import { OutstagramAPI } from './api';

// Create a custom event dispatcher
const dispatchSessionExpiredEvent = () => {
  const event = new CustomEvent('sessionExpired');
  window.dispatchEvent(event);
};

let frozenShown = false;

export async function handleResponse<T>(response: Response): Promise<T | null> {
  if (response.status === 401) {
    OutstagramAPI.removeAuthToken();
    dispatchSessionExpiredEvent();
    throw new Error('Session expired');
  }

  if (response.status === 204) {
    return null; // No content to parse
  }

  if (!response.ok) {
    const errorText = await response.text();
    // FastAPI: {"detail": "..."} or {"detail": {"code", "message"}} (e.g. 403 email_unverified)
    let message = errorText || 'Request failed';
    try {
      const d = JSON.parse(errorText)?.detail;
      if (typeof d === 'string') message = d;
      else if (d?.message) message = d.message;
      if (d?.code === 'email_unverified') window.dispatchEvent(new CustomEvent('emailUnverified'));
      // Frozen by an admin: sign out and say why (a sign-in attempt just shows the message in the form).
      if (d?.code === 'account_frozen' && OutstagramAPI.getAuthToken() && !frozenShown) {
        frozenShown = true;
        OutstagramAPI.removeAuthToken();
        localStorage.removeItem('outstagram_user');
        window.alert(message);
        window.location.reload();
      }
    } catch { /* not JSON */ }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function fetchWithHandling(url: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(url, options);
  if (response.status === 401) {
    OutstagramAPI.removeAuthToken();
    dispatchSessionExpiredEvent();
  }
  return response;
}
