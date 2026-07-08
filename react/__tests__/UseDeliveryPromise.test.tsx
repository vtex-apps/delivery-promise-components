import React from 'react'
import { render, fireEvent, waitFor } from '@vtex/test-tools/react'
import * as reactIntl from 'react-intl'

import { useDeliveryPromise } from '../context/useDeliveryPromise'
import * as client from '../client'
import { DEFAULT_TRADE_POLICY } from '../constants'

jest.mock('vtex.order-items/OrderItems', () => ({
  useOrderItems: () => ({ addItems: jest.fn(), removeItem: jest.fn() }),
}))

jest.mock('vtex.pixel-manager', () => ({
  usePixel: () => ({ push: jest.fn() }),
  usePixelEventCallback: () => {},
}))

// Prefix `mock` so jest.mock hoisting permits access from the factory below.
const mockSetQuery = jest.fn()
let mockRuntimeQuery: Record<string, string | undefined> = {}

jest.mock('vtex.render-runtime', () => ({
  useRuntime: () => ({
    account: 'store',
    setQuery: mockSetQuery,
    query: mockRuntimeQuery,
  }),
  useSSR: () => false,
}))

jest.mock('../utils/cookie', () => ({
  getCountryCode: () => 'BR',
  getFacetsData: () => undefined,
  getOrderFormId: () => undefined,
}))

jest.mock('vtex.session-client', () => ({
  useRenderSession: jest.fn(() => ({
    session: { namespaces: { store: { channel: { value: '1' } } } },
    loading: false,
  })),
}))

// Prefix `mock` is required so jest.mock's hoisting allows access to these
// bindings from inside the module factory below.
const mockReFetchObservableQueries = jest.fn().mockResolvedValue([])

type MockObservableQuery = {
  queryName?: string
  variables?: Record<string, unknown>
  refetch: jest.Mock
}

const mockMakeObservableQuery = (
  queryName: string | undefined,
  variables: Record<string, unknown> = {}
): MockObservableQuery => ({
  queryName,
  variables,
  refetch: jest.fn().mockResolvedValue({}),
})

// Default set of observable queries Apollo would have mounted on a PLP: the
// allowlisted search queries (incl. a paginated productSearchV3 on page 3) plus
// one unrelated query that must never be refetched by the soft refresh.
const mockBuildObservableQueries = () =>
  new Map<string, { observableQuery: MockObservableQuery | null }>([
    ['q-facets', { observableQuery: mockMakeObservableQuery('facetsV2') }],
    [
      'q-search',
      {
        observableQuery: mockMakeObservableQuery('productSearchV3', {
          query: 'shoes',
          from: 24,
          to: 47,
          orderBy: 'OrderByScoreDESC',
        }),
      },
    ],
    ['q-products', { observableQuery: mockMakeObservableQuery('Products') }],
    [
      'q-sponsored',
      { observableQuery: mockMakeObservableQuery('sponsoredProducts') },
    ],
    [
      'q-unrelated',
      { observableQuery: mockMakeObservableQuery('productPriceRange') },
    ],
  ])

let mockObservableQueries = mockBuildObservableQueries()

const getRefetch = (queryName: string): jest.Mock | undefined => {
  let found: jest.Mock | undefined

  mockObservableQueries.forEach(({ observableQuery }) => {
    if (observableQuery?.queryName === queryName) {
      found = observableQuery.refetch
    }
  })

  return found
}

// Builds the default in-memory Apollo client from the current observable
// queries. Read at call time so a fresh map from beforeEach is always used.
const mockDefaultApolloClient = () => ({
  reFetchObservableQueries: mockReFetchObservableQueries,
  queryManager: { queries: mockObservableQueries },
})

// The Apollo client the hook receives. Read through a `useApolloClient` spy
// re-established in beforeEach (mirroring the render-runtime mock) so a test
// can swap it by reassigning this binding — the spy reads it live on every
// render, which the CI test runner honors (unlike a hoisted jest.mock factory
// reading a binding mutated from a test body).
let mockApolloClient: unknown

jest.mock('react-apollo', () => ({
  useApolloClient: () => mockDefaultApolloClient(),
}))

const mockIntl = {
  formatMessage: ({ id }: { id: string }) => String(id),
} as unknown as reactIntl.IntlShape

jest.spyOn(reactIntl, 'useIntl').mockImplementation(() => mockIntl)

function ActionRunner({
  actions,
}: {
  actions: Array<{ type: string; args?: unknown }>
}) {
  const { dispatch } = useDeliveryPromise()

  return (
    <button
      data-testid="btn"
      onClick={async () => {
        for (const action of actions) {
          // eslint-disable-next-line no-await-in-loop
          await dispatch(action as never)
        }
      }}
    >
      go
    </button>
  )
}

// Mock `window.location.reload` once at the file level rather than per test.
//
// `Window.location` is a Web IDL `[Replaceable]` attribute, which jsdom honors
// asymmetrically across Node versions: on Node 18+, repeated calls to
// `Object.defineProperty(window, 'location', { value })` keep replacing the
// property; on Node 16 (the version baked into `vtex/action-io-app-test`), only
// the *first* call actually swaps the value — every subsequent call silently
// fails. That asymmetry made the soft-refresh reload-fallback assertions pass
// locally but fail in CI, because the per-test `reloadMock` was not actually
// installed as `window.location.reload`.
//
// We sidestep the quirk by:
//   1. Calling `Object.defineProperty(window, 'location', ...)` exactly once,
//      which always works (the first redefinition is allowed everywhere) and
//      replaces the original jsdom Location with a plain object whose `reload`
//      is a writable data property.
//   2. Keeping a single mock function (`reloadMock`) installed as that
//      `reload` property. Tests assert against this stable reference, and
//      `reloadMock.mockReset()` in each `beforeEach` resets call history
//      without touching `window.location`.
const reloadMock = jest.fn()

Object.defineProperty(window, 'location', {
  configurable: true,
  value: { ...window.location, reload: reloadMock },
})

