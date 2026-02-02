"use client"

import * as React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { FamilyMember, AuthUser } from "@/types"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchUserData = async (authUser: User | null) => {
    if (!authUser) {
      setUser(null)
      setLoading(false)
      return
    }

    // Fetch family member data
    const { data: familyMember } = await supabase
      .from("family_members")
      .select("*")
      .eq("user_id", authUser.id)
      .single()

    setUser({
      id: authUser.id,
      email: authUser.email || "",
      familyMember: familyMember as FamilyMember | null,
    })
    setLoading(false)
  }

  const refreshUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    await fetchUserData(authUser)
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      fetchUserData(authUser)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        await fetchUserData(session?.user ?? null)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}
