async function router(event, routerConfig) {
    let endpoint = new URL(event.request.url).pathname;
    if (routerConfig.hasOwnProperty(endpoint)) {
        let endpointHandlerMethods = routerConfig[endpoint];

        let method = event.request.method.toUpperCase();
        if (endpointHandlerMethods.hasOwnProperty(method)) {
            let handler = endpointHandlerMethods[method];

            try {
                return await handler(event.request);
            } catch (err) {
                return {
                    message: `Worker error`,
                    status: 500,
                };
            }
        } else {
            return {
                message: `Unimplemented method ${method} on ${endpoint}`,
                status: 501,
            };
        }
    } else {
        return {
            message: `Resource ${endpoint} Not Found`,
            status: 404,
        };
    }
}

async function handleFetch(event) {
    let result = await router(event, {
        "/posts": {
            GET: async request => {
                // the storage also includes other information, prefix limits us to posts only
                let postList = await SOCIAL_MEDIA_KV.list({ prefix: "post:" });

                let posts = [];
                for (key of postList.keys) {
                    // parsing every single one is quite inefficient
                    // can technically treat it as a string always, and append commas and such...
                    // but this is much easier to understand as code
                    posts.push(JSON.parse(await SOCIAL_MEDIA_KV.get(key.name)));
                }

                return {
                    message: posts,
                    status: 200,
                };
            },
            POST: async request => {
                let contentType = request.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    // bad request
                    return {
                        message: "Data must be in JSON format",
                        status: 400,
                    };
                }

                let newPost = await request.json();
                if (
                    !newPost.hasOwnProperty("title") ||
                    !newPost.hasOwnProperty("username") ||
                    !newPost.hasOwnProperty("content")
                ) {
                    // invalid format

                    // unprocessable entity
                    return {
                        message: "Wrong post format, must include: title, username, content",
                        status: 422,
                    };
                }

                // this will be the initial response that will contain the cookie, and built upon at the end
                let authorization;

                let users = JSON.parse(await SOCIAL_MEDIA_KV.get("users"));
                if (users.includes(newPost.username)) {
                    // existing user

                    authorization = await fetch(`${AUTH_SERVER}/verify`, {
                        headers: request.headers,
                    });

                    if (authorization.status === 498 || authorization.status === 401) {
                        // unauthorized
                        return {
                            message: "Unauthorized",
                            status: 401,
                        };
                    }

                    if (!authorization.ok) {
                        // internal server error
                        return {
                            message: `Couldn't authenticate existing user, auth ${authorization.status}`,
                            status: 500,
                        };
                    }
                } else {
                    // new user

                    authorization = await fetch(`${AUTH_SERVER}/auth/${newPost.username}`);

                    console.log("during authorization");

                    if (!authorization.ok) {
                        // something went wrong with the authentication server

                        // internal server error
                        return {
                            message: `Couldn't authenticate new user, auth ${authorization.status}`,
                            status: 500,
                        };
                    }

                    // add the user to our list
                    users.push(newPost.username);
                    await SOCIAL_MEDIA_KV.put("users", JSON.stringify(users));
                }

                // current timestamp will serve as the key (this also allows us to retrieve posts in order!)
                let ts = +new Date();
                let key = `post:${ts}`;

                await SOCIAL_MEDIA_KV.put(key, JSON.stringify(newPost));

                // created
                return {
                    message: "Post created",
                    status: 201,
                    meta: authorization,
                };
            },
        },
    });

    let body = JSON.stringify({ message: result.message });

    if (result.meta) {
        /* return new Response(body, {
            headers: {
                "content-type": "application/json",
                "Access-Control-Allow-Origin": event.request.headers.get("origin"),
                "Access-Control-Allow-Credentials": "true",
            },
            ...result.meta,
            status: result.status,
            credentials: "include",
        }); */

        let headers = new Headers(result.meta.headers);
        headers.set("content-type", "application/json");
        headers.set("Access-Control-Allow-Origin", event.request.headers.get("origin"));
        headers.set("Access-Control-Allow-Credentials", "true");

        const response = new Response(body, {
            headers,
            status: result.status,
            credentials: "same-origin",
        });

        return response;
    } else {
        return new Response(body, {
            headers: {
                "content-type": "application/json",
                "Access-Control-Allow-Origin": event.request.headers.get("origin"),
                "Access-Control-Allow-Credentials": "true",
            },
            status: result.status,
            credentials: "same-origin",
        });
    }
}

addEventListener("fetch", event => {
    if (event.request.method.toUpperCase() === "OPTIONS") {
        // for CORS preflight
        event.respondWith(
            new Response(null, {
                status: 204, // no content
                headers: {
                    "Access-Control-Allow-Origin": event.request.headers.get("origin"),
                    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Credentials": "true",
                },
                credentials: "include",
            })
        );
    } else {
        event.respondWith(handleFetch(event));
    }
});
