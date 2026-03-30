/* eslint-disable no-restricted-globals */
import { useRuntime, useSSR } from 'vtex.render-runtime'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import { useOrderItems } from 'vtex.order-items/OrderItems'
import { usePixelEventCallback } from 'vtex.pixel-manager'
import { useRenderSession } from 'vtex.session-client'

import {
  getAddress,
  getCatalogCount,
  getPickups,
  updateOrderForm,
  updateSession,
  getCartProducts,
  orderFormItemsToAvailabilityItems,
  removeCartProductsById,
  validateProductAvailability,
  validateProductAvailabilityByPickup,
  validateProductAvailabilityByDelivery,
} from '../client'
import type { AvailabilityItem } from '../client'
import type { CartItem, CartProduct } from '../components/UnavailableItemsModal'
import { getCountryCode, getFacetsData, getOrderFormId } from '../utils/cookie'
import messages from '../messages'
import type {
  ShippingMethod,
  DeliveryPromiseActions,
  ZipCodeError,
  DeliveryPromiseUiRegistry,
} from './DeliveryPromiseContext'
import {
  SHOPPER_LOCATION_MODAL_PIXEL_EVENT_ID,
  PRODUCTS_NOT_FOUND_ERROR_CODE,
  DEFAULT_TRADE_POLICY,
} from '../constants'

