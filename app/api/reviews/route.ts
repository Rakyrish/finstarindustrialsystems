import { NextResponse } from "next/server";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GoogleReview {
    author_name: string;
    rating: number;
    text: string;
    time: number;
    profile_photo_url?: string;
}

interface GooglePlacesResult {
    result: {
        rating: number;
        user_ratings_total: number;
        reviews: GoogleReview[];
    };
    status: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────

// Your Google Place ID — find it at:
// https://developers.google.com/maps/documentation/places/web-service/place-id
const PLACE_ID = process.env.GOOGLE_PLACE_ID ?? "ChIJ..."; // replace with your Place ID

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Revalidate every 24 hours (Next.js built-in ISR for Route Handlers)
export const revalidate = 86400;

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET() {
    if (!GOOGLE_API_KEY) {
        return NextResponse.json(
            { error: "Google Places API key not configured" },
            { status: 500 }
        );
    }

    try {
        const url = new URL(
            "https://maps.googleapis.com/maps/api/place/details/json"
        );
        url.searchParams.set("place_id", PLACE_ID);
        url.searchParams.set("fields", "rating,user_ratings_total,reviews");
        url.searchParams.set("reviews_sort", "most_relevant");
        url.searchParams.set("key", GOOGLE_API_KEY);

        const res = await fetch(url.toString(), {
            // Next.js fetch cache — revalidate every 24 hours
            next: { revalidate: 86400 },
        });

        if (!res.ok) {
            throw new Error(`Google API responded with status ${res.status}`);
        }

        const data: GooglePlacesResult = await res.json();

        if (data.status !== "OK") {
            throw new Error(`Google Places API error: ${data.status}`);
        }

        // Return only the 6 most relevant reviews (API returns 5 by default)
        const reviews = (data.result.reviews ?? []).slice(0, 6);

        return NextResponse.json({
            overallRating: data.result.rating,
            totalRatings: data.result.user_ratings_total,
            reviews,
        });
    } catch (error) {
        console.error("[/api/reviews] Failed to fetch Google reviews:", error);

        // Return fallback data so the page doesn't break
        return NextResponse.json(
            {
                overallRating: 4.8,
                totalRatings: 0,
                reviews: [],
                error: "Could not load reviews",
            },
            { status: 200 } // intentionally 200 so the UI handles gracefully
        );
    }
}