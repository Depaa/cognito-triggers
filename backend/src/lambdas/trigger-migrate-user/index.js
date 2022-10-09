// Migrate user from old userpool to new
const { CognitoIdentityServiceProvider } = require('aws-sdk');
const { CognitoJwtVerifier } = require('aws-jwt-verify');

const cognitoIDP = new CognitoIdentityServiceProvider();

const verifier = CognitoJwtVerifier.create({
    userPoolId: process.env.OLD_USER_POOL_ID,
    tokenUse: "id",
    clientId: process.env.OLD_USER_POOL_CLIENT_ID,
});

exports.handler = async (event) => {
    console.debug(event);

    process.env.USER_POOL_ID = event.userPoolId;

    if (event.triggerSource === 'UserMigration_Authentication') {
        // authenticate user with your existing user directory service
        const user = await authenticateUser(event.userName, event.request.password);
        event.response.userAttributes = {
            email: user.email,
            email_verified: 'true',
        };
        event.response.finalUserStatus = "CONFIRMED";
        event.response.messageAction = "SUPPRESS";
    }
    return event;
}

const authenticateUser = async (email, password) => {
    const resInitAuth = await cognitoIDP.adminInitiateAuth({
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        AuthParameters: {
            PASSWORD: password,
            USERNAME: email,
        },
        ClientId: process.env.OLD_USER_POOL_CLIENT_ID,
        UserPoolId: process.env.OLD_USER_POOL_ID,
    }).promise();
    console.debug(resInitAuth);
    console.info(`Successfully adminInitiateAuth`);

    const payload = await verifier.verify(resInitAuth.AuthenticationResult.IdToken);
    console.debug(payload);

    const user = await cognitoIDP.adminGetUser({
        Username: payload.sub,
        UserPoolId: process.env.OLD_USER_POOL_ID,
    }).promise();
    console.debug(user);
    console.info(`Successfully get user ${user.Username}`);

    return {
        email: user.UserAttributes.find(e => e.Name === 'email').Value,
    };
}