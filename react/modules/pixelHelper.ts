/**
 * Maps checkout orderForm lines to Pixel cart item shape (same contract as minicart).
 */
export interface OrderFormCartLine {
  id: string
  uniqueId: string
  skuName: string
  sellingPrice: number
  name: string
  quantity: number
  productId: string
  productRefId: string
  additionalInfo?: {
    brandName: string
  }
  productCategoryIds: string
  productCategories: Record<string, string>
  detailUrl: string
  imageUrl?: string
  imageUrls?: {
    at1x: string
    at2x: string
    at3x: string
  }
  refId: string
}

export interface PixelCartItem {
  skuId: string
  variant: string
  price: number
  priceIsInt: boolean
  name: string
  quantity: number
  productId: string
  productRefId: string
  brand: string
  category: string
  detailUrl: string
  imageUrl: string
  referenceId: string
}

function fixUrlProtocol(url: string) {
  if (!url || url.indexOf('http') === 0) {
    return url
  }

  return `https:${url}`
}

function getNameWithoutVariant(item: OrderFormCartLine) {
  if (
    (item?.name && !item.name.includes(item.skuName)) ||
    item.name === item.skuName
  ) {
    return item.name
  }

  const leadingSpace = 1
  const variantLength = leadingSpace + item.skuName.length

  return item.name.slice(0, item.name.length - variantLength)
}

function productCategory(item: OrderFormCartLine) {
  try {
    const categoryIds = item.productCategoryIds
      .split('/')
      .filter((c) => c.length)

    const category = categoryIds
      .map((id) => item.productCategories[id])
      .join('/')

    return category
  } catch {
    return ''
  }
}

export function mapCartItemToPixel(item: OrderFormCartLine): PixelCartItem {
  return {
    skuId: item.id,
    variant: item.skuName,
    price: item.sellingPrice,
    priceIsInt: true,
    name: getNameWithoutVariant(item),
    quantity: item.quantity,
    productId: item.productId,
    productRefId: item.productRefId,
    brand: item.additionalInfo ? item.additionalInfo.brandName : '',
    category: productCategory(item),
    detailUrl: item.detailUrl,
    imageUrl: item.imageUrls
      ? fixUrlProtocol(item.imageUrls.at3x)
      : item.imageUrl ?? '',
    referenceId: item.refId,
  }
}
