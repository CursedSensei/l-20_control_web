export async function fetchFaders(): Promise<FaderJsonType[]> {
    while (true) {
        try {
            const response = await fetch("/faders.json");
            const data = await response.json();
            return data as FaderJsonType[];
        } catch (error) {
            await new Promise(r => setTimeout(r, 1000))
        }
    }
}