// src/pages/Login.jsx
import React, { useEffect, useRef, useState } from 'react'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const API_BASE  = (import.meta.env.VITE_API_BASE || '').replace(/\/$/,'')

export default function Login({ onAuthed }) {
  const btnRef = useRef(null)
  const [status, setStatus] = useState('Please sign in with Google')

  useEffect(() => {
    if (!window.google || !CLIENT_ID) return

    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredential,
      context: 'signin',
    })

    if (btnRef.current) {
      window.google.accounts.id.renderButton(btnRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        width: 280,
      })
    }

    window.google.accounts.id.prompt()
  }, [])

  async function handleCredential(resp) {
    try {
      setStatus('Signing in…')
      const r = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: resp.credential }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error || 'Auth failed')
      onAuthed?.(data.app_token, data.user)
    } catch (e) {
      console.error(e)
      setStatus('Auth error, please retry')
    }
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <h2 style={{margin:'0 0 8px'}}>Welcome</h2>
        <p style={{marginTop:0}}>Sign in to continue</p>
        <div ref={btnRef} style={{marginTop:12}} />
        <div style={{opacity:.6, marginTop:12, fontSize:13}}>{status}</div>
      </div>
    </div>
  )
}

const wrap = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f6f8fb',
}
const card = {
  width: 360,
  background: '#fff',
  border: '1px solid #e6e8eb',
  borderRadius: 16,
  boxShadow: '0 6px 20px rgba(0,0,0,.06)',
  padding: 24,
  textAlign: 'center',
}
