const upstashRedisRestURL = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

type Command = "zrange" | "sismember" | "get" | "smembers";

export async function fetchRedis(
    command: Command,
    ...args: (string | number)[]
) {
    const commandURL = `${upstashRedisRestURL}/${command}/${args.join("/")}`;

    const response = await fetch(commandURL, {
        headers: {
            Authorization: `Bearer ${upstashToken}`,
        },
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(
            `Error executing Redis command: ${response.statusText}`
        );
    }

    const data = await response.json()
    return data.result
}