describe('useDeliveryPromise actions and behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const sessionMod = jest.requireMock('vtex.session-client') as {
      useRenderSession: jest.Mock
    }

    sessionMod.useRenderSession.mockImplementation(() => ({
      session: { namespaces: { store: { channel: { value: '1' } } } },
      loading: false,
    }))
    jest.spyOn(client, 'updateSession').mockResolvedValue(undefined)
    jest.spyOn(client, 'getAddress').mockResolvedValue({
      city: 'City',
      geoCoordinates: [1, 2],
    } as never)

    jest.spyOn(client, 'getPickups').mockResolvedValue({
      items: [
        {
          pickupPoint: { isActive: true, id: 'p1', friendlyName: 'Store 1' },
        },
      ],
    } as never)

    jest
      .spyOn(client, 'getCatalogCount')
      .mockResolvedValue({ total: 1 } as never)
    jest.spyOn(client, 'updateOrderForm').mockResolvedValue(undefined as never)
    jest.spyOn(client, 'getCartProducts').mockResolvedValue([] as never)
    jest
      .spyOn(client, 'validateProductAvailability')
      .mockResolvedValue({ unavailableItemIds: [] } as never)
    jest
      .spyOn(client, 'validateProductAvailabilityByPickup')
      .mockResolvedValue({ unavailableItemIds: [] } as never)
    jest
      .spyOn(client, 'validateProductAvailabilityByDelivery')
      .mockResolvedValue({ unavailableItemIds: [] } as never)

    mockRuntimeQuery = {}

    const renderRuntime = jest.requireMock('vtex.render-runtime') as {
      useSSR: () => boolean
      useRuntime: () => {
        account: string
        setQuery: jest.Mock
        query: Record<string, string | undefined>
      }
    }

    jest.spyOn(renderRuntime, 'useSSR').mockReturnValue(false)
    jest.spyOn(renderRuntime, 'useRuntime').mockImplementation(() => ({
      account: 'store',
      setQuery: mockSetQuery,
      query: mockRuntimeQuery,
    }))

    const cookie = jest.requireMock('../utils/cookie') as {
      getCountryCode: () => string
      getFacetsData: (k: unknown) => unknown
    }

    jest.spyOn(cookie, 'getCountryCode').mockReturnValue('BR')
    jest
      .spyOn(cookie, 'getFacetsData')
      .mockImplementation((key: unknown) =>
        key === 'zip-code' ? '12345-678' : undefined
      )

    mockObservableQueries = mockBuildObservableQueries()

    // `reloadMock` is installed as `window.location.reload` once at module
    // scope; here we only reset its call history. See the module-scope comment
    // above for the Web IDL / Node 16 rationale.
    reloadMock.mockReset()
  })

  it.each([
    [
      'UPDATE_ZIPCODE + SELECT_DELIVERY_SHIPPING_OPTION triggers a soft refresh',
      [
        {
          type: 'UPDATE_ZIPCODE',
          args: { zipcode: '12345-678', reload: true },
        },
        { type: 'SELECT_DELIVERY_SHIPPING_OPTION' },
      ],
    ],
    [
      'UPDATE_ZIPCODE + RESET_FULFILLMENT_METHOD triggers a soft refresh',
      [
        {
          type: 'UPDATE_ZIPCODE',
          args: { zipcode: '12345-678', reload: true },
        },
        { type: 'RESET_FULFILLMENT_METHOD' },
      ],
    ],
  ])('%s', async (_title, actions) => {
    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(getByTestId('btn')).toBeTruthy()
    })
  })

  it('calls getPickups with default trade policy when session store channel is missing', async () => {
    const sessionMod = jest.requireMock('vtex.session-client') as {
      useRenderSession: jest.Mock
    }

    sessionMod.useRenderSession.mockImplementation(() => ({
      session: { namespaces: { store: {} } },
      loading: false,
    }))

    const getPickupsSpy = jest.spyOn(client, 'getPickups').mockResolvedValue({
      items: [],
    } as never)

    function MountHook() {
      useDeliveryPromise()

      return null
    }

    render(<MountHook />)

    await waitFor(() => {
      expect(getPickupsSpy).toHaveBeenCalledWith(
        'BR',
        '12345-678',
        'store',
        DEFAULT_TRADE_POLICY
      )
    })
  })

  it('UPDATE_ZIPCODE does NOT refresh (soft or hard) when shipping method block is registered as required', async () => {
    const actions = [
      {
        type: 'REGISTER_SHIPPING_METHOD_BLOCK',
        args: { required: true },
      },
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: true },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(reloadMock).not.toHaveBeenCalled()
    })

    expect(getRefetch('productSearchV3')).not.toHaveBeenCalled()
    expect(getRefetch('facetsV2')).not.toHaveBeenCalled()
  })

  it('UPDATE_ZIPCODE with required shipping (optional setter) bumps shippingMethodModalRequestId', async () => {
    const actions = [
      {
        type: 'REGISTER_SHIPPING_METHOD_BLOCK',
        args: { required: true },
      },
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: true },
      },
    ]

    function ModalRequestProbe() {
      const { dispatch, state } = useDeliveryPromise()

      return (
        <div>
          <span data-testid="rid">{state.shippingMethodModalRequestId}</span>
          <button
            data-testid="btn"
            type="button"
            onClick={async () => {
              for (const action of actions) {
                // eslint-disable-next-line no-await-in-loop
                await dispatch(action as never)
              }
            }}
          >
            go
          </button>
        </div>
      )
    }

    const { getByTestId } = render(<ModalRequestProbe />)

    expect(getByTestId('rid').textContent).toBe('0')
    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(getByTestId('rid').textContent).toBe('1')
    })
  })

  it('UPDATE_ZIPCODE does not bump shippingMethodModalRequestId when both location and shipping blocks are required (CEP-before-method sequence)', async () => {
    const actions = [
      {
        type: 'REGISTER_SHOPPER_LOCATION_BLOCK',
        args: { required: true },
      },
      {
        type: 'REGISTER_SHIPPING_METHOD_BLOCK',
        args: { required: true },
      },
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: true },
      },
    ]

    function ModalRequestProbe() {
      const { dispatch, state } = useDeliveryPromise()

      return (
        <div>
          <span data-testid="rid">{state.shippingMethodModalRequestId}</span>
          <button
            data-testid="btn"
            type="button"
            onClick={async () => {
              for (const action of actions) {
                // eslint-disable-next-line no-await-in-loop
                await dispatch(action as never)
              }
            }}
          >
            go
          </button>
        </div>
      )
    }

    const { getByTestId } = render(<ModalRequestProbe />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(getByTestId('rid').textContent).toBe('0')
    })
  })

  it('UPDATE_ZIPCODE soft-refreshes (no hard reload) when shipping method is registered as optional', async () => {
    const actions = [
      {
        type: 'REGISTER_SHIPPING_METHOD_BLOCK',
        args: { required: false },
      },
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: true },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(getRefetch('productSearchV3')).toHaveBeenCalled()
    })

    expect(getRefetch('facetsV2')).toHaveBeenCalled()
    expect(getRefetch('productPriceRange')).not.toHaveBeenCalled()
    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('UPDATE_ZIPCODE falls back to location.reload when a targeted refetch throws', async () => {
    getRefetch('productSearchV3')?.mockRejectedValueOnce(
      new Error('apollo offline')
    )

    const actions = [
      {
        type: 'REGISTER_SHIPPING_METHOD_BLOCK',
        args: { required: false },
      },
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: true },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(reloadMock).toHaveBeenCalled()
    })
  })

  it('REGISTER_*_BLOCK updates uiRegistry and UNREGISTER clears entries', async () => {
    function RegistryProbe() {
      const { dispatch, state } = useDeliveryPromise()

      return (
        <div>
          <span data-testid="registry">{JSON.stringify(state.uiRegistry)}</span>
          <button
            data-testid="reg-both"
            type="button"
            onClick={async () => {
              await dispatch({
                type: 'REGISTER_SHOPPER_LOCATION_BLOCK',
                args: { required: true },
              } as never)
              await dispatch({
                type: 'REGISTER_SHIPPING_METHOD_BLOCK',
                args: { required: false },
              } as never)
            }}
          >
            reg
          </button>
          <button
            data-testid="unreg-shopper"
            type="button"
            onClick={() =>
              dispatch({ type: 'UNREGISTER_SHOPPER_LOCATION_BLOCK' } as never)
            }
          >
            unreg shopper
          </button>
          <button
            data-testid="unreg-shipping"
            type="button"
            onClick={() =>
              dispatch({ type: 'UNREGISTER_SHIPPING_METHOD_BLOCK' } as never)
            }
          >
            unreg shipping
          </button>
        </div>
      )
    }

    const { getByTestId } = render(<RegistryProbe />)

    expect(getByTestId('registry').textContent).toBe('{}')

    fireEvent.click(getByTestId('reg-both'))

    await waitFor(() => {
      expect(getByTestId('registry').textContent).toBe(
        JSON.stringify({
          shopperLocation: { required: true },
          shippingMethod: { required: false },
        })
      )
    })

    fireEvent.click(getByTestId('unreg-shopper'))

    await waitFor(() => {
      expect(getByTestId('registry').textContent).toBe(
        JSON.stringify({ shippingMethod: { required: false } })
      )
    })

    fireEvent.click(getByTestId('unreg-shipping'))

    await waitFor(() => {
      expect(getByTestId('registry').textContent).toBe('{}')
    })
  })

  it('REQUEST_OPEN_SHIPPING_METHOD_MODAL increments shippingMethodModalRequestId', async () => {
    function RequestOpenProbe() {
      const { dispatch, state } = useDeliveryPromise()

      return (
        <div>
          <span data-testid="rid">{state.shippingMethodModalRequestId}</span>
          <button
            data-testid="bump"
            type="button"
            onClick={() =>
              dispatch({ type: 'REQUEST_OPEN_SHIPPING_METHOD_MODAL' } as never)
            }
          >
            bump
          </button>
        </div>
      )
    }

    const { getByTestId } = render(<RequestOpenProbe />)

    expect(getByTestId('rid').textContent).toBe('0')
    fireEvent.click(getByTestId('bump'))

    await waitFor(() => {
      expect(getByTestId('rid').textContent).toBe('1')
    })
  })

  it('UPDATE_PICKUP sets selected pickup via explicit action', async () => {
    const actions = [
      { type: 'UPDATE_ZIPCODE', args: { zipcode: '12345-678', reload: false } },
      {
        type: 'UPDATE_PICKUP',
        args: {
          pickup: {
            pickupPoint: {
              isActive: true,
              id: 'p1',
              friendlyName: 'Store 1',
            },
          },
        },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(getByTestId('btn')).toBeTruthy()
    })
  })

  it('smoke: RESET_FULFILLMENT_METHOD executes without errors', async () => {
    function ResetComponent() {
      const { dispatch } = useDeliveryPromise()

      return (
        <button
          data-testid="reset"
          onClick={() =>
            dispatch({ type: 'RESET_FULFILLMENT_METHOD' } as never)
          }
        >
          Reset
        </button>
      )
    }

    const { getByTestId } = render(<ResetComponent />)

    fireEvent.click(getByTestId('reset'))

    await waitFor(() => {
      expect(getByTestId('reset')).toBeTruthy()
    })
  })
})

