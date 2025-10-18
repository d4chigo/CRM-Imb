"use client"

import * as React from "react"

export default function GoogleCallback() {
  React.useEffect(() => {
    try {
      const hash = typeof window !== 'undefined' ? window.location.hash : ''
      const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
      const access_token = params.get('access_token') || ''
      const token_type = params.get('token_type') || ''
      const expires_in = params.get('expires_in') || ''
      const scope = params.get('scope') || ''
      const payload = { type: 'gcal-token', access_token, token_type, expires_in, scope }
      if (access_token) {
        // Try to fetch email for convenience
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${access_token}` }})
          .then(r=>r.json()).then(info=> {
            (payload as any).email = info?.email || ''
            window.opener?.postMessage(payload, '*')
            setTimeout(() => window.close(), 300)
          }).catch(()=>{
            window.opener?.postMessage(payload, '*')
            setTimeout(() => window.close(), 300)
          })
      } else {
        window.opener?.postMessage({ type:'gcal-token-error', reason:'missing_token' }, '*')
        setTimeout(() => window.close(), 800)
      }
    } catch {
      try {
        window.opener?.postMessage({ type:'gcal-token-error', reason:'exception' }, '*')
      } finally {
        setTimeout(() => window.close(), 800)
      }
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-sm text-gray-600">
        Procesando autorización de Google… Puedes cerrar esta ventana.
      </div>
    </div>
  )
}
