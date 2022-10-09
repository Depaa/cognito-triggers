const { CognitoIdentityProviderClient, ConfirmSignUpCommand } = require('@aws-sdk/client-cognito-identity-provider');

const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const USER_EMAIL = process.env.USER_EMAIL;
const USER_CONFIRMATION_CODE = process.env.USER_CONFIRMATION_CODE;

const cognito = new CognitoIdentityProviderClient({ region: 'eu-central-1' });

const confirmUser = async () => {
  try {
    const confirmUserCommand = new ConfirmSignUpCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: USER_EMAIL,
      ConfirmationCode: USER_CONFIRMATION_CODE
    });
    const res = await cognito.send(confirmUserCommand);
    console.debug(`Successfully confirmed user`);
  } catch (error) {
    console.error(error);
  }
};

confirmUser();