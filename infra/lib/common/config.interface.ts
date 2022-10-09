export interface BuildConfig {
  readonly account: string;
  readonly region: string;
  readonly environment: string;
  readonly project: string;
  readonly version: string;
  readonly build: string;
  readonly stacks: BuildStaks;
}

export interface BuildStaks {
  readonly ses: SESStack;
  readonly cognito: CognitoStack;
}

export interface SESStack {
  readonly identity: string;
  readonly receivers: string[];
}

export interface CognitoStack {
  readonly enableCustomSender: boolean;
  readonly customProvider: CustomProviders;
}

export interface CustomProviders {
  readonly email: EmailProvider;
  readonly sms: SMSProvider;
}

export interface EmailProvider {
  readonly 'api-key': string;
  readonly sender: string;
}

export interface SMSProvider {
  readonly 'api-key': string;
  readonly senderId: string;
  readonly sender: string;
}

