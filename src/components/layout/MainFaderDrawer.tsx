import { FX_1_TRACK_ID, FX_2_TRACK_ID, MASTER_TRACK_ID } from "@/constants";
import { useL20Channel } from "@/contexts/L20ChannelContext";
import { useL20Socket } from "@/contexts/L20SocketContext";
import { useEffect, useRef, useState } from "react";
import TrackFader from "../TrackFader";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../ui/drawer";

export function MainFaderDrawer({open, setOpen}: {open: boolean, setOpen: (open: boolean) => void}) {
    const {setTrackVolume, trackConsumers} = useL20Socket()
    const {channelId} = useL20Channel()

    const [isSendingFX1, setIsSendingFX1] = useState(false)
    const [isSendingFX2, setIsSendingFX2] = useState(false)
    const [isSendingMaster, setIsSendingMaster] = useState(false)

    const FX1Volume = useRef<number>(60)
    const FX2Volume = useRef<number>(60)
    const MasterVolume = useRef<number>(60)

    const [FX1FinalVolume, setFX1FinalVolume] = useState<number>(60)
    const [FX2FinalVolume, setFX2FinalVolume] = useState<number>(60)
    const [MasterFinalVolume, setMasterFinalVolume] = useState<number>(60)

    async function sendVolume(setIsSending: React.Dispatch<React.SetStateAction<boolean>>, newVolume: React.RefObject<number>, track_id: number, isMaster: boolean) {
        setIsSending(true)
        var lastUpdatedVolume = -1

        while (lastUpdatedVolume != newVolume.current) {
            lastUpdatedVolume = newVolume.current
            setTrackVolume({track_id: track_id, volume: lastUpdatedVolume, isMaster: isMaster})
            await new Promise((r) => setTimeout(r, 100))
        }

        setIsSending(false)
    }

    useEffect(() => {
        trackConsumers.current[FX_1_TRACK_ID] = (volume: number) => {
            setFX1FinalVolume(volume)
        }
        trackConsumers.current[FX_2_TRACK_ID] = (volume: number) => {
            setFX2FinalVolume(volume)
        }
        trackConsumers.current[MASTER_TRACK_ID] = (volume: number) => {
            setMasterFinalVolume(volume)
        }

        return () => {
            delete trackConsumers.current[FX_1_TRACK_ID]
            delete trackConsumers.current[FX_2_TRACK_ID]
            delete trackConsumers.current[MASTER_TRACK_ID]
        }
    }, [])

    return (
        <Drawer direction="right" open={open} onClose={() => setOpen(false)}>
            <DrawerContent aria-describedby="">
                <DrawerHeader>
                    <DrawerTitle className="text-lg text-muted-foreground">Main Output & FX Control</DrawerTitle>
                </DrawerHeader>
                <div className="grid grid-cols-3 grid-rows-1 h-full" data-vaul-no-drag>
                    <TrackFader
                        track={{id: FX_1_TRACK_ID, name: "Reverb", icon: "Speaker", shown: true}}
                        orientation="vertical"
                        isSendingState={[isSendingFX1, setIsSendingFX1]}
                        newVolumeRef={FX1Volume}
                        finalVolumeState={[FX1FinalVolume, setFX1FinalVolume]}
                        sendVolumeFunction={() => sendVolume(setIsSendingFX1, FX1Volume, FX_1_TRACK_ID, false)}
                        fxTrack 
                    />
                    <TrackFader 
                        track={{id: FX_2_TRACK_ID, name: "Delay", icon: "Speaker", shown: true}}
                        orientation="vertical"
                        isSendingState={[isSendingFX2, setIsSendingFX2]}
                        newVolumeRef={FX2Volume}
                        finalVolumeState={[FX2FinalVolume, setFX2FinalVolume]}
                        sendVolumeFunction={() => sendVolume(setIsSendingFX2, FX2Volume, FX_2_TRACK_ID, false)}
                        fxTrack
                    />
                    <TrackFader
                        track={{id: MASTER_TRACK_ID, name: "Main", icon: "Headphone", shown: true}}
                        maxVolume={channelId == '0' ? 120 : 118}
                        orientation="vertical"
                        isSendingState={[isSendingMaster, setIsSendingMaster]}
                        newVolumeRef={MasterVolume}
                        finalVolumeState={[MasterFinalVolume, setMasterFinalVolume]}
                        sendVolumeFunction={() => sendVolume(setIsSendingMaster, MasterVolume, MASTER_TRACK_ID, true)}
                        masterTrack
                    />
                </div>
            </DrawerContent>
        </Drawer>
    )
}