import sys
import logging
import rds_config
import pymysql
import boto3
from botocore.exceptions import ClientError

# rds settings
db_endpoint = rds_config.db_endpoint
db_username = rds_config.db_username
db_password = rds_config.db_password

logger = logging.getLogger()
logger.setLevel(logging.INFO)
# create console handler and set level to debug
ch = logging.StreamHandler()
ch.setLevel(logging.DEBUG)

# create formatter
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# add formatter to ch
ch.setFormatter(formatter)

# add ch to logger
logger.addHandler(ch)


def lambda_handler(event, context):

    # fetch text file from bucket
    # s3 = boto3.client('s3')
    # data = s3.get_object(Bucket='workoutprojectstack-testbucketworkout12327b145c6-s0isntjv74xa', Key='test_input.txt')
    # contents = data['Body'].read()
    # print(contents)

    # This function fetches content from MySQL RDS instance


    try:
        conn = pymysql.connect(host=db_endpoint, user=db_username, passwd=db_password, connect_timeout=5)
    except pymysql.MySQLError as e:
        logger.error("ERROR: Unexpected error: Could not connect to MySQL instance.")
        logger.error(e)
        sys.exit()

    logger.info("SUCCESS: Connection to RDS MySQL instance succeeded")


    with conn.cursor() as cur:
        cur.execute('CREATE DATABASE IF NOT EXISTS Workout')
        cur.execute('USE Workout')
        cur.execute("create table if not exists Workout (Date DATE PRIMARY KEY, Name varchar(255))")
        cur.execute('insert into Workout (Date, Name) values("2022-12-10", "Arms")')
        cur.execute('insert into Workout (Date, Name) values("2022-12-11", "Legs")')
        cur.execute('insert into Workout (Date, Name) values("2022-12-12", "Chest")')
        conn.commit()

