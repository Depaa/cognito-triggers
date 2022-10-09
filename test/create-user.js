const { CognitoIdentityProviderClient, SignUpCommand } = require('@aws-sdk/client-cognito-identity-provider');

const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const USER_EMAIL = process.env.USER_EMAIL;
const USER_PHONE_NUMBER = process.env.USER_PHONE_NUMBER;
const USER_PASSWORD = 'pswBLOG2022?';

const cognito = new CognitoIdentityProviderClient({ region: 'eu-central-1' });

const createUserEmail = async () => {
  try {
    const createUserCommand = new SignUpCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: USER_EMAIL,
      Password: USER_PASSWORD
    });
    const res = await cognito.send(createUserCommand);
    console.debug(`Successfully created user ${res?.UserSub}`);
  } catch (error) {
    console.error(error);
  }
};

const createUserSMS = async () => {
  try {
    const createUserCommand = new SignUpCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: USER_EMAIL,
      UserAttributes: [{
        Name: 'phone_number',
        Value: USER_PHONE_NUMBER,
      }],
      Password: USER_PASSWORD
    });
    const res = await cognito.send(createUserCommand);
    console.debug(`Successfully created user ${res?.UserSub}`);
  } catch (error) {
    console.error(error);
  }
};

createUserEmail();
// createUserSMS();