# Workout Database Project Using AWS

**Background:**  
I like to go to gym and track my weightlifting progress on an app. I would like to see more advanced statistics about my workouts but the app wants you to pay an $8.99 monthly subscription.  
  
**Idea:**  
Create a way to send the workout that has a predictable format to a database that is _free or cheap to maintain._ Additionally, set up some formulas to track advanced statistics.  
  
**Implementation Idea:**  
Using the AWS Free Tier resources, receive workout data as an email via Simple Email Services, and trigger a Lambda Function. This Lambda function runs a script to parse the data from the email and upload the parsed data to an RDS MySQL Database instance. Another Lambda would be run after the data is uploaded to send a workout summary back to the user. Set up a bastion host to remotely ssh into that allows access to the database.
  
**Database Schema:**  
![Workout_MySQL drawio](https://user-images.githubusercontent.com/69882779/212497618-71141cf2-997d-4a1b-b9ac-168e84547227.png)

  
**Current Implementation:**  
A user must manually upload a .txt file to S3 Bucket and call the lambda for the database to store the data. No summary report or SES implementation yet.

**Roadbumps:**
Trying to avoid the use of a costly NAT gateway as this costs $0.045 per availability zone per hour. The NAT gateway is necessary to retrieve the S3 Bucket data and the secret from the Secrets Manager. This is due to the Lambda being in the VPC, thus preventing internet access unless there is a NAT gateway. The solution I have currently implemented is a free VPC endpoint that allows the lambda to connect to the S3 Bucket and a $0.005 per hour VPC Interface to Secrets Manager.
  
**Current AWS Architecture:**  
![AWS_WorkoutProjectDiagram drawio](https://user-images.githubusercontent.com/69882779/212501329-8aa84b75-940a-415f-a5b4-c69841ca9309.png)


**Future Tasks:** 
S3 bucket upload triggers Lambda  
Set up a domain using Route 53  
Register an SES email to domain  
SES either uploads .txt to S3 bucket or directly passes data to Lambda  
Set up SQS to deal with emails  

**Future Ideas:**  
Create a frontend app using swift that eliminates the need for a third-party app.  
