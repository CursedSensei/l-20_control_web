'use client'

import { Moon, SlidersVertical, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import FaderSelect from "./FaderSelect";
import { Button } from "./ui/button";

export function TopBar({setIsMainFaderOpen}: {setIsMainFaderOpen: React.Dispatch<React.SetStateAction<boolean>>}) {
    const {theme, setTheme} = useTheme()

    return (
        <div className="w-full bg-sidebar border-b md:border border-border flex items-center justify-between md:mt-3 md:rounded-2xl py-3 px-4 gap-4">
            <Button className="bg-transparent text-foreground hover:bg-secondary w-11 h-11" onClick={() => setTheme(theme == 'light' ? 'dark' : 'light')}>
                {theme === 'light' ? <Moon className="size-6" /> : <Sun className="size-6" />}
            </Button>
            <FaderSelect className="max-w-80" />
            <Button className="bg-transparent text-foreground hover:bg-secondary w-11 h-11" onClick={() => setIsMainFaderOpen(true)}>
                <SlidersVertical className="size-6" />
            </Button>
        </div>
    )
}