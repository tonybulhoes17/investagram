'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function OneSignalInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return
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
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: true,
          // Não mostra prompt automático — controlamos manualmente
          promptOptions: {
            slidedown: {
              prompts: []
            }
          }
        })

        setTimeout(async () => {
          try {
            // Vincula user_id do Supabase como tag
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              await OneSignal.User.addTags({ user_id: user.id })
            }

            // Só pede permissão se ainda não foi concedida/negada
            const permission = await Notification.permission
            if (permission === 'default') {
              // Só pede uma vez — se já respondeu, não pergunta mais
              await OneSignal.Notifications.requestPermission()
            }
          } catch(e) {
            console.log('OneSignal error:', e)
          }
        }, 2000)
      })
    }
    document.head.appendChild(script)
  }, [])

  return null
}

declare global {
  interface Window {
    OneSignalDeferred: any[]
  }
}
