/* eslint-disable no-restricted-globals */
import React, { useEffect, useState } from 'react'
import { usePixelEventCallback } from 'vtex.pixel-manager'
import { useIntl } from 'react-intl'

import { useShippingOptionState, useShippingOptionDispatch } from './context'
import ShippingMethodModal from './components/ShippingMethodModal'
import ShippingMethodSelector from './components/ShippingMethodModal/ShippingMethodSelector'
import { SHOPPER_LOCATION_MODAL_PIXEL_EVENT_ID } from './constants'
import ShopperLocationModal from './components/ShopperLocationModal'
import ShopperLocationSetter from './components/ShopperLocationSetter'
import PickupPointSelector from './components/PickupPointSelector'
import messages from './messages'
import PickupModal from './components/PickupModal'
import ShopperLocationPinIcon from './components/ShopperLocationPinIcon'
import PickupPointIcon from './components/ShippingMethodModal/PickupPointIcon'
import UnavailableItemsModal from './components/UnavailableItemsModal'

interface Props {
  hideStoreSelection?: boolean
  callToAction?: CallToAction
  dismissible?: boolean
  shippingSelection?: ShippingSelection
  mode?: Mode
  showShopperLocationDetectorButton?: boolean
}

function ShippingOptionZipcode({
  callToAction = 'popover-input',
  dismissible = false,
  shippingSelection = 'delivery-and-pickup',
  mode = 'default',
  showShopperLocationDetectorButton = false,
}: Props) {
  const intl = useIntl()
  const [isShippingMethodModalOpen, setIsShippingMethodModalOpen] =
    useState(false)

  const [isShopperLocationModalOpen, setIsShopperLocationModalOpen] =
    useState<boolean>(false)

  const [isPickupModalOpen, setIsPickupModalOpen] = useState<boolean>(false)

  const [
    wasShopperLocationModalOpenedByPixel,
    setWasShopperLocationModalOpenedByPixel,
  ] = useState<boolean>(false)

  const {
    zipcode: selectedZipcode,
    pickups,
    selectedPickup,
    isLoading,
    shippingOption,
    addressLabel,
    submitErrorMessage,
    areThereUnavailableCartItems,
    unavailableCartItems,
    unavailabilityMessage,
  } = useShippingOptionState()

  const dispatch = useShippingOptionDispatch()

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

  const onShippingMethodDeliveryToggle = () => {
    if (shippingOption === 'delivery') {
      // If delivery is already selected, reset to no selection
      dispatch({
        type: 'RESET_SHIPPING_OPTION',
      })
    } else {
      dispatch({
        type: 'SELECT_DELIVERY_SHIPPING_OPTION',
      })
    }
  }

  const onShippingMethodPickupClear = () => {
    if (shippingOption === 'pickup-in-point') {
      // If pickup is already selected, reset to no selection
      dispatch({
        type: 'RESET_SHIPPING_OPTION',
      })
    }
    // Removed automatic pickup selection - let user choose from the list
  }

  const onAbortUnavailableItemsAction = () => {
    dispatch({
      type: 'ABORT_UNAVAILABLE_ITEMS_ACTION',
    })
  }

  const onContinueUnavailableItemsAction = () => {
    dispatch({
      type: 'CONTINUE_UNAVAILABLE_ITEMS_ACTION',
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

  const showShippingMethodSelector = shippingSelection === 'delivery-and-pickup'
  const showPickupButton = shippingSelection === 'only-pickup'
  const pickup =
    shippingOption === 'pickup-in-point' ? selectedPickup : undefined

  return (
    <>
      <ShopperLocationSetter
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

      {selectedZipcode && showShippingMethodSelector && (
        <ShippingMethodSelector
          onClick={() => setIsShippingMethodModalOpen(true)}
          selectedShipping={shippingOption}
          selectedPickup={selectedPickup}
          loading={isLoading}
        />
      )}

      {selectedZipcode && showPickupButton && (
        <PickupPointSelector
          onClick={() => setIsPickupModalOpen(true)}
          loading={isLoading}
          value={pickup?.pickupPoint.friendlyName}
          placeholder={intl.formatMessage(
            messages.pickupPointButtonPlaceholder
          )}
          mode={mode}
          icon={<PickupPointIcon width={20} height={20} />}
        />
      )}

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

      <ShippingMethodModal
        isOpen={isShippingMethodModalOpen && !areThereUnavailableCartItems}
        onClose={() => setIsShippingMethodModalOpen(false)}
        selectedShipping={shippingOption}
        onDeliverySelection={() => {
          onShippingMethodDeliveryToggle()
        }}
        onShippingMethodPickupClear={onShippingMethodPickupClear}
        pickupProps={{
          onSelectPickup,
          onSubmit: (value) => onSubmit(value, true),
          pickups,
          inputErrorMessage: submitErrorMessage?.message,
          selectedPickup: pickup,
          selectedZipcode,
          isLoading,
        }}
        nonDismissibleModal={false}
      />

      <PickupModal
        isOpen={isPickupModalOpen && !areThereUnavailableCartItems}
        onClose={() => setIsPickupModalOpen(false)}
        pickupProps={{
          onSelectPickup,
          onSubmit: (value) => onSubmit(value, true),
          pickups,
          inputErrorMessage: submitErrorMessage?.message,
          selectedPickup: pickup,
          selectedZipcode,
          isLoading,
        }}
      />

      <UnavailableItemsModal
        isOpen={areThereUnavailableCartItems}
        onClose={onAbortUnavailableItemsAction}
        onTryAgain={onAbortUnavailableItemsAction}
        onRemoveItems={onContinueUnavailableItemsAction}
        unavailableCartItems={unavailableCartItems}
        unavailabilityMessage={unavailabilityMessage}
      />
    </>
  )
}

export default ShippingOptionZipcode
