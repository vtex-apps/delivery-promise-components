/* eslint-disable no-restricted-globals */
import { useRuntime, useSSR } from 'vtex.render-runtime'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import { useApolloClient } from 'react-apollo'
import { useOrderItems } from 'vtex.order-items/OrderItems'
import { usePixel, usePixelEventCallback } from 'vtex.pixel-manager'
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
  validateProductAvailability,
  validateProductAvailabilityByPickup,
  validateProductAvailabilityByDelivery,
} from '../client'
import {
  getNearestPickup,
  persistPickupPreference,
  resolvePickupForShippingSession,
} from '../pickupInPointPreference'
import type { AvailabilityItem, ResolvedAddress } from '../client'
import type { CartItem, CartProduct } from '../components/UnavailableItemsModal'
import type { OrderFormCartLine } from '../modules/pixelHelper'
import { mapCartItemToPixel } from '../modules/pixelHelper'
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
import {
  clearSuppressAutoGeolocation,
  setSuppressAutoGeolocation,
} from '../modules/suppressAutoGeolocationSession'

// Local `Promise.allSettled` shim — the repo's TS lib target is `es2017`,
// which does not declare `Promise.allSettled`. The runtime supports it
// (modern browsers / Node 12+), but we wrap each promise in `Promise.all`
// to keep the type system happy without bumping the platform-managed
// tsconfig.
type SettledResult<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: unknown }

