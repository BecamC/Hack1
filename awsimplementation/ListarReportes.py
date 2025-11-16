import boto3
import os
import json
import traceback

def _log_info(data):
    return {"tipo": "INFO", "log_datos": data}

def _log_error(data):
    return {"tipo": "ERROR", "log_datos": data}

def lambda_handler(event, context):
    try:
        # Leer tenant_id desde query params, usar "utec" por defecto
        tenant_id = event.get("queryStringParameters", {}).get("tenant_id") or "utec"

        nombre_tabla = os.environ["TABLE_NAME"]
        dynamodb = boto3.resource("dynamodb")
        table = dynamodb.Table(nombre_tabla)

        # Query por tenant_id (HASH KEY)
        response = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('tenant_id').eq(tenant_id)
        )

        print(json.dumps(_log_info({
            "mensaje": "Consulta exitosa",
            "tenant_id": tenant_id,
            "total_items": len(response.get("Items", [])),
            "request_id": context.aws_request_id
        })))

        return {
            "statusCode": 200,
            "body": json.dumps({
                "mensaje": "Reportes obtenidos correctamente",
                "items": response.get("Items", [])
            })
        }

    except Exception as e:
        print(json.dumps(_log_error({
            "mensaje": str(e),
            "input_event": event,
            "traceback": traceback.format_exc()
        })))

        return {
            "statusCode": 400,
            "body": json.dumps({
                "mensaje": "Error al listar reportes",
                "error": str(e)
            })
        }
