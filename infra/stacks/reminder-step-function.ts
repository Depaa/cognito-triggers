import { App, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Pass, StateMachine, Wait, WaitTime } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { BuildConfig } from '../lib/common/config.interface';
import { name } from '../lib/common/utils';
import * as path from 'path';
import { StepfunctionStackProps } from '../lib/interfaces/stepfunction-props';

export class SignupReminderStack extends Stack {
  private readonly lambdaRole: Role;
  public readonly reminderStateMachine: StateMachine;

  constructor(scope: App, id: string, props: StepfunctionStackProps, buildConfig: BuildConfig) {
    super(scope, id, props);

    const baseEnv = {
      REGION: buildConfig.account,
      ACCOUNT_ID: buildConfig.region,
      USER_POOL_ID: props.userPoolId,
      SES_IDENTITY: buildConfig.stacks.ses.identity,
    };

    this.lambdaRole = this.createLambdaRole(name(`${id}-role`), props, buildConfig);
    const reminderLambdaFunction = this.createLambdaFunction(name(`${id}-send-reminder`), 'send-reminder', baseEnv);
    const disableUserLambdaFunction = this.createLambdaFunction(name(`${id}-disable-user`), 'disable-user', baseEnv);

    const step1 = new Wait(this, name(`${id}-step1`), {
      time: WaitTime.duration(Duration.seconds(60 * 2.5)),
      comment: 'Wait 2 minutes and a half',
    });
    const sendReminder = new LambdaInvoke(this, name(`${id}-step2-send-reminder`), {
      lambdaFunction: reminderLambdaFunction,
      inputPath: '$',
      outputPath: '$.Payload',
    });
    const step3 = new Wait(this, name(`${id}-step3`), {
      time: WaitTime.duration(Duration.seconds(60 * 2.5)),
      comment: 'Wait 2 minutes and a half',
    });
    const disableUser = new LambdaInvoke(this, name(`${id}-step4-disable-user`), {
      lambdaFunction: disableUserLambdaFunction,
      inputPath: '$',
      outputPath: '$.Payload',
    });

    const definition = step1.next(sendReminder).next(step3).next(disableUser);

    this.reminderStateMachine = new StateMachine(this, (name(`${id}`)), {
      definition: definition,
      stateMachineName: (name(`${id}`)),
    });
  }

  private createLambdaFunction(name: string, filename: string, environment?: { [key: string]: string; }): Function {
    return new Function(this, name, {
      functionName: `${name}`,
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.seconds(30),
      code: Code.fromAsset(path.join(__dirname, `../../backend/src/lambdas/${filename}`)),
      handler: 'index.handler',
      role: this.lambdaRole,
      architecture: Architecture.ARM_64,
      environment,
    });
  }

  private createLambdaRole(name: string, props: StepfunctionStackProps, buildConfig: BuildConfig): Role {
    return new Role(this, name, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        SendEmails: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'ses:SendEmail',
                'ses:SendRawEmail',
              ],
              resources: [
                `*`,
              ],
              conditions: {
                StringEquals: {
                  'ses:FromAddress': buildConfig.stacks.ses.identity,
                }
              }
            }),
          ],
        }),
        LambdaBasicExecutionRole: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
              ],
              resources: [
                '*',
              ]
            }),
          ],
        }),
        DisableUser: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'cognito-idp:AdminDeleteUser',
                'cognito-idp:AdminDisableUser',
                'cognito-idp:AdminGetUser',
              ],
              resources: [
                `arn:aws:cognito-idp:${buildConfig.region}:${buildConfig.account}:userpool/${props.userPoolId}`
              ],
            }),
          ]
        }),
      },
    });
  }
}