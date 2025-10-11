import { registerSW } from 'virtual:pwa-register'
import { useToast } from '@/composables/useToast'

export function setupPWA() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  const { toast } = useToast()
  let updateToastId: number | null = null

  const showUpdateToast = (update: (reload?: boolean) => Promise<void>) => {
    if (updateToastId !== null) {
      toast.dismiss(updateToastId)
    }
    updateToastId = toast.info('有新版本，點此重新載入', {
      duration: 0,
      action: {
        label: '重新載入',
        handler: () => {
          void update(true)
          if (updateToastId !== null) {
            toast.dismiss(updateToastId)
            updateToastId = null
          }
        }
      }
    })
  }

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      showUpdateToast(updateSW)
    },
    onOfflineReady() {
      toast.success('FlowNest 現在可以離線使用。')
    },
    onRegisteredSW(_swUrl, registration) {
      if (registration?.waiting) {
        showUpdateToast(updateSW)
      }
    },
    onRegisterError(error) {
      console.error('Service worker registration failed', error)
      toast.error('離線支援啟用失敗。', {
        description: error instanceof Error ? error.message : String(error)
      })
    }
  })
}
