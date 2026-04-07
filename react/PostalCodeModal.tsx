import React from 'react'

import ShopperLocationModal from './components/ShopperLocationModal'
import { useDeliveryPromiseDispatch, useDeliveryPromiseState } from './context'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccessfulZipSubmit?: () => void
  /**
   * Cart availability BFF route for zip submit. Search PLP should use `delivery`;
   * other call sites keep default `deliveryorpickup`.
   */
  cartAvailability?: 'delivery' | 'deliveryorpickup'
}

const LocationModalWithContext = ({
  isOpen,
  onClose,
  onSuccessfulZipSubmit,
  cartAvailability = 'deliveryorpickup',
}: Props) => {
  const {
    zipcode: selectedZipcode,
    isLoading,
    submitErrorMessage,
  } = useDeliveryPromiseState()

  const dispatch = useDeliveryPromiseDispatch()

  const onSubmit = async (zipcode: string, reload?: boolean) => {
    const skipReload = Boolean(onSuccessfulZipSubmit)

    await dispatch({
      type: 'UPDATE_ZIPCODE',
      args: {
        zipcode,
        reload: skipReload ? false : reload,
        onAppliedWithoutReload:
          skipReload && onSuccessfulZipSubmit
            ? onSuccessfulZipSubmit
            : undefined,
        ...(cartAvailability === 'delivery'
          ? { cartAvailability: 'delivery' as const }
          : {}),
      },
    })
  }

  return (
    <ShopperLocationModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      isLoading={isLoading}
      inputErrorMessage={submitErrorMessage}
      selectedZipcode={selectedZipcode}
    />
  )
}

export default LocationModalWithContext
