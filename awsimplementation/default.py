import json
import boto3
import logging
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
connections_table = dynamodb.Table("Connections")
incidents_table = dynamodb.Table("Incidents")

# 🔥 endpoint real del WebSocket (no domain/stage del evento)
WS_ENDPOINT = os.environ.get("WS_ENDPOINT")
api = None
if WS_ENDPOINT and not WS_ENDPOINT.startswith("https://TU-"):
    api = boto3.client("apigatewaymanagementapi", endpoint_url=WS_ENDPOINT)

def lambda_handler(event, context):
    logger.info("=== WebSocket $default ===")
    logger.info(json.dumps(event))

    try:
        connection_id = event["requestContext"]["connectionId"]
        body = json.loads(event.get("body", "{}"))
        action = body.get("action")

        logger.info(f"Action recibida: {action}")

        # ----- getIncidents -----
        if action == "getIncidents":
            incidents = incidents_table.scan().get("Items", [])
            if api:
                api.post_to_connection(
                    ConnectionId=connection_id,
                    Data=json.dumps({
                        "type": "incidentsList",
                        "incidents": incidents
                    }).encode()
                )
            else:
                logger.warning("WS_ENDPOINT no configurado, no se puede enviar respuesta")
            return {"statusCode": 200}

        # ----- nuevoReporte -----
        if action == "nuevoReporte":
            data = body.get("data", {})

            if api:
                connections = connections_table.scan().get("Items", [])
                message = {
                    "type": "nuevoReporte",
                    "data": data
                }

                for conn in connections:
                    try:
                        api.post_to_connection(
                            ConnectionId=conn["connectionId"],
                            Data=json.dumps(message).encode()
                        )
                    except Exception:
                        connections_table.delete_item(Key={"connectionId": conn["connectionId"]})
            else:
                logger.warning("WS_ENDPOINT no configurado, no se puede notificar")

            return {"statusCode": 200}

        # Acción desconocida
        if api:
            api.post_to_connection(
                ConnectionId=connection_id,
                Data=json.dumps({"type": "error", "message": "Acción desconocida"}).encode()
            )
        return {"statusCode": 200}

    except Exception as e:
        logger.error(str(e))
        return {"statusCode": 500}
