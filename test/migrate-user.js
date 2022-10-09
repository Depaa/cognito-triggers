const { CognitoIdentityProviderClient, SignUpCommand, ConfirmSignUpCommand, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');
const prompt = require('prompt');

const OLD_COGNITO_CLIENT_ID = process.env.OLD_COGNITO_CLIENT_ID;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const USER_EMAIL = process.env.USER_EMAIL;
const USER_PASSWORD = 'pswBLOG2022?';
let USER_CONFIRMATION_CODE;

const cognito = new CognitoIdentityProviderClient({ region: 'eu-central-1' });

const startMigration = async () => {
  try {
    const createUserCommand = new SignUpCommand({
      ClientId: OLD_COGNITO_CLIENT_ID,
      Username: USER_EMAIL,
      Password: 'pswBLOG2022?'
    });
    const res = await cognito.send(createUserCommand);
    console.debug(`Successfully created user ${res?.UserSub}`);

    prompt.start();
    prompt.get(['USER_CONFIRMATION_CODE'], async (err, result) => {
      if (err) {
        console.error(err);
      }
      console.log('Command-line input received:');
      console.log('  USER_CONFIRMATION_CODE: ' + result.USER_CONFIRMATION_CODE);
      USER_CONFIRMATION_CODE = result.USER_CONFIRMATION_CODE.toString();

      const confirmUserCommand = new ConfirmSignUpCommand({
        ClientId: OLD_COGNITO_CLIENT_ID,
        Username: USER_EMAIL,
        ConfirmationCode: USER_CONFIRMATION_CODE
      });
      await cognito.send(confirmUserCommand);
      console.debug(`Successfully confirmed user`);

      const initiateAuthCommand = new InitiateAuthCommand({
        ClientId: COGNITO_CLIENT_ID,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          'USERNAME': USER_EMAIL,
          'PASSWORD': USER_PASSWORD
        }
      });
      await cognito.send(initiateAuthCommand);
      console.debug(`Successfully initiate user auth`);
    });
  } catch (error) {
    console.error(error);
  }
};

startMigration();
