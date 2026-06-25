import React from 'react'
import { render } from '@vtex/test-tools/react'

import PickupPointSelector from '../PickupPointSelector'

const mockDispatch = jest.fn()
const mockUseDeliveryPromiseState = jest.fn()

jest.mock('../context', () => ({
  useDeliveryPromiseState: () => mockUseDeliveryPromiseState(),
  useDeliveryPromiseDispatch: () => mockDispatch,
}))

jest.mock('../components/PickupPointSelector', () => ({
  __esModule: true,
  default: () => <div data-testid="pickup-point-control" />,
}))

let lastPickupModalProps: { pickupProps?: { canUnselect?: boolean } } = {}

jest.mock('../components/PickupModal', () => ({
  __esModule: true,
  default: (props: { pickupProps?: { canUnselect?: boolean } }) => {
    lastPickupModalProps = props

    return <div data-testid="pickup-modal" />
  },
}))

const baseState = {
  zipcode: '12345-678',
  pickups: [] as Pickup[],
  selectedPickup: undefined as Pickup | undefined,
  isLoading: false,
  deliveryPromiseMethod: 'pickup-in-point' as
    | 'delivery'
    | 'pickup-in-point'
    | undefined,
  submitErrorMessage: undefined,
  areThereUnavailableCartItems: false,
}

describe('PickupPointSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    lastPickupModalProps = {}
    mockUseDeliveryPromiseState.mockReturnValue({ ...baseState })
  })

  it('always allows unselecting (canUnselect hardcoded true)', () => {
    render(<PickupPointSelector />)

    expect(lastPickupModalProps.pickupProps?.canUnselect).toBe(true)
  })

  it('renders nothing without zipcode', () => {
    mockUseDeliveryPromiseState.mockReturnValue({
      ...baseState,
      zipcode: undefined,
    })

    const { container } = render(<PickupPointSelector />)

    expect(container.firstChild).toBeNull()
  })
})
