import type { ReactNode } from 'react'
import React, { createContext, useContext } from 'react'

import ErrorBoundary from './ErrorBoundary'
import { DeliveryPromiseProviderCore } from './DeliveryPromiseProviderCore'
import type { CartItem } from '../components/UnavailableItemsModal'

export type ShippingMethod = 'delivery' | 'pickup-in-point'

export type ZipCodeError = {
  code: string
  message: string
}

export type DeliveryPromiseUiRegistry = {
  shopperLocation?: { required: boolean }
  shippingMethod?: { required: boolean }
}

export interface State {
  zipcode?: string
  pickups: Pickup[]
  /** Closest pickup to the current zip (from API distance); used for PLP label when nothing is selected. */
  pickupSuggestion?: Pickup
  selectedPickup?: Pickup
  geoCoordinates?: number[]
  countryCode?: string
  city?: string
  isLoading: boolean
  deliveryPromiseMethod?: ShippingMethod
  addressLabel?: string
  submitErrorMessage?: ZipCodeError
  areThereUnavailableCartItems: boolean
  unavailableCartItems: CartItem[]
  unavailabilityMessage?: string
  uiRegistry: DeliveryPromiseUiRegistry
  /** Increments when something requests the shipping-method modal to open (for sibling blocks). */
  shippingMethodModalRequestId: number
}

interface UpdateZipCode {
  type: 'UPDATE_ZIPCODE'
  args: {
    zipcode: string
    reload?: boolean
    /** When reload is false (e.g. PLP facet navigation), run after zip is applied — including after “remove unavailable items”. */
    onAppliedWithoutReload?: () => void
    /**
     * Cart availability check before applying zip. PLP postal facet uses `delivery` (BFF `/availability/delivery`);
     * header / ShopperLocationSetter uses default `deliveryorpickup` (`/availability/deliveryorpickup`).
     */
    cartAvailability?: 'delivery' | 'deliveryorpickup'
  }
}

interface UpdatePickup {
  type: 'UPDATE_PICKUP'
  args: { pickup: Pickup; canUnselect?: boolean }
}

interface SelectDeliveryShippingOption {
  type: 'SELECT_DELIVERY_SHIPPING_OPTION'
}

interface AbortUnavailableItemsAction {
  type: 'ABORT_UNAVAILABLE_ITEMS_ACTION'
}

interface ContinueUnavailableItemsAction {
  type: 'CONTINUE_UNAVAILABLE_ITEMS_ACTION'
}

interface ResetFulfillmentMethod {
  type: 'RESET_FULFILLMENT_METHOD'
}

interface RegisterShopperLocationBlock {
  type: 'REGISTER_SHOPPER_LOCATION_BLOCK'
  args: { required: boolean }
}

interface UnregisterShopperLocationBlock {
  type: 'UNREGISTER_SHOPPER_LOCATION_BLOCK'
}

interface RegisterShippingMethodBlock {
  type: 'REGISTER_SHIPPING_METHOD_BLOCK'
  args: { required: boolean }
}

interface UnregisterShippingMethodBlock {
  type: 'UNREGISTER_SHIPPING_METHOD_BLOCK'
}

interface RequestOpenShippingMethodModal {
  type: 'REQUEST_OPEN_SHIPPING_METHOD_MODAL'
}

interface ClearZipCode {
  type: 'CLEAR_ZIPCODE'
}

export type DeliveryPromiseActions =
  | UpdateZipCode
  | UpdatePickup
  | SelectDeliveryShippingOption
  | AbortUnavailableItemsAction
  | ContinueUnavailableItemsAction
  | ResetFulfillmentMethod
  | RegisterShopperLocationBlock
  | UnregisterShopperLocationBlock
  | RegisterShippingMethodBlock
  | UnregisterShippingMethodBlock
  | RequestOpenShippingMethodModal
  | ClearZipCode

const DEFAULT_STATE: State = {
  pickups: [],
  isLoading: true,
  areThereUnavailableCartItems: false,
  unavailableCartItems: [],
  uiRegistry: {},
  shippingMethodModalRequestId: 0,
}

const DeliveryPromiseStateContext = createContext<State>(DEFAULT_STATE)
const DeliveryPromiseDispatchContext = createContext(
  (_: DeliveryPromiseActions) => {}
)

interface Props {
  children?: ReactNode
}

const DeliveryPromiseProvider = ({ children }: Props) => {
  return (
    <ErrorBoundary fallback={children}>
      <DeliveryPromiseProviderCore>{children}</DeliveryPromiseProviderCore>
    </ErrorBoundary>
  )
}

const useDeliveryPromiseState = () => useContext(DeliveryPromiseStateContext)

const useDeliveryPromiseDispatch = () =>
  useContext(DeliveryPromiseDispatchContext)

export {
  DeliveryPromiseProvider,
  useDeliveryPromiseState,
  useDeliveryPromiseDispatch,
  DeliveryPromiseStateContext,
  DeliveryPromiseDispatchContext,
}
