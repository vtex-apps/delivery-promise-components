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
  clearOrderFormShipping,
  updateSession,
  clearShippingSession,
  getCartProducts,
  orderFormItemsToAvailabilityItems,
  removeCartProductsById,
  validateProductAvailability,
  validateProductAvailabilityByPickup,
  validateProductAvailabilityByDelivery,
} from '../client'
import {
  getNearestPickup,
  persistPickupPreference,
  resolvePickupForShippingSession,
} from '../pickupInPointPreference'
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
  const [pickupSuggestion, setPickupSuggestion] = useState<Pickup>()
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
    (action: DeliveryPromiseActions) => Promise<boolean | undefined>
  >(async () => undefined)

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
        setPickupSuggestion(undefined)
        setSelectedPickup(undefined)

        if (!keepLoading) {
          setIsLoading(false)
        }

        return
      }

      const nearest = getNearestPickup(pickupsFormatted)

      setPickupSuggestion(nearest)

      const segmentPickupId = getFacetsData('pickupPoint')
      const pickupForSession = resolvePickupForShippingSession(
        pickupsFormatted,
        selectedZipcode,
        segmentPickupId,
        shippingMethod
      )

      setSelectedPickup(pickupForSession)

      await updateSession(
        country,
        selectedZipcode,
        coordinates,
        pickupForSession,
        shippingMethod
      )

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

    const { country, selectedZipcode, coordinates, shippingMethod } =
      pendingPickupsFetch

    setPendingPickupsFetch(null)
    fetchPickups(country, selectedZipcode, coordinates, shippingMethod, false)
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

  const submitZipcode = async (
    selectedZipcode: string,
    reload = true
  ): Promise<boolean> => {
    if (!selectedZipcode) {
      onError(
        'POSTAL_CODE_NOT_FOUND',
        intl.formatMessage(messages.shopperLocationPostalCodeInputPlaceholder)
      )

      return false
    }

    if (!countryCode) {
      return false
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

        return false
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

        return false
      }

      const orderFormId = getOrderFormId()

      if (orderFormId) {
        await updateOrderForm(countryCode, selectedZipcode, orderFormId)
      }

      setCity(cityName)
      setGeoCoordinates(coordinates)
      setZipCode(selectedZipcode)

      setDeliveryPromiseMethod(undefined)
      setSelectedPickup(undefined)

      await updateSession(countryCode, selectedZipcode, coordinates, undefined)

      await fetchPickups(
        countryCode,
        selectedZipcode,
        coordinates,
        undefined,
        true
      )
    } catch {
      onError(
        'INVALID_POSTAL_CODE',
        intl.formatMessage(messages.shopperLocationPostalCodeInputError)
      )

      return false
    }

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
      setIsLoading(true)
      location.reload()
    }

    return true
  }

  const selectPickup = async (pickup: Pickup, canUnselect = true) => {
    if (!countryCode || !zipcode || !geoCoordinates) {
      return
    }

    let shippingOption: ShippingMethod | undefined = 'pickup-in-point'
    let pickupUpdated: Pickup | undefined = pickup

    if (
      canUnselect &&
      deliveryPromiseMethod === 'pickup-in-point' &&
      pickup.pickupPoint.id === selectedPickup?.pickupPoint.id
    ) {
      shippingOption = undefined
      pickupUpdated = undefined
    }

    setSelectedPickup(pickupUpdated)

    if (
      shippingOption === 'pickup-in-point' &&
      pickupUpdated?.pickupPoint?.id
    ) {
      persistPickupPreference(pickupUpdated, zipcode!)
    }

    await updateSession(
      countryCode,
      zipcode!,
      geoCoordinates!,
      pickupUpdated,
      shippingOption
    )

    setIsLoading(true)
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
      undefined,
      'delivery'
    )

    setIsLoading(true)
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
          const applied = await submitZipcode(zipcodeSelected, reload)

          return applied
        }

        setUnavailabilityMessage(
          intl.formatMessage(messages.unavailableItemsModalDescription, {
            addressLabel,
          })
        )

        setActionInterruptedByCartValidation(
          () => () => submitZipcode(zipcodeSelected, reload)
        )

        return false
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

        await updateSession(countryCode, zipcode, geoCoordinates, undefined)

        setIsLoading(true)
        location.reload()

        break
      }

      case 'CLEAR_ZIPCODE': {
        const orderFormId = getOrderFormId()

        setIsLoading(true)

        if (orderFormId) {
          await clearOrderFormShipping(orderFormId)
        }

        await clearShippingSession()

        setZipCode(undefined)
        setCity(undefined)
        setGeoCoordinates(undefined)
        setPickups([])
        setSelectedPickup(undefined)
        setDeliveryPromiseMethod(undefined)
        setAddressLabel(undefined)
        setSubmitErrorMessage(undefined)
        setUnavailableCartItems([])
        setUnavailabilityMessage(undefined)
        setActionInterruptedByCartValidation(undefined)

        location.reload()

        break
      }

      default:
        break
    }

    return undefined
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
      pickupSuggestion,
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
