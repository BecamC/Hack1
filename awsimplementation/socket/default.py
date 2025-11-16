import json
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
connections_table = dynamodb.Table("Connections")
incidents_table = dynamodb.Table("Incidents")

def lambda_handler(event, context):
    logger.info("=== WebSocket $default ===")
    logger.info(f"Event: {json.dumps(event)}")

    connection_id = event["requestContext"]["connectionId"]
    domain = event["requestContext"]["domainName"]
    stage = event["requestContext"]["stage"]

    api = boto3.client(
        "apigatewaymanagementapi",
        endpoint_url=f"https://{domain}/{stage}"
    )

    try:
        # Parsear el body del mensaje
        body = json.loads(event.get("body", "{}"))
        action = body.get("action", "unknown")
        
        logger.info(f"Action recibida: {action}")

        # Manejar diferentes acciones
        if action == "getIncidents":
            # Enviar lista de incidentes al cliente
            response = incidents_table.scan()
            incidents = response.get("Items", [])
            
            api.post_to_connection(
                ConnectionId=connection_id,
                Data=json.dumps({
                    "type": "incidentsList",
                    "incidents": incidents
                }).encode("utf-8")
            )
        
        elif action == "nuevoReporte":
            # Broadcast a todas las conexiones
            data = body.get("data", {})
            
            # Obtener todas las conexiones
            result = connections_table.scan()
            connections = result.get("Items", [])
            
            message = {
                "type": "nuevoReporte",
                "data": data
            }
            
            # Enviar a todas las conexiones
            for conn in connections:
                try:
                    cid = conn["connectionId"]
                    api.post_to_connection(
                        ConnectionId=cid,
                        Data=json.dumps(message).encode("utf-8")
                    )
                except Exception as e:
                    logger.error(f"Error enviando a {cid}: {str(e)}")
                    # Si falla, eliminar conexión obsoleta
                    connections_table.delete_item(Key={"connectionId": cid})
        
        else:
            # Acción desconocida
            api.post_to_connection(
                ConnectionId=connection_id,
                Data=json.dumps({
                    "type": "error",
                    "message": f"Acción desconocida: {action}"
                }).encode("utf-8")
            )

        return {"statusCode": 200}

    except Exception as e:
        logger.error(f"ERROR en default: {str(e)}")
        try:
            api.post_to_connection(
                ConnectionId=connection_id,
                Data=json.dumps({
                    "type": "error",
                    "message": str(e)
                }).encode("utf-8")
            )
        except:
            pass
        
        return {"statusCode": 500}
