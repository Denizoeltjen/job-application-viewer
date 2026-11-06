import { useState } from 'react';
import { storage } from '../utils/storage';
import type { ApplicationStatus } from '../types';

export function useApplicationStatus(appId: string, initial: ApplicationStatus) {
  const key = `status-${appId}`;
  const [status, setStatusState] = useState<ApplicationStatus>(
    () => (storage.getItem(key) as ApplicationStatus | null) ?? initial,
  );

  const setStatus = (s: ApplicationStatus) => {
    storage.setItem(key, s);
    setStatusState(s);
  };

  return [status, setStatus] as const;
}
