const SUPPRESS_AUTO_GEOLOCATION_SESSION_KEY =
  'vtex:delivery-promise:suppressAutoGeolocation'

export function readSuppressAutoGeolocation(): boolean {
  if (typeof sessionStorage === 'undefined') {
    return false
  }

  try {
    return sessionStorage.getItem(SUPPRESS_AUTO_GEOLOCATION_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function setSuppressAutoGeolocation(): void {
  if (typeof sessionStorage === 'undefined') {
    return
  }

  try {
    sessionStorage.setItem(SUPPRESS_AUTO_GEOLOCATION_SESSION_KEY, '1')
  } catch {
    /* private mode / disabled storage */
  }
}

export function clearSuppressAutoGeolocation(): void {
  if (typeof sessionStorage === 'undefined') {
    return
  }

  try {
    sessionStorage.removeItem(SUPPRESS_AUTO_GEOLOCATION_SESSION_KEY)
  } catch {
    /* ignore */
  }
}
