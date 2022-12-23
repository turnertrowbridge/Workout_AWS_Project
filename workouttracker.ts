import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface WorkoutTrackerProps {
  /** the function for which we want to count url hits **/
  downstream: lambda.IFunction;
}

export class HitCounter extends Construct {
  constructor(scope: Construct, id: string, props: WorkoutTrackerProps) {
    super(scope, id);

    // TODO
  }
}