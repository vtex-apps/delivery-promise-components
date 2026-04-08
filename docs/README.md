📢 Use this project, [contribute](https://github.com/{OrganizationName}/{AppName}) to it, or open issues to help evolve it through [Store Discussion](https://github.com/vtex-apps/store-discussion).

# Delivery Promise Components

<!-- DOCS-IGNORE:start -->
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->

[![All Contributors](https://img.shields.io/badge/all_contributors-0-orange.svg?style=flat-square)](#contributors-)

<!-- ALL-CONTRIBUTORS-BADGE:END -->
<!-- DOCS-IGNORE:end -->

[<i class="fa-brands fa-github"></i> Source code](https://github.com/vtex-apps/delivery-promise-components)

> ⚠️ The Delivery Promise Components app is available only for stores using [Delivery Promise](https://help.vtex.com/en/tutorial/delivery-promise-beta--p9EJH9GgxL0JceA6dBswd). This feature is currently in closed beta, meaning only select customers can access it. If you are interested in implementing it in the future, please contact our [Support](https://support.vtex.com/hc/en-us) team.
>
> For more information on setting up Delivery Promise components on Store Framework, see the [developer documentation](https://developers.vtex.com/docs/guides/setting-up-delivery-promise-components).

The Delivery Promise Components app exposes blocks that let shoppers set a postal code, choose delivery versus pickup, and pick a pickup point. Shoppers can use geolocation (when enabled) or enter a postal code manually. The store should wrap the theme with `DeliveryPromiseProvider` (for example via `store`’s `StoreWrapper`) so every block shares the same session state.

Merchants control whether postal code and shipping method are optional or required per block. The shopper must have a valid postal code for Delivery Promise to apply; required shipping method blocks keep the method modal open until a choice is made.

![delivery-promise-components](https://vtexhelp.vtexassets.com/assets/docs/src/shipping-option-components___c5a1d86b0ebf692a3eb9ca49f79b55f8.png)

## Configuration

### Adding the Delivery Promise Components app to your theme dependencies

Add the `delivery-promise-components` app to your theme dependencies in the `manifest.json` as shown below:

```json
  "dependencies": {
    "vtex.delivery-promise-components": "0.x"
  }
```

You can now use all blocks exported by the `delivery-promise-components` app. Use **one instance per block** in the theme (no ref-counting; the last mounted block of each type wins if duplicates exist).

| Block name                   | Description                                                                 |
| ---------------------------- | --------------------------------------------------------------------------- |
| `shopper-location-setter`    | Postal code control: popover when optional, blocking modal when `required`. |
| `shipping-method-selector`   | Delivery vs pickup modal (after a postal code exists).                     |
| `pickup-point-selector`      | Pickup point choice (when applicable).                                     |
| `availability-badges`        | Product-summary badges driven by delivery promise data.                      |

### Adding blocks to the theme

Place the blocks where you need them (commonly under [header](https://developers.vtex.com/docs/apps/vtex.store-header) rows). Example:

```json
"header-row#1-desktop": {
  "children": [
    "shopper-location-setter",
    "shipping-method-selector",
    "pickup-point-selector"
  ]
},

"shopper-location-setter": {
  "props": {
    "required": false,
    "mode": "default",
    "showLocationDetectorButton": true
  }
},

"shipping-method-selector": {
  "props": {
    "required": false,
    "mode": "default",
    "shippingSelection": "delivery-and-pickup"
  }
},

"pickup-point-selector": {
  "props": {
    "mode": "default"
  }
}
```

### Behavior: reload after postal code, registry, and shipping-method modal

- **Reload policy:** After a successful postal code update, the app may call `location.reload()` when the flow asks for reload. If a `shipping-method-selector` block is mounted with **`required: true`**, reload is **deferred** until after the shopper picks a method (session and local state still update without reloading). After the shopper selects delivery or pickup (or resets in flows that reload), the existing reload behavior applies.
- **UI registry:** On mount, `shopper-location-setter` registers `REGISTER_SHOPPER_LOCATION_BLOCK` and `shipping-method-selector` registers `REGISTER_SHIPPING_METHOD_BLOCK` with their `required` flags. The hook uses this registry for `effectiveReload` and for coordinating the shipping-method modal.
- **Opening the shipping-method modal from another block:** The context increments `shippingMethodModalRequestId` when `REQUEST_OPEN_SHIPPING_METHOD_MODAL` runs—either from the hook after postal code submit (required shipping, location **not** in the “both required” pair) or from `shopper-location-setter` after CEP completes when **both** blocks are `required` (see below). The `shipping-method-selector` opens its modal when the id changes and a postal code is present.
- **Strict sequence when both are required:** If **both** `shopper-location-setter` and `shipping-method-selector` use `required: true`, the shipping-method modal is **not** requested at postal-code submit time. It is requested only **after** a valid postal code exists and the location flow has finished (so the method modal does not stack on top of the postal code modal).
- **Optional postal code + required method:** Once a postal code exists, the shipping-method modal may open automatically. With `required: true` on `shipping-method-selector`, the modal is **non-dismissible** until `deliveryPromiseMethod` is set.

### Block props

#### `shopper-location-setter`

| Prop name                    | Type      | Description                                                                 |
| ---------------------------- | --------- | --------------------------------------------------------------------------- |
| `required`                   | `boolean` | If `true`, blocking postal code modal until valid code. If `false`, popover flow. Default `false`. |
| `mode`                       | `enum`    | `default` or `icon`.                                                        |
| `showLocationDetectorButton` | `boolean` | Shows geolocation control in the postal code UI. Default `false`.           |

#### `shipping-method-selector`

| Prop name            | Type      | Description                                                                 |
| -------------------- | --------- | --------------------------------------------------------------------------- |
| `required`           | `boolean` | If `true`, modal cannot be dismissed until a method is chosen (after postal code exists). Default `false`. |
| `mode`               | `enum`    | `default` or `icon`.                                                        |
| `shippingSelection`  | `enum`    | `delivery-and-pickup` or `only-pickup`.                                     |

#### `pickup-point-selector`

| Prop name | Type   | Description          |
| --------- | ------ | -------------------- |
| `mode`    | `enum` | `default` or `icon`. |

#### `availability-badges`

No content schema; add the block in product-summary templates as documented in `docs/AvailabilityBadges.md`.

### Global UI

`UnavailableItemsModal` is rendered once inside `DeliveryPromiseProvider` (not inside each block).

### Optional React exports (e.g. PLP / search)

The default `PickupModal` block is wired to `DeliveryPromiseProvider` and session updates. For integrations that need **only the UI** (controlled zip and pickup list, no `UPDATE_ZIPCODE` / session side effects), import **`PickupModalPresentational`** from `vtex.delivery-promise-components`. Supporting modules such as **`pickupSearchClient`** / **`pickupInPointPreference`** are available for fetching pickup points and persisting pickup-in-point preferences in the host app.

## Customization

In order to apply CSS customizations in this and other blocks, follow the instructions given in the recipe on [Using CSS Handles for store customization](https://vtex.io/docs/recipes/style/using-css-handles-for-store-customization).

| CSS Handles                              |
| ---------------------------------------- |
| `shopperLocationPopover`                 |
| `shopperLocationPopoverArrow`            |
| `shopperLocationPopoverInputContainer`   |
| `shopperLocationPopoverText`             |
| `shopperLocationDetectorButton`          |
| `shopperLocationDetectorButtonContainer` |
| `shopperLocationDetectorButtonIcon`      |
| `noPickupPointStateContent`              |
| `pickupPointItem`                        |
| `pickupPointItemSelected`                |
| `pickupPointIconPath`                    |
| `pickupPointIconSVG`                     |
| `pickupPointSelectorButtonValue`         |
| `pickupPointSelectorButtonWrapper`       |
| `pickupPointSelectorContainer`           |
| `postalCodeHelpLink`                     |
| `postalCodeInputClearButton`             |
| `postalCodeInputContainer`               |
| `shippingMethodModalOptions`             |
| `shippingMethodOptionButton`             |
| `shippingMethodOptionButtonSelected`     |
| `shippingMethodSelector`                 |
| `shippingMethodSelectorLabel`            |
| `shippingMethodSelectorLabelLimited`     |
| `shopperLocationPinIconPath`             |
| `shopperLocationPinIconSVG`              |
| `shopperLocationSetterButtonLabel`       |
| `shopperLocationSetterButtonValue`       |
| `shopperLocationSetterButtonWrapper`     |
| `shopperLocationSetterContainer`         |

<!-- DOCS-IGNORE:start -->

## Contributors ✨

Special thanks to these wonderful people:

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind are welcome!

<!-- DOCS-IGNORE:end -->
