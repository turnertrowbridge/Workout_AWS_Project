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
import {SqsEventSource} from "aws-cdk-lib/aws-lambda-event-sources";
import * as path from 'path';
import {ManagedPolicy, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";


export class WorkoutProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create vpc
    const vpc =  new ec2.Vpc(this, 'workout-vpc', {
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'workout-private-vpc',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED
        },
        {
          cidrMask: 24,
          name: 'workout-public-vpc',
          subnetType: ec2.SubnetType.PUBLIC
        }
      ],
      natGateways: 0
      });


    vpc.addFlowLog('FlowLogCloudWatch');


    const bucket = new s3.Bucket(this, 'test-bucket-workout-123', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });


    // add security group
    const mySG = new ec2.SecurityGroup(this, 'security-group 1', {
      vpc: vpc,
      description: 'CDK Security Group'
    });

    mySG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'allow ssh access from the world');

    // mySG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(5432));
    // mySG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3306));

    // create MySQL table
    const workoutTable =  new rds.DatabaseInstance(this, 'WorkoutTrackingTable', {
      engine: rds.DatabaseInstanceEngine.MYSQL,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      },
      credentials: rds.Credentials.fromGeneratedSecret('ttrow99'),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      publiclyAccessible: false,
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


    // const lambdaRole = new Role(this, 'lambaRole', {
    //                 roleName: 'lambdaRole',
    //                 assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    //                 managedPolicies: [
    //                     ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole"),
    //                     ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
    //                 ]
    //             })


    const dockerfile = path.join(__dirname, '../lambda');
    const add_workout_lambda = new lambda.DockerImageFunction(this, "add-workout", {
      code: lambda.DockerImageCode.fromImageAsset(dockerfile),
      architecture: lambda.Architecture.ARM_64,
      vpc
    });

    // permit add_workout to write to table
    workoutTable.grantConnect(add_workout_lambda);


    // create read_workout lambda
    const read_workout_lambda = new lambda.Function(this, "read-workout-lambda-function", {
      code: new lambda.InlineCode("./lambda"),
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'read_workout.lambda_handler',
      vpc
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
