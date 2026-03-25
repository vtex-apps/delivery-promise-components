import React from 'react'
import { useCssHandles } from 'vtex.css-handles'
import { Spinner } from 'vtex.styleguide'
import { useDevice } from 'vtex.device-detector'

import ShippingIcon from './ShippingIcon'
import PickupPointIcon from './PickupPointIcon'
import DeliveryIcon from './DeliveryIcon'

interface Props {
  onClick: () => void
  selectedShipping?: 'delivery' | 'pickup-in-point'
  selectedPickup?: Pickup
  loading: boolean
}

const CSS_HANDLES = [
  'shippingMethodSelector',
  'shippingMethodSelectorLabel',
  'shippingMethodSelectorLabelLimited',
]

const SHIPPING_ICONS = {
  'pickup-in-point': <PickupPointIcon width={24} height={24} />,
  delivery: <DeliveryIcon width={24} height={22.5} />,
}

const ShippingMethodSelector = ({
  selectedShipping,
  onClick,
  selectedPickup,
  loading,
}: Props) => {
  const handles = useCssHandles(CSS_HANDLES)
  const { isMobile } = useDevice()

  return (
    <button
      onClick={onClick}
      className={`flex flex-row items-center pa4 ${handles.shippingMethodSelector}`}
    >
      {selectedShipping ? (
        SHIPPING_ICONS[selectedShipping]
      ) : (
        <span>
          <ShippingIcon width={32} height={32} />
        </span>
      )}
      {!isMobile && (
        <>
          {loading ? (
            <span className="ml3">
              <Spinner size={14} />
            </span>
          ) : (
            <span
              className={`${handles.shippingMethodSelectorLabel} ${
                selectedShipping === 'pickup-in-point'
                  ? handles.shippingMethodSelectorLabelLimited
                  : ''
              } c-action-primary`}
            >
              {selectedShipping
                ? selectedShipping === 'delivery'
                  ? 'Filtrando por entrega'
                  : selectedPickup?.pickupPoint.friendlyName
                : 'Filtrar por envío'}
            </span>
          )}
        </>
      )}
    </button>
  )
}

export default ShippingMethodSelector