export const useDeliveryPromise = () => {
  const [zipcode, setZipCode] = useState<string>()
  const [isLoading, setIsLoading] = useState(true)
  const [countryCode, setCountryCode] = useState<string>()
  const [submitErrorMessage, setSubmitErrorMessage] = useState<ZipCodeError>()

  const [city, setCity] = useState<string>()
  const [pickups, setPickups] = useState<Pickup[]>([])
  const [selectedPickup, setSelectedPickup] = useState<Pickup>()
  const [geoCoordinates, setGeoCoordinates] = useState<number[]>()
  const [addressLabel, setAddressLabel] = useState<string>()
  const [deliveryPromiseMethod, setDeliveryPromiseMethod] =
    useState<ShippingMethod>()

  const [unavailableCartItems, setUnavailableCartItems] = useState<CartItem[]>(
    []
  )

  const [pendingAddToCartItem, setPendingAddToCartItem] = useState<any>()

  const [unavailabilityMessage, setUnavailabilityMessage] = useState<string>()

  const [
    actionInterruptedByCartValidation,
    setActionInterruptedByCartValidation,
  ] = useState<() => void>()

  const [uiRegistry, setUiRegistry] = useState<DeliveryPromiseUiRegistry>({})
  const [shippingMethodModalRequestId, setShippingMethodModalRequestId] =
    useState(0)

  const uiRegistryRef = useRef(uiRegistry)

  uiRegistryRef.current = uiRegistry

  const dispatchImplRef = useRef<
    (action: DeliveryPromiseActions) => Promise<void>
  >(async () => {})

  const { account } = useRuntime()
  const { session, loading: isSessionLoading } = useRenderSession()
  const isSSR = useSSR()
  const intl = useIntl()
  const { addItems } = useOrderItems()

  const salesChannel = isSessionLoading
    ? undefined
    : session?.namespaces?.store?.channel?.value ?? DEFAULT_TRADE_POLICY

  const [pendingPickupsFetch, setPendingPickupsFetch] = useState<{
    country: string
    selectedZipcode: string
    coordinates: number[]
    shippingMethod?: ShippingMethod
    keepLoading?: boolean
  } | null>(null)

  usePixelEventCallback({
    eventId: SHOPPER_LOCATION_MODAL_PIXEL_EVENT_ID,
    handler: (event: any) => {
      setPendingAddToCartItem(event.data.addToCartInfo)
    },
  })

  const fetchPickups = useCallback(
    async (
      country: string,
      selectedZipcode: string,
      coordinates: number[],
      shippingMethod?: ShippingMethod,
      keepLoading = false
    ) => {
      if (!salesChannel) {
        setPendingPickupsFetch({
          country,
          selectedZipcode,
          coordinates,
          shippingMethod,
          keepLoading,
        })

        return
      }

      const responsePickups = await getPickups(
        country,
        selectedZipcode,
        account,
        salesChannel
      )

      const pickupsFormatted = responsePickups?.items.filter(
        (pickup: Pickup) => pickup.pickupPoint.isActive
      )

      setPickups(pickupsFormatted ?? [])

      if (pickupsFormatted.length === 0) {
        setIsLoading(false)

        return
      }

      const pickupPointId = getFacetsData('pickupPoint')

      // Only auto-select pickup if there's already a shipping method or saved pickup preference
      if (pickupPointId || shippingMethod === 'pickup-in-point') {
        const [defaultPickup] = pickupsFormatted

        const pickup = pickupPointId
          ? pickupsFormatted.find(
              (p: Pickup) => p.pickupPoint.id === pickupPointId
            ) || defaultPickup
          : defaultPickup

        setSelectedPickup(pickup)

        await updateSession(
          country,
          selectedZipcode,
          coordinates,
          pickup,
          shippingMethod
        )
      } else {
        // Don't auto-select pickup - let user choose
        await updateSession(
          country,
          selectedZipcode,
          coordinates,
          undefined,
          shippingMethod
        )
      }

      if (!keepLoading) {
        setIsLoading(false)
      }
    },
    [account, salesChannel]
  )

  useEffect(() => {
    if (isSSR || isSessionLoading) {
      return
    }

    if (!pendingPickupsFetch) {
      return
    }

    const {
      country,
      selectedZipcode,
      coordinates,
      shippingMethod,
      keepLoading,
    } = pendingPickupsFetch

    setPendingPickupsFetch(null)
    fetchPickups(
      country,
      selectedZipcode,
      coordinates,
      shippingMethod,
      keepLoading
    )
  }, [fetchPickups, isSSR, isSessionLoading, pendingPickupsFetch])

  useEffect(() => {
    if (isSSR) {
      return
    }

    const segmentZipCode = getFacetsData('zip-code')
    const segmentCountryCode = getCountryCode()
    const segmentShippingMethod = getFacetsData('shipping') as ShippingMethod

    setZipCode(segmentZipCode)
    setDeliveryPromiseMethod(segmentShippingMethod)
    setCountryCode(segmentCountryCode)

    if (segmentZipCode) {
      try {
        getAddress(segmentCountryCode, segmentZipCode, account).then((res) => {
          setCity(res.city)
          setGeoCoordinates(res.geoCoordinates)
          fetchPickups(
            segmentCountryCode,
            segmentZipCode,
            res.geoCoordinates,
            segmentShippingMethod
          )
        })
      } catch {
        setIsLoading(false)
      }
    } else {
      setIsLoading(false)
    }
  }, [account, isSSR, fetchPickups])

  const onError = (code: string, message: string) => {
    setSubmitErrorMessage({ code, message })
    setIsLoading(false)

    setTimeout(() => {
      setSubmitErrorMessage(undefined)
    }, 3000)
  }

  const validateCartItems = async (
    validationHandler: (items: AvailabilityItem[]) => Promise<any>
  ) => {
    setIsLoading(true)

    try {
      const orderFormId = getOrderFormId()

      const orderLines = await getCartProducts(orderFormId)

      const availabilityItems = orderFormItemsToAvailabilityItems(orderLines)

      const { unavailableItemIds } = await validationHandler(availabilityItems)

      const unavailableSkuIds = new Set(
        Array.isArray(unavailableItemIds) ? unavailableItemIds.map(String) : []
      )

      const unavailableItems = orderLines
        .map((line: CartProduct, id: number) => ({
          cartItemIndex: id,
          product: line,
        }))
        .filter((item: any) => unavailableSkuIds.has(String(item.product.id)))

      setUnavailableCartItems(unavailableItems)

      setIsLoading(false)

      return unavailableItems
    } catch {
      setIsLoading(false)
      setUnavailableCartItems([])

      return []
    }
  }

  const resetUnavailableCartItems = async () => {
    setUnavailableCartItems([])
  }

  const removeUnavailableItems = async () => {
    const orderFormId = getOrderFormId()

    await removeCartProductsById(
      orderFormId,
      unavailableCartItems.map((item) => item.cartItemIndex)
    )

    if (actionInterruptedByCartValidation) {
      actionInterruptedByCartValidation()
    }
  }

  const submitZipcode = async (selectedZipcode: string, reload = true) => {
    if (!selectedZipcode) {
      onError(
        'POSTAL_CODE_NOT_FOUND',
        intl.formatMessage(messages.shopperLocationPostalCodeInputPlaceholder)
      )

      return
    }

    if (!countryCode) {
      return
    }

    setIsLoading(true)

    try {
      const { geoCoordinates: coordinates, city: cityName } = await getAddress(
        countryCode,
        selectedZipcode,
        account
      )

      if (coordinates.length === 0) {
        onError(
          'INVALID_POSTAL_CODE',
          intl.formatMessage(messages.shopperLocationPostalCodeInputError)
        )

        return
      }

      const { total } = await getCatalogCount(selectedZipcode, coordinates)

      if (total === 0) {
        onError(
          PRODUCTS_NOT_FOUND_ERROR_CODE,
          intl.formatMessage(
            messages.shopperLocationModalNoPickupPointStateDescription,
            {
              postalCode: ` ${selectedZipcode}`,
            }
          )
        )

        return
      }

      const orderFormId = getOrderFormId()

      if (orderFormId) {
        await updateOrderForm(countryCode, selectedZipcode, orderFormId)
      }

      setCity(cityName)
      setGeoCoordinates(coordinates)
      setZipCode(selectedZipcode)

      await updateSession(
        countryCode,
        selectedZipcode,
        coordinates,
        selectedPickup
        // Removed automatic 'delivery' default - let user choose shipping method
      )

      await fetchPickups(
        countryCode,
        selectedZipcode,
        coordinates,
        deliveryPromiseMethod,
        true
      )
    } catch {
      onError(
        'INVALID_POSTAL_CODE',
        intl.formatMessage(messages.shopperLocationPostalCodeInputError)
      )

      return
    }

    setDeliveryPromiseMethod(undefined)
    setSelectedPickup(undefined)

    const registry = uiRegistryRef.current
    const shippingMethodRequired = registry.shippingMethod?.required === true
    const shopperLocationRequired = registry.shopperLocation?.required === true
    const effectiveReload = reload && !shippingMethodRequired

    if (!effectiveReload) {
      setIsLoading(false)
    }

    if (
      reload &&
      shippingMethodRequired &&
      !(shopperLocationRequired && shippingMethodRequired)
    ) {
      setShippingMethodModalRequestId((n) => n + 1)
    }

    if (effectiveReload) {
      location.reload()
    }
  }

  const selectPickup = async (pickup: Pickup, canUnselect = true) => {
    if (!countryCode || !zipcode || !geoCoordinates) {
      return
    }

    let shippingMethod = 'pickup-in-point'
    let pickupUpdated = pickup

    if (
      canUnselect &&
      deliveryPromiseMethod === 'pickup-in-point' &&
      pickup.pickupPoint.id === selectedPickup?.pickupPoint.id
    ) {
      shippingMethod = ''
      pickupUpdated = pickups[0]
    }

    setSelectedPickup(pickupUpdated)

    await updateSession(
      countryCode,
      zipcode!,
      geoCoordinates!,
      pickupUpdated,
      shippingMethod
    )

    location.reload()
  }

  const selectDeliveryShippingOption = async () => {
    if (!countryCode || !zipcode || !geoCoordinates) {
      return
    }

    await updateSession(
      countryCode,
      zipcode,
      geoCoordinates,
      selectedPickup,
      'delivery'
    )

    location.reload()
  }

  useEffect(() => {
    setAddressLabel(city ? `${city}, ${zipcode}` : zipcode)
  }, [zipcode, city])

  dispatchImplRef.current = async (action: DeliveryPromiseActions) => {
    switch (action.type) {
      case 'REGISTER_SHOPPER_LOCATION_BLOCK':
        setUiRegistry((prev) => ({
          ...prev,
          shopperLocation: { required: action.args.required },
        }))

        return

      case 'UNREGISTER_SHOPPER_LOCATION_BLOCK':
        setUiRegistry((prev) => {
          const next = { ...prev }

          delete next.shopperLocation

          return next
        })

        return

      case 'REGISTER_SHIPPING_METHOD_BLOCK':
        setUiRegistry((prev) => ({
          ...prev,
          shippingMethod: { required: action.args.required },
        }))

        return

      case 'UNREGISTER_SHIPPING_METHOD_BLOCK':
        setUiRegistry((prev) => {
          const next = { ...prev }

          delete next.shippingMethod

          return next
        })

        return

      case 'REQUEST_OPEN_SHIPPING_METHOD_MODAL':
        setShippingMethodModalRequestId((n) => n + 1)

        return

      case 'UPDATE_ZIPCODE': {
        const { zipcode: zipcodeSelected, reload } = action.args

        const unavailableItems = await validateCartItems(
          async (items: AvailabilityItem[]) =>
            validateProductAvailability(
              zipcodeSelected,
              countryCode!,
              items,
              account,
              salesChannel
            )
        )

        if (unavailableItems.length === 0) {
          submitZipcode(zipcodeSelected, reload)
          break
        }

        setUnavailabilityMessage(
          intl.formatMessage(messages.unavailableItemsModalDescription, {
            addressLabel,
          })
        )

        setActionInterruptedByCartValidation(
          () => () => submitZipcode(zipcodeSelected, reload)
        )

        break
      }

      case 'UPDATE_PICKUP': {
        const { pickup, canUnselect } = action.args

        setUnavailabilityMessage('pickup')

        const unavailableItems = await validateCartItems(
          async (items: AvailabilityItem[]) =>
            validateProductAvailabilityByPickup(
              pickup.pickupPoint.id,
              items,
              zipcode!,
              countryCode!,
              account,
              salesChannel
            )
        )

        if (unavailableItems.length === 0) {
          selectPickup(pickup, canUnselect)

          if (pendingAddToCartItem) {
            await addItems(
              pendingAddToCartItem.skuItems,
              pendingAddToCartItem.options
            )

            setPendingAddToCartItem(undefined)
          }

          break
        }

        setUnavailabilityMessage(
          intl.formatMessage(
            messages.unavailableItemsModalForPickupPointDescription,
            {
              pickupLabel: selectedPickup?.pickupPoint.friendlyName,
            }
          )
        )

        setActionInterruptedByCartValidation(() => () => selectPickup(pickup))

        break
      }

      case 'SELECT_DELIVERY_SHIPPING_OPTION': {
        setUnavailabilityMessage('delivery')

        const unavailableItems = await validateCartItems(
          async (items: AvailabilityItem[]) =>
            validateProductAvailabilityByDelivery(
              zipcode!,
              countryCode!,
              items,
              account,
              salesChannel
            )
        )

        if (unavailableItems.length === 0) {
          selectDeliveryShippingOption()

          if (pendingAddToCartItem) {
            await addItems(
              pendingAddToCartItem.skuItems,
              pendingAddToCartItem.options
            )

            setPendingAddToCartItem(undefined)
          }

          break
        }

        setUnavailabilityMessage(
          intl.formatMessage(
            messages.unavailableItemsModalForDeliveryDescription,
            {
              addressLabel,
            }
          )
        )

        setActionInterruptedByCartValidation(
          () => () => selectDeliveryShippingOption()
        )

        break
      }

      case 'ABORT_UNAVAILABLE_ITEMS_ACTION': {
        resetUnavailableCartItems()
        break
      }

      case 'CONTINUE_UNAVAILABLE_ITEMS_ACTION': {
        removeUnavailableItems()
        break
      }

      case 'RESET_FULFILLMENT_METHOD': {
        if (!countryCode || !zipcode || !geoCoordinates) {
          return
        }

        // Reset fulfillment method to undefined (no selection)
        await updateSession(
          countryCode,
          zipcode,
          geoCoordinates,
          selectedPickup
          // No shipping option parameter = reset to no selection
        )

        location.reload()

        break
      }

      default:
        break
    }
  }

  const dispatch = useCallback((action: DeliveryPromiseActions) => {
    return dispatchImplRef.current(action)
  }, [])

  const areThereUnavailableCartItems = unavailableCartItems.length > 0

  return {
    dispatch,
    state: {
      zipcode,
      isLoading,
      countryCode,
      submitErrorMessage,
      city,
      pickups,
      selectedPickup,
      geoCoordinates,
      addressLabel,
      deliveryPromiseMethod,
      areThereUnavailableCartItems,
      unavailableCartItems,
      unavailabilityMessage,
      uiRegistry,
      shippingMethodModalRequestId,
    },
  }
}
