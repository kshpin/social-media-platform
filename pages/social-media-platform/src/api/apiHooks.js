import { useState, useEffect } from "react";

export function useRequest(request, params) {
    let [result, setResult] = useState();
    let [error, setError] = useState();
    let [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        setError(null);
        setResult(null);

        // fetch data from server
        (async () => {
            try {
                let postsResp = await request(params);

                if (!postsResp.ok) {
                    throw new Error(
                        "Request error, status: " + postsResp.status
                    );
                }

                let contentType = postsResp.headers.get("content-type");
                if (!contentType || !/json/.test(contentType)) {
                    throw new Error("Server returned incorrect data");
                }

                let result = await postsResp.json();

                setResult(result);
                setLoading(false);
            } catch (err) {
                setError("Could not process request");
                console.error(err);
                setLoading(false);
            }
        })();
    }, [setResult, setError, setLoading, params, request]);

    return {
        result,
        error,
        loading,
    };
}
