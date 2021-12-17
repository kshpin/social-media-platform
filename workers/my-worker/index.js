addEventListener("fetch", event => {
    let method = event.request.method.toUpperCase();

    if (method === "GET") {
        event.respondWith(handleGet(event.request));
    } else if (method === "POST") {
        event.respondWith(handlePost(event));
    } else {
        // not a handled type
        event.respondWith(
            new Response("Only GET and POST are supported", {
                status: 501, // not implemented
            })
        );
    }
});

async function handleGet(request) {
    if (!/.dev\/posts/.test(request.url)) {
        // there has to be a better way to check what the endpoint is
        // but I don't know it :/

        return new Response("Only GET /posts is supported", {
            status: 404, // not found
        });
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

    return new Response(JSON.stringify(posts), {
        headers: { "content-type": "application/json" },
    });
}

async function handlePost(event) {
    let contentType = event.request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        return new Response("Not JSON!", {
            status: 400, // bad request
        });
    }

    let newPost = await event.request.json();
    if (
        !newPost.hasOwnProperty("title") ||
        !newPost.hasOwnProperty("username") ||
        !newPost.hasOwnProperty("content")
    ) {
        // invalid format
        return new Response(
            "Wrong post format! Must include title, username, and content",
            {
                status: 422, // unprocessable entity
            }
        );
    }

    // this will be the initial response that will contain the cookie, and built upon at the end
    let authorization;

    let users = JSON.parse(await MY_KV.get("users"));
    if (users.includes(newPost.username)) {
        // existing user

        // don't actually need to do any sort of cookie processing ourselves, just forward the request
        authorization = await fetch("verify", {
            headers: event.request.headers,
        });

        if (authorization.status === 498) {
            return new Response("Unauthorized", {
                status: 401, // unauthorized
            });
        }

        if (!authorization.ok) {
            return new Response("Internal Server Error", {
                status: 500, // internal server error
            });
        }
    } else {
        // new user

        authorization = await fetch(`auth/${newPost.username}`);

        if (!authorization.ok) {
            // something went wrong with the authentication server
            return new Response("Couldn't authenticate", {
                status: 500, // internal server error
            });
        }

        // add the user to our list
        users.push(newPost.username);
        await MY_KV.put("users", JSON.stringify(users));
    }

    // current timestamp will serve as the key (this also allows us to retrieve posts in order!)
    let ts = +new Date();
    let key = "post:" + ts;

    await MY_KV.put(key, JSON.stringify(newPost));

    return new Response("Created", {
        ...authorization,
        status: 201, // created
    });
}
