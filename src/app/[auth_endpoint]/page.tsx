'use client'

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authenticateUser, verifyEndpoint } from "./actions";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AuthPage() {
    const [password, setPassword] = useState<string>("");
    const [isEndpointValid, setIsEndpointValid] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const { auth_endpoint } = useParams<{ auth_endpoint: string }>();
    const router = useRouter();

    const handleSubmit = async () => {
        const token = await authenticateUser(password, auth_endpoint);

        if (token) {
            localStorage.setItem("l20_auth", token);
            router.replace("/")
        } else {
            setError("Incorrect password");
        }
    }

    useEffect(() => {
        const checkEndpoint = async () => {
            setIsEndpointValid(await verifyEndpoint(auth_endpoint));
        }

        checkEndpoint();
    }, []);

    if (!isEndpointValid) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen py-2">
                <h1 className="text-4xl font-bold">404 - Not Found</h1>
                <p className="mt-4 text-lg">The page you are looking for does not exist.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2">
            <h1 className="text-2xl md:text-4xl font-bold">Request Access to Mixer</h1>
            <Field className="mt-7 md:w-1/3 w-10/12">
                <FieldLabel className="md:text-xl" htmlFor="password">Password:</FieldLabel>
                <Input className="md:py-6 md:text-lg" type="password" id="password" name="password" placeholder="Enter the password" value={password} onChange={(e) => setPassword(e.target.value)}/>
                <FieldDescription className={"text-red-600 " +(error ? "" : "hidden")} id="error_label">{error}</FieldDescription>
            </Field>
            <Button className="mt-7 px-7 py-4 md:py-6 md:text-lg" type="button" onClick={handleSubmit}>Submit</Button>
        </div>
    );
}