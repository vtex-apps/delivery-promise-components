import React, { useCallback, useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { useCssHandles } from 'vtex.css-handles'

import EmptyState from './EmptyState'
import ShopperLocationPinIcon from './ShopperLocationPinIcon'
import messages from '../messages'
import { useDeliveryPromiseDispatch, useDeliveryPromiseState } from '../context'

const CSS_HANDLES = [
  'shopperLocationDetectorButton',
  'shopperLocationDetectorButtonContainer',
  'shopperLocationDetectorButtonIcon',
] as const

/** Narrow shape we read from `getCurrentPosition` (DOM lib may omit `GeolocationPosition`). */
type BrowserGeoPosition = {
  coords: { latitude: number; longitude: number }
}

const getGeolocation = async (): Promise<BrowserGeoPosition> => {
  if (!navigator?.geolocation) {
    throw new Error('Geolocation not supported')
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject)
  }) as Promise<BrowserGeoPosition>
}

const reverseGeocodeToZip = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
  )

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  const postcode = data.address?.postcode || data.address?.postal_code

  if (!postcode) {
    throw new Error('No postcode in reverse geocode response')
  }

  return postcode.replace(/-/g, '')
}

const ShopperLocationDetectorButton: React.FC = () => {
  const [uiPhase, setUiPhase] = useState<'idle' | 'working' | 'error'>('idle')
  const [awaitingContextIdle, setAwaitingContextIdle] = useState(false)
  const dispatch = useDeliveryPromiseDispatch()
  const { countryCode, isLoading } = useDeliveryPromiseState()
  const handles = useCssHandles(CSS_HANDLES)
  const intl = useIntl()

  useEffect(() => {
    if (!awaitingContextIdle) {
      return
    }

    if (!isLoading) {
      setUiPhase('idle')
      setAwaitingContextIdle(false)
    }
  }, [awaitingContextIdle, isLoading])

  const handleUseLocation = useCallback(async () => {
    if (!navigator?.geolocation || !countryCode) {
      setUiPhase('error')

      return
    }

    setUiPhase('working')
    setAwaitingContextIdle(false)

    try {
      const position = await getGeolocation()
      const { latitude, longitude } = position.coords
      const zipcode = await reverseGeocodeToZip(latitude, longitude)

      await dispatch({
        type: 'UPDATE_ZIPCODE',
        args: { zipcode },
      })

      setAwaitingContextIdle(true)
    } catch {
      setUiPhase('error')
      setAwaitingContextIdle(false)
    }
  }, [countryCode, dispatch])

  if (uiPhase === 'working') {
    return (
      <div className={`${handles.shopperLocationDetectorButtonContainer}`}>
        <EmptyState
          description={intl.formatMessage(
            messages.shopperLocationDetectorButtonLoadingDescription
          )}
          variant="secondary"
          iconProps={{ useIcon: false, width: '20', height: '20' }}
        />
      </div>
    )
  }

  if (uiPhase === 'error') {
    return (
      <div className={`${handles.shopperLocationDetectorButtonContainer}`}>
        <EmptyState
          description={intl.formatMessage(
            messages.shopperLocationDetectorButtonErrorDescription
          )}
          variant="secondary"
          iconProps={{ useIcon: true, width: '20', height: '20' }}
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleUseLocation}
      className={`${handles.shopperLocationDetectorButton} bn bg-transparent pa0 pointer no-underline flex items-center c-link hover-c-link`}
    >
      <span className={handles.shopperLocationDetectorButtonIcon} aria-hidden>
        <ShopperLocationPinIcon filled={false} />
      </span>
      {intl.formatMessage(messages.shopperLocationDetectorButtonTitle)}
    </button>
  )
}

export default ShopperLocationDetectorButton
