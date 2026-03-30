/* eslint-disable no-restricted-globals */
import React, { useEffect, useRef, useState } from 'react'

import { useDeliveryPromiseState, useDeliveryPromiseDispatch } from './context'
import ShippingMethodModal from './components/ShippingMethodModal'
import ShippingMethodSelectorControl from './components/ShippingMethodModal/ShippingMethodSelector'

interface Props {
  required?: boolean
  mode?: Mode
  shippingSelection?: ShippingSelection
}

function ShippingMethodSelector({
  required = false,
  mode = 'default',
  shippingSelection = 'delivery-and-pickup',
}: Props) {
  const [isShippingMethodModalOpen, setIsShippingMethodModalOpen] =
    useState(false)

  const {
    zipcode: selectedZipcode,
    pickups,
    selectedPickup,
    isLoading,
    deliveryPromiseMethod,
    submitErrorMessage,
    areThereUnavailableCartItems,
    shippingMethodModalRequestId,
  } = useDeliveryPromiseState()

  const dispatch = useDeliveryPromiseDispatch()
  const lastHandledShippingMethodModalRequestId = useRef(0)

  useEffect(() => {
    dispatch({
      type: 'REGISTER_SHIPPING_METHOD_BLOCK',
      args: { required },
    })

    return () => {
      dispatch({ type: 'UNREGISTER_SHIPPING_METHOD_BLOCK' })
    }
  }, [dispatch, required])

  useEffect(() => {
    if (
      shippingMethodModalRequestId <=
      lastHandledShippingMethodModalRequestId.current
    ) {
      return
    }

    lastHandledShippingMethodModalRequestId.current =
      shippingMethodModalRequestId

    if (!selectedZipcode) {
      return
    }

    if (required && deliveryPromiseMethod) {
      return
    }

    setIsShippingMethodModalOpen(true)
  }, [
    deliveryPromiseMethod,
    required,
    selectedZipcode,
    shippingMethodModalRequestId,
  ])

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
    if (deliveryPromiseMethod === 'delivery') {
      dispatch({
        type: 'RESET_FULFILLMENT_METHOD',
      })
    } else {
      dispatch({
        type: 'SELECT_DELIVERY_SHIPPING_OPTION',
      })
    }
  }

  const onShippingMethodPickupClear = () => {
    if (deliveryPromiseMethod === 'pickup-in-point') {
      dispatch({
        type: 'RESET_FULFILLMENT_METHOD',
      })
    }
  }

  const showShippingMethodSelector = shippingSelection === 'delivery-and-pickup'
  const pickup =
    deliveryPromiseMethod === 'pickup-in-point' ? selectedPickup : undefined

  if (!selectedZipcode || !showShippingMethodSelector) {
    return null
  }

  return (
    <>
      <ShippingMethodSelectorControl
        onClick={() => setIsShippingMethodModalOpen(true)}
        selectedShipping={deliveryPromiseMethod}
        selectedPickup={selectedPickup}
        loading={isLoading}
        mode={mode}
      />

      <ShippingMethodModal
        isOpen={isShippingMethodModalOpen && !areThereUnavailableCartItems}
        onClose={() => setIsShippingMethodModalOpen(false)}
        selectedShipping={deliveryPromiseMethod}
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
        nonDismissibleModal={required && !deliveryPromiseMethod}
      />
    </>
  )
}

export default ShippingMethodSelector
