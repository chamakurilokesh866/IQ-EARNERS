"use client"

import { createContext, useContext } from "react"

const UserSlugContext = createContext<string | null>(null)

export function UserSlugProvider({ username, children }: { username: string; children: React.ReactNode }) {
  return (
    <UserSlugContext.Provider value={username}>{children}</UserSlugContext.Provider>
  )
}

export function useUserSlug(): string | null {
  return useContext(UserSlugContext)
}

/** Base path for app routes when username is in URL, e.g. "/JohnDoe". Empty when not under [username] route. */
export function useBasePath(): string {
  const username = useUserSlug()
  return username ? `/${username}` : ""
}
