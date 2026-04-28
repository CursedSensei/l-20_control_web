import TrackFader from "./TrackFader";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "./ui/drawer";

export function MainFaderDrawer({open, setOpen}: {open: boolean, setOpen: (open: boolean) => void}) {
    return (
        <Drawer direction="right" open={open} onClose={() => setOpen(false)}>
            <DrawerContent aria-describedby="">
                <DrawerHeader>
                    <DrawerTitle className="text-lg text-muted-foreground">Main Output & FX Control</DrawerTitle>
                </DrawerHeader>
                <div className="grid grid-cols-3 grid-rows-1 h-full" data-vaul-no-drag>
                    <TrackFader track={{id: 0, name: "Reverb", icon: "Speaker", shown: true}} orientation="vertical" fxTrack/>
                    <TrackFader track={{id: 0, name: "Delay", icon: "Speaker", shown: true}} orientation="vertical"  fxTrack/>
                    <TrackFader track={{id: 0, name: "Main", icon: "Headphone", shown: true}} orientation="vertical" masterTrack />
                </div>
            </DrawerContent>
        </Drawer>
    )
}