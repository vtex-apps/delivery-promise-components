import React from 'react'

import ShopperLocationModal from './components/ShopperLocationModal'
import { useDeliveryPromiseDispatch, useDeliveryPromiseState } from './context'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccessfulZipSubmit?: () => void
}

const LocationModalWithContext = ({
  isOpen,
  onClose,
  onSuccessfulZipSubmit,
}: Props) => {
  const {
    zipcode: selectedZipcode,
    isLoading,
    submitErrorMessage,
  } = useDeliveryPromiseState()

  const dispatch = useDeliveryPromiseDispatch()

  const onSubmit = async (zipcode: string, reload?: boolean) => {
    const skipReload = Boolean(onSuccessfulZipSubmit)
    const applied = (await dispatch({
      type: 'UPDATE_ZIPCODE',
      args: {
        zipcode,
        reload: skipReload ? false : reload,
      },
    })) as boolean | undefined

    if (skipReload && applied === true) {
      onSuccessfulZipSubmit?.()
    }
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
