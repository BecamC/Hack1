import boto3
import uuid
import os
import json
import traceback

# ------------------------------
# Helpers de logs
# ------------------------------
def _log_info(data):
    return {"tipo": "INFO", "log_datos": data}

def _log_error(data):
    return {"tipo": "ERROR", "log_datos": data}

# ------------------------------
# Handler principal
# ------------------------------
def lambda_handler(event, context):
    try:
        # Normalizar el body (API Gateway manda string)
        if isinstance(event.get("body"), str):
            body = json.loads(event["body"])
        else:
            body = event.get("body")

        if body is None:
            raise ValueError("No se recibió 'body' en el evento.")

        # ------------------------------
        # Validación de campos obligatorios
        # ------------------------------
        required_fields = [
            "tenant_id",
            "tipo_incidente",
            "nivel_urgencia",
            "ubicacion",
            "tipo_usuario",
            "descripcion"
        ]

        missing = [f for f in required_fields if f not in body]
        if missing:
            raise ValueError(f"Faltan campos obligatorios: {', '.join(missing)}")

        tenant_id = body["tenant_id"]
        tipo_incidente = body["tipo_incidente"]
        nivel_urgencia = body["nivel_urgencia"]
        ubicacion = body["ubicacion"]
        tipo_usuario = body["tipo_usuario"]
        descripcion = body["descripcion"]

        nombre_tabla = os.environ["TABLE_NAME"]

        # ------------------------------
        # Construcción del item
        # ------------------------------
        uuidv4 = str(uuid.uuid4())

        reporte = {
            "tenant_id": tenant_id,   # HASH KEY
            "uuid": uuidv4,           # RANGE KEY
            "tipo_incidente": tipo_incidente,
            "nivel_urgencia": nivel_urgencia,
            "ubicacion": ubicacion,
            "tipo_usuario": tipo_usuario,
            "descripcion": descripcion
        }

        # ------------------------------
        # Guardar en DynamoDB
        # ------------------------------
        dynamodb = boto3.resource("dynamodb")
        table = dynamodb.Table(nombre_tabla)
        response = table.put_item(Item=reporte)

        # ------------------------------
        # Log de éxito
        # ------------------------------
        print(json.dumps(_log_info({
            "mensaje": "Reporte creado correctamente",
            "request_id": context.aws_request_id,
            "reporte": reporte
        })))

        # ------------------------------
        # Respuesta HTTP
        # ------------------------------
        return {
            "statusCode": 200,
            "body": json.dumps({
                "mensaje": "Reporte creado",
                "reporte": reporte,
                "put_response": response
            })
        }

    except Exception as e:
        # Log de error
        error_log = {
            "mensaje": str(e),
            "input_event": event,
            "traceback": traceback.format_exc()
        }

        print(json.dumps(_log_error(error_log)))

        return {
            "statusCode": 400,
            "body": json.dumps({
                "mensaje": "Error al crear el reporte",
                "error": str(e)
            })
        }
