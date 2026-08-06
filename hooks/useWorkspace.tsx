"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  role?: string;
  status?: string;
  plans?: {
    id?: string;
    name?: string;
    code?: string;
  };
}

interface WorkspaceContextType {
  activeWorkspace: WorkspaceItem | null;
  workspaces: WorkspaceItem[];
  isLoading: boolean;
  switchWorkspace: (slug: string) => void;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  activeWorkspace: null,
  workspaces: [],
  isLoading: true,
  switchWorkspace: () => {},
  refreshWorkspaces: async () => {},
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/workspaces");
      if (!res.ok) return;
      const data = await res.json();
      const list: WorkspaceItem[] = data.workspaces || [];
      setWorkspaces(list);

      if (list.length > 0) {
        const cookies = document.cookie.split("; ");
        const activeCookie = cookies.find((c) => c.startsWith("active_workspace_id="));
        const savedId = activeCookie ? activeCookie.split("=")[1] : null;

        const current = list.find((w) => w.id === savedId) || list[0];
        setActiveWorkspace(current);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const switchWorkspace = (slug: string) => {
    const target = workspaces.find((w) => w.slug === slug);
    if (!target) return;

    document.cookie = `active_workspace_id=${target.id}; path=/; max-age=2592000; SameSite=Lax`;
    setActiveWorkspace(target);
    window.location.href = "/" + encodeURIComponent(slug);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspace,
        workspaces,
        isLoading,
        switchWorkspace,
        refreshWorkspaces: fetchWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
