from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.slack.operators.slack_api import SlackAPIPostOperator
from airflow.providers.sendgrid.operators.sendgrid import SendGridOperator
from datetime import datetime
import boto3
import json
import pandas as pd
import openpyxl

# Diccionario de tipos de incidente a nivel de urgencia
TIPO_INCIDENTE_URGENCIA = {
    "Robo": "Alta",
    "Accidente": "Alta",
    "Acoso": "Alta",
    "Daño a propiedad": "Media",
    "Otro": "Baja"
}

# Función para clasificar el incidente
def clasificar_incidente(**kwargs):
    tenant_id = kwargs['dag_run'].conf.get('tenant_id')
    uuid = kwargs['dag_run'].conf.get('uuid')
    descripcion = kwargs['dag_run'].conf.get('descripcion')
    tipo_incidente = kwargs['dag_run'].conf.get('tipo_incidente')

    # Asignar nivel de urgencia basado en el tipo de incidente
    nivel_urgencia = TIPO_INCIDENTE_URGENCIA.get(tipo_incidente, "Baja")

    # Si la descripción contiene "urgente", cambiar el nivel de urgencia a "Alta"
    if "urgente" in descripcion.lower():
        nivel_urgencia = "Alta"

    # Imprimir para ver el resultado
    print(f"Clasificando incidente {uuid}: Tipo: {tipo_incidente}, Descripción: {descripcion}, Nivel de Urgencia: {nivel_urgencia}")

    # Actualizar el incidente en DynamoDB
    try:
        dynamodb = boto3.resource("dynamodb")
        table = dynamodb.Table("tu_nombre_de_tabla_dynamodb")
        
        # Actualizamos el nivel de urgencia del reporte
        response = table.update_item(
            Key={
                'tenant_id': tenant_id,
                'uuid': uuid
            },
            UpdateExpression="set nivel_urgencia = :n",
            ExpressionAttributeValues={
                ':n': nivel_urgencia
            },
            ReturnValues="UPDATED_NEW"
        )
        print(f"Reporte actualizado: {response}")
    except Exception as e:
        print(f"Error al actualizar el incidente en DynamoDB: {str(e)}")

    # Retornar el incidente para notificación o uso posterior
    return {
        'uuid': uuid,
        'tipo': tipo_incidente,
        'descripcion': descripcion,
        'urgencia': nivel_urgencia
    }

# Función para enviar notificación de Slack
def enviar_notificacion_slack(incident, **kwargs):
    slack_message = f"Nuevo incidente reportado: {incident['tipo']} - {incident['descripcion']} en {incident['ubicacion']}. Urgencia: {incident['urgencia']}"
    
    return SlackAPIPostOperator(
        task_id='enviar_notificacion_slack',
        token='tu-token-de-slack',
        channel='#alertas-incidentes',
        text=slack_message
    ).execute(context=kwargs)

# Función para generar un reporte estadístico
def generar_reporte_estadistico(**kwargs):
    # Obtener los incidentes desde DynamoDB o base de datos
    incidentes = [
        {'id': 1, 'tipo': 'Robo', 'descripcion': 'Robo de celular', 'ubicacion': 'Edificio A', 'urgencia': 'Alta', 'rol': 'Estudiante'},
        {'id': 2, 'tipo': 'Accidente', 'descripcion': 'Accidente de tráfico', 'ubicacion': 'Avenida principal', 'urgencia': 'Media', 'rol': 'Estudiante'}
    ]

    # Crear un DataFrame con los incidentes
    df = pd.DataFrame(incidentes)

    # Generar un archivo Excel
    filename = '/tmp/reporte_incidentes.xlsx'
    df.to_excel(filename, index=False)

    # Devolver la ruta del archivo para que pueda ser enviado por correo o procesado
    return filename

# Función para enviar el reporte por correo electrónico
def enviar_reporte_por_correo(**kwargs):
    # Recuperar la ubicación del archivo generado
    reporte_path = kwargs['ti'].xcom_pull(task_ids='generar_reporte_estadistico')
    
    return SendGridOperator(
        task_id="enviar_reporte_correo",
        api_key="tu-api-key-de-sendgrid",
        to=["responsable@tucorreo.com"],
        subject="Reporte de Incidentes",
        html_content="Aquí está el reporte de incidentes.",
        attachments=[{
            "file": reporte_path,
            "filename": "reporte_incidentes.xlsx"
        }]
    ).execute(context=kwargs)

# Definición del DAG
with DAG('clasificacion_incidentes', start_date=datetime(2023, 11, 16), catchup=False, schedule_interval='@daily') as dag:

    # Tarea de clasificación del incidente
    tarea_clasificar = PythonOperator(
        task_id='clasificar_incidente',
        python_callable=clasificar_incidente,
        provide_context=True
    )

    # Tarea para enviar notificación de Slack
    tarea_notificar_slack = PythonOperator(
        task_id="notificar_incidente_slack",
        python_callable=enviar_notificacion_slack,
        op_args=['{{ task_instance.xcom_pull(task_ids="clasificar_incidente") }}'],
        provide_context=True
    )

    # Tarea para generar reporte estadístico
    tarea_generar_reporte = PythonOperator(
        task_id="generar_reporte_estadistico",
        python_callable=generar_reporte_estadistico,
        provide_context=True
    )

    # Tarea para enviar el reporte por correo
    tarea_enviar_reporte = PythonOperator(
        task_id="enviar_reporte_correo",
        python_callable=enviar_reporte_por_correo,
        provide_context=True
    )

    # Definir las dependencias entre las tareas
    tarea_clasificar >> tarea_notificar_slack
    tarea_generar_reporte >> tarea_enviar_reporte
