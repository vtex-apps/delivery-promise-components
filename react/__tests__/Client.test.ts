import {
  getCatalogCount,
  getPickups,
  validateProductAvailability,
  validateProductAvailabilityByDelivery,
  validateProductAvailabilityByPickup,
} from '../client'
import { DEFAULT_TRADE_POLICY } from '../constants'

describe('client.getCatalogCount', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('uses GET without Content-Type and credentials: "omit"', async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve({}) })

    ;(global as any).fetch = mockFetch

    await getCatalogCount('12345-678', [0, 0])

    expect(mockFetch).toHaveBeenCalledTimes(1)
    // eslint-disable-next-line prefer-destructuring
    const [, options] = mockFetch.mock.calls[0]

    expect(options).toMatchObject({
      method: 'GET',
      credentials: 'omit',
    })
    expect(options.headers).toBeUndefined()
  })
})

describe('client.getPickups', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sends GET with credentials omitted and without Content-Type header', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          pickupPointDistances: [],
        }),
    })

    ;(global as any).fetch = mockFetch

    await getPickups('BR', '01310-100', 'store', DEFAULT_TRADE_POLICY)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [, options] = mockFetch.mock.calls[0]

    expect(options).toEqual({ method: 'GET', credentials: 'omit' })
  })

  it('maps pickup-point-availability response to the internal pickup model', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          pickupPointDistances: [
            {
              pickupId: 'p1',
              pickupName: 'Store A',
              distance: 1200,
              isActive: true,
              address: {
                neighborhood: 'Centro',
                street: 'Rua A',
                postalCode: '01310-100',
                city: 'SP',
                number: '10',
                state: 'SP',
              },
            },
          ],
        }),
    })

    ;(global as any).fetch = mockFetch

    const result = await getPickups('BR', '01310-100', 'store', '2')

    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      distance: 1200,
      pickupPoint: {
        id: 'p1',
        friendlyName: 'Store A',
        isActive: true,
        address: {
          neighborhood: 'Centro',
          street: 'Rua A',
          postalCode: '01310-100',
          city: 'SP',
          number: '10',
          state: 'SP',
        },
      },
    })
  })

  it('uses empty strings when address fields are missing', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          pickupPointDistances: [
            {
              pickupId: 'p2',
              pickupName: 'Store B',
              distance: 500,
              isActive: true,
            },
          ],
        }),
    })

    ;(global as any).fetch = mockFetch

    const result = await getPickups('BR', '01310-100', 'store', '1')

    expect(result.items[0].pickupPoint.address).toEqual({
      neighborhood: '',
      street: '',
      postalCode: '',
      city: '',
      number: '',
      state: '',
    })
  })

  it('returns empty items when the API responds with non-OK status', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    })

    ;(global as any).fetch = mockFetch

    const result = await getPickups('BR', '01310-100', 'store', '1')

    expect(result).toEqual({ items: [] })
  })

  it('returns empty items when fetch rejects', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('network'))

    ;(global as any).fetch = mockFetch

    const result = await getPickups('BR', '01310-100', 'store', '1')

    expect(result).toEqual({ items: [] })
  })
})

describe('client.validateProductAvailability — pre-resolved address (K-1)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('skips getAddress when options.address is provided', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ unavailableItemIds: [] }),
    })

    ;(global as any).fetch = mockFetch

    await validateProductAvailability(
      '01310-100',
      'BRA',
      [{ itemId: '1', productId: '10' }],
      'store',
      DEFAULT_TRADE_POLICY,
      { address: { city: 'SP', geoCoordinates: [-46, -23] } }
    )

    expect(mockFetch).toHaveBeenCalledTimes(1)

    const [url, options] = mockFetch.mock.calls[0]

    expect(url).toContain(
      '/api/delivery-promises-bff/availability/deliveryorpickup'
    )
    const body = JSON.parse(options.body)

    expect(body.location).toEqual({
      zipCode: '01310-100',
      country: 'BRA',
      coordinate: { longitude: -46, latitude: -23 },
    })
  })

  it('falls back to getAddress when options is omitted', async () => {
    const mockFetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/checkout/pub/postal-code/')) {
        return Promise.resolve({
          json: () => Promise.resolve({ geoCoordinates: [-46, -23] }),
        })
      }

      return Promise.resolve({
        json: () => Promise.resolve({ unavailableItemIds: [] }),
      })
    })

    ;(global as any).fetch = mockFetch

    await validateProductAvailability(
      '01310-100',
      'BRA',
      [{ itemId: '1', productId: '10' }],
      'store',
      DEFAULT_TRADE_POLICY
    )

    expect(mockFetch).toHaveBeenCalledTimes(2)

    const [firstUrl] = mockFetch.mock.calls[0]

    expect(firstUrl).toContain('/api/checkout/pub/postal-code/BRA/01310-100')
  })
})

describe('client.validateProductAvailabilityByDelivery — pre-resolved address (K-1)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('skips getAddress when options.address is provided', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ unavailableItemIds: [] }),
    })

    ;(global as any).fetch = mockFetch

    await validateProductAvailabilityByDelivery(
      '01310-100',
      'BRA',
      [{ itemId: '1', productId: '10' }],
      'store',
      DEFAULT_TRADE_POLICY,
      { address: { geoCoordinates: [-46, -23] } }
    )

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url] = mockFetch.mock.calls[0]

    expect(url).toContain('/api/delivery-promises-bff/availability/delivery')
  })
})

describe('client.validateProductAvailabilityByPickup — pre-resolved address (K-1)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('skips getAddress when options.address is provided', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ unavailableItemIds: [] }),
    })

    ;(global as any).fetch = mockFetch

    await validateProductAvailabilityByPickup(
      'pickup-1',
      [{ itemId: '1', productId: '10' }],
      '01310-100',
      'BRA',
      'store',
      DEFAULT_TRADE_POLICY,
      { address: { geoCoordinates: [-46, -23] } }
    )

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url] = mockFetch.mock.calls[0]

    expect(url).toContain('/api/delivery-promises-bff/availability/pickupid')
    expect(url).toContain('pickupId=pickup-1')
  })
})
