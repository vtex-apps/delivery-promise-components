import React from 'react'
import { useCssHandles } from 'vtex.css-handles'
import { useIntl } from 'react-intl'

import ShippingMethodOptionButton from './ShippingMethodOptionButton'
import DeliveryIcon from './DeliveryIcon'
import PickupPointIcon from './PickupPointIcon'
import messages from '../../messages'

const CSS_HANDLES = ['shippingMethodModalOptions']

interface Props {
  onPickupSelection: () => void
  onDeliverySelection: () => void
  selectedShipping?: 'delivery' | 'pickup-in-point'
}

const ShippingMethodStage = ({
  onDeliverySelection,
  onPickupSelection,
  selectedShipping,
}: Props) => {
  const intl = useIntl()
  const handles = useCssHandles(CSS_HANDLES)

  return (
    <>
      <p className="mid-gray ma0">
        {intl.formatMessage(messages.shippingMethodModalDescription)}
      </p>
      <div
        className={`flex flex-column w-100 mt8 justify-around ${handles.shippingMethodModalOptions}`}
      >
        <ShippingMethodOptionButton
          onClick={onDeliverySelection}
          icon={<DeliveryIcon />}
          label={intl.formatMessage(
            messages.shippingMethodModalDeliveryOptionLabel
          )}
          isSelected={selectedShipping === 'delivery'}
        />
        <ShippingMethodOptionButton
          onClick={onPickupSelection}
          icon={<PickupPointIcon />}
          label={intl.formatMessage(
            messages.shippingMethodModalPickupPointOptionLabel
          )}
          isSelected={selectedShipping === 'pickup-in-point'}
        />
      </div>
    </>
  )
}

export default ShippingMethodStage
