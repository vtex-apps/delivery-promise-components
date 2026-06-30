/**
 * Default VTEX trade policy / sales channel id when the session has no
 * `store.channel` value (used in the Intelligent Search pickup-point-availability URL).
 */
export const DEFAULT_TRADE_POLICY = '1'

export const DELIVER_DRAWER_PIXEL_EVENT_ID = 'shipping-option-deliver-to'
export const STORE_DRAWER_PIXEL_EVENT_ID = 'shipping-option-store'
export const SHIPPING_INFO_COOKIE = 'shipping_info'
export const PRODUCTS_NOT_FOUND_ERROR_CODE = 'products-not-found-error'
export const SHOPPER_LOCATION_MODAL_PIXEL_EVENT_ID =
  'item-added-to-cart-shipping-modal'

/**
 * GraphQL operation names (`ObservableQuery.queryName`) refetched after a
 * delivery-promise session write. Each maps to a `vtex.store-resources` export:
 *   facetsV2               ← vtex.store-resources/QueryFacetsV2               (search-result SearchQuery.js)
 *   productSearchV3        ← vtex.store-resources/QueryProductSearchV3        (search-result SearchQuery.js)
 *   Products               ← vtex.store-resources QueryProducts               (product-summary ProductSummaryList.tsx)
 *   Product                ← vtex.store-resources/QueryProduct                (PDP / product-context consumers)
 *   sponsoredProducts      ← vtex.store-resources/QuerySponsoredProducts      (search result with sponsored products)
 *   ProductRecommendations ← vtex.store-resources/QueryProductRecommendations (cross-selling / recommendations shelves)
 */
export const REFRESHABLE_QUERY_NAMES: readonly string[] = [
  'facetsV2',
  'productSearchV3',
  'Products',
  'Product',
  'sponsoredProducts',
  'ProductRecommendations',
]

/**
 * Per-query variable overrides applied on top of each query's existing
 * variables at refetch time. Each entry is a function of the query's current
 * variables so the override can be computed from them.
 *
 * A location change invalidates the current pagination position, so
 * `productSearchV3` resets to the first page. `search-result` derives the
 * window as `from = (page - 1) * maxItemsPerPage` and `to = from + size - 1`,
 * so page 1 is `from: 0, to: size - 1`. The page size is preserved from the
 * current window (`to - from + 1`), giving `to: to - from`.
 */
export const QUERY_VARIABLE_OVERRIDES: Partial<
  Record<
    string,
    (variables: Record<string, unknown>) => Record<string, unknown>
  >
> = {
  productSearchV3: (variables) => {
    const from = typeof variables.from === 'number' ? variables.from : 0
    const to = typeof variables.to === 'number' ? variables.to : undefined

    return to !== undefined ? { from: 0, to: to - from } : { from: 0 }
  },
}
