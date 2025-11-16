# Usa la imagen oficial de Apache Airflow
FROM apache/airflow:2.5.0-python3.9

# Establece el directorio de trabajo
WORKDIR /opt/airflow

# Copia los archivos del DAG al contenedor
COPY ./dags /opt/airflow/dags
COPY ./requirements.txt /opt/airflow/requirements.txt

# Instala las dependencias del archivo requirements.txt
RUN pip install --no-cache-dir -r /opt/airflow/requirements.txt

# Establece las variables de entorno necesarias para Airflow
ENV AIRFLOW_HOME=/opt/airflow

# Si necesitas variables como las de S3, puedes agregarlas aquí:
ENV S3_BUCKET_NAME="diegolde-apache-bucket"
ENV SUBNET_ID_1="subnet-abc123"
ENV SUBNET_ID_2="subnet-def456"
ENV SOURCE_BUCKET_ARN="arn:aws:s3:::diegolde-apache-bucket"

# Exponer el puerto de Airflow (para acceder a la UI)
EXPOSE 8080

# Comando para ejecutar el webserver y el scheduler
CMD ["bash", "-c", "airflow webserver & airflow scheduler"]
