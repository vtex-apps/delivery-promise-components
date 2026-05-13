<!-- managed-by: golden-path v1 -->
# Data Model — delivery-promise-components

This document describes the main entities and relationships managed by this app.
The app does not own a persistent data store; all state is either session-scoped
(VTEX Session) or transient (React context / component state).

---

## Store Framework Blocks

Declared in `store/interfaces.json`. Each block maps to one React component.

| Block | Component | Content Schema Props |
|---|---|---|
| `shopper-location-setter` | `ShopperLocationSetter` | `required: boolean`, `mode: "default"\|"icon"`, `showLocationDetectorButton: boolean` |
| `shipping-method-selector` | `ShippingMethodSelector` | `required: boolean`, `mode: "default"\|"icon"` |
| `pickup-point-selector` | `PickupPointSelector` | `mode: "default"\|"icon"` |
| `availability-badges` | `AvailabilityBadges` | *(no explicit props; reads ProductSummaryContext)* |

---

## React Context State (`DeliveryPromiseContext`)

Managed by `DeliveryPromiseContext.tsx` and shared across all blocks via `DeliveryPromiseProvider`.

| Field | Type | Description |
|---|---|---|
| `postalCode` | `string \| null` | Current shopper postal code. Drives all Delivery Promise queries. |
| `deliveryPromiseMethod` | `"delivery" \| "pickup" \| null` | Shipping method chosen by the shopper. |
| `shippingMethodModalRequestId` | `number` | Incremented to signal `shipping-method-selector` to open its modal. |
| `registeredBlocks` | `{ shopperLocation?: { required: boolean }; shippingMethod?: { required: boolean } }` | Registry of mounted blocks and their `required` flags; drives reload and sequencing logic. |

---

## Block Registry Actions

| Action | Registered By | Effect |
|---|---|---|
| `REGISTER_SHOPPER_LOCATION_BLOCK` | `ShopperLocationSetter` | Adds entry to registry with `required` flag. |
| `REGISTER_SHIPPING_METHOD_BLOCK` | `ShippingMethodSelector` | Adds entry to registry with `required` flag. |
| `REQUEST_OPEN_SHIPPING_METHOD_MODAL` | Hook / `ShopperLocationSetter` (post postal-code) | Increments `shippingMethodModalRequestId`. |
| `UPDATE_ZIPCODE` | `ShopperLocationSetter` | Writes postal code to VTEX Session and context. May trigger `effectiveReload`. |

---

## VTEX Platform Integrations

| Platform entity | How used |
|---|---|
| **VTEX Session** | Source of truth for `postalCode` and `deliveryPromiseMethod` across the storefront. Written via `vtex.session-client`. |
| **Order Items** | Read via `vtex.order-items` to check cart items when computing unavailability. |
| **Product Summary Context** | Read by `AvailabilityBadges` to get delivery promise data for the current product in a shelf. |
| **Address Form** | Used inside postal code input components via `vtex.address-form`. |
| **Device Detector** | Used to adapt UI layout for mobile/desktop contexts. |
| **Pixel Manager** | Fires analytics events on delivery promise interactions. |

---

## i18n Messages

Managed in `messages/`. The reference locale is `en` (`messages/en.json`).
All other locales must have an equivalent key set, enforced by `intl-equalizer`
(`yarn lint:locales`).

Key namespace: `store/delivery-promise-components.*`

---

## CSS Handles

Stable class anchors for store theme customization. Full list in `docs/README.md` under the
**Customization** section. Handles follow the naming pattern `<componentName><Element>`.
