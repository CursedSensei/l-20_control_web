'use client'

import { useL20Socket } from "@/contexts/L20SocketContext";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Spinner } from "./ui/spinner";

export function ConnectionDialog() {
    const {isConnected} = useL20Socket()

    return (
        <AlertDialog open={!isConnected}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex gap-3 items-center text-xl">
                        <Spinner className="size-7" /> Connecting to Zoom L-20
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm mt-2">
                        This is usually caused by because the host computer not connected to the mixer. Please wait a moment until the host is connected.
                    </AlertDialogDescription>
                </AlertDialogHeader>
            </AlertDialogContent>
        </AlertDialog>
    )
}