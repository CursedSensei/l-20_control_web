'use client'

import { useL20Channel } from "@/contexts/L20ChannelContext";
import { RotateCcw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import TrackFader from "../TrackFader";
import { Field, FieldLabel } from "../ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "../ui/input-group";

export default function TrackFaderList() {
    const [tracks, setTracks] = useState<TrackJsonType[]>([])
    const [searchTerm, setSearchTerm] = useState<string>("")
    const { allChannels, channelId } = useL20Channel()

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

    const filteredTracks = tracks.filter((track) => {
        if (track.shown || (channelId !== undefined && allChannels[parseInt(channelId)].permanentTracks.includes(track.id))) {
            return track.name.toLowerCase().includes(searchTerm.toLowerCase())
        }
        return false
    })

    return (
        <section className="min-h-screen flex flex-col pt-4">
            <div className="md:w-80 mb-5 md:ml-auto md:mr-0 px-3 md:px-0">
                <Field>
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
            {filteredTracks.map((track, index) => (
                <TrackFader key={track.id} track={track} first={index == 0} last={index == tracks.length - 1} />
            ))}
        </section>
    )
}