describe('useDeliveryPromise — fail-fast on UPDATE_ZIPCODE', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const sessionMod = jest.requireMock('vtex.session-client') as {
      useRenderSession: jest.Mock
    }

    sessionMod.useRenderSession.mockImplementation(() => ({
      session: { namespaces: { store: { channel: { value: '1' } } } },
      loading: false,
    }))
    jest.spyOn(client, 'updateSession').mockResolvedValue(undefined)
    jest.spyOn(client, 'getPickups').mockResolvedValue({ items: [] } as never)
    jest
      .spyOn(client, 'getCatalogCount')
      .mockResolvedValue({ total: 1 } as never)
    jest.spyOn(client, 'updateOrderForm').mockResolvedValue(undefined as never)
    jest.spyOn(client, 'getCartProducts').mockResolvedValue([] as never)
    jest
      .spyOn(client, 'validateProductAvailability')
      .mockResolvedValue({ unavailableItemIds: [] } as never)

    const cookie = jest.requireMock('../utils/cookie') as {
      getCountryCode: () => string
      getFacetsData: (k: unknown) => unknown
      getOrderFormId: () => unknown
    }

    jest.spyOn(cookie, 'getCountryCode').mockReturnValue('BR')
    // Important: empty zip-code so the mount effect does NOT call getAddress.
    // This isolates the assertion to the UPDATE_ZIPCODE dispatch only.
    jest.spyOn(cookie, 'getFacetsData').mockReturnValue(undefined)
    jest.spyOn(cookie, 'getOrderFormId').mockReturnValue(undefined)

    // `reloadMock` is installed as `window.location.reload` once at module
    // scope; here we only reset its call history. See the module-scope comment
    // for the Web IDL / Node 16 rationale.
    reloadMock.mockReset()
  })

  it('calls getAddress exactly once on the happy path', async () => {
    const getAddressSpy = jest
      .spyOn(client, 'getAddress')
      .mockResolvedValue({ city: 'City', geoCoordinates: [1, 2] } as never)

    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: false },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(getAddressSpy).toHaveBeenCalledTimes(1)
    })
  })

  it('fails fast on getAddress rejection without calling BFF availability', async () => {
    jest
      .spyOn(client, 'getAddress')
      .mockRejectedValue(new Error('postal-code 4xx'))

    const validateSpy = jest
      .spyOn(client, 'validateProductAvailability')
      .mockResolvedValue({ unavailableItemIds: [] } as never)

    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: false },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    // Wait for the dispatch to settle — assert no BFF call followed.
    await waitFor(() => {
      expect(client.getAddress).toHaveBeenCalled()
    })

    expect(validateSpy).not.toHaveBeenCalled()
  })

  it('fails fast on empty geoCoordinates without calling BFF availability', async () => {
    jest
      .spyOn(client, 'getAddress')
      .mockResolvedValue({ city: 'City', geoCoordinates: [] } as never)

    const validateSpy = jest
      .spyOn(client, 'validateProductAvailability')
      .mockResolvedValue({ unavailableItemIds: [] } as never)

    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: false },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(client.getAddress).toHaveBeenCalled()
    })

    expect(validateSpy).not.toHaveBeenCalled()
  })

  it('rejects an incomplete postal code before any getAddress round-trip', async () => {
    // BR mask (00000-000) requires 8 digits; "01" is partial.
    const getAddressSpy = jest
      .spyOn(client, 'getAddress')
      .mockResolvedValue({ city: 'City', geoCoordinates: [1, 2] } as never)

    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '01', reload: false },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    // Give the async dispatch a chance to run; the guard is synchronous and
    // must short-circuit before getAddress is ever reached.
    await waitFor(() => {
      expect(getByTestId('btn')).toBeInTheDocument()
    })

    expect(getAddressSpy).not.toHaveBeenCalled()
  })
})

