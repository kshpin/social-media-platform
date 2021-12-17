const serverPrefix = process.env.REACT_APP_API_SERVER;

const getFullUrl = (url) => `${serverPrefix}${url}`;

const server = {
    get: async (url) => await fetch(getFullUrl(url)),
    post: async (url, payload) => {
        try {
            let response = await fetch(getFullUrl(url), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                throw new Error(
                    `POST request error, status: ${
                        response.status
                    }, message: ${await response.text()}`
                );
            }

            return await response.json();
        } catch (err) {
            console.error("POST error", err);
            throw err;
        }
    },
};

export const api = {
    posts: {
        list: async () => await server.get("/posts"),
        add: async ({ post }) => await server.post("/posts", post),
    },
};
