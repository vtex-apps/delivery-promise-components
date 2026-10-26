import {
  getCatalogCount,
  getPickups,
  validateProductAvailability,
  validateProductAvailabilityByDelivery,
  validateProductAvailabilityByPickup,
} from '../client'
import { DEFAULT_TRADE_POLICY } from '../constants'

const apolloWith = (query: jest.Mock) => ({ query } as never)

describe('client.getCatalogCount', () => {
  it('queries catalogCount with zip and joined coordinates, bypassing the cache', async () => {
    const query = jest
      .fn()
      .mockResolvedValue({ data: { catalogCount: { total: 7 } } })

    const result = await getCatalogCount(
      apolloWith(query),
      '12345-678',
      [-46.6, -23.5]
    )

    expect(result).toEqual({ total: 7 })
    expect(query).toHaveBeenCalledTimes(1)
    expect(query.mock.calls[0][0]).toMatchObject({
      variables: { zipCode: '12345-678', coordinates: '-46.6,-23.5' },
      fetchPolicy: 'network-only',
    })
  })

  it('rejects when the query fails so the postal code is treated as invalid', async () => {
    const query = jest.fn().mockRejectedValue(new Error('graphql'))

    await expect(
      getCatalogCount(apolloWith(query), '12345-678', [0, 0])
    ).rejects.toThrow('graphql')
  })
})

describe('client without an Apollo client', () => {
  it('getCatalogCount rejects', async () => {
    await expect(getCatalogCount(null, '12345-678', [0, 0])).rejects.toThrow(
      'Apollo client is not available'
    )
  })

  it('getPickups returns empty items', async () => {
    expect(await getPickups(null, 'BR', '01310-100', '1')).toEqual({
      items: [],
    })
  })
})

describe('client.getPickups', () => {
  const respond = (pickupPointDistances: unknown) =>
    jest.fn().mockResolvedValue({
      data: { pickupPointAvailability: { pickupPointDistances } },
    })

  it('queries pickupPointAvailability with sales channel, zip and country', async () => {
    const query = respond([])

    await getPickups(apolloWith(query), 'BR', '01310-100', DEFAULT_TRADE_POLICY)

    expect(query).toHaveBeenCalledTimes(1)
    expect(query.mock.calls[0][0]).toMatchObject({
      variables: {
        salesChannel: DEFAULT_TRADE_POLICY,
        zipCode: '01310-100',
        country: 'BR',
      },
      fetchPolicy: 'network-only',
    })
  })

  it('maps pickup-point-availability response to the internal pickup model', async () => {
    const query = respond([
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
    ])

    const result = await getPickups(apolloWith(query), 'BR', '01310-100', '2')

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
    const query = respond([
      { pickupId: 'p2', pickupName: 'Store B', distance: 500, isActive: true },
    ])

    const result = await getPickups(apolloWith(query), 'BR', '01310-100', '1')

    expect(result.items[0].pickupPoint.address).toEqual({
      neighborhood: '',
      street: '',
      postalCode: '',
      city: '',
      number: '',
      state: '',
    })
  })

  it('returns empty items when the response has no pickup list', async () => {
    const query = jest.fn().mockResolvedValue({ data: {} })

    const result = await getPickups(apolloWith(query), 'BR', '01310-100', '1')

    expect(result).toEqual({ items: [] })
  })

  it('returns empty items when the query rejects', async () => {
    const query = jest.fn().mockRejectedValue(new Error('network'))

    const result = await getPickups(apolloWith(query), 'BR', '01310-100', '1')

    expect(result).toEqual({ items: [] })
  })
})

describe('client.validateProductAvailability — pre-resolved address', () => {
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

describe('client.validateProductAvailabilityByDelivery — pre-resolved address', () => {
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

describe('client.validateProductAvailabilityByPickup — pre-resolved address', () => {
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
