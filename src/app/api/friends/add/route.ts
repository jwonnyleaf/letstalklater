import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { addFriendValidator } from "@/lib/validations/add-friend";
import { getServerSession } from "next-auth";
import { ZodError, z } from "zod";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const { email: emailToAdd } = addFriendValidator.parse(body.email);

        const RESTResponse = await fetch(
            `${process.env.UPSTASH_REDIS_REST_URL}/get/user:email${emailToAdd}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
                },
                cache: "no-store",
            }
        );

        const data = (await RESTResponse.json()) as { result: string };
        const idToAdd = data.result;
        if (!idToAdd) {
            return new Response("This person does not exist.", { status: 400 });
        }

        const session = await getServerSession(authOptions);
        if (!session) {
            return new Response("Unauthorized", { status: 401 });
        }

        if (idToAdd === session.user.id) {
            return new Response("You cannot add yourself as a friend", {
                status: 400,
            });
        }

        const isAlreadyAdded = (await fetchRedis(
            "sismember",
            `user:${idToAdd}:incoming_friend_requests`,
            session.user.id
        )) as 0 | 1;

        if (isAlreadyAdded) {
            return new Response("Already added this user", { status: 400 });
        }

        const isAlreadyFriends = (await fetchRedis(
            "sismember",
            `user:${session.user.id}:friends`,
            idToAdd
        )) as 0 | 1;

        if (isAlreadyFriends) {
            return new Response("Already added this user", { status: 400 });
        }

        db.sadd(`user:${idToAdd}:incoming_friend_requests`, session.user.id);

        return new Response("OK");
    } catch (error) {
        if (error instanceof z.ZodError) {
            
        }
    }
}
