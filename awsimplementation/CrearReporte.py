import requests
import json
import boto3
import uuid
import os
import traceback

dynamodb = boto3.resource("dynamodb")
table_name = os.environ.get("TABLE_NAME", "dev-t_reportes")
reportes_table = dynamodb.Table(table_name)
connections_table = dynamodb.Table(os.environ.get("CONNECTIONS_TABLE", "Connections"))

AIRFLOW_API_URL = "http://<airflow-instance-url>/api/v1/dags/your_dag_id/dagRuns"

def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        required = ["tipo_incidente", "ubicacion", "tipo_usuario", "descripcion"]

        missing = [x for x in required if x not in body]
        if missing:
            return {"statusCode": 400, "body": f"Faltan campos: {missing}"}

        uuidv4 = str(uuid.uuid4())
        tenant_id = body.get("tenant_id", "utec")
        
        # nivel_urgencia es opcional, con valor por defecto
        nivel_urgencia = body.get("nivel_urgencia", "media")

        reporte = {
            "uuid": uuidv4,
            "tenant_id": tenant_id,
            "tipo_incidente": body["tipo_incidente"],
            "nivel_urgencia": nivel_urgencia,
            "ubicacion": body["ubicacion"],
            "tipo_usuario": body["tipo_usuario"],
            "descripcion": body["descripcion"],
            "estado": "pendiente"
        }

        # Guardar en dev-t_reportes
        reportes_table.put_item(Item=reporte)

        # Notificar por WebSocket a todos los administradores
        domain = event["requestContext"]["domainName"]
        stage = event["requestContext"]["stage"]
        ws_endpoint = f"https://{domain}/{stage}"
        
        try:
            api = boto3.client("apigatewaymanagementapi", endpoint_url=ws_endpoint)
            connections = connections_table.scan().get("Items", [])
            
            message = {
                "type": "nuevoReporte",
                "data": reporte
            }
            
            for conn in connections:
                try:
                    api.post_to_connection(
                        ConnectionId=conn["connectionId"],
                        Data=json.dumps(message)
                    )
                except Exception as e:
                    print(f"Error enviando a {conn['connectionId']}: {str(e)}")
        except Exception as e:
            print(f"Warning: No se pudo notificar por WebSocket: {str(e)}")

        return {"statusCode": 200, "body": json.dumps({"mensaje": "Reporte creado", "uuid": uuidv4})}

    except Exception as e:
        traceback.print_exc()
        return {"statusCode": 500, "body": str(e)}
