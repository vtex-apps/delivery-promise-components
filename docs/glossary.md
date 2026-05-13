<!-- managed-by: golden-path v1 -->
# Glossary — delivery-promise-components

Domain terms used across this app, its documentation, and the Delivery Promise platform.

| Term | Definition |
|---|---|
| **Delivery Promise** | VTEX platform service that provides real-time delivery and pickup availability based on a shopper's location. Currently in closed beta. |
| **Postal code (CEP)** | A location identifier entered by the shopper or detected via geolocation. Required for Delivery Promise to determine available shipping options. |
| **Shopper location** | The postal code (and optionally geolocation-derived address) that identifies where a shopper wants items delivered or where they will pick them up. |
| **Shipping method** | The fulfillment mode chosen by the shopper: **delivery** (shipped to address) or **pickup** (collected at a physical point). |
| **Pickup point** | A physical store or collection point where shoppers can retrieve their order. Displayed and selectable via `pickup-point-selector`. |
| **Regionalization** | The VTEX platform feature that filters catalog availability and pricing based on the shopper's location. Required for Delivery Promise components to work correctly. |
| **`DeliveryPromiseProvider`** | The React context provider that wraps the store (e.g., via `StoreWrapper`) and shares delivery promise state across all blocks. |
| **`DeliveryPromiseContext`** | The internal React context exposed by `DeliveryPromiseProvider`; holds `postalCode`, `deliveryPromiseMethod`, `shippingMethodModalRequestId`, and related state. |
| **effectiveReload** | Whether a successful postal code submission should trigger `location.reload()`. Deferred when a required `shipping-method-selector` is mounted. |
| **Block registry** | Runtime record of mounted blocks and their `required` flags. `shopper-location-setter` registers `REGISTER_SHOPPER_LOCATION_BLOCK`; `shipping-method-selector` registers `REGISTER_SHIPPING_METHOD_BLOCK`. |
| **`shippingMethodModalRequestId`** | Incrementing counter in context; `shipping-method-selector` opens its modal when this value changes and a postal code is present. |
| **`PickupModalPresentational`** | Exported controlled component for integrations that need only the pickup UI without `UPDATE_ZIPCODE` or session side effects. |
| **`pickupSearchClient`** | Exported utility for fetching pickup points from the platform. |
| **`pickupInPointPreference`** | Exported utility for persisting a shopper's pickup-in-point preference in the host app. |
| **vtex-test-tools** | VTEX's Jest wrapper (`@vtex/test-tools`) used for the React builder test suite. |
| **Toolbelt** | The VTEX CLI (`vtex`). Used for authentication, workspace management, `vtex link`, `vtex publish`, and `vtex deploy`. |
| **Builder** | A VTEX IO platform module that validates and packages a specific folder (e.g., `react`, `store`, `messages`) into the platform app. |
| **`vtex link`** | Toolbelt command that uploads the app to the active development workspace and starts a file-watch loop. |
| **CSS handles** | Stable class name anchors exported by the app for store theme CSS customization. Defined in the React components and documented in `docs/README.md`. |
