import type { useApolloClient } from 'react-apollo'

import { SHIPPING_INFO_COOKIE } from './constants'
import { setCookie } from './utils/cookie'
import CATALOG_COUNT from './queries/catalogCount.graphql'
import PICKUP_POINT_AVAILABILITY from './queries/pickupPointAvailability.graphql'

/** The Apollo client `useApolloClient()` returns (null outside an Apollo provider). */
export type QueryClient = ReturnType<typeof useApolloClient>

/** Matches delivery-promises-bff availability body (`itemId` = SKU, `productId` = catalog product). */
export type AvailabilityItem = {
  itemId: string
  productId: string
}

/**
 * Pre-resolved Checkout postal-code response, threaded through the dispatch
 * handler so a single `getAddress` call serves the whole `UPDATE_ZIPCODE` flow.
 */
export type ResolvedAddress = {
  city?: string
  geoCoordinates: number[]
}

/** Optional bag accepted by availability calls so callers can pass a pre-resolved address. */
export type AvailabilityCallOptions = {
  address?: ResolvedAddress
}

/** Address fields from Intelligent Search `pickup-point-availability` (may be partial). */
export type PickupPointAvailabilityAddress = {
  neighborhood?: string
  street?: string
  postalCode?: string
  city?: string
  number?: string
  state?: string
}

/** One row from `pickupPointDistances` in the pickup-point-availability response. */
export type PickupPointDistance = {
  pickupId: string
  pickupName: string
  distance: number
  isActive: boolean
  address?: PickupPointAvailabilityAddress
}

export type PickupPointAvailabilityResponse = {
  pickupPointDistances?: PickupPointDistance[]
}

const buildAvailabilityLocation = (
  zipCode: string,
  countryCode: string,
  geoCoordinates: number[]
) => ({
  zipCode,
  coordinate: {
    longitude: geoCoordinates[0],
    latitude: geoCoordinates[1],
  },
  country: countryCode,
})

/** Appends optional BFF `sc` (sales channel) query param when defined. */
const withAvailabilityScQuery = (
  baseUrlWithQuery: string,
  salesChannel?: string
) => {
  if (salesChannel == null || salesChannel.trim() === '') {
    return baseUrlWithQuery
  }

  return `${baseUrlWithQuery}&sc=${encodeURIComponent(salesChannel.trim())}`
}

export const getAddress = (
  countryCode: string,
  zipCode: string,
  account: string
) =>
  fetch(
    `/api/checkout/pub/postal-code/${countryCode}/${zipCode}?an=${account}`
  ).then((res) => res.json())

