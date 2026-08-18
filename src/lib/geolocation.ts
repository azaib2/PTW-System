export interface Coords { latitude: number; longitude: number; }

export function getCurrentLocation(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location services are not available on this device/browser.'));
      return;
    }
    // enableHighAccuracy forces a GPS-only fix, which many laptops/desktops
    // don't have hardware for and will simply time out on every attempt.
    // Falling back to network/Wi-Fi based positioning (accurate to roughly
    // tens-to-low-hundreds of meters) is far more reliable across devices
    // and still precise enough for a site-level geofence.
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      err => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('Location access was denied. Enable location permission for this site to continue.'));
        } else if (err.code === err.TIMEOUT) {
          reject(new Error('Could not get your location in time. Move somewhere with a clearer signal (near a window, outdoors) and try again.'));
        } else {
          reject(new Error('Could not determine your location. Try again or move to an area with better signal.'));
        }
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 120000 }
    );
  });
}
