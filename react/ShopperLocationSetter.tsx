/* eslint-disable no-restricted-globals */
import React, { useEffect, useState } from 'react'
import { usePixelEventCallback } from 'vtex.pixel-manager'
import { useIntl } from 'react-intl'

import { useDeliveryPromiseState, useDeliveryPromiseDispatch } from './context'
import { SHOPPER_LOCATION_MODAL_PIXEL_EVENT_ID } from './constants'
import ShopperLocationModal from './components/ShopperLocationModal'
import ShopperLocationSetterControl from './components/ShopperLocationSetter'
import messages from './messages'
import ShopperLocationPinIcon from './components/ShopperLocationPinIcon'

interface Props {
  hideStoreSelection?: boolean
  callToAction?: CallToAction
  dismissible?: boolean
  shippingSelection?: ShippingSelection
  mode?: Mode
  showShopperLocationDetectorButton?: boolean
}

function ShopperLocationSetter({
  callToAction = 'popover-input',
  dismissible = false,
  mode = 'default',
  showShopperLocationDetectorButton = false,
}: Props) {
  const intl = useIntl()
  const [isShopperLocationModalOpen, setIsShopperLocationModalOpen] =
    useState<boolean>(false)

  const [
    wasShopperLocationModalOpenedByPixel,
    setWasShopperLocationModalOpenedByPixel,
  ] = useState<boolean>(false)

  const {
    zipcode: selectedZipcode,
    isLoading,
    addressLabel,
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

  usePixelEventCallback({
    eventId: SHOPPER_LOCATION_MODAL_PIXEL_EVENT_ID,
    handler: () => {
      setWasShopperLocationModalOpenedByPixel(true)
      setIsShopperLocationModalOpen(true)
    },
  })

  useEffect(() => {
    const isModalOpen =
      !isLoading && !selectedZipcode && callToAction === 'modal'

    if (isModalOpen) {
      setIsShopperLocationModalOpen(true)
    }
  }, [callToAction, selectedZipcode, isLoading])

  return (
    <>
      <ShopperLocationSetterControl
        onClick={() => {
          setWasShopperLocationModalOpenedByPixel(false)
          setIsShopperLocationModalOpen(true)
        }}
        showShopperLocationDetectorButton={showShopperLocationDetectorButton}
        loading={isLoading}
        value={addressLabel}
        placeholder={intl.formatMessage(
          messages.shopperLocationButtonPlaceholder
        )}
        selectedZipcode={selectedZipcode}
        onSubmit={(zipCode: string) => {
          setWasShopperLocationModalOpenedByPixel(true)
          onSubmit(zipCode, true)
        }}
        inputErrorMessage={submitErrorMessage?.message}
        callToAction={callToAction}
        mode={mode}
        icon={<ShopperLocationPinIcon filled={false} width={20} height={20} />}
      />

      <ShopperLocationModal
        isOpen={isShopperLocationModalOpen && !areThereUnavailableCartItems}
        onClose={() => setIsShopperLocationModalOpen(false)}
        showShopperLocationDetectorButton={showShopperLocationDetectorButton}
        onSubmit={async (zipcode: string) => {
          onSubmit(zipcode, true)
        }}
        isLoading={isLoading}
        inputErrorMessage={submitErrorMessage}
        selectedZipcode={selectedZipcode}
        nonDismissibleModal={
          (!dismissible && !selectedZipcode) ||
          (wasShopperLocationModalOpenedByPixel && !selectedZipcode)
        }
      />
    </>
  )
}

export default ShopperLocationSetter
