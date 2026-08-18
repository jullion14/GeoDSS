import { useCallback, useEffect, useRef, useState } from 'react';

export interface UserPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

type Status = 'idle' | 'locating' | 'tracking' | 'denied' | 'unavailable' | 'error';

/**
 * Browser geolocation, requested only when the user asks for it.
 *
 * Prompting on load trains people to deny before they know what it's for,
 * and a denial is sticky — the browser won't re-prompt without the user
 * digging into site settings.
 */
export function useGeolocation() {
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

    /** Clears the watch without touching state — the error handler needs to
   *  end the watch in some branches but not others. */
  const stopWatch = useCallback(() => {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    stopWatch();
    setPosition(null);
    setStatus('idle');
    setMessage(null);
  }, [stopWatch]);

  const start = useCallback(() => {
    console.log('geo start called');
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      setMessage('This browser does not support location.');
      return;
    }

    setStatus('locating');
    setMessage(null);

    watchId.current = navigator.geolocation.watchPosition(
      pos => {
        console.log('geo fix', pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setStatus('tracking');
        setMessage(null);   // a fix arrived — drop any "still trying" text
      },
      err => {
        if (err.code === err.PERMISSION_DENIED) {
          stopWatch();
          setStatus('denied');
          setMessage('Location permission was denied. Enable it in your browser settings to use this.');
          return;
        }

        if (err.code === err.TIMEOUT) {
          // watchPosition keeps retrying after a timeout, so the watch stays
          // alive — a later fix can still arrive and clear this message.
          setMessage('Still trying to find your location. Desktop machines have no GPS, so this can take a moment.');
          return;
        }

        // POSITION_UNAVAILABLE: the location provider itself failed. Retrying
        // rarely helps, so end the watch rather than spinning.
        stopWatch();
        setStatus('error');
        setMessage('Could not determine your location. Check that location services are enabled for your browser.');
      },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 },
    );
  }, [stopWatch]);

  const toggle = useCallback(() => {
    if (status === 'idle' || status === 'denied' || status === 'error' || status === 'unavailable') start();
    else stop();
  }, [status, start, stop]);

  useEffect(() => () => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
  }, []);

  return { position, status, message, start, stop, toggle };
}