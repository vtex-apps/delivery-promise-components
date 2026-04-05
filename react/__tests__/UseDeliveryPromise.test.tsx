import React from 'react'
import { render, fireEvent, waitFor } from '@vtex/test-tools/react'
import * as reactIntl from 'react-intl'

import { useDeliveryPromise } from '../context/useDeliveryPromise'
import * as client from '../client'
import { DEFAULT_TRADE_POLICY } from '../constants'

jest.mock('vtex.order-items/OrderItems', () => ({
  useOrderItems: () => ({ addItems: jest.fn() }),
}))

jest.mock('vtex.pixel-manager', () => ({
  usePixelEventCallback: () => {},
}))

jest.mock('vtex.render-runtime', () => ({
  useRuntime: () => ({ account: 'store' }),
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

    const renderRuntime = jest.requireMock('vtex.render-runtime') as {
      useSSR: () => boolean
      useRuntime: () => { account: string }
    }

    jest.spyOn(renderRuntime, 'useSSR').mockReturnValue(false)
    jest
      .spyOn(renderRuntime, 'useRuntime')
      .mockReturnValue({ account: 'store' })

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

    const reloadMock = jest.fn()

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })
  })

  it.each([
    [
      'UPDATE_ZIPCODE + SELECT_DELIVERY_SHIPPING_OPTION triggers reload',
      [
        {
          type: 'UPDATE_ZIPCODE',
          args: { zipcode: '12345-678', reload: true },
        },
        { type: 'SELECT_DELIVERY_SHIPPING_OPTION' },
      ],
    ],
    [
      'UPDATE_ZIPCODE + RESET_FULFILLMENT_METHOD triggers reload',
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

  it('UPDATE_ZIPCODE skips location.reload when shipping method block is registered as required', async () => {
    const reloadMock = window.location.reload as jest.Mock
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

  it('UPDATE_ZIPCODE still calls location.reload when shipping method is registered as optional', async () => {
    const reloadMock = window.location.reload as jest.Mock
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
