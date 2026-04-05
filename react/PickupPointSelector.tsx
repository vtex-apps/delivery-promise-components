/* eslint-disable no-restricted-globals */
import React, { useState } from 'react'
import { useIntl } from 'react-intl'

import { useDeliveryPromiseState, useDeliveryPromiseDispatch } from './context'
import PickupPointSelectorControl from './components/PickupPointSelector'
import messages from './messages'
import PickupModal from './components/PickupModal'
import PickupPointIcon from './components/ShippingMethodModal/PickupPointIcon'

interface Props {
  mode?: Mode
}

function PickupPointSelector({ mode = 'default' }: Props) {
  const intl = useIntl()
  const [isPickupModalOpen, setIsPickupModalOpen] = useState<boolean>(false)

  const {
    zipcode: selectedZipcode,
    pickups,
    selectedPickup,
    isLoading,
    deliveryPromiseMethod,
    submitErrorMessage,
    areThereUnavailableCartItems,
  } = useDeliveryPromiseState()

  const dispatch = useDeliveryPromiseDispatch()

  const onSubmit = (zipcode: string, reload?: boolean) => {
    dispatch({
      type: 'UPDATE_ZIPCODE',
      args: { zipcode, reload },
    })
  }

  const onSelectPickup = (pickup: Pickup) => {
    dispatch({
      type: 'UPDATE_PICKUP',
      args: { pickup },
    })
  }

  const pickup =
    deliveryPromiseMethod === 'pickup-in-point' ? selectedPickup : undefined

  if (!selectedZipcode) {
    return null
  }

  return (
    <>
      <PickupPointSelectorControl
        onClick={() => setIsPickupModalOpen(true)}
        loading={isLoading}
        value={pickup?.pickupPoint.friendlyName}
        placeholder={intl.formatMessage(messages.pickupPointButtonPlaceholder)}
        mode={mode}
        icon={<PickupPointIcon width={20} height={20} />}
      />

      <PickupModal
        isOpen={isPickupModalOpen && !areThereUnavailableCartItems}
        onClose={() => setIsPickupModalOpen(false)}
        pickupProps={{
          onSelectPickup,
          onSubmit: (value) => onSubmit(value, false),
          pickups,
          inputErrorMessage: submitErrorMessage?.message,
          selectedPickup: pickup,
          selectedZipcode,
          isLoading,
        }}
      />
    </>
  )
}

export default PickupPointSelector
