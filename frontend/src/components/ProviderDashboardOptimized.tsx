import React from 'react';
import { DashboardCacheProvider } from '../context/DashboardCacheContext';
import ProviderDashboardEnhanced from './ProviderDashboardEnhanced';

/**
 * Provider Dashboard with Caching Wrapper
 * Wraps the dashboard with DashboardCacheProvider to enable data caching
 */
export function ProviderDashboardOptimized() {
  return (
    <DashboardCacheProvider>
      <ProviderDashboardEnhanced />
    </DashboardCacheProvider>
  );
}

export default ProviderDashboardOptimized;
