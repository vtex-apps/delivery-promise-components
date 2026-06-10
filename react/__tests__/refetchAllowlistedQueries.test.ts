import { refetchAllowlistedQueries } from '../modules/refetchAllowlistedQueries'

type FakeObservableQuery = {
  queryName?: string
  variables?: Record<string, unknown>
  refetch: jest.Mock
}

const oq = (
  queryName: string | undefined,
  variables: Record<string, unknown> = {}
): FakeObservableQuery => ({
  queryName,
  variables,
  refetch: jest.fn().mockResolvedValue({}),
})

const clientWith = (entries: Array<[string, FakeObservableQuery | null]>) =>
  ({
    queryManager: {
      queries: new Map(
        entries.map(([id, observableQuery]) => [id, { observableQuery }])
      ),
    },
  } as never)

describe('refetchAllowlistedQueries', () => {
  it('refetches only allowlisted observable queries', async () => {
    const facets = oq('facetsV2')
    const search = oq('productSearchV3', { query: 'x', from: 24, to: 47 })
    const products = oq('Products')
    const unrelated = oq('productPriceRange')

    const result = await refetchAllowlistedQueries(
      clientWith([
        ['a', facets],
        ['b', search],
        ['c', products],
        ['d', unrelated],
      ])
    )

    expect(facets.refetch).toHaveBeenCalledTimes(1)
    expect(search.refetch).toHaveBeenCalledTimes(1)
    expect(products.refetch).toHaveBeenCalledTimes(1)
    expect(unrelated.refetch).not.toHaveBeenCalled()
    expect(result).toEqual({ attempted: 3, failed: false })
  })

  it('resets productSearchV3 to the first page (from: 0, to: page size - 1) preserving other variables', async () => {
    // Page 2 of size 24 (from: 24, to: 47) → page 1 keeps the size: from 0, to 23.
    const search = oq('productSearchV3', {
      query: 'shoes',
      from: 24,
      to: 47,
      orderBy: 'OrderByScoreDESC',
    })

    await refetchAllowlistedQueries(clientWith([['b', search]]))

    expect(search.refetch).toHaveBeenCalledWith({
      query: 'shoes',
      from: 0,
      to: 23,
      orderBy: 'OrderByScoreDESC',
    })
  })

  it('resets productSearchV3 with only from when to is absent', async () => {
    const search = oq('productSearchV3', { query: 'shoes', from: 24 })

    await refetchAllowlistedQueries(clientWith([['b', search]]))

    expect(search.refetch).toHaveBeenCalledWith({ query: 'shoes', from: 0 })
  })

  it('refetches non-paginated allowlisted queries without variable overrides', async () => {
    const facets = oq('facetsV2', { query: 'x' })

    await refetchAllowlistedQueries(clientWith([['a', facets]]))

    expect(facets.refetch).toHaveBeenCalledWith(undefined)
  })

  it('returns attempted:0, failed:false when no allowlisted query is mounted', async () => {
    const result = await refetchAllowlistedQueries(
      clientWith([['c', oq('productPriceRange')]])
    )

    expect(result).toEqual({ attempted: 0, failed: false })
  })

  it('reports failed:true when the query manager internals are inaccessible', async () => {
    expect(await refetchAllowlistedQueries({} as never)).toEqual({
      attempted: 0,
      failed: true,
    })

    expect(
      await refetchAllowlistedQueries({ queryManager: {} } as never)
    ).toEqual({ attempted: 0, failed: true })
  })

  it('reports failed:true when a refetch rejects, while still attempting it', async () => {
    const search = oq('productSearchV3', { from: 0 })

    search.refetch.mockRejectedValueOnce(new Error('network'))

    const result = await refetchAllowlistedQueries(clientWith([['b', search]]))

    expect(result.attempted).toBe(1)
    expect(result.failed).toBe(true)
  })

  it('skips entries whose observableQuery is null or missing a refetch', async () => {
    const facets = oq('facetsV2')

    const result = await refetchAllowlistedQueries(
      clientWith([
        ['x', null],
        ['a', facets],
      ])
    )

    expect(facets.refetch).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ attempted: 1, failed: false })
  })
})
