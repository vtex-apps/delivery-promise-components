/* eslint-disable no-restricted-globals */
import React, { useEffect, useRef, useState } from 'react'
import { usePixelEventCallback } from 'vtex.pixel-manager'
import { useIntl } from 'react-intl'

import { useDeliveryPromiseState, useDeliveryPromiseDispatch } from './context'
import { SHOPPER_LOCATION_MODAL_PIXEL_EVENT_ID } from './constants'
import ShopperLocationModal from './components/ShopperLocationModal'
import ShopperLocationSetterControl from './components/ShopperLocationSetter'
import messages from './messages'
import ShopperLocationPinIcon from './components/ShopperLocationPinIcon'

interface Props {
  required?: boolean
  mode?: Mode
  showLocationDetectorButton?: boolean
}

function ShopperLocationSetter({
  required = false,
  mode = 'default',
  showLocationDetectorButton = false,
}: Props) {
  const callToAction: CallToAction = required ? 'modal' : 'popover-input'
  const dismissible = !required
  const intl = useIntl()
  const [isShopperLocationModalOpen, setIsShopperLocationModalOpen] =
    useState<boolean>(false)

  const [
    wasShopperLocationModalOpenedByPixel,
    setWasShopperLocationModalOpenedByPixel,
  ] = useState<boolean>(false)

  const [awaitingPostZipSubmit, setAwaitingPostZipSubmit] =
    useState<boolean>(false)

  const {
    zipcode: selectedZipcode,
    isLoading,
    addressLabel,
    submitErrorMessage,
    areThereUnavailableCartItems,
    uiRegistry,
    deliveryPromiseMethod,
  } = useDeliveryPromiseState()

  const dispatch = useDeliveryPromiseDispatch()
  const lastZipHandledForShippingModalRef = useRef<string | undefined>()

  const onSubmit = (zipcode: string, reload?: boolean) => {
    dispatch({
      type: 'UPDATE_ZIPCODE',
      args: { zipcode, reload },
    })
  }

  const onClearZipcode = () => {
    dispatch({ type: 'CLEAR_ZIPCODE' })
  }

  useEffect(() => {
    dispatch({
      type: 'REGISTER_SHOPPER_LOCATION_BLOCK',
      args: { required },
    })

    return () => {
      dispatch({ type: 'UNREGISTER_SHOPPER_LOCATION_BLOCK' })
    }
  }, [dispatch, required])

  useEffect(() => {
    if (
      isLoading ||
      !selectedZipcode ||
      !required ||
      !uiRegistry.shippingMethod?.required ||
      deliveryPromiseMethod
    ) {
      return
    }

    if (lastZipHandledForShippingModalRef.current === selectedZipcode) {
      return
    }

    lastZipHandledForShippingModalRef.current = selectedZipcode
    dispatch({ type: 'REQUEST_OPEN_SHIPPING_METHOD_MODAL' })
    setIsShopperLocationModalOpen(false)
  }, [
    deliveryPromiseMethod,
    dispatch,
    isLoading,
    required,
    selectedZipcode,
    uiRegistry.shippingMethod?.required,
  ])

  usePixelEventCallback({
    eventId: SHOPPER_LOCATION_MODAL_PIXEL_EVENT_ID,
    handler: () => {
      setWasShopperLocationModalOpenedByPixel(true)
      setIsShopperLocationModalOpen(true)
    },
  })

  useEffect(() => {
    if (!isShopperLocationModalOpen) {
      setAwaitingPostZipSubmit(false)
    }
  }, [isShopperLocationModalOpen])

  useEffect(() => {
    if (submitErrorMessage) {
      setAwaitingPostZipSubmit(false)
    }
  }, [submitErrorMessage])

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
        showLocationDetectorButton={showLocationDetectorButton}
        loading={isLoading}
        value={addressLabel}
        placeholder={intl.formatMessage(
          messages.shopperLocationButtonPlaceholder
        )}
        selectedZipcode={selectedZipcode}
        onClearZipcode={onClearZipcode}
        onSubmit={(zipCode: string) => {
          setWasShopperLocationModalOpenedByPixel(true)
          if (required) {
            setAwaitingPostZipSubmit(true)
          }

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
        showLocationDetectorButton={showLocationDetectorButton}
        onSubmit={async (zipcode: string) => {
          if (required) {
            setAwaitingPostZipSubmit(true)
          }

          onSubmit(zipcode, true)
        }}
        isLoading={isLoading}
        inputErrorMessage={submitErrorMessage}
        selectedZipcode={selectedZipcode}
        nonDismissibleModal={
          (!dismissible && !selectedZipcode) ||
          (wasShopperLocationModalOpenedByPixel && !selectedZipcode) ||
          (required && awaitingPostZipSubmit)
        }
      />
    </>
  )
}

export default ShopperLocationSetter
