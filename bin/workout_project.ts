#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WorkoutProjectStack } from '../lib/workout_project-stack';

const app = new cdk.App();
new WorkoutProjectStack(app, 'WorkoutProjectStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});