import type { User } from '../types/auth'

export async function loginUser(usernameOrEmail: string, password: string): Promise<User> {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      username_or_email: usernameOrEmail,
      password: password,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Login failed. Please try again.' }))
    throw new Error(errorData.detail || 'Login failed.')
  }

  return response.json()
}

export async function logoutUser(): Promise<void> {
  await fetch('/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })
}

export async function getCurrentUser(): Promise<User | null> {
  const response = await fetch('/api/v1/auth/me', {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return null
    }
    throw new Error(`Failed to fetch session: ${response.status}`)
  }

  return response.json()
}
