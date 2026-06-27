'use client'

import { useL20Channel } from "@/contexts/L20ChannelContext";
import { RotateCcw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import TrackFader from "../TrackFader";
import { Field, FieldLabel } from "../ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "../ui/input-group";
import { useTheme } from "@/contexts/ThemeContext";
import { OrientationButton } from "../OrientationButton";
import { useL20Socket } from "@/contexts/L20SocketContext";

export default function TrackFaderList() {
    const [tracks, setTracks] = useState<TrackJsonType[]>([])
    const [searchTerm, setSearchTerm] = useState<string>("")
    const {allChannels, channelId} = useL20Channel()
    const {requestTrackInfo} = useL20Socket()
    const {orientation} = useTheme()

    useEffect(() => {
        const fetchTracks = () => {
            fetch("/tracks.json")
                .then(data => data.json())
                .then((data) => {
                    const fetchedtracks = data as TrackJsonType[]
                    setTracks(fetchedtracks)
                })
                .catch(async () => {
                    await new Promise(r => setTimeout(r, 1000))
                    fetchTracks()
                })
        }

        fetchTracks()
    }, [])

    useEffect(() => {
        requestTrackInfo()
    }, [orientation])

    const filteredTracks = tracks.filter((track) => {
        if (track.shown || (channelId !== undefined && allChannels[parseInt(channelId)].permanentTracks.includes(track.id))) {
            return track.name.toLowerCase().includes(searchTerm.toLowerCase())
        }
        return false
    })

    return (
        <section className="min-h-screen flex flex-col pt-4">
            <div className="flex justify-between mb-5 md:mx-0 px-3 md:px-0 items-center">
                <OrientationButton />
                <Field className="w-50 md:w-80">
                    <FieldLabel htmlFor="fader_search" className="text-md">Search:</FieldLabel>
                    <InputGroup className="py-5">
                        <InputGroupInput placeholder="e.g. Worship Leader" value={searchTerm} onInput={(e) => {
                            const target = e.target as HTMLInputElement
                            setSearchTerm(target.value)
                        }} />
                        <InputGroupAddon>
                            <Search />
                        </InputGroupAddon>
                        <InputGroupAddon align="inline-end">
                            <InputGroupButton onClick={() => setSearchTerm("")}>
                                {searchTerm.length != 0 ? <RotateCcw /> : ''}
                            </InputGroupButton>
                        </InputGroupAddon>
                    </InputGroup>
                </Field>
            </div>
            
            { orientation == "horizontal" ? 
                (filteredTracks.map((track, index) => (
                    <TrackFader key={track.id} track={track} first={index == 0} last={index == tracks.length - 1} orientation={orientation} />
                ))) : 
                <div className="grow flex overflow-x-auto border border-accent rounded-md mb-3">
                    {filteredTracks.map((track, index) => (
                        <TrackFader key={track.id} track={track} first={index == 0} last={index == tracks.length - 1} orientation={orientation} />
                    ))}
                </div>
            }
        </section>
    )
}