const settle = <T>(promise: Promise<T>): Promise<SettledResult<T>> =>
  promise.then(
    (value) => ({ status: 'fulfilled' as const, value }),
    (reason) => ({ status: 'rejected' as const, reason })
  )

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

  /** Stores a thunk: setState(updater) must return the callback, hence `() => () => run()`. */
  const [
    actionInterruptedByCartValidation,
    setActionInterruptedByCartValidation,
  ] = useState<(() => () => void | Promise<void | boolean>) | undefined>()

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
  const { addItems, removeItem } = useOrderItems()
  const { push } = usePixel()
  const apolloClient = useApolloClient()

  /**
   * Refreshes the storefront after a session write. The session POST sets a
   * new `vtex_segment` cookie (which carries the delivery / pickup hashes) in
   * the response, so by the time we land here every cached observable query
   * is one network round trip away from the new shopper context. We call
   * `reFetchObservableQueries(true)` to pull those refreshed payloads into
   * Apollo (productSearch, facets, suggestions, anything `@withSegment`),
   * keeping the React tree alive and avoiding a hard `location.reload()`.
   *
   * Falls back to `location.reload()` when Apollo is unavailable (e.g. the
   * provider isn't mounted in tests / custom hosts) or the refetch throws —
   * a hard reload is always a correct, if expensive, way to converge on the
   * post-session state.
   */
  const refreshStorefront = useCallback(async (): Promise<void> => {
    if (
      apolloClient &&
      typeof apolloClient.reFetchObservableQueries === 'function'
    ) {
      try {
        await apolloClient.reFetchObservableQueries(true)
        setIsLoading(false)

        return
      } catch {
        // fall through to the hard reload below
      }
    }

    location.reload()
  }, [apolloClient])

  const orderItemsUpdateOptions = {
    allowedOutdatedData: ['paymentData'] as const,
    splitItem: true,
  }

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

  // Shared pickup-state sync used by both applyPickupsResult (fetchPickups
  // consumers) and the submitZipcode session-write block. Updates the
  // pickup-related local state from a getPickups response and returns the
  // pickup that the next session write should carry (and a flag indicating
  // whether any active pickup was returned, so callers can preserve their
  // own conditional updateSession semantics).
  const syncPickupsState = useCallback(
    (
      responsePickups: { items?: Pickup[] } | null | undefined,
      selectedZipcode: string,
      shippingMethod?: ShippingMethod
    ): { pickupForSession: Pickup | undefined; hasAnyPickup: boolean } => {
      const pickupsFormatted =
        responsePickups?.items?.filter(
          (pickup: Pickup) => pickup.pickupPoint.isActive
        ) ?? []

      setPickups(pickupsFormatted)

      if (pickupsFormatted.length === 0) {
        setPickupSuggestion(undefined)
        setSelectedPickup(undefined)

        return { pickupForSession: undefined, hasAnyPickup: false }
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

      return { pickupForSession, hasAnyPickup: true }
    },
    []
  )

  // Post-fetch processing for fetchPickups consumers. When the response
  // carries no active pickups, the session write is skipped so callers
  // (segment-restoration useEffect, pendingPickupsFetch effect) keep their
  // "don't re-write an already-correct session" behavior.
  const applyPickupsResult = useCallback(
    async (
      country: string,
      selectedZipcode: string,
      coordinates: number[],
      responsePickups: { items?: Pickup[] } | null | undefined,
      shippingMethod?: ShippingMethod,
      keepLoading = false
    ) => {
      const { pickupForSession, hasAnyPickup } = syncPickupsState(
        responsePickups,
        selectedZipcode,
        shippingMethod
      )

      if (!hasAnyPickup) {
        if (!keepLoading) {
          setIsLoading(false)
        }

        return
      }

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
    [syncPickupsState]
  )

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

      await applyPickupsResult(
        country,
        selectedZipcode,
        coordinates,
        responsePickups,
        shippingMethod,
        keepLoading
      )
    },
    [account, salesChannel, applyPickupsResult]
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
    }, 8000)
  }

  const validateCartItems = async (
    validationHandler: (items: AvailabilityItem[]) => Promise<any>
  ) => {
    setIsLoading(true)

    try {
      const orderFormId = getOrderFormId()

      const orderLines = await getCartProducts(orderFormId)

      // Skip the BFF availability call entirely for empty carts.
      if (orderLines.length === 0) {
        setIsLoading(false)

        return []
      }

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
    await unavailableCartItems.reduce<Promise<void>>(
      async (previous, { product }) => {
        await previous

        const line = product as unknown as OrderFormCartLine

        push({
          event: 'removeFromCart',
          items: [mapCartItemToPixel(line)],
        })

        await removeItem({ uniqueId: line.uniqueId }, orderItemsUpdateOptions)
      },
      Promise.resolve()
    )

    const outer = actionInterruptedByCartValidation

    if (typeof outer !== 'function') {
      return
    }

    const inner = outer()

    if (typeof inner === 'function') {
      await inner()
    }
  }

  const submitZipcode = async (
    selectedZipcode: string,
    resolvedAddress: ResolvedAddress,
    reload = true
  ): Promise<boolean> => {
    if (!countryCode) {
      return false
    }

    setIsLoading(true)

    try {
      const { geoCoordinates: coordinates, city: cityName } = resolvedAddress
      const orderFormId = getOrderFormId()

      // Run the three independent calls in parallel. getCatalogCount stays
      // on the critical path (UX gate) but no longer blocks updateOrderForm
      // and getPickups behind it.
      const catalogCountPromise = getCatalogCount(selectedZipcode, coordinates)
      const updateOrderFormPromise = orderFormId
        ? updateOrderForm(countryCode, selectedZipcode, orderFormId)
        : Promise.resolve()

      const pickupsPromise = salesChannel
        ? getPickups(countryCode, selectedZipcode, account, salesChannel)
        : Promise.resolve(null)

      const [catalogCountResult, updateOrderFormResult, pickupsResult] =
        await Promise.all([
          settle(catalogCountPromise),
          settle(updateOrderFormPromise),
          settle(pickupsPromise),
        ])

      // Catalog-count rejection keeps the existing INVALID_POSTAL_CODE path.
      if (catalogCountResult.status === 'rejected') {
        throw catalogCountResult.reason
      }

      const { total } = catalogCountResult.value

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

      // updateOrderForm is best-effort: log and continue on failure.
      if (updateOrderFormResult.status === 'rejected') {
        console.error(
          'delivery-promise: updateOrderForm failed during UPDATE_ZIPCODE',
          updateOrderFormResult.reason
        )
      }

      setCity(cityName)
      setGeoCoordinates(coordinates)
      setZipCode(selectedZipcode)

      setDeliveryPromiseMethod(undefined)
      setSelectedPickup(undefined)

      // Single session write per dispatch. Pickup resolution happens before
      // the write so the single write carries the resolved pickup (or
      // undefined when there are no active pickups, when getPickups rejected,
      // or when salesChannel is not yet loaded and pickup fetching is
      // deferred).
      let pickupForSession: Pickup | undefined

      if (!salesChannel) {
        // Deferral path preserved: pendingPickupsFetch will run once the
        // session loads. The session still gets the zipcode/coordinates
        // immediately via the single write below.
        setPendingPickupsFetch({
          country: countryCode,
          selectedZipcode,
          coordinates,
          shippingMethod: undefined,
          keepLoading: true,
        })
      } else {
        const pickupsValue =
          pickupsResult.status === 'fulfilled' ? pickupsResult.value : null

        pickupForSession = syncPickupsState(
          pickupsValue,
          selectedZipcode,
          undefined
        ).pickupForSession
      }

      await updateSession(
        countryCode,
        selectedZipcode,
        coordinates,
        pickupForSession
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

    clearSuppressAutoGeolocation()

    if (effectiveReload) {
      setIsLoading(true)
      await refreshStorefront()
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
    await refreshStorefront()
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
    await refreshStorefront()
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
        const {
          zipcode: zipcodeSelected,
          reload,
          onAppliedWithoutReload,
          cartAvailability = 'deliveryorpickup',
        } = action.args

        if (!zipcodeSelected) {
          onError(
            'POSTAL_CODE_NOT_FOUND',
            intl.formatMessage(
              messages.shopperLocationPostalCodeInputPlaceholder
            )
          )

          return false
        }

        if (!countryCode) {
          return false
        }

        setIsLoading(true)

        // Resolve the address ONCE; every downstream step reuses it.
        // On failure, surface INVALID_POSTAL_CODE without attempting the
        // BFF availability call or any further getAddress retry.
        let resolvedAddress: ResolvedAddress

        try {
          resolvedAddress = await getAddress(
            countryCode,
            zipcodeSelected,
            account
          )
        } catch {
          onError(
            'INVALID_POSTAL_CODE',
            intl.formatMessage(messages.shopperLocationPostalCodeInputError)
          )

          return false
        }

        if (
          !resolvedAddress.geoCoordinates ||
          resolvedAddress.geoCoordinates.length === 0
        ) {
          onError(
            'INVALID_POSTAL_CODE',
            intl.formatMessage(messages.shopperLocationPostalCodeInputError)
          )

          return false
        }

        const validateZipCartAvailability = (
          items: AvailabilityItem[]
        ): Promise<unknown> =>
          cartAvailability === 'delivery'
            ? validateProductAvailabilityByDelivery(
                zipcodeSelected,
                countryCode,
                items,
                account,
                salesChannel,
                { address: resolvedAddress }
              )
            : validateProductAvailability(
                zipcodeSelected,
                countryCode,
                items,
                account,
                salesChannel,
                { address: resolvedAddress }
              )

        const applyZipAndFacetCallback = async () => {
          const applied = await submitZipcode(
            zipcodeSelected,
            resolvedAddress,
            reload
          )

          if (applied && reload === false && onAppliedWithoutReload) {
            // Close unavailable-items UI before client navigation so the modal is not left
            // loading if navigate interrupts the follow-up ABORT from the modal.
            await resetUnavailableCartItems()
            setActionInterruptedByCartValidation(undefined)
            setUnavailabilityMessage(undefined)
            onAppliedWithoutReload()
          }

          return applied
        }

        const unavailableItems = await validateCartItems(
          validateZipCartAvailability
        )

        if (unavailableItems.length === 0) {
          return applyZipAndFacetCallback()
        }

        setUnavailabilityMessage(
          intl.formatMessage(messages.unavailableItemsModalDescription, {
            addressLabel: zipcodeSelected,
          })
        )

        setActionInterruptedByCartValidation(
          () => () => applyZipAndFacetCallback()
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
        setActionInterruptedByCartValidation(undefined)
        setUnavailabilityMessage(undefined)
        break
      }

      case 'CONTINUE_UNAVAILABLE_ITEMS_ACTION': {
        await removeUnavailableItems()
        break
      }

      case 'RESET_FULFILLMENT_METHOD': {
        if (!countryCode || !zipcode || !geoCoordinates) {
          return
        }

        await updateSession(countryCode, zipcode, geoCoordinates, undefined)

        setIsLoading(true)
        await refreshStorefront()

        break
      }

      case 'CLEAR_ZIPCODE': {
        const orderFormId = getOrderFormId()

        setIsLoading(true)

        if (orderFormId) {
          await clearOrderFormShipping(orderFormId)
        }

        await clearShippingSession()

        setSuppressAutoGeolocation()

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

        await refreshStorefront()

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
