import type { ShippingMethod } from './context/DeliveryPromiseContext'

/** Same key as search-result PLP (`constants/pickupSearch`). */
export const PICKUP_IN_POINT_STORAGE_KEY = 'vtex.search.pickupInPoint'

export type StoredPickupPreference = {
  id: string | number
  friendlyName?: string
  address?: unknown
  /** Postal code when the user saved this pickup (invalidates preference when zip changes). */
  postalCode?: string
}

export const normalizePostalCode = (postal: string | undefined | null) =>
  (postal ?? '').replace(/\s/g, '').toLowerCase()

export function getNearestPickup(pickups: Pickup[]): Pickup | undefined {
  if (!pickups?.length) {
    return undefined
  }

  return pickups.reduce((best, p) => (p.distance < best.distance ? p : best))
}

export function readStoredPickupPreference(): StoredPickupPreference | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null
  }

  try {
    const raw = localStorage.getItem(PICKUP_IN_POINT_STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as StoredPickupPreference

    if (parsed && parsed.id != null) {
      return parsed
    }
  } catch {
    return null
  }

  return null
}

export function persistPickupPreference(pickup: Pickup, postalCode: string) {
  const payload: StoredPickupPreference = {
    id: pickup.pickupPoint.id,
    friendlyName: pickup.pickupPoint.friendlyName,
    address: pickup.pickupPoint.address,
    postalCode: postalCode.trim(),
  }

  try {
    localStorage.setItem(PICKUP_IN_POINT_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Resolves pickup for session when segment or pickup-in-point shipping applies.
 */
export function resolvePickupForShippingSession(
  pickups: Pickup[],
  postalCode: string,
  segmentPickupId: string | undefined,
  shippingMethod: ShippingMethod | undefined
): Pickup | undefined {
  const nearest = getNearestPickup(pickups)

  if (!nearest) {
    return undefined
  }

  if (shippingMethod === 'delivery') {
    return undefined
  }

  if (segmentPickupId) {
    return (
      pickups.find(
        (p) => String(p.pickupPoint.id) === String(segmentPickupId)
      ) ?? nearest
    )
  }

  if (shippingMethod === 'pickup-in-point') {
    const stored = readStoredPickupPreference()

    if (
      stored?.id != null &&
      normalizePostalCode(stored.postalCode) === normalizePostalCode(postalCode)
    ) {
      const match = pickups.find(
        (p) => String(p.pickupPoint.id) === String(stored.id)
      )

      if (match) {
        return match
      }
    }

    return nearest
  }

  return undefined
}
