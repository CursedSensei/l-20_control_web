'use client'

import { Drum, Guitar, Headphones, MicVocal, Piano, Speaker } from "lucide-react";

export function FaderIcon({iconName}: {iconName: IconName}): React.ReactNode {
  switch (iconName) {
    case "Drum":
      return (
        <Drum />
      )
    case "Guitar":
      return (
        <Guitar />
      )
    case "Keyboard":
      return (
        <Piano />
      )
    case "Mic":
      return (
        <MicVocal />
      )
    case "Speaker":
      return (
        <Speaker />
      )
    case "Headphone":
      return (
        <Headphones />
      )
    default:
      return null;
  }
}