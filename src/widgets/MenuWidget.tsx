import { NAV_ITEMS } from '../config/navigation'
import { useRouter } from '../store/RouterContext'

export const meta = {
  id: 'menu',
  name: '메뉴',
  icon: 'menu',
  defaultW: 6,
  defaultH: 8,
  minW: 4,
  minH: 4,
  order: 10,
}

export default function MenuWidget() {
  const { setPage } = useRouter()

  return (
    <div className="widget-menu-list">
      {NAV_ITEMS.map(item => {
        const Icon = item.icon
        return (
          <button key={item.id} type="button" onClick={() => setPage(item.id)}>
            <Icon size={15} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
