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
    logger.info(f"Event: {json.dumps(event)}")

    try:
        connection_id = event["requestContext"]["connectionId"]
        
        # Solo guardar la conexión en DynamoDB
        # NO intentar enviar mensajes durante $connect
        connections_table.put_item(Item={
            "connectionId": connection_id,
            "username": "Anon",
            "timestamp": int(time.time())
        })
        
        logger.info(f"Conexión guardada: {connection_id}")

        return {
            "statusCode": 200,
            "body": "Connected"
        }

    except Exception as e:
        logger.error(f"ERROR en connect: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
