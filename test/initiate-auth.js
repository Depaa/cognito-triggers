const { CognitoIdentityProviderClient, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');

const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const USER_EMAIL = process.env.USER_EMAIL;
const USER_PASSWORD = 'pswBLOG2022?';

const cognito = new CognitoIdentityProviderClient({ region: 'eu-central-1' });

const initiateAuth = async () => {
  try {
    const initiateAuthCommand = new InitiateAuthCommand({
      ClientId: COGNITO_CLIENT_ID,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        'USERNAME': USER_EMAIL,
        'PASSWORD': USER_PASSWORD
      }
    });
    const res = await cognito.send(initiateAuthCommand);
    console.debug(`Successfully initiate user auth`);
  } catch (error) {
    console.error(error);
  }
};

initiateAuth();