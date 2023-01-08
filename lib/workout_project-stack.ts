import * as cdk from 'aws-cdk-lib';
import {RemovalPolicy} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions'
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import {SqsEventSource} from "aws-cdk-lib/aws-lambda-event-sources";
import * as path from 'path';

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class WorkoutProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create vpc
    const vpc =  new ec2.Vpc(this, "workout-vpc");

    const bucket = new s3.Bucket(this, 'test-bucket-workout-123', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });


    // add security group
    const mySG = new ec2.SecurityGroup(this, 'security-group 1', {
      vpc: vpc,
      allowAllOutbound: true,
      description: 'CDK Security Group'
    });


    // create MySQL table
    const workoutTable =  new rds.DatabaseInstance(this, 'WorkoutTrackingTable', {
      engine: rds.DatabaseInstanceEngine.MYSQL,
      vpc,
      credentials: rds.Credentials.fromGeneratedSecret('ttrow99'),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      securityGroups: [mySG],
      publiclyAccessible: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      allocatedStorage: 20,
    });

    workoutTable.connections.allowDefaultPortFromAnyIpv4();


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


    const dockerfile = path.join(__dirname, '../lambda');
    const add_workout_lambda = new lambda.DockerImageFunction(this, "add-workout", {
      code: lambda.DockerImageCode.fromImageAsset(dockerfile),
      architecture: lambda.Architecture.ARM_64,
    });
    // create add_workout lambda
    // const add_workout_lambda = new lambda.Function(this, "add_workout_lambda_function", {
    //   code: new lambda.InlineCode("./lambda"),
    //   runtime: lambda.Runtime.PYTHON_3_9,
    //   handler: 'add_workout.lambda_handler'
    // });

    // workout_lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName(
    //     "service-role/AWSLambdaVPCAccessExecutionRole"));


    // permit add_workout to write to table
    workoutTable.grantConnect(add_workout_lambda);


    // create read_workout lambda
    const read_workout_lambda = new lambda.Function(this, "read-workout-lambda-function", {
      code: new lambda.InlineCode("./lambda"),
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'read_workout.lambda_handler',
    });


     // permit read_workout to read from table
    workoutTable.grantConnect(read_workout_lambda);


    // add sqs queue as event source for lambda
    add_workout_lambda.addEventSource(
        new SqsEventSource(queue, {
          batchSize: 1,
        })
    );
  }
}
