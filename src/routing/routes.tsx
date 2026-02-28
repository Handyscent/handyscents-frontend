import { NavLink, Outlet, Routes, Route } from 'react-router-dom'
import { OrderForm } from '../features/order/OrderForm'
import { ResubmissionForm } from '../features/order/ResubmissionForm'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-4 py-2 text-base font-medium ${
    isActive ? 'bg-violet-100 text-violet-800' : 'text-gray-600 hover:bg-gray-100'
  }`

const showNav = false // set true to restore nav

export function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-100">
      {showNav && (
        <nav className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="mx-auto flex max-w-5xl gap-4">
            <NavLink to="/" end className={navClass}>Order form</NavLink>
            <NavLink to="/resubmit" className={navClass}>Resubmission</NavLink>
          </div>
        </nav>
      )}
      <Outlet />
    </div>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<OrderForm />} />
        <Route path="resubmit" element={<ResubmissionForm />} />
      </Route>
    </Routes>
  )
}
