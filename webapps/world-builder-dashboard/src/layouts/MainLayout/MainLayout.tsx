// React and related libraries
import React from 'react'
import { Outlet } from 'react-router-dom'

// Styles
import styles from './MainLayout.module.css'

// Local components and assets
import IconDroplets02 from '@/assets/IconDroplets02'
import StakerIcon from '@/assets/StakerIcon'
import IconWallet04 from '@/assets/IconWallet04'
import DesktopSidebar from '@/layouts/MainLayout/DesktopSidebar'
import MobileSidebar from '@/layouts/MainLayout/MobileSidebar'
import { useMediaQuery } from '@mantine/hooks'

interface MainLayoutProps {}

const NAVIGATION_ITEMS = [
  { name: 'bridge', navigateTo: '/bridge', icon: <IconWallet04 /> },
  { name: 'faucet', navigateTo: '/faucet', icon: <IconDroplets02 /> },
  { name: 'staker', navigateTo: '/staker', icon: <StakerIcon /> }
]
const MainLayout: React.FC<MainLayoutProps> = ({}) => {
  const smallView = useMediaQuery('(max-width: 1199px)')
  return (
    <div className={styles.container}>
      {smallView ? (
        <MobileSidebar navigationItems={NAVIGATION_ITEMS} />
      ) : (
        <DesktopSidebar navigationItems={NAVIGATION_ITEMS} />
      )}
      <Outlet />
    </div>
  )
}

export default MainLayout
