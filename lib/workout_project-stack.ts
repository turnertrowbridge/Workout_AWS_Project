import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions'

import fs = require('fs');
import {SqsEventSource} from "aws-cdk-lib/aws-lambda-event-sources";

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


    // create dynamodb table
    const workoutTable = new dynamodb.Table(this, 'WorkoutTracking_Table', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
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
      code: lambda.Code.fromAsset("./lambda/add_workout.py"),
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'add_workout_lambda.lambda_handler',
    });

    add_workout_lambda.addEnvironment("TABLE_NAME", workoutTable.tableName);

    // permit add_workout to write to table
    workoutTable.grantWriteData(add_workout_lambda);


    // create read_workout lambda
    const read_workout_lambda = new lambda.Function(this, "readWorkout_lambda_function", {
      code: lambda.Code.fromAsset("./lambda/read_workout.py"),
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'read_workout_lambda.lambda_handler',
    });

    read_workout_lambda.addEnvironment("TABLE_NAME", workoutTable.tableName);

     // permit read_workout to read from table
    workoutTable.grantReadData(read_workout_lambda);


    // add sqs queue as event source for lambda
    add_workout_lambda.addEventSource(
        new SqsEventSource(queue, {
          batchSize: 1,
        })
    )
  }
}
