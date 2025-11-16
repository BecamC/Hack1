import requests
import json
import boto3
import uuid
import os
import traceback

# URL de la API REST de Airflow
AIRFLOW_API_URL = "http://<airflow-instance-url>/api/v1/dags/your_dag_id/dagRuns"

def lambda_handler(event, context):
    try:
        # Normalización del body
        body = json.loads(event["body"]) if isinstance(event.get("body"), str) else event.get("body")
        if body is None:
            raise ValueError("No se recibió 'body' en el evento.")

        required_fields = ["tipo_incidente", "nivel_urgencia", "ubicacion", "tipo_usuario", "descripcion"]
        missing = [f for f in required_fields if f not in body]
        if missing:
            raise ValueError(f"Faltan campos obligatorios: {', '.join(missing)}")

        tenant_id = body.get("tenant_id", "utec")
        tipo_incidente = body["tipo_incidente"]
        nivel_urgencia = body["nivel_urgencia"]
        ubicacion = body["ubicacion"]
        tipo_usuario = body["tipo_usuario"]
        descripcion = body["descripcion"]

        # Guardar en DynamoDB
        dynamodb = boto3.resource("dynamodb")
        table = dynamodb.Table(os.environ["TABLE_NAME"])
        uuidv4 = str(uuid.uuid4())

        reporte = {
            "tenant_id": tenant_id,
            "uuid": uuidv4,
            "tipo_incidente": tipo_incidente,
            "nivel_urgencia": nivel_urgencia,
            "ubicacion": ubicacion,
            "tipo_usuario": tipo_usuario,
            "descripcion": descripcion
        }

        response = table.put_item(Item=reporte)

        # Llamar a Apache Airflow para clasificar el incidente
        airflow_payload = {
            "conf": {
                "tenant_id": tenant_id,
                "uuid": uuidv4,
                "descripcion": descripcion
            }
        }

        airflow_response = requests.post(
            AIRFLOW_API_URL,
            data=json.dumps(airflow_payload),
            headers={"Content-Type": "application/json"}
        )

        if airflow_response.status_code != 200:
            raise ValueError(f"Error al invocar Airflow: {airflow_response.text}")

        return {
            "statusCode": 200,
            "body": json.dumps({
                "mensaje": "Reporte creado y clasificado",
                "reporte": reporte,
                "put_response": response
            })
        }

    except ValueError as ve:
        error_log = {"mensaje": str(ve), "input_event": event, "traceback": traceback.format_exc()}
        return {"statusCode": 400, "body": json.dumps({"mensaje": "Error de validación", "error": str(ve)})}

    except Exception as e:
        error_log = {"mensaje": str(e), "input_event": event, "traceback": traceback.format_exc()}
        return {"statusCode": 500, "body": json.dumps({"mensaje": "Error inesperado", "error": str(e)})}
