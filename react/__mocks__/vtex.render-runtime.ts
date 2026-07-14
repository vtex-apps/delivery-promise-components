let query: Record<string, unknown> = {}
let culture: { country?: string } | undefined
const setQuery = jest.fn((val: Record<string, unknown>) => {
  query = val
})

export const setMockCountry = (country: string | undefined) => {
  culture = country ? { country } : undefined
}

export const useRuntime = jest.fn(() => ({
  query,
  culture,
  hints: {
    mobile: false,
    desktop: true,
  },
  setQuery,
}))

export const useSSR = jest.fn(() => ({
  isSSR: false,
}))

afterEach(() => {
  query = {}
  culture = undefined
  setQuery.mockClear()
})
