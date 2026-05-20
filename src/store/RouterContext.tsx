import { createContext, useContext, useState, type ReactNode } from 'react'

type PageId =
  | 'dashboard' | 'habits' | 'tasks' | 'goals' | 'projects'
  | 'weekly' | 'daily' | 'notes' | 'journal' | 'profile'

interface RouterContextValue {
  page: PageId
  setPage: (page: PageId) => void
}

const RouterContext = createContext<RouterContextValue | null>(null)

export function RouterProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageId>('dashboard')
  return (
    <RouterContext.Provider value={{ page, setPage }}>
      {children}
    </RouterContext.Provider>
  )
}

export const useRouter = (): RouterContextValue => {
  const ctx = useContext(RouterContext)
  if (!ctx) throw new Error('useRouter must be used within RouterProvider')
  return ctx
}
