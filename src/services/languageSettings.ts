import { Language } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export const syncPreferredLanguage = async (userId: string, language: Language): Promise<void> => {
  try {
    await fetch(`${API_BASE_URL}/api/user/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, preferred_language: language }),
      keepalive: true,
    });
  } catch {
    return;
  }
};
