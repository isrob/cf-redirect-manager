// Parameters in Redirect object:
//    path                        // start with /, or '*' at the end for a default
//    destination                 // absolute URL
//    useRegex = false            // true if regex pattern matching with optional placeholders, false if regular string comparison 
//    considerParams = false      // true if whole URL including query params should be compared, false if only path compared
//    isTemporary = false         // true if temporary/302 redirect, false if permanent/301 redirect
//    retainParams = false        // true if request's query params should be merged into the destination (overwriting any dupes), false if not

// Define routes per hostname, with '*' for a default if no matches
var routes = {
    "app.domain.com": [
        { path: "/", destination: "https://different-domain.com/app/" },
        { path: "/old/path/posts/(\\d+)", destination: "https://different-domain.com/article/$1", useRegex: true },
        { path: "/test302", destination: "https://different-domain.com/test", isTemporary: true },
        { path: "/testmergedparams", retainParams: true, destination: "https://different-domain.com/test?anotherparam=390" },
        { path: "/testretainparams", retainParams: true, destination: "https://different-domain.com/test" },
        { path: "/testcheckedparams?param=123", considerParams: true, destination: "https://different-domain.com/test?anotherparam=390" },
        { path: "*", destination: "https://different-domain.com/app/default-app-route" }
    ],
    "*": [
        { path: "*", destination: "https://different-domain.com/default-route" }
    ]
};

// Main function definition
function redirectManager(eventRequest) {
    // Create a helper object for the request
    var requestURL = {
        "hostname": eventRequest.headers.host.value,
        "path": eventRequest.uri,
        "querystring": objectToQueryString(eventRequest.querystring)
    };

    var destination;

    // Get the redirects for the request hostname, or redirect to the default if no mapping found
    var mappings = routes[requestURL.hostname] || routes["*"] || [];

    // Iterate through the redirects
    for (var i = 0; i < mappings.length; i++) {     // more performant than for...x of y
        var redirect = mappings[i];

        if (redirect.path === "*") {
            // Default redirect
            destination = redirect.destination;
        } else {
            // Compare differently if query params matter 
            var requestToCompare = (redirect.considerParams) ? requestURL.path + requestURL.querystring : requestURL.path;

            if (redirect.useRegex) {
                // Regex comparison
                var regexMatches = requestToCompare.match(new RegExp(redirect.path));
                if (!regexMatches) { continue; }

                destination = redirect.destination;

                // Replace captured groups
                if (regexMatches.length > 1) {
                    destination = destination.replace(/\$(\d+)/g, (_, groupIndex) => {
                        var index = parseInt(groupIndex, 10);
                        return regexMatches[index] || '';
                    });
                }
            } else {
                // String comparison
                if (requestToCompare !== redirect.path) { continue; }
                destination = redirect.destination;
            }
        }

        // Do we need to merge request params into the destination URL?
        if (redirect.retainParams) {
            var destinationQueryStringIndex = destination.indexOf("?");
            if (destinationQueryStringIndex !== -1) {
                // Querystring present in destination
                var destinationBaseURL = destination.substring(0, destinationQueryStringIndex);
                var destinationQueryString = destination.substring(destinationQueryStringIndex);
                destination = destinationBaseURL + mergeQueryStrings(destinationQueryString, requestURL.querystring);
            } else {
                // No Querystring present in destination
                destination = destination + requestURL.querystring
            }
        }

        return createRedirectObject(destination, redirect.isTemporary);
    }
}

// Create redirection object
function createRedirectObject(destination, isTemporary) {
    return {
        statusCode: (isTemporary) ? 302 : 301,
        statusDescription: (isTemporary) ? "Found" : "Moved Permanently",
        headers: { location: { value: destination } }
    };
}

// Merge two query parameter objects, overwriting any existing keys
function mergeQueryStrings(first, second) {
    var firstParams = queryStringToObject(first);
    var secondParams = queryStringToObject(second);

    for (var key in secondParams) {
        firstParams[key] = secondParams[key];
    }

    return objectToQueryString(firstParams);
}

// Convert a querystring to a query parameter object
function queryStringToObject(queryString) {
    if (queryString.length === 0) { return {}; }

    var params = {};
    if (queryString.charAt(0) === "?") {
        queryString = queryString.slice(1);
    }

    var pairs = queryString.split("&");

    for (var i = 0; i < pairs.length; i++) {
        var splitPair = pairs[i].split("=");
        params[decodeURIComponent(splitPair[0])] = { "value": decodeURIComponent(splitPair[1]) };
    }

    return params;
}

// Convert a query parameter object to a string
function objectToQueryString(params) {
    var pairs = [];
    for (var key in params) {
        pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key].value));
    }

    return pairs.length > 0 ? "?" + pairs.join("&") : "";
}

// CloudFront event handler
function handler(event) {
    var result = redirectManager(event.request);

    // Pass through the redirection object, or the original event request if no redirect found
    return result || event.request;
}

// Test out with a mocked object that is similar to a CloudFront event
var mockedCFEventObject = { "request": { "uri": "/testretainparams", "querystring": { "param": { "value": "123" } }, "headers": { "host": { "value": "app.domain.com" } } } };
console.log(handler(mockedCFEventObject));