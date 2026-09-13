import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const username = request.nextUrl.searchParams.get("username");

    if (!username) {
        return NextResponse.json(
            { error: "Username is required" },
            { status: 400 }
        );
    }

    try {
        const response = await fetch(
            `https://api.sleeper.app/v1/user/${encodeURIComponent(username)}`
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: "Unable to reach Sleeper" },
                { status: 502 }
            );
        }

        const user = await response.json();

        if (!user) {
            return NextResponse.json(
                { error: "Sleeper user not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(user);
    } catch {
        return NextResponse.json(
            { error: "Something went wrong while contacting Sleeper" },
            { status: 500 }
        );
    }
}