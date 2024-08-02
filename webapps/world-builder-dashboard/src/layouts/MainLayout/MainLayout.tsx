// React and related libraries
import React from 'react'
import { Outlet } from 'react-router-dom'
// Styles
import styles from './MainLayout.module.css'
import IconDroplets02 from '@/assets/IconDroplets02'
import IconWallet04 from '@/assets/IconWallet04'
// Local components and assets
import DesktopSidebar from '@/layouts/MainLayout/DesktopSidebar'
import MobileSidebar from '@/layouts/MainLayout/MobileSidebar'
import { useMediaQuery } from '@mantine/hooks'

interface MainLayoutProps {}

const NAVIGATION_ITEMS = [
  { name: 'bridge', navigateTo: '/bridge', icon: <IconWallet04 /> },
  { name: 'faucet', navigateTo: '/faucet', icon: <IconDroplets02 /> }
]
const MainLayout: React.FC<MainLayoutProps> = ({}) => {
  const smallView = useMediaQuery('(max-width: 767px)')
  return (
    <div className={styles.container}>
      {smallView ? <MobileSidebar /> : <DesktopSidebar navigationItems={NAVIGATION_ITEMS} />}
      <Outlet />
    </div>
  )
}

export default MainLayout
