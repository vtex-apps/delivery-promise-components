import React from 'react'
import { render, waitFor, fireEvent } from '@vtex/test-tools/react'
import * as reactIntl from 'react-intl'

import ShopperLocationDetectorButton from '../components/ShopperLocationDetectorButton'

const messages = {
  'store/delivery-promise-components.shopperLocationDetectorButton.title':
    'Use my location',
  'store/delivery-promise-components.shopperLocationDetectorButton.loadingDescription':
    'Detecting location...',
  'store/delivery-promise-components.shopperLocationDetectorButton.errorDescription':
    'Location detection failed',
} as const

const mockDispatch = jest.fn().mockResolvedValue(undefined)

jest.mock('../context', () => ({
  useDeliveryPromiseDispatch: () => mockDispatch,
  useDeliveryPromiseState: () => ({
    countryCode: 'BRA',
    isLoading: false,
  }),
}))

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
}

// Mock fetch
const mockFetch = jest.fn()

// Mock useCssHandles
const mockUseCssHandles = jest.fn()

// Mock intl
const mockIntl = {
  formatMessage: ({ id }: { id: string }) =>
    messages[id as keyof typeof messages] || id,
} as reactIntl.IntlShape

jest.mock('vtex.css-handles', () => ({
  useCssHandles: () => mockUseCssHandles(),
}))

jest.mock('../components/EmptyState', () => {
  const MockEmptyState = ({ description }: { description: string }) => (
    <div data-testid="empty-state">{description}</div>
  )

  return MockEmptyState
})

jest.mock('../components/ShopperLocationPinIcon', () => {
  const MockShopperLocationPinIcon = ({ filled }: { filled: boolean }) => (
    <span data-testid="pin-icon" data-filled={filled} />
  )

  return MockShopperLocationPinIcon
})

describe('ShopperLocationDetectorButton', () => {
  const mockCoordinates = { latitude: -23.5505, longitude: -46.6333 }
  const mockPostcode = '01310-100'

  const mockSuccessfulGeolocation = () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: mockCoordinates })
    })
  }

  const mockGeolocationError = (errorMessage = 'Geolocation denied') => {
    mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
      error(new Error(errorMessage))
    })
  }

  const mockSuccessfulFetch = (postcode = mockPostcode) => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ address: { postcode } }),
    })
  }

  const mockFailedFetch = (status = 500) => {
    mockFetch.mockResolvedValue({ ok: false, status })
  }

  beforeEach(() => {
    jest.clearAllMocks()

    Object.defineProperty(global, 'navigator', {
      value: { geolocation: mockGeolocation },
      writable: true,
    })

    global.fetch = mockFetch

    mockUseCssHandles.mockReturnValue({
      shopperLocationDetectorButton: 'shopperLocationDetectorButton',
      shopperLocationDetectorButtonContainer:
        'shopperLocationDetectorButtonContainer',
      shopperLocationDetectorButtonIcon: 'shopperLocationDetectorButtonIcon',
    })

    jest.spyOn(reactIntl, 'useIntl').mockImplementation(() => mockIntl)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders use-location button initially without calling geolocation', () => {
    const { getByRole } = render(<ShopperLocationDetectorButton />)

    expect(getByRole('button', { name: 'Use my location' })).toBeInTheDocument()
    expect(mockGeolocation.getCurrentPosition).not.toHaveBeenCalled()
  })

  it('calls geolocation and dispatches UPDATE_ZIPCODE after click', async () => {
    mockSuccessfulGeolocation()
    mockSuccessfulFetch()

    const { getByRole } = render(<ShopperLocationDetectorButton />)

    fireEvent.click(getByRole('button', { name: 'Use my location' }))

    await waitFor(() => {
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled()
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '01310100' },
      })
    })
  })

  it('shows loading state while resolving location', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation(() => {
      /* never resolve — stay loading */
    })
    mockSuccessfulFetch()

    const { getByRole, getByText } = render(<ShopperLocationDetectorButton />)

    fireEvent.click(getByRole('button', { name: 'Use my location' }))

    await waitFor(() => {
      expect(getByText('Detecting location...')).toBeInTheDocument()
    })
  })

  it('handles geolocation error gracefully', async () => {
    mockGeolocationError()

    const { getByRole, getByText } = render(<ShopperLocationDetectorButton />)

    fireEvent.click(getByRole('button', { name: 'Use my location' }))

    await waitFor(() => {
      expect(getByText('Location detection failed')).toBeInTheDocument()
    })

    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('handles API error gracefully', async () => {
    mockSuccessfulGeolocation()
    mockFailedFetch()

    const { getByRole, getByText } = render(<ShopperLocationDetectorButton />)

    fireEvent.click(getByRole('button', { name: 'Use my location' }))

    await waitFor(() => {
      expect(getByText('Location detection failed')).toBeInTheDocument()
    })

    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('dispatches zipcode from postal_code field when postcode is absent', async () => {
    mockSuccessfulGeolocation()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          address: { postal_code: '90210' },
        }),
    })

    const { getByRole } = render(<ShopperLocationDetectorButton />)

    fireEvent.click(getByRole('button', { name: 'Use my location' }))

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_ZIPCODE',
        args: { zipcode: '90210' },
      })
    })
  })

  it('applies CSS handles on the button', () => {
    const { container } = render(<ShopperLocationDetectorButton />)

    expect(
      container.querySelector('.shopperLocationDetectorButton')
    ).toBeInTheDocument()
    expect(
      container.querySelector('.shopperLocationDetectorButtonIcon')
    ).toBeInTheDocument()
  })

  it('shows error when geolocation is not supported', async () => {
    Object.defineProperty(global, 'navigator', {
      value: {},
      writable: true,
    })

    const { getByRole, getByText } = render(<ShopperLocationDetectorButton />)

    fireEvent.click(getByRole('button', { name: 'Use my location' }))

    await waitFor(() => {
      expect(getByText('Location detection failed')).toBeInTheDocument()
    })
  })
})
