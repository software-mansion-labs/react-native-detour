// Module-level auth snapshot for non-React consumers (e.g., +native-intent.tsx).
// Updated by AuthProvider whenever isLoaded or isSignedIn changes.

let _isSignedIn = false;
let _isLoaded = false;

export function setAuthSnapshot(isLoaded: boolean, isSignedIn: boolean) {
  _isLoaded = isLoaded;
  _isSignedIn = isSignedIn;
}

export function getAuthSnapshot() {
  return { isLoaded: _isLoaded, isSignedIn: _isSignedIn };
}
