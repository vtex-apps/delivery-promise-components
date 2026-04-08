import React from 'react'
import { useIntl } from 'react-intl'
import { useCssHandles } from 'vtex.css-handles'
import { Spinner } from 'vtex.styleguide'
import { useDevice } from 'vtex.device-detector'

import messages from '../../messages'
import ShippingIcon from './ShippingIcon'
import PickupPointIcon from './PickupPointIcon'
import DeliveryIcon from './DeliveryIcon'

interface Props {
  onClick: () => void
  selectedShipping?: 'delivery' | 'pickup-in-point'
  selectedPickup?: Pickup
  loading: boolean
  mode?: Mode
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
  mode = 'default',
}: Props) => {
  const intl = useIntl()
  const handles = useCssHandles(CSS_HANDLES)
  const { isMobile } = useDevice()

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-row items-center pa4 ${handles.shippingMethodSelector}`}
    >
      {loading ? (
        <div className="ml4">
          <Spinner size={14} />
        </div>
      ) : (
        <>
          {selectedShipping ? (
            SHIPPING_ICONS[selectedShipping]
          ) : (
            <span>
              <ShippingIcon width={32} height={32} />
            </span>
          )}
          {mode === 'default' && !isMobile && (
            <span
              className={`ml3 ${handles.shippingMethodSelectorLabel} ${
                selectedShipping === 'pickup-in-point'
                  ? handles.shippingMethodSelectorLabelLimited
                  : ''
              } c-action-primary`}
            >
              {selectedShipping
                ? selectedShipping === 'delivery'
                  ? intl.formatMessage(
                      messages.shippingMethodSelectorFilteringByDelivery
                    )
                  : selectedPickup?.pickupPoint.friendlyName
                : intl.formatMessage(
                    messages.shippingMethodSelectorFilterByShipping
                  )}
            </span>
          )}
        </>
      )}
    </button>
  )
}

export default ShippingMethodSelector
