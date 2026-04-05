import React from 'react'
import { render } from '@vtex/test-tools/react'

import ShippingMethodSelector from '../ShippingMethodSelector'

const mockDispatch = jest.fn()
const mockUseDeliveryPromiseState = jest.fn()

jest.mock('../context', () => ({
  useDeliveryPromiseState: () => mockUseDeliveryPromiseState(),
  useDeliveryPromiseDispatch: () => mockDispatch,
}))

jest.mock('../components/ShippingMethodModal/ShippingMethodSelector', () => ({
  __esModule: true,
  default: () => <div data-testid="shipping-method-control" />,
}))

let lastShippingMethodModalProps: { nonDismissibleModal?: boolean } = {}

jest.mock('../components/ShippingMethodModal', () => ({
  __esModule: true,
  default: (props: { nonDismissibleModal?: boolean }) => {
    lastShippingMethodModalProps = props

    return <div data-testid="shipping-method-modal" />
  },
}))

const baseState = {
  zipcode: '12345-678',
  pickups: [] as Pickup[],
  selectedPickup: undefined as Pickup | undefined,
  isLoading: false,
  deliveryPromiseMethod: undefined as
    | 'delivery'
    | 'pickup-in-point'
    | undefined,
  submitErrorMessage: undefined,
  areThereUnavailableCartItems: false,
  shippingMethodModalRequestId: 0,
}

describe('ShippingMethodSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    lastShippingMethodModalProps = {}
    mockUseDeliveryPromiseState.mockReturnValue({ ...baseState })
  })

  it('passes nonDismissibleModal true when required and no method selected', () => {
    mockUseDeliveryPromiseState.mockReturnValue({
      ...baseState,
      deliveryPromiseMethod: undefined,
    })

    render(<ShippingMethodSelector required />)

    expect(lastShippingMethodModalProps.nonDismissibleModal).toBe(true)
  })

  it('passes nonDismissibleModal false when required but method already selected', () => {
    mockUseDeliveryPromiseState.mockReturnValue({
      ...baseState,
      deliveryPromiseMethod: 'delivery',
    })

    render(<ShippingMethodSelector required />)

    expect(lastShippingMethodModalProps.nonDismissibleModal).toBe(false)
  })

  it('passes nonDismissibleModal false when not required', () => {
    mockUseDeliveryPromiseState.mockReturnValue({
      ...baseState,
      deliveryPromiseMethod: undefined,
    })

    render(<ShippingMethodSelector required={false} />)

    expect(lastShippingMethodModalProps.nonDismissibleModal).toBe(false)
  })

  it('renders nothing without zipcode', () => {
    mockUseDeliveryPromiseState.mockReturnValue({
      ...baseState,
      zipcode: undefined,
    })

    const { container } = render(<ShippingMethodSelector required />)

    expect(container.firstChild).toBeNull()
  })
})
