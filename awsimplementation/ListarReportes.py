import boto3
import os
import json
import traceback
from boto3.dynamodb.conditions import Key

def lambda_handler(event, context):
    try:
        # Obtener tenant_id desde query params
        query_params = event.get("queryStringParameters") or {}
        tenant_id = query_params.get("tenant_id") or "utec"
        
        print(f"Listando reportes para tenant: {tenant_id}")

        nombre_tabla = os.environ.get("TABLE_NAME", "dev-t_reportes")
        print(f"Usando tabla: {nombre_tabla}")
        
        dynamodb = boto3.resource("dynamodb")
        table = dynamodb.Table(nombre_tabla)

        # Query por tenant_id (HASH KEY)
        response = table.query(
            KeyConditionExpression=Key('tenant_id').eq(tenant_id)
        )

        items = response.get("Items", [])
        print(f"Se encontraron {len(items)} reportes")

        return {
            "statusCode": 200,
            "body": json.dumps({
                "mensaje": "Reportes obtenidos correctamente",
                "items": items
            })
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        traceback.print_exc()
        
        return {
            "statusCode": 500,
            "body": json.dumps({
                "error": str(e)
            })
        }
