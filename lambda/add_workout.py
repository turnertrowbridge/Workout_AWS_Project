import sys
import logging
import rds_config
import pymysql
import re
import datetime
from smart_open import smart_open

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

workout_table_data = {
    'workout_title': str,
    'date': str,
    'time': str,
    'AM_or_PM': str,
    'day_of_week': str,
    'total_weight': 0.0
}

exercises = {}

exercise_data = {
    'workout_title': str,
    'date': str,
    'set_num': int,
    'reps': int,
    'weight': float
}


def modify_exercise_name(exercise: str):
    exercise = exercise.replace(" ", "")
    exercise = exercise.replace("(", "_")
    exercise = exercise.replace(")", "")
    return exercise


def read_txt_file():
    line_num = 0
    for line in smart_open('s3://workoutprojectstack-testbucketworkout12327b145c6-cvo04t2n69d1/text.txt', 'r'):
        if line_num == 0:
            first_line = re.search('(?<!\s)^(.+)$', line)
            workout_table_data['workout_title'] = (first_line.group())

        elif line_num == 1:
            date = datetime.datetime.strptime(line, '%A, %B %d, %Y at %I:%M %p\n')
            workout_table_data['date'] = (date.strftime('%Y-%m-%d'))
            workout_table_data['time'] = (date.strftime('%I:%M'))
            workout_table_data['AM_or_PM'] = (date.strftime('%p'))
            workout_table_data['day_of_week'] = (date.strftime('%A'))

        else:
            is_set = re.search('Set', line)

            if not is_set:
                is_exercise_name = re.search('[^\n].*(?=\n)', line)
                if is_exercise_name:
                    exercise_name = modify_exercise_name(is_exercise_name.group())
                    exercises[f'{exercise_name}'] = {}

            if is_set:
                set_num = re.search('(?<=Set\s)(\d*)(?=:)', line)
                weight = re.search('(?<=:\s)(.*)(?=\slb)', line)
                reps = re.search('(?<=×\s)(\d*)(?=\n)', line)
                exercise_data['set_num'] = set_num.group()
                exercise_data['weight'] = weight.group()
                exercise_data['reps'] = reps.group()
                exercise_data['workout_title'] = workout_table_data['workout_title']
                exercise_data['date'] = workout_table_data['date']
                exercises[f'{exercise_name}'][set_num.group()] = exercise_data.copy()

        line_num += 1


def create_workout_table():
    sql = 'CREATE TABLE IF NOT EXISTS Workouts (workout_title varchar(255), date date, time time, ' \
          'AM_or_PM varchar(2), day_of_week varchar(255), total_weight float, PRIMARY KEY(workout_title, date))'
    return sql


def create_exercise_table(exercise: str):
    sql = 'CREATE TABLE IF NOT EXISTS %(title)s (workout_title varchar(255), date date, set_num int, reps int, ' \
          'weight int, FOREIGN KEY (workout_title, date) REFERENCES Workouts(workout_title, date), PRIMARY KEY (' \
          'workout_title, date, set_num))' \
          % {'title': exercise}
    return sql


def convert_to_mysql(table_name: str, d: dict):
    columns = ", ".join(d.keys())
    values = ", ".join("'" + str(x).replace('/', '_') + "'" for x in d.values())
    sql = 'INSERT IGNORE INTO %s ( %s ) VALUES ( %s )' % (table_name, columns, values)
    return sql


def total_weight_update(total_weight: float):
    sql = "UPDATE Workouts SET total_weight = '%(weight)s' WHERE workout_title = '%(title)s' AND date = '%(date)s'" \
          % {
              'weight': str(total_weight),
              'title': workout_table_data["workout_title"],
              'date': workout_table_data["date"]
          }
    return sql


def lambda_handler(event, context):

    read_txt_file()

    try:
        conn = pymysql.connect(host=db_endpoint, user=db_username, passwd=db_password, connect_timeout=5)
    except pymysql.MySQLError as e:
        logger.error('ERROR: Unexpected error: Could not connect to MySQL instance.')
        logger.error(e)
        sys.exit()

    logger.info('SUCCESS: Connection to RDS MySQL instance succeeded')

    with conn.cursor() as cur:
        cur.execute('CREATE DATABASE IF NOT EXISTS Workout_Tracker')
        cur.execute('USE Workout_Tracker')
        cur.execute(create_workout_table())
        cur.execute(convert_to_mysql('Workouts', workout_table_data))

        total_weight = 0
        for exercise in exercises:
            cur.execute(create_exercise_table(exercise))
            for i in range(1, len(exercises[exercise]) + 1):
                cur.execute(convert_to_mysql(exercise, exercises[exercise][f"{i}"]))
                total_weight += float(exercises[exercise][f"{i}"]['weight'])

        cur.execute(total_weight_update(total_weight))
        conn.commit()

