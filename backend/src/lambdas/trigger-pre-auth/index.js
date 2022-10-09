// Block user after 5 login attempts 
// Return error when user use blocked email address
const { DynamoDB } = require('aws-sdk');

const dynamodb = new DynamoDB.DocumentClient();

const makeUpdateExpression = (diff) => Object.keys(diff)
  .map((key) => `#${key} = :${key}`)
  .join(',');

const getQueryExpressions = (attributes) => {
  const expressions = {};
  expressions.ExpressionAttributeValues = {};
  expressions.ExpressionAttributeNames = {};
  Object.entries(attributes).forEach(([key, value]) => {
    expressions.ExpressionAttributeValues[`:${key}`] = value;
    expressions.ExpressionAttributeNames[`#${key}`] = key;
  });
  return expressions;
};

exports.handler = async (event) => {
  console.debug(event);

  const paramsGet = {
    TableName: process.env.USERS_TABLE,
    Key: {
      id: event.request.userAttributes.sub,
    }
  };
  const result = await dynamodb.get(paramsGet).promise();
  console.debug(result);

  // new user, happens only when migrate users because post-confirmation trigger won't be called
  if (!result.Item) {
    result.Item = {}
    result.Item.email = event.request.userAttributes.email;
    result.Item.createdAt = new Date().toISOString();
    result.Item.updatedAt = new Date().toISOString();
    result.Item.lastLoginAt = new Date().toISOString();
  } else {
    delete result.Item.id;
  }

  // if last attemped login was more than 5 minutes ago, restart with countdown
  if (!result.Item.lastAttemptedLoginAt || new Date().getTime() > new Date(result.Item.lastAttemptedLoginAt).getTime() + 60 * 5 * 1000) {
    result.Item.totalAttempts = 0;
    result.Item.status = null;
  }
  result.Item.totalAttempts++;
  result.Item.status = result.Item.totalAttempts <= 5 ? null : 'blocked';
  result.Item.lastAttemptedLoginAt = new Date().toISOString();

  const paramsUpdate = {
    TableName: process.env.USERS_TABLE,
    Key: {
      id: event.request.userAttributes.sub,
    },
    UpdateExpression: `set ${makeUpdateExpression(result.Item)}`,
    ...getQueryExpressions(result.Item),
    ReturnValues: 'UPDATED_NEW',
  };
  await dynamodb.update(paramsUpdate).promise();
  console.info(`Successfully update user in ${process.env.USERS_TABLE}`);

  if (result.Item.status === 'blocked') {
    throw new Error('Too much attempts, user has been blocked, please wait 5 minutes ☕');
  }

  return event;
}