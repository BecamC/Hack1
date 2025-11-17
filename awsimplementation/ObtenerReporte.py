import boto3
import os
import json
import traceback

def lambda_handler(event, context):
    try:
        path_params = event.get("pathParameters") or {}
        query_params = event.get("queryStringParameters") or {}

        tenant_id = query_params.get("tenant_id") or "utec"
        uuid = path_params.get("uuid")

        if not uuid:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Debe enviar uuid en la ruta /reporte/{uuid}"})
            }

        nombre_tabla = os.environ.get("TABLE_NAME", "dev-t_reportes")
        dynamodb = boto3.resource("dynamodb")
        table = dynamodb.Table(nombre_tabla)

        response = table.get_item(
            Key={
                "tenant_id": tenant_id,
                "uuid": uuid
            }
        )

        if "Item" not in response:
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "El reporte no existe"})
            }

        return {
            "statusCode": 200,
            "body": json.dumps({
                "mensaje": "Reporte encontrado",
                "item": response["Item"]
            })
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        traceback.print_exc()
        
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
