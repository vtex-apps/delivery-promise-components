import { removePageQueryParam } from '../modules/removePageQueryParam'

describe('removePageQueryParam', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('removes the page param, preserves the other params, and returns the previous page', () => {
    window.history.replaceState({}, '', '/category?page=3&q=shoes&map=c')

    const previousPage = removePageQueryParam()

    const { searchParams } = new URL(window.location.href)

    expect(previousPage).toBe(3)
    expect(searchParams.has('page')).toBe(false)
    expect(searchParams.get('q')).toBe('shoes')
    expect(searchParams.get('map')).toBe('c')
    expect(window.location.pathname).toBe('/category')
  })

  it('is a no-op and returns 1 when there is no page param', () => {
    window.history.replaceState({}, '', '/category?q=shoes')

    const previousPage = removePageQueryParam()

    expect(previousPage).toBe(1)
    expect(window.location.search).toBe('?q=shoes')
  })

  it('returns 1 for an invalid page value', () => {
    window.history.replaceState({}, '', '/category?page=abc')

    expect(removePageQueryParam()).toBe(1)
  })
})
