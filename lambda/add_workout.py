import sys
import logging
import rds_config
import pymysql
import boto3
from botocore.exceptions import ClientError



# db_username = "ttrow99"
# db_name = "WorkoutTrackingTable"
# db_endpoint = "workoutprojectstack-workouttrackingtable087385ee-befffhnoqsx8.cpzmyn3b5mc4.us-west-2.rds.amazonaws.com"
# region_name = "us-west-2"
# db_password = "r-SPM0tGh-osymdqTGL-mhA=f=0,^H"

# def get_secret():
#
#
#     # Create a Secrets Manager client
#     session = boto3.session.Session()
#     client = session.client(
#         service_name='secretsmanager',
#         region_name=rds_config.region_name
#     )
#
#     try:
#         get_secret_value_response = client.get_secret_value(
#             SecretId=rds_config.secret_name
#         )
#     except ClientError as e:
#         # For a list of exceptions thrown, see
#         # https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
#         raise e
#
#     # Decrypts secret using the associated KMS key.
#     return get_secret_value_response['SecretString']


# rds settings
db_endpoint = rds_config.db_endpoint
db_username = rds_config.db_username
db_password = rds_config.db_password
db_name = rds_config.db_name

logger = logging.getLogger()
logger.setLevel(logging.INFO)

try:
    conn = pymysql.connect(host=db_endpoint, user=db_username, passwd=db_password, connect_timeout=5)
except pymysql.MySQLError as e:
    logger.error("ERROR: Unexpected error: Could not connect to MySQL instance.")
    logger.error(e)
    sys.exit()

logger.info("SUCCESS: Connection to RDS MySQL instance succeeded")


def lambda_handler(event, context):

    This function fetches content from MySQL RDS instance
    """

    # s3 = boto3.client('s3')
    # data = s3.get_object(Bucket='workoutprojectstack-testbucketworkout12327b145c6-s0isntjv74xa', Key='test_input.txt')
    # contents = data['Body'].read()
    # print(contents)

    item_count = 0

    with conn.cursor() as cur:
        cur.execute('CREATE DATABASE IF NOT EXISTS Workout;')
        cur.execute('use workout_table')
        cur.execute("create table if not exists Workout ("
                    "WorkoutID BINARY(16) PRIMARY KEY,"
                    "Date DATE NOT NULL,"
                    "Name varchar(255) NOT NULL,"
                    "")
        cur.execute('insert into Workout (Date, Name) values("2022-12-10", "Arms")')
        cur.execute('insert into Workout (Date, Name) values("2022-12-11", "Legs")')
        cur.execute('insert into Workout (Date, Name) values("2022-12-12", "Chest")')
        conn.commit()
        cur.execute("select * from Workout")
        for row in cur:
            item_count += 1
            logger.info(row)
            print(row)
    conn.commit()

    return "Added %d items from RDS MySQL table" %(item_count)