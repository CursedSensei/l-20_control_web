'use client'

import { RectangleHorizontal, RectangleVertical, SwatchBook } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useTheme as useNextTheme } from "next-themes";
import { Button } from "./ui/button";
import { useCallback } from "react";

export function OrientationButton() {
    const {orientationMode, setOrientationMode} = useTheme()
    const {theme} = useNextTheme()

    const handleOrientationChange = () => {
        if (orientationMode === "auto") {
            setOrientationMode("horizontal")
        } else if (orientationMode === "horizontal") {
            setOrientationMode("vertical")
        } else {
            setOrientationMode("auto")
        }
    }

    const getOrientationText = useCallback((orientationMode: Screen_Orientation_Mode) => {
        if (orientationMode === "auto") {
            return <>
                <SwatchBook className="size-5" /> Auto-Rotate
            </>
        } else if (orientationMode === "horizontal") {
            return <>
                <RectangleHorizontal className="size-5" /> Horizontal-Only
            </>
        } else {
            return <>
                <RectangleVertical className="size-5" /> Vertical-Only
            </>
        }
    }, [])

    return (
        <Button className={`bg-transparent border-ring hover:bg-muted mt-8 pl-5 pr-6 py-5 text-md font-bold ${theme == 'light' ? 'text-background' : 'text-foreground'}`} onClick={handleOrientationChange} size="lg">
            {getOrientationText(orientationMode)}
        </Button>
    )
}