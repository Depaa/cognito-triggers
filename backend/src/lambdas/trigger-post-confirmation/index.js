// Send an email to the confirmed user
// Save user in database
const { DynamoDB, SES } = require('aws-sdk');

const dynamodb = new DynamoDB.DocumentClient();
const ses = new SES();

exports.handler = async (event) => {
  console.debug(event);

  if (event.triggerSource === 'PostConfirmation_ConfirmSignUp') {
    const result = await dynamodb
      .put({
        TableName: process.env.USERS_TABLE,
        Item: {
          id: event.request.userAttributes.sub,
          email: event.request.userAttributes.email,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        },
        ConditionExpression: 'attribute_not_exists(id)',
      })
      .promise();
    console.info(`Successfully executed put in ${process.env.USERS_TABLE}`);

    const subject = 'Welcome confirmed user';
    const body = 'Glad you are here';

    const params = {
      Source: process.env.SES_IDENTITY,
      Destination: {
        ToAddresses: [
          event.request.userAttributes.email,
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
    console.info(`Successfully sent email to user ${event.request.userAttributes.sub}`);
  } 
  
  return event;
}