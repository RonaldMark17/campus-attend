export type UserRole = 'admin' | 'instructor' | 'dept_head' | 'registrar'

export interface User {
  id: string
  username: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  login: (usernameOrEmail: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}
