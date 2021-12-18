const serverPrefix = process.env.REACT_APP_API_SERVER;

const getFullUrl = (url) => `${serverPrefix}${url}`;

const makeRequestAndPreprocess = async (url, method, payload) => {
    try {
        let response;
        if (payload) {
            response = await fetch(getFullUrl(url), {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });
        } else {
            response = await fetch(getFullUrl(url), { method });
        }

        let body = await response.json();

        if (!response.ok) {
            throw new Error(
                `${method} request error, status: ${
                    response.status
                }, message: ${JSON.stringify(body)}`
            );
        }

        return body;
    } catch (err) {
        console.error("POST error", err);
        throw err;
    }
};

const server = {
    get: async (url) => await makeRequestAndPreprocess(url, "GET"),
    post: async (url, payload) =>
        await makeRequestAndPreprocess(url, "POST", payload),
};

export const api = {
    posts: {
        list: async () => (await server.get("/posts")).message,
        add: async ({ post }) => (await server.post("/posts", post)).message,
    },
};
