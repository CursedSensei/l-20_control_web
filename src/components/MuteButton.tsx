'use client'

import { useL20Socket } from "@/contexts/L20SocketContext";
import { Volume2, VolumeXIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";

interface MuteButtonProps {
    isMuted: boolean,
    handleMute: () => void
}

export function MuteButton({isMuted, handleMute}: MuteButtonProps) {
    const {isProcessing} = useL20Socket()
    const {theme} = useTheme()

    return (
        <Button disabled={isProcessing} className={`${isMuted ? 'bg-transparent border-ring hover:bg-muted' : 'bg-primary border-accent'} ${theme == 'light' && !isMuted ? 'text-background' : 'text-foreground'}`} onClick={handleMute} size="lg">
            {(isMuted ? 
                <>
                    <Volume2 /> Unmute
                </>
                : <>
                    <VolumeXIcon /> Mute
                </>
            )}
        </Button>
    )
}