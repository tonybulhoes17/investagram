'use client'

import { useEffect } from 'react'

export function OneSignalInit() {
  useEffect(() => {
    // Só inicializa no browser
    if (typeof window === 'undefined') return

    const script = document.createElement('script')
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
    script.defer = true
    document.head.appendChild(script)

    script.onload = () => {
      ;(window as any).OneSignalDeferred = (window as any).OneSignalDeferred || []
      ;(window as any).OneSignalDeferred.push(async function (OneSignal: any) {
        await OneSignal.init({
          appId:            '609ebebf-e10a-4304-aa7a-cf340eab1e88',
          notifyButton:     { enable: false }, // usamos nossa própria UI
          allowLocalhostAsSecureOrigin: true,
        })
      })
    }
  }, [])

  return null
}
