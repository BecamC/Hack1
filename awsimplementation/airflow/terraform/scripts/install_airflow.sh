#!/bin/bash
# Instalar dependencias
sudo apt update -y
sudo apt install -y python3-pip python3-dev libmysqlclient-dev build-essential

# Instalar Apache Airflow
pip3 install apache-airflow

# Crear usuario y directorios de Airflow
sudo useradd -m -s /bin/bash airflow
sudo mkdir /home/airflow/airflow_home
sudo chown -R airflow:airflow /home/airflow/

# Configurar variables de entorno
echo "AIRFLOW_HOME=/home/airflow/airflow_home" >> /home/airflow/.bashrc
echo "export AIRFLOW_HOME" >> /home/airflow/.bashrc
source /home/airflow/.bashrc

# Inicializar la base de datos de Airflow
sudo -u airflow airflow db init

# Iniciar Airflow webserver
sudo -u airflow airflow webserver -D

# Iniciar Airflow scheduler
sudo -u airflow airflow scheduler -D
