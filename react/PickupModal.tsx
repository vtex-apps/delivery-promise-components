import React from 'react'

import PickupModal from './components/PickupModal'
import { useDeliveryPromiseDispatch, useDeliveryPromiseState } from './context'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const PickupModalWithContext = ({ isOpen, onClose }: Props) => {
  const {
    zipcode: selectedZipcode,
    pickups,
    selectedPickup,
    isLoading,
    submitErrorMessage,
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
      args: { pickup, canUnselect: false },
    })
  }

  return (
    <PickupModal
      isOpen={isOpen}
      onClose={onClose}
      pickupProps={{
        onSelectPickup,
        onSubmit: (value) => onSubmit(value, false),
        pickups,
        inputErrorMessage: submitErrorMessage?.message,
        selectedPickup,
        selectedZipcode,
        isLoading,
      }}
    />
  )
}

export default PickupModalWithContext
