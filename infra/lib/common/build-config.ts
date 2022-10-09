import { App } from 'aws-cdk-lib';
import { BuildConfig } from './config.interface';

export function getConfig(app: App): BuildConfig {
  const env = app.node.tryGetContext('config');
  if (!env)
    throw new Error("Context variable missing on CDK command. Pass in as `-c config=XXX`");

  const buildConfig: BuildConfig = app.node.tryGetContext(env);

  return buildConfig;
}