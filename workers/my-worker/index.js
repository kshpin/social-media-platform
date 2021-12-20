import cookie from "cookie";
import { ReasonPhrases, StatusCodes, getReasonPhrase, getStatusCode } from "http-status-codes";

class ServerError extends Error {
    constructor(status, messageOverride) {
        super(messageOverride || ReasonPhrases[StatusCodes[status]]);
        this.status = status;
    }
}

const authService = {
    verify: async (request, username) => {
        let cookies = cookie.parse(request.headers.get("Cookie") || "");
        if (!cookies["token"]) {
            throw new ServerError(StatusCodes.UNAUTHORIZED);
        }

        let authorization = await fetch(`${AUTH_SERVER}/verify`, {
            headers: {
                cookie: cookie.serialize("token", cookies["token"], {
                    httpOnly: true,
                    secure: true,
                    path: "/",
                }),
            },
        });

        if (authorization.status === 498) {
            throw new ServerError(StatusCodes.IM_A_TEAPOT); // because 498 isn't in this library
        }

        if (authorization.status === 401) {
            throw new ServerError(StatusCodes.UNAUTHORIZED);
        }

        if (!authorization.ok) {
            throw new ServerError(StatusCodes.INTERNAL_SERVER_ERROR);
        }

        if (username !== (await authorization.text())) {
            throw new ServerError(StatusCodes.FORBIDDEN, "Authenticated username does not match");
        }
    },
    authenticate: async (request, username, response) => {
        let authorization = await fetch(`${AUTH_SERVER}/auth/${username}`);

        if (!authorization.ok) {
            // something went wrong with the authentication server

            // internal server error
            throw new ServerError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                `Couldn't authenticate new user, auth ${authorization.status}`
            );
        }

        let cookies = cookie.parse(authorization.headers.get("set-cookie") || "");

        if (!cookies["token"]) {
            // auth server didn't return cookie
            throw new ServerError(StatusCodes.INTERNAL_SERVER_ERROR, "Authentication server didn't return cookie");
        }

        response.cookies.push(
            cookie.serialize("token", cookies["token"], {
                httpOnly: true,
                secure: true,
                path: "/",
            })
        );
    },
};

const ROUTER_CONFIG = {
    "/posts": {
        GET: async (request, response) => {
            // the storage also includes other information, prefix limits us to posts only
            let postList = await SOCIAL_MEDIA_KV.list({ prefix: "post:" });

            let posts = [];
            for (let key of postList.keys) {
                // parsing every single one is quite inefficient
                // can technically treat it as a string always, and append commas and such...
                // but this is much easier to understand as code
                posts.push(JSON.parse(await SOCIAL_MEDIA_KV.get(key.name)));
            }

            return posts;
        },
        POST: async (request, response, newPost) => {
            if (
                !newPost.hasOwnProperty("title") ||
                !newPost.hasOwnProperty("username") ||
                !newPost.hasOwnProperty("content")
            ) {
                // invalid format

                throw new ServerError(
                    StatusCodes.UNPROCESSABLE_ENTITY,
                    "Wrong post format, must include: title, username, content"
                );
            }

            // TODO: replace users to specific user
            let users = JSON.parse(await SOCIAL_MEDIA_KV.get("users"));
            if (users.includes(newPost.username)) {
                // existing user
                await authService.verify(request, newPost.username);
            } else {
                // new user
                await authService.authenticate(request, newPost.username, response);

                // add the user to our list
                users.push(newPost.username);
                await SOCIAL_MEDIA_KV.put("users", JSON.stringify(users));
            }

            // current timestamp will serve as the key (this also allows us to retrieve posts in order!)
            let ts = +new Date();
            let key = `post:${ts}`;

            await SOCIAL_MEDIA_KV.put(key, JSON.stringify(newPost));

            // created
            return "success";
        },
    },
};

async function processRequest(request, routerConfig, response) {
    let endpoint = new URL(request.url).pathname;
    if (routerConfig.hasOwnProperty(endpoint)) {
        let endpointHandlerMethods = routerConfig[endpoint];

        let method = request.method.toUpperCase();

        console.log("----------------------------------------------------------");
        let ts = +new Date();
        let key = `post:${ts}`;
        let requestClone = request.clone();
        /* SOCIAL_MEDIA_KV.put(
            `test:${key}`,
            JSON.stringify(
                {
                    endpoint,
                    method,
                    headers: [...requestClone.headers.entries()],
                    body: await requestClone.text(),
                },
                null,
                2
            )
        ); */
        console.log("----------------------------------------------------------");

        if (method === "OPTIONS") {
            // for CORS preflight
            response.status = StatusCodes.NO_CONTENT;
            response.headers["Access-Control-Allow-Methods"] = `${Object.keys(endpointHandlerMethods).join(
                ", "
            )}, OPTIONS`;
            response.headers["Access-Control-Allow-Headers"] = "Content-Type";

            return;
        }

        if (endpointHandlerMethods.hasOwnProperty(method)) {
            let handler = endpointHandlerMethods[method];

            let payload;
            if (["POST"].includes(method)) {
                let contentType = request.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    // bad request
                    throw new ServerError(StatusCodes.BAD_REQUEST, "Data must be in JSON format");
                }

                payload = await request.json();
            }

            let body = await handler(request, response, payload);

            switch (method) {
                case "POST":
                    response.status = StatusCodes.OK; // CREATED
                    break;
                default:
                    response.status = StatusCodes.OK;
            }

            return body;
        } else {
            throw new ServerError(StatusCodes.NOT_IMPLEMENTED, `Unimplemented method ${method} on ${endpoint}`);
        }
    } else {
        throw new ServerError(StatusCodes.NOT_FOUND, `Resource ${endpoint} Not Found`);
    }
}

async function buildResponse(request, result, responseParams) {
    let body = null;

    let init = {
        headers: {},
        status: responseParams.status,
        credentials: "include",
    };

    if (result) {
        if (typeof result === "string") {
            body = result;
            init.headers["content-type"] = "text/plain";
        } else {
            body = JSON.stringify(result);
            init.headers["content-type"] = "application/json";
        }
    }

    let response = new Response(body, init);

    response.headers.append("Access-Control-Allow-Origin", request.headers.get("origin"));
    response.headers.append("Access-Control-Allow-Credentials", "true");

    responseParams.cookies.forEach(cookieValue => {
        response.headers.append("Set-Cookie", cookieValue);
    });

    Object.entries(responseParams.headers).forEach(([headerName, headerValue]) => {
        response.headers.append(headerName, headerValue);
    });

    return response;
}

async function buildErrorResponse(request, err) {
    let response = new Response(err.message, {
        status: err.status,
    });

    response.headers.append("Access-Control-Allow-Origin", request.headers.get("origin"));
    response.headers.append("Access-Control-Allow-Credentials", "true");
    response.headers.append("content-type", "text/plain");

    return response;
}

async function handleFetch(event) {
    let responseParams = {
        headers: {},
        cookies: [],
        status: StatusCodes.OK,
    };

    let response;
    try {
        let result = await processRequest(event.request, ROUTER_CONFIG, responseParams);
        response = await buildResponse(event.request, result, responseParams);
    } catch (err) {
        if (err instanceof ServerError) {
            response = await buildErrorResponse(event.request, err);
        } else {
            let message = JSON.stringify({
                message: err.message,
                stack: err.stack.toString(),
            });
            response = await buildErrorResponse(
                event.request,
                new ServerError(StatusCodes.INTERNAL_SERVER_ERROR, message)
            );
            //throw err;
        }
    }

    return response;
}

addEventListener("fetch", event => {
    event.respondWith(handleFetch(event));
});
