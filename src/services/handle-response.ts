
import { OutstagramAPI } from './api';

// Create a custom event dispatcher
const dispatchSessionExpiredEvent = () => {
  const event = new CustomEvent('sessionExpired');
  window.dispatchEvent(event);
};

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
    throw new Error(errorText || 'Request failed');
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
