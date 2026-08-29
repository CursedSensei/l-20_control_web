"use server";

import jwt from "jsonwebtoken";

export async function authenticateUser(password: string, auth_endpoint: string): Promise<string | null> {
    if (password === process.env.AUTHENTICATOR_PASSWORD && auth_endpoint === process.env.AUTHENTICATOR_ENDPOINT) {
        return jwt.sign({ authenticated_at: new Date() }, process.env.JWT_SECRET as string);
    }

    return null;
}

export async function verifyEndpoint(auth_endpoint: string): Promise<boolean> {
    return auth_endpoint === process.env.AUTHENTICATOR_ENDPOINT;
}