import { App, Stack, StackProps } from 'aws-cdk-lib';
import { CfnEmailIdentity, Identity } from 'aws-cdk-lib/aws-ses';
import { BuildConfig } from '../lib/common/config.interface';
import { name } from '../lib/common/utils';

export class SESIdentitiesStack extends Stack {
  constructor(scope: App, id: string, props: StackProps, buildConfig: BuildConfig) {
    super(scope, id, props);

    for (const [index, value] of [buildConfig.stacks.ses.identity, ...buildConfig.stacks.ses.receivers].entries()) {
      this.createIdentity(name(`${id}-${index}`), value);
    }
  }

  private createIdentity(name: string, emailIdentity: string): CfnEmailIdentity {
    return new CfnEmailIdentity(this, name, {
      emailIdentity
    });
  }
}