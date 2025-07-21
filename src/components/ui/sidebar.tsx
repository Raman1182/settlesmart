"use client"

// This file is deprecated and its contents have been moved to src/components/app-sidebar.tsx
// It is kept to prevent breaking imports during the transition.
export function AppSidebar() {
    return null;
}
export function SidebarProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
export const Sidebar = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
export const SidebarHeader = ({ children, className }: { children: React.ReactNode, className?: string }) => <div className={className}>{children}</div>;
export const SidebarMenu = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
export const SidebarMenuItem = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
export const SidebarMenuButton = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
export const SidebarFooter = ({ children, className }: { children: React.ReactNode, className?: string }) => <div className={className}>{children}</div>;
