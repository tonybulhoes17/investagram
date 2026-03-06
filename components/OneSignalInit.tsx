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
          promptOptions: {
            slidedown: {
              prompts: [
                {
                  type: 'push',
                  autoPrompt: true,
                  text: {
                    actionMessage: 'Receba notificações de curtidas, comentários e mensagens!',
                    acceptButton: 'Permitir',
                    cancelButton: 'Agora não',
                  },
                  delay: {
                    pageViews: 1,
                    timeDelay: 3,
                  },
                }
              ]
            }
          }
        })

        // Após init, vincula o user_id do Supabase como tag no OneSignal
        setTimeout(async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              // Tag para identificar o usuário
              await OneSignal.User.addTags({ user_id: user.id })
              console.log('OneSignal tag set:', user.id)
            }

            // Solicita permissão se ainda não tem
            const permission = OneSignal.Notifications.permission
            if (!permission) {
              await OneSignal.Notifications.requestPermission()
            }
          } catch(e) {
            console.log('OneSignal error:', e)
          }
        }, 3000)
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
