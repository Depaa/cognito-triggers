import { App, Stack, StackProps } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { BuildConfig } from '../lib/common/config.interface';
import { name } from '../lib/common/utils';

export class UserTableStack extends Stack {
  public readonly usersTable: Table;

  constructor(scope: App, id: string, props: StackProps, buildConfig: BuildConfig) {
    super(scope, id, props);

    this.usersTable = this.createTable(name(`${id}-users`));
  }

  private createTable(name: string): Table {
    return new Table(this, name, {
      tableName: `${name}`,
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING
      },
    });
  }
}