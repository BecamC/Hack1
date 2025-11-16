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
        path_params = event.get("pathParameters") or {}

        tenant_id = event.get("queryStringParameters", {}).get("tenant_id") or "utec"
        uuid = path_params.get("uuid")

        if not uuid:
            raise ValueError("Debe enviar uuid en la ruta /reporte/{uuid}")

        nombre_tabla = os.environ["TABLE_NAME"]
        dynamodb = boto3.resource("dynamodb")
        table = dynamodb.Table(nombre_tabla)

        # Validación previa
        existing = table.get_item(
            Key={"tenant_id": tenant_id, "uuid": uuid}
        )
        if "Item" not in existing:
            raise ValueError("El reporte no existe o no pertenece al tenant.")

        # Eliminación
        table.delete_item(
            Key={"tenant_id": tenant_id, "uuid": uuid}
        )

        print(json.dumps(_log_info({
            "mensaje": "Reporte eliminado",
            "tenant_id": tenant_id,
            "uuid": uuid,
            "request_id": context.aws_request_id
        })))

        return {
            "statusCode": 200,
            "body": json.dumps({
                "mensaje": "Reporte eliminado correctamente",
                "uuid": uuid
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
                "mensaje": "Error al eliminar reporte",
                "error": str(e)
            })
        }
