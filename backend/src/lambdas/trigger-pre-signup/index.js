// allow only gmail, icloud and outlook addresses
// start step function to remind user and to delete unconfirmed user
const { StepFunctions } = require('aws-sdk');

const sfn = new StepFunctions();

exports.handler = async (event) => {
  console.debug(event);

  const address = event.request.userAttributes.email.split("@");
  if (address[1] !== 'gmail.com' && address[1] !== 'icloud.com' && address[1] !== 'outlook.com') {
    throw new Error('You must use gmail, icloud or outlook');
  }

  const input = {
    id: event.userName,
  }

  await sfn.startExecution({
    input: JSON.stringify(JSON.stringify(input)),
    name: event.userName,
    stateMachineArn: process.env.REMINDER_STATE_MACHINE
  }).promise();
  console.info(`Successfully start execution for ${event.userName}`);

  return event;
}