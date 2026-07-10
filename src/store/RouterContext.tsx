import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { pageFromHash, pageToHash, type PageId } from '../config/navigation'

interface RouterContextValue {
  page: PageId
  setPage: (page: PageId) => void
}

const RouterContext = createContext<RouterContextValue | null>(null)

export function RouterProvider({ children }: { children: ReactNode }) {
  const [page, setPageState] = useState<PageId>(() => pageFromHash(window.location.hash))

  useEffect(() => {
    if (window.location.hash !== pageToHash(page)) {
      window.history.replaceState({ plannerPage: page }, '', pageToHash(page))
    }

    const syncFromLocation = () => setPageState(pageFromHash(window.location.hash))
    window.addEventListener('hashchange', syncFromLocation)
    window.addEventListener('popstate', syncFromLocation)
    return () => {
      window.removeEventListener('hashchange', syncFromLocation)
      window.removeEventListener('popstate', syncFromLocation)
    }
  }, [])

  const setPage = useCallback((nextPage: PageId) => {
    const nextHash = pageToHash(nextPage)
    if (window.location.hash !== nextHash) {
      window.history.pushState({ plannerPage: nextPage }, '', nextHash)
    }
    setPageState(nextPage)
  }, [])

  return (
    <RouterContext.Provider value={{ page, setPage }}>
      {children}
    </RouterContext.Provider>
  )
}

export const useRouter = (): RouterContextValue => {
  const context = useContext(RouterContext)
  if (!context) throw new Error('useRouter must be used within RouterProvider')
  return context
}