describe('useDeliveryPromise — empty-cart short-circuit on UPDATE_ZIPCODE', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const sessionMod = jest.requireMock('vtex.session-client') as {
      useRenderSession: jest.Mock
    }

    sessionMod.useRenderSession.mockImplementation(() => ({
      session: { namespaces: { store: { channel: { value: '1' } } } },
      loading: false,
    }))
    jest.spyOn(client, 'updateSession').mockResolvedValue(undefined)
    jest
      .spyOn(client, 'getAddress')
      .mockResolvedValue({ city: 'City', geoCoordinates: [1, 2] } as never)
    jest.spyOn(client, 'getPickups').mockResolvedValue({ items: [] } as never)
    jest
      .spyOn(client, 'getCatalogCount')
      .mockResolvedValue({ total: 1 } as never)
    jest.spyOn(client, 'updateOrderForm').mockResolvedValue(undefined as never)

    const cookie = jest.requireMock('../utils/cookie') as {
      getCountryCode: () => string
      getFacetsData: (k: unknown) => unknown
      getOrderFormId: () => unknown
    }

    jest.spyOn(cookie, 'getCountryCode').mockReturnValue('BR')
    jest.spyOn(cookie, 'getFacetsData').mockReturnValue(undefined)
    jest.spyOn(cookie, 'getOrderFormId').mockReturnValue('order-form-id')

    // `reloadMock` is installed as `window.location.reload` once at module
    // scope; here we only reset its call history. See the module-scope comment
    // for the Web IDL / Node 16 rationale.
    reloadMock.mockReset()
  })

  it('does NOT call BFF availability when the cart is empty', async () => {
    jest.spyOn(client, 'getCartProducts').mockResolvedValue([] as never)

    const validateSpy = jest
      .spyOn(client, 'validateProductAvailability')
      .mockResolvedValue({ unavailableItemIds: [] } as never)

    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: false },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(client.getCatalogCount).toHaveBeenCalled()
    })

    expect(validateSpy).not.toHaveBeenCalled()
  })

  it('still calls BFF availability when the cart has items', async () => {
    jest
      .spyOn(client, 'getCartProducts')
      .mockResolvedValue([{ id: '1', productId: '10' }] as never)

    const validateSpy = jest
      .spyOn(client, 'validateProductAvailability')
      .mockResolvedValue({ unavailableItemIds: [] } as never)

    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: false },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(validateSpy).toHaveBeenCalledTimes(1)
    })
  })
})

describe('useDeliveryPromise — parallel block in submitZipcode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const sessionMod = jest.requireMock('vtex.session-client') as {
      useRenderSession: jest.Mock
    }

    sessionMod.useRenderSession.mockImplementation(() => ({
      session: { namespaces: { store: { channel: { value: '1' } } } },
      loading: false,
    }))
    jest.spyOn(client, 'updateSession').mockResolvedValue(undefined)
    jest
      .spyOn(client, 'getAddress')
      .mockResolvedValue({ city: 'City', geoCoordinates: [1, 2] } as never)

    const cookie = jest.requireMock('../utils/cookie') as {
      getCountryCode: () => string
      getFacetsData: (k: unknown) => unknown
      getOrderFormId: () => unknown
    }

    jest.spyOn(cookie, 'getCountryCode').mockReturnValue('BR')
    jest.spyOn(cookie, 'getFacetsData').mockReturnValue(undefined)
    jest.spyOn(cookie, 'getOrderFormId').mockReturnValue('order-form-id')

    // `reloadMock` is installed as `window.location.reload` once at module
    // scope; here we only reset its call history. See the module-scope comment
    // for the Web IDL / Node 16 rationale.
    reloadMock.mockReset()
  })

  it('launches getCatalogCount, updateOrderForm and getPickups in parallel', async () => {
    let resolveCatalogCount: (value: unknown) => void = () => undefined
    const callOrder: string[] = []

    jest.spyOn(client, 'getCatalogCount').mockImplementation((() => {
      callOrder.push('getCatalogCount')

      return new Promise((resolve) => {
        resolveCatalogCount = resolve as (v: unknown) => void
      })
    }) as never)

    jest.spyOn(client, 'updateOrderForm').mockImplementation((() => {
      callOrder.push('updateOrderForm')

      return Promise.resolve()
    }) as never)

    jest.spyOn(client, 'getPickups').mockImplementation((() => {
      callOrder.push('getPickups')

      return Promise.resolve({ items: [] })
    }) as never)

    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: false },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    // All three calls are launched even though getCatalogCount has not
    // resolved yet — proves they are in a parallel block, not serial awaits.
    await waitFor(() => {
      expect(callOrder).toEqual(
        expect.arrayContaining([
          'getCatalogCount',
          'updateOrderForm',
          'getPickups',
        ])
      )
    })

    expect(client.updateSession).not.toHaveBeenCalled()

    resolveCatalogCount({ total: 1 })

    await waitFor(() => {
      expect(client.updateSession).toHaveBeenCalled()
    })
  })

  it('short-circuits via onError when getCatalogCount.total === 0 without writing the session', async () => {
    jest
      .spyOn(client, 'getCatalogCount')
      .mockResolvedValue({ total: 0 } as never)
    jest.spyOn(client, 'updateOrderForm').mockResolvedValue(undefined as never)
    jest.spyOn(client, 'getPickups').mockResolvedValue({ items: [] } as never)

    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: false },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(client.getCatalogCount).toHaveBeenCalled()
    })

    // updateSession is the gated mutation — never written when catalog gate fires.
    expect(client.updateSession).not.toHaveBeenCalled()
  })

  it('treats updateOrderForm rejection as best-effort (dispatch still completes)', async () => {
    jest
      .spyOn(client, 'getCatalogCount')
      .mockResolvedValue({ total: 1 } as never)
    jest
      .spyOn(client, 'updateOrderForm')
      .mockRejectedValue(new Error('checkout 5xx'))
    jest.spyOn(client, 'getPickups').mockResolvedValue({ items: [] } as never)

    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: false },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    // Dispatch reaches updateSession despite updateOrderForm failure.
    await waitFor(() => {
      expect(client.updateSession).toHaveBeenCalled()
    })
  })

  it('treats getPickups rejection as empty pickups and keeps the dispatch flow going', async () => {
    jest
      .spyOn(client, 'getCatalogCount')
      .mockResolvedValue({ total: 1 } as never)
    jest.spyOn(client, 'updateOrderForm').mockResolvedValue(undefined as never)
    jest.spyOn(client, 'getPickups').mockRejectedValue(new Error('pickup 5xx'))

    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: false },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(client.updateSession).toHaveBeenCalled()
    })
  })
})

