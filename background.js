const blockedUsers = [];

// Define how to fetch blocked users
async function fetchMuellposter() {
    try {
        const response = await fetch('https://pr0gramm.com/api/user/blocklist');
        const data = await response.json();

        // Check if the response contains the expected structure
        if (data && data.blockedUsers) {
            // Extract usernames and populate the blockedUsers array
            data.blockedUsers.forEach(user => {
                blockedUsers.push(user.name);
            });
        } else {
            console.error('Invalid response format');
        }
    } catch (error) {
        console.error('Error fetching blocked users:', error);
    }
}

// Load muellposters initially, and register the request intercepter
fetchMuellposter().then(r => {
    console.log('Loaded blocked users:', blockedUsers)

    browser.webRequest.onBeforeRequest.addListener(
        listener,
        { urls: ["https://pr0gramm.com/api/items/get?*"] },
        ["blocking"],
    );
});

// Reload blocked users when loading a page
browser.webNavigation.onCompleted.addListener(() => {
    fetchMuellposter().then(() => {
        console.log('Reloaded blocked users:', blockedUsers)
    });
});

// Define the request intercepter
function listener(details) {
    let filter = browser.webRequest.filterResponseData(details.requestId);
    let decoder = new TextDecoder("utf-8");
    let encoder = new TextEncoder();

    // Collect response data
    let responseBody = "";
    filter.ondata = (event) => {
        let str = decoder.decode(event.data, { stream: true });
        responseBody += str;
    };

    // When the response finished loading
    filter.onstop = (event) => {
        console.log('Cleaning Müllposts from requests');
        // Convert it to json, if possible
        let data = {};
        try {
            data = JSON.parse(responseBody);
        }
        catch (e) {
            filter.write(encoder.encode(responseBody));
            filter.disconnect();
            return {};
        }

        // Let the Müllabfuhr do its thing
        data.items = data.items.filter(item => {
            return !blockedUsers.includes(item.user);
        });

        // Hand the cleaned response back to pr0gramm
        let response = JSON.stringify(data);
        filter.write(encoder.encode(response));
        filter.disconnect();
    };

    return {};
}
