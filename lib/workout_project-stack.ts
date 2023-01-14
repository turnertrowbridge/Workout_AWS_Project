import * as cdk from 'aws-cdk-lib';
import {Duration} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import {InterfaceVpcEndpointService, SubnetType} from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions'
import * as s3 from 'aws-cdk-lib/aws-s3';
import {S3EventSource, SqsEventSource} from "aws-cdk-lib/aws-lambda-event-sources";
import * as path from 'path';


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
      natGateways: 0,
      maxAzs: 1,
      gatewayEndpoints: {
        S3: {
          service: ec2.GatewayVpcEndpointAwsService.S3
        }
      }
    });

    vpc.addFlowLog('FlowLogCloudWatch');

    // add security group
    const mySG = new ec2.SecurityGroup(this, 'security-group-1', {
      vpc: vpc,
      description: 'CDK Security Group',
    });


    vpc.addInterfaceEndpoint('secretsmanager', {
      service: new InterfaceVpcEndpointService('com.amazonaws.' + this.region + '.secretsmanager'),
      privateDnsEnabled: true,
      securityGroups: [mySG],
    });


    const bucket = new s3.Bucket(this, 'workout-uploads', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      bucketName: 'workouts-bucket'
    });

    // const nat_instance = new ec2.Instance(this, 'nat_instance', {
    //   instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
    //   machineImage: new ec2.GenericLinuxImage({
    //     'us-west-2': 'ami-0fc08ccc5a7477361'
    //   }),
    //   vpc,
    //   vpcSubnets: {
    //     subnetType: ec2.SubnetType.PUBLIC
    //   },
    //   sourceDestCheck: false
    // });




    mySG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'allow ssh access from the world');


    // create MySQL table
    const workoutTable =  new rds.DatabaseInstance(this, 'WorkoutTrackingTable', {
      engine: rds.DatabaseInstanceEngine.MYSQL,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      },
      credentials: rds.Credentials.fromGeneratedSecret('databaseSecret', {
        secretName: 'databaseSecretName'
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      publiclyAccessible: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      allocatedStorage: 20,
      backupRetention: Duration.days(0)
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
      timeout: Duration.seconds(15),
      environment:{
        'secret_name': workoutTable.secret!.secretName,
        'region_name': this.region,
        'bucket_name': bucket.bucketName
      },
      vpc
    });



    // permit add_workout to write to table

    workoutTable.grantConnect(add_workout_lambda);
    bucket.grantReadWrite(add_workout_lambda);
    workoutTable.secret!.grantRead(add_workout_lambda);
    // add_workout_lambda.connections.allowTo(mySG, Port.allTcp());



    // create read_workout lambda
    const read_workout_lambda = new lambda.Function(this, "read-workout-lambda-function", {
      code: new lambda.InlineCode("./lambda"),
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'read_workout.lambda_handler',
      vpc,
    });


     // permit read_workout to read from table
    workoutTable.grantConnect(read_workout_lambda);


    // add sqs queue as event source for lambda
    add_workout_lambda.addEventSource(
        new SqsEventSource(queue, {
          batchSize: 1,
        })
    );

    add_workout_lambda.addEventSource(new S3EventSource(bucket, {
    events: [ s3.EventType.OBJECT_CREATED],
}));

  }
}