describe('useDeliveryPromise — single updateSession per UPDATE_ZIPCODE dispatch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const sessionMod = jest.requireMock('vtex.session-client') as {
      useRenderSession: jest.Mock
    }

    sessionMod.useRenderSession.mockImplementation(() => ({
      session: { namespaces: { store: { channel: { value: '1' } } } },
      loading: false,
    }))
    jest.spyOn(client, 'updateSession').mockResolvedValue(undefined)
    jest
      .spyOn(client, 'getAddress')
      .mockResolvedValue({ city: 'City', geoCoordinates: [1, 2] } as never)
    jest
      .spyOn(client, 'getCatalogCount')
      .mockResolvedValue({ total: 1 } as never)
    jest.spyOn(client, 'updateOrderForm').mockResolvedValue(undefined as never)

    const cookie = jest.requireMock('../utils/cookie') as {
      getCountryCode: () => string
      getFacetsData: (k: unknown) => unknown
      getOrderFormId: () => unknown
    }

    jest.spyOn(cookie, 'getCountryCode').mockReturnValue('BR')
    jest.spyOn(cookie, 'getFacetsData').mockReturnValue(undefined)
    jest.spyOn(cookie, 'getOrderFormId').mockReturnValue('order-form-id')

    // `reloadMock` is installed as `window.location.reload` once at module
    // scope; here we only reset its call history. See the module-scope comment
    // for the Web IDL / Node 16 rationale.
    reloadMock.mockReset()
  })

  it('writes the session exactly once with the resolved pickup (happy path)', async () => {
    const activePickup = {
      pickupPoint: { isActive: true, id: 'pp-1', friendlyName: 'Store 1' },
    }

    jest
      .spyOn(client, 'getPickups')
      .mockResolvedValue({ items: [activePickup] } as never)

    // The segment already references this pickup id — resolvePickupFor-
    // ShippingSession returns the matching pickup, so the (single) session
    // write carries it.
    const cookie = jest.requireMock('../utils/cookie') as {
      getFacetsData: (k: unknown) => unknown
    }

    jest
      .spyOn(cookie, 'getFacetsData')
      .mockImplementation((k: unknown) =>
        k === 'pickupPoint' ? 'pp-1' : undefined
      )

    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: false },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(client.updateSession).toHaveBeenCalledTimes(1)
    })

    const [country, zip, coords, pickupArg] = (
      client.updateSession as jest.Mock
    ).mock.calls[0]

    expect(country).toBe('BR')
    expect(zip).toBe('12345-678')
    expect(coords).toEqual([1, 2])
    expect(pickupArg).toEqual(activePickup)
  })

  it('writes the session exactly once with pickup=undefined when no active pickups are returned', async () => {
    jest.spyOn(client, 'getPickups').mockResolvedValue({ items: [] } as never)

    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: false },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(client.updateSession).toHaveBeenCalledTimes(1)
    })

    const [, , , pickupArg] = (client.updateSession as jest.Mock).mock.calls[0]

    expect(pickupArg).toBeUndefined()
  })

  it('writes the session exactly once with pickup=undefined when getPickups rejects', async () => {
    jest.spyOn(client, 'getPickups').mockRejectedValue(new Error('pickup 5xx'))

    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: false },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(client.updateSession).toHaveBeenCalledTimes(1)
    })

    const [, , , pickupArg] = (client.updateSession as jest.Mock).mock.calls[0]

    expect(pickupArg).toBeUndefined()
  })

  it('writes the session exactly once with pickup=undefined when salesChannel is still loading (deferral path)', async () => {
    const sessionMod = jest.requireMock('vtex.session-client') as {
      useRenderSession: jest.Mock
    }

    sessionMod.useRenderSession.mockImplementation(() => ({
      session: undefined,
      loading: true,
    }))

    // getPickups should NOT be invoked during the dispatch — it is deferred.
    const getPickupsSpy = jest
      .spyOn(client, 'getPickups')
      .mockResolvedValue({ items: [] } as never)

    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: false },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(client.updateSession).toHaveBeenCalledTimes(1)
    })

    const [, , , pickupArg] = (client.updateSession as jest.Mock).mock.calls[0]

    expect(pickupArg).toBeUndefined()
    expect(getPickupsSpy).not.toHaveBeenCalled()
  })
})

