/* eslint-disable no-undef */
import { getCountryCode } from '../utils/cookie'

declare const global: typeof globalThis & { atob?: typeof atob }

const encodeSegment = (payload: Record<string, unknown>): string =>
  Buffer.from(JSON.stringify(payload), 'binary').toString('base64')

describe('cookie.getCountryCode — SSR safety', () => {
  const originalAtob = global.atob
  const originalRuntime = (window as any).__RUNTIME__

  beforeEach(() => {
    ;(window as any).__RUNTIME__ = {
      segmentToken: encodeSegment({ countryCode: 'BRA' }),
    }
  })

  afterEach(() => {
    if (originalAtob) {
      global.atob = originalAtob
    } else {
      delete global.atob
    }

    ;(window as any).__RUNTIME__ = originalRuntime
  })

  it('returns the country when the browser `atob` is available', () => {
    expect(getCountryCode()).toBe('BRA')
  })

  it('falls back to Buffer when `atob` is not defined (Node / vm2 SSR)', () => {
    delete global.atob
    expect(typeof atob).toBe('undefined')

    expect(getCountryCode()).toBe('BRA')
  })

  it('returns undefined (does not throw) when the segment is missing', () => {
    ;(window as any).__RUNTIME__ = {}
    expect(getCountryCode()).toBeUndefined()
  })

  it('returns undefined (does not throw) when __RUNTIME__ itself is missing', () => {
    ;(window as any).__RUNTIME__ = undefined
    expect(getCountryCode()).toBeUndefined()
  })

  it('returns undefined (does not throw) when the segment is malformed base64', () => {
    ;(window as any).__RUNTIME__ = { segmentToken: '!!!not-valid-base64$$$' }
    expect(getCountryCode()).toBeUndefined()
  })

  it('returns undefined (does not throw) when the decoded payload is not JSON', () => {
    ;(window as any).__RUNTIME__ = {
      segmentToken: Buffer.from('not-json', 'binary').toString('base64'),
    }
    expect(getCountryCode()).toBeUndefined()
  })
})
