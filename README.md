# Workout Database Project Using AWS

**Background:**  
While I go to the gym and work out I like to track my weightlifting progress on an app. I would like to see more advanced statistics about my workouts but the app wants you to pay an $8.99 monthly subscription.  
  
**Idea:**  
Create a way to send the workout that has a predictable format to a database and set up some statistics to track or request that is free or cheap to maintain.  
  
**Implementation Idea:**  
Using the AWS Free Tier resources, receive workout data as an email via Simple Email Services, and use the text inside to trigger a Lambda Function. This Lambda function runs a script to parse the data and upload the parsed data to an RDS MySQL Database instance.
Another Lambda would be run after the data is uploaded to send a workout summary back to the user.  
  
**Database Schema:**  
![Workout_MySQL drawio](https://user-images.githubusercontent.com/69882779/212497618-71141cf2-997d-4a1b-b9ac-168e84547227.png)
  
**Current Implementation:**  
A user must manually upload a .txt file to S3 Bucket and call the lambda for the database to store the data. No summary report yet.  
  
**Current AWS Architecture:**  
![AWS_WorkoutProject drawio](https://user-images.githubusercontent.com/69882779/212497621-5ffbd174-f85b-4690-bce1-69c54044cd3a.png)
  
**Future Ideas:**  
Create a frontend app using swift that eliminates the need for a third-party app.  
