import { useEffect, useState } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

export function useFingerprint() {
  const [fpHash, setFpHash] = useState('');

  useEffect(() => {
    const loadFingerprint = async () => {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      setFpHash(result.visitorId);
    };

    void loadFingerprint();
  }, []);

  return fpHash;
}
