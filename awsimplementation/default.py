import json
import boto3
import logging
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
connections_table = dynamodb.Table("Connections")
table_name = os.environ.get("TABLE_NAME", "dev-t_reportes")
reportes_table = dynamodb.Table(table_name)

def lambda_handler(event, context):
    logger.info("=== WebSocket $default ===")
    logger.info(json.dumps(event))

    try:
        connection_id = event["requestContext"]["connectionId"]
        domain = event["requestContext"]["domainName"]
        stage = event["requestContext"]["stage"]
        
        # Construir el endpoint del API Gateway Management API
        ws_endpoint = f"https://{domain}/{stage}"
        api = boto3.client("apigatewaymanagementapi", endpoint_url=ws_endpoint)
        
        body = json.loads(event.get("body", "{}"))
        action = body.get("action")

        logger.info(f"Action recibida: {action}")

        # ----- getIncidents -----
        if action == "getIncidents":
            # Obtener todos los reportes de dev-t_reportes
            reportes = reportes_table.scan().get("Items", [])
            
            api.post_to_connection(
                ConnectionId=connection_id,
                Data=json.dumps({
                    "type": "incidentsList",
                    "incidents": reportes
                })
            )
            return {"statusCode": 200}

        # ----- nuevoReporte -----
        if action == "nuevoReporte":
            data = body.get("data", {})
            
            # Obtener todas las conexiones activas
            connections = connections_table.scan().get("Items", [])
            message = {
                "type": "nuevoReporte",
                "data": data
            }

            # Enviar a todos los clientes conectados
            for conn in connections:
                try:
                    api.post_to_connection(
                        ConnectionId=conn["connectionId"],
                        Data=json.dumps(message)
                    )
                except Exception as e:
                    logger.error(f"Error enviando a {conn['connectionId']}: {str(e)}")

            return {"statusCode": 200}

        # Acción desconocida
        logger.warning(f"Acción desconocida: {action}")
        return {"statusCode": 200}

    except Exception as e:
        logger.error(f"ERROR en $default: {str(e)}")
        return {"statusCode": 200}
