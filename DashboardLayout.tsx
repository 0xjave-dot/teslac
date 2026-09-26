import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="flex bg-navy-base min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 min-w-0 min-h-screen flex flex-col lg:ml-56">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 min-w-0 w-full py-8 px-4 sm:px-6 lg:px-8 overflow-auto">
          <div key={location.pathname} className="page-transition min-w-0 w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}





