FROM public.ecr.aws/lambda/python:3.9

# Copy function code
COPY add_workout.py ${LAMBDA_TASK_ROOT}
COPY rds_config.py rds_config.py


COPY requirements.txt /tmp
WORKDIR /tmp
# Install the function's dependencies using file requirements.txt
# from your project folder.
RUN pip3 install -r requirements.txt

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "add_workout.lambda_handler" ]

