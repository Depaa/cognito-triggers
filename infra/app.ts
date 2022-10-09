import { App, Environment, StackProps } from 'aws-cdk-lib';
import { getConfig } from './lib/common/build-config';
import { BuildConfig } from './lib/common/config.interface';
import { Tags } from 'aws-cdk-lib';
import { CognitoStack } from './stacks/cognito-pools';
import { UserTableStack } from './stacks/user-table';
import { SignupReminderStack } from './stacks/reminder-step-function';
import { SESIdentitiesStack } from './stacks/ses-identities';

const app = new App();

const buildConfig: BuildConfig = getConfig(app);
Tags.of(app).add('Environment', buildConfig.environment);
Tags.of(app).add('Project', buildConfig.project);

const env: Environment = { account: buildConfig.account, region: buildConfig.region }
const stackId = `${buildConfig.environment}-${buildConfig.project}`;
const baseProps: StackProps = { env }

const cognitoStackId = `${stackId}`;
const sesIdentitiesStackId = `${stackId}-ses`;
const signupReminderStackId = `${stackId}-signup-reminder`;
const userTableStackId = `${stackId}-users-table`;

new SESIdentitiesStack(app, sesIdentitiesStackId, {
  ...baseProps,
}, buildConfig);

const userTableStack = new UserTableStack(app, userTableStackId, {
  ...baseProps,
  stackName: userTableStackId,
}, buildConfig);

const cognitoStack = new CognitoStack(app, cognitoStackId, {
  ...baseProps,
  stackName: cognitoStackId,
  usersTable: userTableStack.usersTable.tableName,
  usersTableArn: userTableStack.usersTable.tableArn,
  stateMachineArn: `arn:aws:states:${env.region}:${env.account}:stateMachine:${signupReminderStackId}`,
}, buildConfig);

const signupReminderStack = new SignupReminderStack(app, signupReminderStackId, {
  ...baseProps,
  stackName: signupReminderStackId,
  userPoolId: cognitoStack.userPool.userPoolId,
}, buildConfig);