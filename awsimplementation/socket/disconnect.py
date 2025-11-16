import json
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
connections_table = dynamodb.Table("Connections")

def lambda_handler(event, context):
    logger.info("=== WebSocket $disconnect ===")
    logger.info(f"Event: {json.dumps(event)}")

    try:
        connection_id = event["requestContext"]["connectionId"]
        
        # Eliminar la conexión de DynamoDB
        connections_table.delete_item(Key={"connectionId": connection_id})
        
        logger.info(f"Conexión eliminada: {connection_id}")

        return {
            "statusCode": 200,
            "body": "Disconnected"
        }

    except Exception as e:
        logger.error(f"ERROR disconnect: {str(e)}")
        return {
            "statusCode": 200,  # Retornar 200 incluso con error para no bloquear la desconexión
            "body": json.dumps({"error": str(e)})
        }
