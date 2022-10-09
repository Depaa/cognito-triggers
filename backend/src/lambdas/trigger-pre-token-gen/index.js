// Add more info to user's token
exports.handler = async (event) => {
    console.debug(event);

    event.response = {
        claimsOverrideDetails: {
            claimsToSuppress: ['email']
        }
    }
    return event;
}