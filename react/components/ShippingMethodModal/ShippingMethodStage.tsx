import React, { useEffect, useState } from 'react'
import { useCssHandles } from 'vtex.css-handles'
import { useIntl } from 'react-intl'

import ShippingMethodOptionButton from './ShippingMethodOptionButton'
import DeliveryIcon from './DeliveryIcon'
import PickupPointIcon from './PickupPointIcon'
import messages from '../../messages'

const CSS_HANDLES = ['shippingMethodModalOptions']

type ClickHighlight = 'delivery' | 'pickup-in-point' | null

interface Props {
  isModalOpen: boolean
  onPickupSelection: () => void
  onDeliverySelection: () => void
  selectedShipping?: 'delivery' | 'pickup-in-point'
}

const ShippingMethodStage = ({
  isModalOpen,
  onDeliverySelection,
  onPickupSelection,
  selectedShipping,
}: Props) => {
  const intl = useIntl()
  const handles = useCssHandles(CSS_HANDLES)
  const [clickHighlight, setClickHighlight] = useState<ClickHighlight>(null)

  useEffect(() => {
    if (!isModalOpen) {
      setClickHighlight(null)
    }
  }, [isModalOpen])

  const deliverySelected =
    clickHighlight != null
      ? clickHighlight === 'delivery'
      : selectedShipping === 'delivery'

  const pickupSelected =
    clickHighlight != null
      ? clickHighlight === 'pickup-in-point'
      : selectedShipping === 'pickup-in-point'

  return (
    <>
      <p className="mid-gray ma0">
        {intl.formatMessage(messages.shippingMethodModalDescription)}
      </p>
      <div
        className={`flex flex-column w-100 mt8 justify-around ${handles.shippingMethodModalOptions}`}
      >
        <ShippingMethodOptionButton
          onClick={() => {
            setClickHighlight('delivery')
            onDeliverySelection()
          }}
          icon={<DeliveryIcon />}
          label={intl.formatMessage(
            messages.shippingMethodModalDeliveryOptionLabel
          )}
          isSelected={deliverySelected}
        />
        <ShippingMethodOptionButton
          onClick={() => {
            setClickHighlight('pickup-in-point')
            onPickupSelection()
          }}
          icon={<PickupPointIcon />}
          label={intl.formatMessage(
            messages.shippingMethodModalPickupPointOptionLabel
          )}
          isSelected={pickupSelected}
        />
      </div>
    </>
  )
}

export default ShippingMethodStage
