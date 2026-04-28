'use client'

import { useL20Channel } from "@/contexts/L20ChannelContext";
import { fetchFaders } from "@/services/fetchFaders";
import React, { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export default function FaderSelect({className}: React.HTMLAttributes<HTMLDivElement>) {
    const [faders, setFaders] = useState<FaderJsonType[]>([])
    const {channelId, setChannelId} = useL20Channel()

    useEffect(() => {
        fetchFaders().then((fetchedFaders) => {
            setFaders(fetchedFaders.filter((fader) => fader.shown))
        })
    }, [])

    return (
        <Select onValueChange={(val) => setChannelId(val)} value={channelId ?? ''}>
            <SelectTrigger className={`text-xl w-full px-3 py-6 select-none ${className}`}>
                <SelectValue placeholder="Select Your Channel" />
            </SelectTrigger>
            <SelectContent position="popper">
                {faders.map((fader, _) => (
                    <SelectItem className="text-md" key={fader.id} value={fader.id.toString()}>{fader.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}