'use client'

import { createContext, useContext, useEffect, useState } from "react";
import { ThemeProvider as NextThemeProvider } from "next-themes";

interface ThemeContextType {
    orientation: Screen_Orientation,
    orientationMode: Screen_Orientation_Mode,
    setOrientationMode: (orientation: Screen_Orientation_Mode) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({children}: Readonly<{children: React.ReactNode}>) {
    const [orientation, setOrientation] = useState<Screen_Orientation>("vertical")
    const [orientationMode, setOrientationMode] = useState<Screen_Orientation_Mode>("auto")

    useEffect(() => {
        const storedOrientationMode = localStorage.getItem("orientationMode") as Screen_Orientation_Mode | null
        if (storedOrientationMode) {
            setOrientationMode(storedOrientationMode)
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("orientationMode", orientationMode)

        if (orientationMode !== "auto") {
            setOrientation(orientationMode)
            return
        }

        const handleResize = () => {
            if (window.innerWidth > window.innerHeight) {
                setOrientation("vertical")
            } else {
                setOrientation("horizontal")
            }
        }

        handleResize()
        window.addEventListener("resize", handleResize)

        return () => {
            window.removeEventListener("resize", handleResize)
        }
    }, [orientationMode]);

    return (
        <NextThemeProvider enableSystem attribute="class" defaultTheme="dark">
            <ThemeContext.Provider value={{orientation, orientationMode, setOrientationMode}}>
                {children}
            </ThemeContext.Provider>
        </NextThemeProvider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider")
    }
    return context
}