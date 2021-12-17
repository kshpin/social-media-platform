import { useState, useEffect } from "react";

export function usePosts() {
    let [list, setList] = useState();
    let [error, setError] = useState();
    let [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        setError(null);
        setList(null);

        // fetch data from server
        (async () => {
            try {
                let postsResp = await fetch(
                    `${process.env.REACT_APP_API_SERVER}/posts`
                );

                if (postsResp.status !== 200) {
                    throw new Error(
                        "Request error, status: " + postsResp.status
                    );
                }

                let contentType = postsResp.headers.get("content-type");
                if (!contentType || !/json/.test(contentType)) {
                    throw new Error("Server returned incorrect data");
                }

                let list = await postsResp.json();

                setList(list);
                setLoading(false);
            } catch (err) {
                setError("Could not load posts: " + err.message);
                setLoading(false);
            }
        })();
    }, [setList, setError, setLoading]);

    return {
        list,
        error,
        loading,
    };
}
