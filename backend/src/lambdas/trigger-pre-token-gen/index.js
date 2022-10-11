// Add more info to user's token or suppress some
exports.handler = async (event) => {
    console.debug(event);

    event.response = {
        claimsOverrideDetails: {
            claimsToSuppress: ['email']
        }
    }
    return event;
}