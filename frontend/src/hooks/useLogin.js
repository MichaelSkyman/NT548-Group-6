// HOOK: LOGIC đăng nhập admin (không có giao diện).
// LoginPage chỉ việc nối các field và nút với hook này.
//
//   adminApi.login() đã tự token.set(access_token) khi thành công.
//   Đăng nhập xong -> điều hướng sang `redirectTo` (mặc định /admin).

import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../api/client'

export function useLogin({ redirectTo = '/admin' } = {}) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Gọi được trực tiếp hoặc gắn vào <form onSubmit={submit}> (tự chặn reload).
  const submit = useCallback(async (e) => {
    e?.preventDefault?.()
    setSubmitting(true)
    setError(null)
    try {
      const res = await adminApi.login(username, password)
      navigate(redirectTo, { replace: true })
      return res
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setSubmitting(false)
    }
  }, [username, password, redirectTo, navigate])

  return {
    username, setUsername,
    password, setPassword,
    submit,
    submitting,
    error,
  }
}
