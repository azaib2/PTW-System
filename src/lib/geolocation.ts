export interface Coords { latitude: number; longitude: number; }

export function getCurrentLocation(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location services are not available on this device/browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      err => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('Location access was denied. Enable location permission for this site to continue.'));
        } else if (err.code === err.TIMEOUT) {
          reject(new Error('Could not get your location in time. Check your GPS/network connection and try again.'));
        } else {
          reject(new Error('Could not determine your location. Try again or move to an area with better GPS signal.'));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  });
}
