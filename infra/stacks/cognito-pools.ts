import { App, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { BuildConfig } from '../lib/common/config.interface';
import { name } from '../lib/common/utils';
import { AccountRecovery, StringAttribute, UserPool, UserPoolClient, UserPoolEmail, UserPoolOperation } from 'aws-cdk-lib/aws-cognito';
import { Effect, Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { CognitoStackProps } from '../lib/interfaces/cognito-props';
import { Key } from 'aws-cdk-lib/aws-kms';
import * as path from 'path';


export class CognitoStack extends Stack {
  public readonly userPool: UserPool;
  private readonly oldUserPool: UserPool;
  private readonly lambdaRole: Role;
  private readonly kmsKey: Key | undefined;

  constructor(scope: App, id: string, props: CognitoStackProps, buildConfig: BuildConfig) {
    super(scope, id, props);

    this.kmsKey = buildConfig.stacks.cognito.enableCustomSender ? this.createKMSKey(name(`${id}-key`)) : undefined;
    this.lambdaRole = this.createLambdaRole(name(`${id}-role`), props, buildConfig);
    this.userPool = this.createUserPool(name(`${id}-pool`), buildConfig);
    this.oldUserPool = this.createUserPool(name(`${id}-old-pool`), buildConfig);

    const userPoolClientID = this.createAppClient(this.userPool, name(`${id}-client`));
    const oldUserPoolClientID = this.createAppClient(this.oldUserPool, name(`${id}-old-client`));
    this.createUserPoolDomain(this.userPool, name(`${id}-domain`));
    this.createUserPoolDomain(this.oldUserPool, name(`${id}-old-domain`));

    const baseEnv = {
      REGION: buildConfig.account,
      ACCOUNT_ID: buildConfig.region,
      USERS_TABLE: props.usersTable,
      REMINDER_STATE_MACHINE: props.stateMachineArn,
      SES_IDENTITY: buildConfig.stacks.ses.identity,
      KEY_ARN: this.kmsKey?.keyArn ?? '',
      KEY_ALIAS_ARN: `arn:aws:kms:${buildConfig.region}:${buildConfig.account}:alias/${name(`${id}-key`)}`,
      OLD_USER_POOL_ID: this.oldUserPool.userPoolId,
      OLD_USER_POOL_CLIENT_ID: oldUserPoolClientID.userPoolClientId,
      SMS_SENDER_ID: buildConfig.stacks.cognito.enableCustomSender ? buildConfig.stacks.cognito.customProvider.sms.senderId : '',
      SMS_API_KEY: buildConfig.stacks.cognito.enableCustomSender ? buildConfig.stacks.cognito.customProvider.sms['api-key'] : '',
      SMS_SENDER: buildConfig.stacks.cognito.enableCustomSender ? buildConfig.stacks.cognito.customProvider.sms.sender : '',
      EMAIL_API_KEY: buildConfig.stacks.cognito.enableCustomSender ? buildConfig.stacks.cognito.customProvider.email['api-key'] : '',
      EMAIL_SENDER: buildConfig.stacks.cognito.enableCustomSender ? buildConfig.stacks.cognito.customProvider.email.sender : ''
    };

    // Return error when user use blocked email address
    const lambdaFunctionPreAuth = this.createLambdaFunction(name(`${id}-pre-authentication`), 'trigger-pre-auth', baseEnv);
    this.userPool.addTrigger(UserPoolOperation.PRE_AUTHENTICATION, lambdaFunctionPreAuth);

    // Save last user login
    const lambdaFunctionPostAuth = this.createLambdaFunction(name(`${id}-post-authentication`), 'trigger-post-auth', baseEnv);
    this.userPool.addTrigger(UserPoolOperation.POST_AUTHENTICATION, lambdaFunctionPostAuth);

    // Add more info to user's token
    const lambdaFunctionPreTokenGen = this.createLambdaFunction(name(`${id}-pre-token-gen`), 'trigger-pre-token-gen', baseEnv);
    this.userPool.addTrigger(UserPoolOperation.PRE_TOKEN_GENERATION, lambdaFunctionPreTokenGen);

    // Autoconfirm only gmail addresses
    const lambdaFunctionPreSignup = this.createLambdaFunction(name(`${id}-pre-signup`), 'trigger-pre-signup', baseEnv);
    this.userPool.addTrigger(UserPoolOperation.PRE_SIGN_UP, lambdaFunctionPreSignup);

    // Send an email to the confirmed user
    const lambdaFunctionPostConfirmation = this.createLambdaFunction(name(`${id}-post-confirmation`), 'trigger-post-confirmation', baseEnv);
    this.userPool.addTrigger(UserPoolOperation.POST_CONFIRMATION, lambdaFunctionPostConfirmation);

    // Migrate user from old userpool to new
    const lambdaFunctionMigrateUser = this.createLambdaFunction(name(`${id}-migrate-user`), 'trigger-migrate-user', baseEnv);
    this.userPool.addTrigger(UserPoolOperation.USER_MIGRATION, lambdaFunctionMigrateUser);

    // Custom email template
    const lambdaFunctionCustomMessage = this.createLambdaFunction(name(`${id}-custom-message`), 'trigger-custom-message');
    this.userPool.addTrigger(UserPoolOperation.CUSTOM_MESSAGE, lambdaFunctionCustomMessage);

    // 
    const lambdaFunctionDefineAuthChallenge = this.createLambdaFunction(name(`${id}-define-auth-challenge`), 'trigger-define-auth-challenge', baseEnv);
    this.userPool.addTrigger(UserPoolOperation.DEFINE_AUTH_CHALLENGE, lambdaFunctionDefineAuthChallenge);

    // 
    const lambdaFunctionCreateAuthChallenge = this.createLambdaFunction(name(`${id}-create-auth-challenge`), 'trigger-create-auth-challenge', baseEnv);
    this.userPool.addTrigger(UserPoolOperation.CREATE_AUTH_CHALLENGE, lambdaFunctionCreateAuthChallenge);

    // 
    const lambdaFunctionVerifyAuthChallengeRes = this.createLambdaFunction(name(`${id}-verify-auth-challenge-response`), 'trigger-verify-auth-challenge-response', baseEnv);
    this.userPool.addTrigger(UserPoolOperation.VERIFY_AUTH_CHALLENGE_RESPONSE, lambdaFunctionVerifyAuthChallengeRes);

    // ! if it's enabled it will cost 1$ per month
    if (buildConfig.stacks.cognito.enableCustomSender) {
      // send Email through SES
      const lambdaFunctionCustomSender = this.createLambdaFunction(name(`${id}-custom-sender`), 'trigger-custom-sender', baseEnv);
      this.userPool.addTrigger(UserPoolOperation.CUSTOM_EMAIL_SENDER, lambdaFunctionCustomSender);  
      this.userPool.addTrigger(UserPoolOperation.CUSTOM_SMS_SENDER, lambdaFunctionCustomSender);
    }
  }

  private createKMSKey(name: string): Key {
    return new Key(this, `${name}-key`, {
      description: 'KMS key for cognito custom sender',
      removalPolicy: RemovalPolicy.DESTROY,
      alias: `${name}`
    });
  }

  private createUserPool(name: string, buildConfig: BuildConfig): UserPool {
    return new UserPool(this, name, {
      userPoolName: `${name}`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true

      },
      autoVerify: { email: true, phone: true },
      signInCaseSensitive: false,
      passwordPolicy: {
        minLength: 10,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: Duration.days(3),
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      customAttributes: {
        flag: new StringAttribute({ mutable: true }),
      },

      customSenderKmsKey: this.kmsKey,
      email: UserPoolEmail.withSES({
        sesRegion: buildConfig.region,
        fromEmail: buildConfig.stacks.ses.identity,
        fromName: 'Cognito blog',
        // replyTo: 'support@myawesomeapp.com',
        // sesVerifiedDomain: 'myawesomeapp.com',
      }),
    });
  }

  private createAppClient(userPool: UserPool, name: string): UserPoolClient {
    return userPool.addClient(name, {
      generateSecret: false,
      userPoolClientName: name,
      authFlows: {
        adminUserPassword: true,
        custom: true,
        userPassword: true,
      },
      refreshTokenValidity: Duration.minutes(60),
      accessTokenValidity: Duration.minutes(5),
      idTokenValidity: Duration.minutes(5),
    });
  }

  private createUserPoolDomain(userPool: UserPool, name: string): void {
    userPool.addDomain(name, {
      cognitoDomain: {
        domainPrefix: name.replace('cognito-', ''),
      }
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

  private createLambdaRole(name: string, props: CognitoStackProps, buildConfig: BuildConfig): Role {
    const lambdaRole = new Role(this, name, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    lambdaRole.attachInlinePolicy(new Policy(this, `${name}-send-email-ses`, {
      policyName: `${name}-send-email-ses`,
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
      ]
    }));

    //Allow publishing only to resources without arn
    lambdaRole.attachInlinePolicy(new Policy(this, `${name}-send-sms-sns`, {
      policyName: `${name}-send-sms-sns`,
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'sns:Publish',
          ],
          notResources: [
            'arn:aws:sns:*:*:*',
          ]
        }),
      ]
    }));

    lambdaRole.attachInlinePolicy(new Policy(this, `${name}-lambda-basic-execution`, {
      policyName: `${name}-lambda-basic-execution`,
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
      ]
    }));

    lambdaRole.attachInlinePolicy(new Policy(this, `${name}-dynamodb-users-table`, {
      policyName: `${name}-dynamodb-users-table`,
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'dynamodb:DeleteItem',
            'dynamodb:GetItem',
            'dynamodb:PutItem',
            'dynamodb:Query',
            'dynamodb:Scan',
            'dynamodb:UpdateItem',
          ],
          resources: [
            props.usersTableArn,
          ]
        }),
      ]
    }));

    lambdaRole.attachInlinePolicy(new Policy(this, `${name}-signup-reminder`, {
      policyName: `${name}-signup-reminder`,
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'states:StartExecution',
          ],
          resources: [
            props.stateMachineArn,
          ]
        }),
      ]
    }));

    lambdaRole.attachInlinePolicy(new Policy(this, `${name}-migrate-user-cognito`, {
      policyName: `${name}-migrate-user-cognito`,
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'cognito-idp:AdminInitiateAuth',
            'cognito-idp:AdminGetUser',
          ],
          resources: [
            `arn:aws:cognito-idp:${buildConfig.region}:${buildConfig.account}:userpool/*`
          ],
        }),
      ]
    }));

    if (this.kmsKey) {
      lambdaRole.attachInlinePolicy(new Policy(this, `${name}-decrypt-custom-email`, {
        policyName: `${name}-decrypt-custom-email`,
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'kms:Decrypt',
            ],
            resources: [
              this.kmsKey?.keyArn,
            ]
          }),
        ]
      }));
    }

    return lambdaRole;
  }
}