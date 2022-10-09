import { StackProps } from "aws-cdk-lib/core/lib/stack";

export interface StepfunctionStackProps extends StackProps {
  userPoolId: string,
}