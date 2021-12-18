function constructResponse(message, status, request) {
    return new Response(JSON.stringify({ message }), {
        status,
        headers: {
            "content-type": "application/json",
            "Access-Control-Allow-Origin": request.headers.get("origin"),
        },
    });
}

async function handleGet(request) {
    if (!/.dev\/posts/.test(request.url)) {
        // there has to be a better way to check what the endpoint is
        // but I don't know it :/

        // not found
        return constructResponse("Only GET /posts is supported", 404, request);
    }

    // the storage also includes other information, prefix limits us to posts only
    let list = await MY_KV.list({ prefix: "post:" });
    let posts = [];
    for (key of list.keys) {
        // parsing every single one is quite inefficient
        // can technically treat it as a string always, and append commas and such...
        // but this is much easier to understand as code
        posts.push(JSON.parse(await MY_KV.get(key.name)));
    }

    return constructResponse(posts, 200, request);
}

async function handlePost(request) {
    let contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        // bad request
        return constructResponse("Not JSON!", 400, request);
    }

    let newPost = await request.json();
    if (
        !newPost.hasOwnProperty("title") ||
        !newPost.hasOwnProperty("username") ||
        !newPost.hasOwnProperty("content")
    ) {
        // invalid format

        // unprocessable entity
        return new Response(
            "Wrong post format! Must include title, username, and content",
            422,
            request
        );
    }

    // this will be the initial response that will contain the cookie, and built upon at the end
    let authorization;

    let users = JSON.parse(await MY_KV.get("users"));
    if (users.includes(newPost.username)) {
        // existing user

        authorization = await fetch(`${AUTH_SERVER}/verify`, {
            headers: request.headers,
        });

        if (authorization.status === 498) {
            // unauthorized
            return constructResponse("Unauthorized", 401, request);
        }

        if (!authorization.ok) {
            // internal server error
            return constructResponse("Internal Server Error", 500, request);
        }
    } else {
        // new user

        authorization = await fetch(`${AUTH_SERVER}/auth/${newPost.username}`);

        if (!authorization.ok) {
            // something went wrong with the authentication server

            // internal server error
            return constructResponse("Couldn't authenticate", 500, request);
        }

        // add the user to our list
        users.push(newPost.username);
        await MY_KV.put("users", JSON.stringify(users));
    }

    // current timestamp will serve as the key (this also allows us to retrieve posts in order!)
    let ts = +new Date();
    let key = "post:" + ts;

    await MY_KV.put(key, JSON.stringify(newPost));

    // created
    return new Response(JSON.stringify({ message: "Created" }), {
        headers: {
            "content-type": "application/json",
            "Access-Control-Allow-Origin": request.headers.get("origin"),
        },
        ...authorization,
        status: 201,
    });
}

addEventListener("fetch", event => {
    let method = event.request.method.toUpperCase();

    if (method === "GET") {
        event.respondWith(handleGet(event.request));
    } else if (method === "POST") {
        event.respondWith(handlePost(event.request));
    } else if (method === "OPTIONS") {
        // for CORS preflight
        event.respondWith(
            new Response(null, {
                status: 204, // no content
                headers: {
                    "Access-Control-Allow-Origin": event.request.headers.get("origin"),
                    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            })
        );
    } else {
        // not a handled type
        event.respondWith(
            new Response("Only GET and POST are supported", {
                status: 501, // not implemented
                headers: {
                    "Access-Control-Allow-Origin": event.request.headers.get("origin"),
                },
            })
        );
    }
});
