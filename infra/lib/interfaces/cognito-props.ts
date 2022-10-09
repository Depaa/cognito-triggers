import { StackProps } from "aws-cdk-lib/core/lib/stack";

export interface CognitoStackProps extends StackProps {
  usersTable: string,
  usersTableArn: string,
  stateMachineArn: string,
}