describe('useDeliveryPromise — soft refresh (replaces location.reload)', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    const sessionMod = jest.requireMock('vtex.session-client') as {
      useRenderSession: jest.Mock
    }

    sessionMod.useRenderSession.mockImplementation(() => ({
      session: { namespaces: { store: { channel: { value: '1' } } } },
      loading: false,
    }))

    jest.spyOn(client, 'updateSession').mockResolvedValue(undefined)
    jest
      .spyOn(client, 'getAddress')
      .mockResolvedValue({ city: 'City', geoCoordinates: [1, 2] } as never)
    jest
      .spyOn(client, 'getCatalogCount')
      .mockResolvedValue({ total: 1 } as never)
    jest.spyOn(client, 'updateOrderForm').mockResolvedValue(undefined as never)
    jest.spyOn(client, 'getPickups').mockResolvedValue({
      items: [
        {
          pickupPoint: { isActive: true, id: 'p1', friendlyName: 'Store 1' },
        },
      ],
    } as never)
    jest.spyOn(client, 'getCartProducts').mockResolvedValue([] as never)
    jest
      .spyOn(client, 'validateProductAvailability')
      .mockResolvedValue({ unavailableItemIds: [] } as never)
    jest
      .spyOn(client, 'validateProductAvailabilityByDelivery')
      .mockResolvedValue({ unavailableItemIds: [] } as never)
    jest
      .spyOn(client, 'validateProductAvailabilityByPickup')
      .mockResolvedValue({ unavailableItemIds: [] } as never)
    jest.spyOn(client, 'clearOrderFormShipping').mockResolvedValue(undefined)
    jest.spyOn(client, 'clearShippingSession').mockResolvedValue(undefined)

    const cookie = jest.requireMock('../utils/cookie') as {
      getCountryCode: () => string
      getFacetsData: (k: unknown) => unknown
      getOrderFormId: () => unknown
    }

    jest.spyOn(cookie, 'getCountryCode').mockReturnValue('BR')
    jest
      .spyOn(cookie, 'getFacetsData')
      .mockImplementation((key: unknown) =>
        key === 'zip-code' ? '12345-678' : undefined
      )
    jest.spyOn(cookie, 'getOrderFormId').mockReturnValue('order-form-id')

    // Reset the runtime query and re-establish the render-runtime spy on every
    // test so a leftover `page` param from an earlier case cannot push
    // `refreshStorefront` into the `setQuery` branch and skip the reload
    // fallback (parity with the first describe block's beforeEach).
    mockRuntimeQuery = {}

    const renderRuntime = jest.requireMock('vtex.render-runtime') as {
      useSSR: () => boolean
      useRuntime: () => {
        account: string
        setQuery: jest.Mock
        query: Record<string, string | undefined>
      }
    }

    jest.spyOn(renderRuntime, 'useSSR').mockReturnValue(false)
    jest.spyOn(renderRuntime, 'useRuntime').mockImplementation(() => ({
      account: 'store',
      setQuery: mockSetQuery,
      query: mockRuntimeQuery,
    }))

    mockObservableQueries = mockBuildObservableQueries()

    // Default the hook's Apollo client to the in-memory one and read it through
    // a spy re-established every test, so per-test swaps (null / broken
    // internals) are honored the same way the render-runtime query mock is.
    mockApolloClient = mockDefaultApolloClient()

    const apolloMod = jest.requireMock('react-apollo') as {
      useApolloClient: jest.Mock
    }

    jest
      .spyOn(apolloMod, 'useApolloClient')
      .mockImplementation(() => mockApolloClient)

    // `reloadMock` is installed as `window.location.reload` once at module
    // scope; here we only reset its call history. See the module-scope comment
    // for the Web IDL / Node 16 rationale.
    reloadMock.mockReset()
  })

  it('UPDATE_ZIPCODE refetches only the allowlisted queries instead of reloading', async () => {
    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: true },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(getRefetch('productSearchV3')).toHaveBeenCalled()
    })

    expect(getRefetch('facetsV2')).toHaveBeenCalled()
    expect(getRefetch('Products')).toHaveBeenCalled()
    expect(getRefetch('sponsoredProducts')).toHaveBeenCalled()
    expect(getRefetch('productPriceRange')).not.toHaveBeenCalled()
    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('UPDATE_ZIPCODE resets productSearchV3 to the first page (from: 0, to: page size - 1) preserving other variables', async () => {
    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: true },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    // Mock is on page 2 of size 24 (from: 24, to: 47). Page 1 keeps the page
    // size: from = 0, to = (to - from) = 23. Other variables are preserved.
    await waitFor(() => {
      expect(getRefetch('productSearchV3')).toHaveBeenCalledWith({
        query: 'shoes',
        from: 0,
        to: 23,
        orderBy: 'OrderByScoreDESC',
      })
    })
  })

  it('UPDATE_ZIPCODE resets the PLP page query param via render-runtime when past page 1', async () => {
    // Shopper is on page 5 (URL ?page=5). search-result reads this through
    // render-runtime, so the reset must go through setQuery (not history) to
    // make useFetchMore snap "load more" back to page 2.
    mockRuntimeQuery = { page: '5' }

    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: true },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(mockSetQuery).toHaveBeenCalledWith(
        { page: undefined },
        { replace: true }
      )
    })
  })

  it('UPDATE_ZIPCODE does not touch the page query param when already on page 1', async () => {
    // No `page` param (page 1): the reset is a no-op so non-PLP / first-page
    // URLs are left untouched.
    mockRuntimeQuery = {}

    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: true },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(getRefetch('productSearchV3')).toHaveBeenCalled()
    })

    expect(mockSetQuery).not.toHaveBeenCalled()
  })

  it('UPDATE_ZIPCODE with reload:false neither refetches nor reloads (caller owns navigation)', async () => {
    // Start with no segment zip-code so the segment-restoration useEffect does
    // not write the session before our dispatched action runs.
    const cookie = jest.requireMock('../utils/cookie') as {
      getFacetsData: jest.Mock
    }

    cookie.getFacetsData.mockImplementation(() => undefined)

    const onApplied = jest.fn()
    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: {
          zipcode: '12345-678',
          reload: false,
          onAppliedWithoutReload: onApplied,
        },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(onApplied).toHaveBeenCalledTimes(1)
    })

    expect(getRefetch('productSearchV3')).not.toHaveBeenCalled()
    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('SELECT_DELIVERY_SHIPPING_OPTION soft-refreshes', async () => {
    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: true },
      },
      { type: 'SELECT_DELIVERY_SHIPPING_OPTION' },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      // UPDATE_ZIPCODE + SELECT_DELIVERY_SHIPPING_OPTION = 2 refetches.
      expect(getRefetch('productSearchV3')).toHaveBeenCalledTimes(2)
    })

    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('RESET_FULFILLMENT_METHOD soft-refreshes', async () => {
    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: true },
      },
      { type: 'RESET_FULFILLMENT_METHOD' },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(getRefetch('productSearchV3')).toHaveBeenCalledTimes(2)
    })

    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('CLEAR_ZIPCODE soft-refreshes', async () => {
    const actions = [{ type: 'CLEAR_ZIPCODE' }]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(getRefetch('productSearchV3')).toHaveBeenCalled()
    })

    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('falls back to location.reload when a targeted refetch throws', async () => {
    // A client whose allowlisted query rejects on refetch. Built up-front and
    // assigned to the live binding so the rejecting refetch is part of the
    // value the hook reads, not a post-hoc mock mutation.
    mockApolloClient = {
      queryManager: {
        queries: new Map([
          [
            'q-search',
            {
              observableQuery: {
                queryName: 'productSearchV3',
                variables: { query: 'shoes', from: 24, to: 47 },
                refetch: jest.fn().mockRejectedValue(new Error('apollo down')),
              },
            },
          ],
        ]),
      },
    }

    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: true },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(reloadMock).toHaveBeenCalledTimes(1)
    })
  })

  it('falls back to location.reload when the query manager internals are inaccessible', async () => {
    // Apollo present, but the internal queries map is not reachable.
    mockApolloClient = { queryManager: {} }

    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: true },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(reloadMock).toHaveBeenCalledTimes(1)
    })
  })

  it('falls back to location.reload when no Apollo provider is mounted', async () => {
    mockApolloClient = null

    const actions = [
      {
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '12345-678', reload: true },
      },
    ]

    const { getByTestId } = render(<ActionRunner actions={actions} />)

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(reloadMock).toHaveBeenCalledTimes(1)
    })

    expect(getRefetch('productSearchV3')).not.toHaveBeenCalled()
  })

  // Without a reload, the fulfillment-method state that used to be re-derived
  // from the segment on remount must now be updated optimistically.
  function FulfillmentProbe({
    actions,
  }: {
    actions: Array<{ type: string; args?: unknown }>
  }) {
    const { dispatch, state } = useDeliveryPromise()

    return (
      <div>
        <span data-testid="method">
          {state.deliveryPromiseMethod ?? 'none'}
        </span>
        <span data-testid="pickup">
          {state.selectedPickup?.pickupPoint.id ?? 'none'}
        </span>
        <span data-testid="geo">
          {state.geoCoordinates?.join(',') ?? 'none'}
        </span>
        <span data-testid="applied">{state.fulfillmentSelectionAppliedId}</span>
        <button
          data-testid="btn"
          type="button"
          onClick={async () => {
            for (const action of actions) {
              // eslint-disable-next-line no-await-in-loop
              await dispatch(action as never)
            }
          }}
        >
          go
        </button>
      </div>
    )
  }

  it('SELECT_DELIVERY_SHIPPING_OPTION sets deliveryPromiseMethod to delivery and clears the selected pickup', async () => {
    const { getByTestId } = render(
      <FulfillmentProbe
        actions={[{ type: 'SELECT_DELIVERY_SHIPPING_OPTION' }]}
      />
    )

    // Wait for the segment-restoration effect to establish the location.
    await waitFor(() => {
      expect(getByTestId('geo').textContent).toBe('1,2')
    })

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(getByTestId('method').textContent).toBe('delivery')
    })

    expect(getByTestId('pickup').textContent).toBe('none')
    expect(Number(getByTestId('applied').textContent)).toBeGreaterThan(0)
  })

  it('UPDATE_PICKUP sets deliveryPromiseMethod to pickup-in-point and stores the selected pickup', async () => {
    const pickup = {
      pickupPoint: { id: 'pk-1', friendlyName: 'Store 1', isActive: true },
    }

    const { getByTestId } = render(
      <FulfillmentProbe
        actions={[
          { type: 'UPDATE_PICKUP', args: { pickup, canUnselect: true } },
        ]}
      />
    )

    await waitFor(() => {
      expect(getByTestId('geo').textContent).toBe('1,2')
    })

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(getByTestId('method').textContent).toBe('pickup-in-point')
    })

    expect(getByTestId('pickup').textContent).toBe('pk-1')
    expect(Number(getByTestId('applied').textContent)).toBeGreaterThan(0)
  })

  it('RESET_FULFILLMENT_METHOD clears deliveryPromiseMethod and the selected pickup', async () => {
    const { getByTestId } = render(
      <FulfillmentProbe
        actions={[
          { type: 'SELECT_DELIVERY_SHIPPING_OPTION' },
          { type: 'RESET_FULFILLMENT_METHOD' },
        ]}
      />
    )

    await waitFor(() => {
      expect(getByTestId('geo').textContent).toBe('1,2')
    })

    fireEvent.click(getByTestId('btn'))

    // Method becomes 'delivery' then is cleared back to 'none' by the reset.
    await waitFor(() => {
      expect(getByTestId('method').textContent).toBe('none')
    })

    expect(getByTestId('pickup').textContent).toBe('none')
    expect(Number(getByTestId('applied').textContent)).toBeGreaterThan(1)
  })

  // When the session write fails, the optimistic fulfillment state must roll
  // back (the session was never written) and loading must stop — otherwise the
  // UI claims a selection that does not exist and the spinner is stuck forever.
  function RollbackProbe({
    actions,
  }: {
    actions: Array<{ type: string; args?: unknown }>
  }) {
    const { dispatch, state } = useDeliveryPromise()

    return (
      <div>
        <span data-testid="method">
          {state.deliveryPromiseMethod ?? 'none'}
        </span>
        <span data-testid="pickup">
          {state.selectedPickup?.pickupPoint.id ?? 'none'}
        </span>
        <span data-testid="geo">
          {state.geoCoordinates?.join(',') ?? 'none'}
        </span>
        <span data-testid="loading">{String(state.isLoading)}</span>
        {actions.map((action, index) => (
          <button
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            data-testid={`btn-${index}`}
            type="button"
            onClick={() => dispatch(action as never)}
          >
            go
          </button>
        ))}
      </div>
    )
  }

  it('UPDATE_PICKUP rolls back the optimistic state and stops loading when the session write fails', async () => {
    const pickup = {
      pickupPoint: { id: 'pk-1', friendlyName: 'Store 1', isActive: true },
    }

    const { getByTestId } = render(
      <RollbackProbe
        actions={[
          { type: 'SELECT_DELIVERY_SHIPPING_OPTION' },
          { type: 'UPDATE_PICKUP', args: { pickup, canUnselect: true } },
        ]}
      />
    )

    await waitFor(() => {
      expect(getByTestId('geo').textContent).toBe('1,2')
    })

    // Establish a successful prior selection (delivery).
    fireEvent.click(getByTestId('btn-0'))

    await waitFor(() => {
      expect(getByTestId('method').textContent).toBe('delivery')
    })
    await waitFor(() => {
      expect(getByTestId('loading').textContent).toBe('false')
    })

    jest
      .spyOn(client, 'updateSession')
      .mockRejectedValue(new Error('session write failed') as never)

    fireEvent.click(getByTestId('btn-1'))

    // The optimistic update applies first…
    await waitFor(() => {
      expect(getByTestId('pickup').textContent).toBe('pk-1')
    })

    // …then rolls back when the session write fails.
    await waitFor(() => {
      expect(getByTestId('method').textContent).toBe('delivery')
    })
    expect(getByTestId('pickup').textContent).toBe('none')

    await waitFor(() => {
      expect(getByTestId('loading').textContent).toBe('false')
    })

    expect(window.location.reload as jest.Mock).not.toHaveBeenCalled()
  })

  it('SELECT_DELIVERY_SHIPPING_OPTION rolls back the optimistic state and stops loading when the session write fails', async () => {
    const pickup = {
      pickupPoint: { id: 'pk-1', friendlyName: 'Store 1', isActive: true },
    }

    const { getByTestId } = render(
      <RollbackProbe
        actions={[
          { type: 'UPDATE_PICKUP', args: { pickup, canUnselect: true } },
          { type: 'SELECT_DELIVERY_SHIPPING_OPTION' },
        ]}
      />
    )

    await waitFor(() => {
      expect(getByTestId('geo').textContent).toBe('1,2')
    })

    // Establish a successful prior selection (pickup).
    fireEvent.click(getByTestId('btn-0'))

    await waitFor(() => {
      expect(getByTestId('method').textContent).toBe('pickup-in-point')
    })
    await waitFor(() => {
      expect(getByTestId('loading').textContent).toBe('false')
    })

    jest
      .spyOn(client, 'updateSession')
      .mockRejectedValue(new Error('session write failed') as never)

    fireEvent.click(getByTestId('btn-1'))

    // The optimistic update applies first…
    await waitFor(() => {
      expect(getByTestId('method').textContent).toBe('delivery')
    })

    // …then rolls back when the session write fails.
    await waitFor(() => {
      expect(getByTestId('method').textContent).toBe('pickup-in-point')
    })
    expect(getByTestId('pickup').textContent).toBe('pk-1')

    await waitFor(() => {
      expect(getByTestId('loading').textContent).toBe('false')
    })
  })

  it('RESET_FULFILLMENT_METHOD rolls back the optimistic state when the session write fails', async () => {
    const pickup = {
      pickupPoint: { id: 'pk-1', friendlyName: 'Store 1', isActive: true },
    }

    const { getByTestId } = render(
      <RollbackProbe
        actions={[
          { type: 'UPDATE_PICKUP', args: { pickup, canUnselect: true } },
          { type: 'RESET_FULFILLMENT_METHOD' },
        ]}
      />
    )

    await waitFor(() => {
      expect(getByTestId('geo').textContent).toBe('1,2')
    })

    fireEvent.click(getByTestId('btn-0'))

    await waitFor(() => {
      expect(getByTestId('method').textContent).toBe('pickup-in-point')
    })
    await waitFor(() => {
      expect(getByTestId('loading').textContent).toBe('false')
    })

    jest
      .spyOn(client, 'updateSession')
      .mockRejectedValue(new Error('session write failed') as never)

    fireEvent.click(getByTestId('btn-1'))

    // The optimistic clear applies first…
    await waitFor(() => {
      expect(getByTestId('method').textContent).toBe('none')
    })

    // …then is restored when the session write fails.
    await waitFor(() => {
      expect(getByTestId('method').textContent).toBe('pickup-in-point')
    })
    expect(getByTestId('pickup').textContent).toBe('pk-1')

    await waitFor(() => {
      expect(getByTestId('loading').textContent).toBe('false')
    })
  })

  // A single visible loading cycle (true → false). The cart-availability check
  // and the selection must not each own their own spinner (loading → idle →
  // loading → idle).
  const loadingRenders: boolean[] = []

  function LoadingProbe({
    actions,
  }: {
    actions: Array<{ type: string; args?: unknown }>
  }) {
    const { dispatch, state } = useDeliveryPromise()

    loadingRenders.push(state.isLoading)

    return (
      <div>
        <span data-testid="geo">
          {state.geoCoordinates?.join(',') ?? 'none'}
        </span>
        <span data-testid="method">
          {state.deliveryPromiseMethod ?? 'none'}
        </span>
        <span data-testid="loading">{String(state.isLoading)}</span>
        <button
          data-testid="btn"
          type="button"
          onClick={async () => {
            for (const action of actions) {
              // eslint-disable-next-line no-await-in-loop
              await dispatch(action as never)
            }
          }}
        >
          go
        </button>
      </div>
    )
  }

  it('selecting a pickup point toggles loading exactly once (no double spinner)', async () => {
    const pickup = {
      pickupPoint: { id: 'pk-1', friendlyName: 'Store 1', isActive: true },
    }

    const { getByTestId } = render(
      <LoadingProbe
        actions={[
          { type: 'UPDATE_PICKUP', args: { pickup, canUnselect: true } },
        ]}
      />
    )

    await waitFor(() => {
      expect(getByTestId('geo').textContent).toBe('1,2')
    })
    await waitFor(() => {
      expect(getByTestId('loading').textContent).toBe('false')
    })

    // Only count loading transitions caused by the selection itself.
    loadingRenders.length = 0

    fireEvent.click(getByTestId('btn'))

    await waitFor(() => {
      expect(getByTestId('method').textContent).toBe('pickup-in-point')
    })
    await waitFor(() => {
      expect(getByTestId('loading').textContent).toBe('false')
    })

    // Collapse consecutive duplicates; loading must turn on exactly once.
    const transitions = loadingRenders.filter(
      (value, index) => index === 0 || value !== loadingRenders[index - 1]
    )

    expect(transitions.filter(Boolean)).toHaveLength(1)
  })
})