// FIXME in the future the country should not be passed here, instead it should go to session
// so this should be fixed for not to pass the country anymore
export const updateSession = async (
  countryCode: string,
  zipCode: string,
  geoCoordinates: number[],
  pickup?: Pickup,
  shippingOption?: string
) => {
  const facetsValue = `zip-code=${zipCode};country=${countryCode};coordinates=${geoCoordinates.join(
    ','
  )}${shippingOption ? `;shipping=${shippingOption}` : ''}${
    pickup ? `;pickupPoint=${pickup.pickupPoint.id}` : ''
  }`

  // __RUNTIME__.segmentToken is not reliable for the facets. It might not be updated. For this reason we must try to get the info from our custom cookie first
  // Replacing ";" by ":" because ";" is not allowed in cookies
  setCookie(SHIPPING_INFO_COOKIE, facetsValue.replace(/;/g, ':'))

  await fetch('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({
      public: {
        facets: {
          value: facetsValue,
        },
      },
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

function mapPickupPointDistanceRow(ppd: PickupPointDistance) {
  const { address } = ppd

  return {
    distance: ppd.distance,
    pickupPoint: {
      id: ppd.pickupId,
      friendlyName: ppd.pickupName,
      address: {
        neighborhood: address?.neighborhood ?? '',
        street: address?.street ?? '',
        postalCode: address?.postalCode ?? '',
        city: address?.city ?? '',
        number: address?.number ?? '',
        state: address?.state ?? '',
      },
      isActive: ppd.isActive,
    },
  }
}

export const clearShippingSession = async () => {
  document.cookie = `${SHIPPING_INFO_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`

  await fetch('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({
      public: {
        facets: {
          value: '',
        },
      },
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

const requireClient = (apolloClient: QueryClient) => {
  if (!apolloClient) {
    throw new Error('Apollo client is not available')
  }

  return apolloClient
}

export const getPickups = async (
  apolloClient: QueryClient,
  countryCode: string,
  zipCode: string,
  salesChannel: string
) => {
  try {
    const { data } = await requireClient(apolloClient).query<{
      pickupPointAvailability?: PickupPointAvailabilityResponse
    }>({
      query: PICKUP_POINT_AVAILABILITY,
      variables: { salesChannel, zipCode, country: countryCode },
      fetchPolicy: 'network-only',
    })

    const distances = data?.pickupPointAvailability?.pickupPointDistances

    return {
      items: Array.isArray(distances)
        ? distances.map(mapPickupPointDistanceRow)
        : [],
    }
  } catch {
    return { items: [] }
  }
}

export const updateOrderForm = (
  country: string,
  zipCode: string,
  orderFormId: string
) =>
  fetch(`/api/checkout/pub/orderForm/${orderFormId}/attachments/shippingData`, {
    method: 'POST',
    body: `{"selectedAddresses": [{ "postalCode": "${zipCode}", "country": "${country}" }]}`,
    headers: {
      'Content-Type': 'application/json',
    },
  }).then((res) => res.json())

export const clearOrderFormShipping = (orderFormId: string) =>
  fetch(`/api/checkout/pub/orderForm/${orderFormId}/attachments/shippingData`, {
    method: 'POST',
    body: JSON.stringify({ selectedAddresses: [] }),
    headers: {
      'Content-Type': 'application/json',
    },
  }).then((res) => res.json())

export const getCatalogCount = async (
  apolloClient: QueryClient,
  zipCode: string,
  geoCoordinates: number[]
) => {
  const { data } = await requireClient(apolloClient).query<{
    catalogCount: { total: number }
  }>({
    query: CATALOG_COUNT,
    variables: { zipCode, coordinates: geoCoordinates.join(',') },
    fetchPolicy: 'network-only',
  })

  return data.catalogCount
}

export const getCartProducts = async (orderFormId: string) => {
  const orderForm = await fetch(
    `/api/checkout/pub/orderForm/${orderFormId}`
  ).then((res) => res.json())

  return orderForm.items
}

/** Maps Checkout orderForm items to BFF `items` (SKU id + catalog product id). */
export const orderFormItemsToAvailabilityItems = (
  orderFormItems: unknown[]
): AvailabilityItem[] =>
  orderFormItems.map((raw) => {
    const line = raw as { id: string | number; productId?: string | number }
    const itemId = String(line.id)
    const productId =
      line.productId != null && String(line.productId) !== ''
        ? String(line.productId)
        : itemId

    return { itemId, productId }
  })

export const validateProductAvailability = async (
  zipCode: string,
  countryCode: string,
  items: AvailabilityItem[],
  account: string,
  salesChannel?: string,
  options?: AvailabilityCallOptions
) => {
  const address =
    options?.address ?? (await getAddress(countryCode, zipCode, account))

  const requestBody = {
    location: buildAvailabilityLocation(
      zipCode,
      countryCode,
      address.geoCoordinates
    ),
    items,
  }

  const url = withAvailabilityScQuery(
    `/api/delivery-promises-bff/availability/deliveryorpickup?an=${encodeURIComponent(
      account
    )}`,
    salesChannel
  )

  return fetch(url, {
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: {
      'Content-Type': 'application/json',
    },
  }).then((res) => res.json())
}

export const validateProductAvailabilityByDelivery = async (
  zipCode: string,
  countryCode: string,
  items: AvailabilityItem[],
  account: string,
  salesChannel?: string,
  options?: AvailabilityCallOptions
) => {
  const address =
    options?.address ?? (await getAddress(countryCode, zipCode, account))

  const requestBody = {
    location: buildAvailabilityLocation(
      zipCode,
      countryCode,
      address.geoCoordinates
    ),
    items,
  }

  const url = withAvailabilityScQuery(
    `/api/delivery-promises-bff/availability/delivery?an=${encodeURIComponent(
      account
    )}`,
    salesChannel
  )

  return fetch(url, {
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: {
      'Content-Type': 'application/json',
    },
  }).then((res) => res.json())
}

export const validateProductAvailabilityByPickup = async (
  pickupId: string,
  items: AvailabilityItem[],
  zipCode: string,
  countryCode: string,
  account: string,
  salesChannel?: string,
  options?: AvailabilityCallOptions
) => {
  if (!options?.address) {
    await getAddress(countryCode, zipCode, account)
  }

  const requestBody = {
    items,
  }

  const url = withAvailabilityScQuery(
    `/api/delivery-promises-bff/availability/pickupid?an=${encodeURIComponent(
      account
    )}&pickupId=${encodeURIComponent(pickupId)}`,
    salesChannel
  )

  return fetch(url, {
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: {
      'Content-Type': 'application/json',
    },
  }).then((res) => res.json())
}
