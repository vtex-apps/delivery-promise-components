import { SHIPPING_INFO_COOKIE } from '../constants'

export function getCookie(name: string) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)

  if (parts.length === 2) {
    return parts.pop()?.split(';').shift()
  }

  return undefined
}

export function setCookie(name: string, val: string) {
  const date = new Date()
  const value = val

  date.setTime(date.getTime() + 30 * 60 * 1000)

  document.cookie = `${name}=${value}; expires=${date.toUTCString()}; path=/`
}

export function getFacetsData(facetsDataTarget: string) {
  // __RUNTIME__.segmentToken is not reliable for the facets. It might not be updated. For this reason we must try to get the info from our custom cookie first

  let facets = getCookie(SHIPPING_INFO_COOKIE) ?? ''

  if (!facets) {
    const segment = (window as any)?.__RUNTIME__.segmentToken

    if (!segment) {
      return
    }

    facets = JSON.parse(atob(segment)).facets
  }

  if (!facets) {
    return
  }

  const facetsTarget = facets
    .replace(/:/g, ';')
    .split(';')
    .find((facet: string) => facet.indexOf(facetsDataTarget) > -1)

  if (!facetsTarget) {
    return
  }

  const [, data] = facetsTarget.split('=')

  if (data && data[data.length - 1] === ';') {
    return data.substring(0, data.length - 1)
  }

  return data
}

// Decode a base64-encoded VTEX segment token in both browser (`atob`) and
// Node/SSR (`Buffer`) environments. The render-server runs callers inside a
// vm2 sandbox that does not expose `atob`, so a Buffer fallback is required
// any time `getCountryCode` is invoked during server-side rendering.
function decodeBase64(input: string): string {
  if (typeof atob === 'function') {
    return atob(input)
  }

  // eslint-disable-next-line no-undef
  if (typeof Buffer !== 'undefined') {
    // eslint-disable-next-line no-undef
    return Buffer.from(input, 'base64').toString('binary')
  }

  throw new Error('No base64 decoder available')
}

export function getCountryCode() {
  const segment = (window as any)?.__RUNTIME__?.segmentToken

  if (!segment) {
    return
  }

  try {
    const { countryCode } = JSON.parse(decodeBase64(segment))

    return countryCode
  } catch {
    return undefined
  }
}

export function getOrderFormId() {
  const orderForm = localStorage.getItem('orderform')

  if (!orderForm) {
    return
  }

  return JSON.parse(orderForm || '{}').id
}
