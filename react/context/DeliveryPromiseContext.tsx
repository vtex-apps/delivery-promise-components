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

export interface State {
  zipcode?: string
  pickups: Pickup[]
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
}

interface UpdateZipCode {
  type: 'UPDATE_ZIPCODE'
  args: { zipcode: string; reload?: boolean }
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

export type DeliveryPromiseActions =
  | UpdateZipCode
  | UpdatePickup
  | SelectDeliveryShippingOption
  | AbortUnavailableItemsAction
  | ContinueUnavailableItemsAction
  | ResetFulfillmentMethod

const DEFAULT_STATE: State = {
  pickups: [],
  isLoading: true,
  areThereUnavailableCartItems: false,
  unavailableCartItems: [],
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
