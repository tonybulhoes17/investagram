'use client'

import { useEffect } from 'react'

export function OneSignalInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Evita inicializar duas vezes
    if ((window as any).OneSignalInitialized) return
    ;(window as any).OneSignalInitialized = true

    window.OneSignalDeferred = window.OneSignalDeferred || []

    const script = document.createElement('script')
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
    script.async = true
    script.onload = () => {
      window.OneSignalDeferred.push(async function(OneSignal: any) {
        await OneSignal.init({
          appId: '609ebebf-e10a-4304-aa7a-cf340eab1e88',
          serviceWorkerParam: { scope: '/push/onesignal/' },
          serviceWorkerPath: 'push/onesignal/OneSignalSDKWorker.js',
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: true,
        })

        // Solicita permissão automaticamente
        const permission = await OneSignal.Notifications.permission
        if (!permission) {
          await OneSignal.Slidedown.promptPush()
        }
      })
    }
    document.head.appendChild(script)
  }, [])

  return null
}

// Adiciona tipo global
declare global {
  interface Window {
    OneSignalDeferred: any[]
  }
}
