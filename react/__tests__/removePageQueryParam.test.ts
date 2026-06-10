import { removePageQueryParam } from '../modules/removePageQueryParam'

describe('removePageQueryParam', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('removes the page param while preserving the other query-string params', () => {
    window.history.replaceState({}, '', '/category?page=3&q=shoes&map=c')

    removePageQueryParam()

    const { searchParams } = new URL(window.location.href)

    expect(searchParams.has('page')).toBe(false)
    expect(searchParams.get('q')).toBe('shoes')
    expect(searchParams.get('map')).toBe('c')
    expect(window.location.pathname).toBe('/category')
  })

  it('is a no-op when there is no page param', () => {
    window.history.replaceState({}, '', '/category?q=shoes')

    removePageQueryParam()

    expect(window.location.search).toBe('?q=shoes')
  })
})
