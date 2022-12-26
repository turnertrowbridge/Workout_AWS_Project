import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions'

import fs = require('fs');
import {SqsEventSource} from "aws-cdk-lib/aws-lambda-event-sources";
import {AssetCode} from "aws-cdk-lib/aws-lambda";

export class WorkoutProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'WorkoutProjectQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    // create vpc
    const vpc =  new ec2.Vpc(this, "workout_vpc");


    const secret = new rds.DatabaseSecret(this, 'MySQLSecret', {
      username: 'ttrow',
    });

    // create MySQL table
    const workoutTable =  new rds.DatabaseInstance(this, 'WorkoutTracking_Table', {
      engine: rds.DatabaseInstanceEngine.MYSQL,
      vpc,
      credentials: { username: 'ttrow' },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
    });


    // sns queue creation
    const queue = new sqs.Queue(this, 'sqs-queue');

    // create sns topic
    const topic = new sns.Topic(this, 'new-workout', {
      displayName: 'My New Workout'
    });

    // subscribe queue to topic
    topic.addSubscription(new subs.SqsSubscription(queue));

    new cdk.CfnOutput(this, 'snsTopicArn', {
      value: topic.topicArn,
      description: 'The arn of the SNS topic',
    });


    // create add_workout lambda
    const add_workout_lambda = new lambda.Function(this, "add_workout_lambda_function", {
      code: new AssetCode("./lambda"),
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'add_workout_lambda.lambda_handler',
    });


    // permit add_workout to write to table
    workoutTable.grantConnect(add_workout_lambda);


    // create read_workout lambda
    const read_workout_lambda = new lambda.Function(this, "readWorkout_lambda_function", {
      code: new AssetCode("./lambda"),
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'read_workout_lambda.lambda_handler',
    });


     // permit read_workout to read from table
    workoutTable.grantConnect(read_workout_lambda);


    // add sqs queue as event source for lambda
    add_workout_lambda.addEventSource(
        new SqsEventSource(queue, {
          batchSize: 1,
        })
    )
  }
}
