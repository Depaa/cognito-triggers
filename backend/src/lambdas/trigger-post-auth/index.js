// Save last user login
const dynamoDB = require('aws-sdk/clients/dynamodb');

const dynamodb = new dynamoDB.DocumentClient();

exports.handler = async (event) => {
  console.debug(event);

  const params = {
    TableName: process.env.USERS_TABLE,
    Key: {
      id: event.request.userAttributes.sub,
    },
    UpdateExpression: `set #l = :l`,
    ExpressionAttributeNames: {'#l' : 'lastLoginAt'},
    ExpressionAttributeValues: {
      ':l' : new Date().toISOString(),
    },
    ReturnValues: 'UPDATED_NEW',
  };
  const result = await dynamodb.update(params).promise();
  console.info(`Successfully update user in ${process.env.USERS_TABLE}`);
  console.debug(result);

  return event;
}