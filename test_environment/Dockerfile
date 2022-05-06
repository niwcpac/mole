FROM  python:3.7.9-buster

COPY requirements.txt /test_environment/

RUN pip install -r /test_environment/requirements.txt
COPY . /test_environment/

WORKDIR /test_environment