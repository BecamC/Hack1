import json
import boto3
import logging
import time

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
connections_table = dynamodb.Table("Connections")

def lambda_handler(event, context):
    logger.info("=== WebSocket $connect ===")
    logger.info(json.dumps(event))

    try:
        connection_id = event["requestContext"]["connectionId"]

        # Guardar conexión
        connections_table.put_item(Item={
            "connectionId": connection_id,
            "username": "Anon",
            "timestamp": int(time.time())
        })

        logger.info(f"Conexión guardada: {connection_id}")

        return {
            "statusCode": 200
        }

    except Exception as e:
        logger.error(f"ERROR en connect: {str(e)}")
        return {
            "statusCode": 500
        }
