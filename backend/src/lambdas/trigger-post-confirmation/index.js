// Send an email to the confirmed user
// Save user in database
const { DynamoDB, SES } = require('aws-sdk');

const dynamodb = new DynamoDB.DocumentClient();
const ses = new SES();

exports.handler = async (event) => {
  console.debug(event);

  if (event.triggerSource === 'PostConfirmation_ConfirmSignUp') {
    await dynamodb
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

    const params = {
      Source: process.env.SES_IDENTITY,
      Destination: { ToAddresses: [ event.request.userAttributes.email, ], },
      Message: {
        Subject: { Data: 'Welcome confirmed user', Charset: 'UTF-8', },
        Body: { Html: { Data: 'Glad you are here', Charset: 'UTF-8', }, },
      },
    };
    await ses.sendEmail(params).promise();
    console.info(`Successfully sent email to user ${event.request.userAttributes.sub}`);
  } 
  
  return event;
}