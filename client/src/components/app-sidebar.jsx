import React, { useEffect, useState } from "react"
import {
    ShieldCheck,
    FileSearch,
    Files,
    Bot,
    History,
    Settings,
    LogOut,
    User,
    Moon,
    Sun,
    PanelLeftClose,
    FileImage
} from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarHeader,
    SidebarFooter,
    useSidebar
} from "./ui/sidebar"
import { useAuth } from "../context/AuthContext"

// Menu items representing Plagiarism Detection Context
const items = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: ShieldCheck,
    },
    {
        title: "Compare Files",
        url: "/compare",
        icon: Files,
    },
    {
        title: "AI Analysis",
        url: "/ai-check",
        icon: Bot,
    },
    {
        title: "Batch Scan",
        url: "/batch-scan",
        icon: FileSearch,
    },
    {
        title: "PDF Analysis",
        url: "/pdf-analysis",
        icon: FileImage,
    },
    {
        title: "Reports History",
        url: "/reports",
        icon: History,
    },
    {
        title: "Settings",
        url: "/settings",
        icon: Settings,
    },
]

export function AppSidebar() {
    const { user, logout } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const { state, toggleSidebar } = useSidebar()
    const [theme, setTheme] = useState("light")

    useEffect(() => {
        // Check initial theme
        if (document.documentElement.classList.contains("dark")) {
            setTheme("dark")
        }
    }, [])

    const toggleTheme = () => {
        if (theme === "light") {
            document.documentElement.classList.add("dark")
            setTheme("dark")
        } else {
            document.documentElement.classList.remove("dark")
            setTheme("light")
        }
    }

    const handleLogout = () => {
        logout()
        navigate("/login")
    }

    // Find active item
    const isActive = (url) => {
        if (url === '/dashboard' && location.pathname === '/dashboard') return true
        if (url !== '/dashboard' && location.pathname.startsWith(url)) return true
        return false
    }

    return (
        <Sidebar variant="inset" className="border-r border-border backdrop-blur-sm bg-card/50">
            <SidebarHeader>
                <div className="flex items-center justify-between">
                    <SidebarMenu className="flex-1">
                        <SidebarMenuItem>
                            <SidebarMenuButton size="lg" asChild>
                                <Link to="/dashboard">
                                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                        <ShieldCheck className="size-5" />
                                    </div>
                                    <div className={`flex flex-col gap-0.5 leading-tight ${state === "collapsed" ? "hidden" : "block"}`}>
                                        <span className="font-semibold text-foreground tracking-tight">Plagiarism Detector</span>
                                        <span className="text-xs text-muted-foreground">Admin System</span>
                                    </div>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isActive(item.url)}
                                        tooltip={item.title}
                                    >
                                        <Link to={item.url} className="flex w-full items-center gap-2">
                                            <item.icon className="h-4 w-4" />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <div className="flex flex-col gap-2 p-2 w-full">
                    {/* Optional Close Sidebar Button */}
                    <button
                        onClick={toggleSidebar}
                        className="flex items-center gap-2 px-2 py-2 hover:bg-muted/50 rounded-md text-sm transition-colors text-muted-foreground hover:text-foreground w-full group"
                    >
                        <PanelLeftClose size={16} className={`transition-transform ${state === 'collapsed' ? 'rotate-180' : ''}`} />
                        <span className={state === "collapsed" ? "hidden" : "inline-block"}>
                            Collapse Sidebar
                        </span>
                    </button>

                    {/* Theme Toggle Button */}
                    <button
                        onClick={toggleTheme}
                        className="flex items-center gap-2 px-2 py-2 hover:bg-muted/50 rounded-md text-sm transition-colors text-muted-foreground hover:text-foreground w-full"
                    >
                        {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
                        <span className={state === "collapsed" ? "hidden" : "inline-block"}>
                            {theme === "light" ? "Dark Mode" : "Light Mode"}
                        </span>
                    </button>

                    {user && (
                        <>
                            <div className={`flex items-center gap-3 px-2 py-2 ${state === "collapsed" ? "justify-center" : ""}`}>
                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                                    <User size={16} className="text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div className={`overflow-hidden ${state === "collapsed" ? "hidden" : "block"}`}>
                                    <p className="text-sm font-medium truncate text-foreground">{user?.username || "Admin"}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user?.role || "Instructor"}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-2 py-2 hover:bg-red-500/10 rounded-md text-sm transition-colors text-red-500 hover:text-red-600 w-full"
                            >
                                <LogOut size={16} />
                                <span className={state === "collapsed" ? "hidden" : "inline-block"}>Log out</span>
                            </button>
                        </>
                    )}
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}
