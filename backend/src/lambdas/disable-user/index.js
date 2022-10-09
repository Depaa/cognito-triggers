const { CognitoIdentityServiceProvider, SES } = require('aws-sdk');

const ses = new SES();
const cognitoIDP = new CognitoIdentityServiceProvider();

exports.handler = async (event) => {
  console.debug(event);

  const user = await cognitoIDP.adminGetUser({
    Username: event.id,
    UserPoolId: process.env.USER_POOL_ID,
  }).promise();
  console.debug(user);
  console.info(`Successfully get user ${event.id}`);

  if (user.UserAttributes.find(el => el.Name === 'email_verified').Value === 'false') {
    await cognitoIDP.adminDeleteUser({
      Username: event.id,
      UserPoolId: process.env.USER_POOL_ID,
    }).promise();
    console.info(`Successfully delete user ${event.id}`);

    const subject = 'Notice: your user has been deleted';
    const body = 'Hey there, you user has been delete, signin again.';
    const params = {
      Source: process.env.SES_IDENTITY,
      Destination: {
        ToAddresses: [
          user.UserAttributes.find(el => el.Name === 'email').Value,
        ],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: body,
            Charset: 'UTF-8',
          },
        },
      },
    };
    await ses.sendEmail(params).promise();
    console.info(`Successfully sent email to user ${event.id}`);
  }
  return event;
}