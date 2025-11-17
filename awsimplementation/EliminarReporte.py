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

        print(f"🔍 Intentando eliminar: tenant_id={tenant_id}, uuid={uuid}")

        if not uuid:
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({"error": "Debe enviar uuid en la ruta /reporte/{uuid}"})
            }

        nombre_tabla = os.environ.get("TABLE_NAME", "dev-t_reportes")
        print(f"📊 Tabla: {nombre_tabla}")
        
        dynamodb = boto3.resource("dynamodb")
        table = dynamodb.Table(nombre_tabla)

        # Validación previa - verificar que existe
        existing = table.get_item(
            Key={"tenant_id": tenant_id, "uuid": uuid}
        )
        
        if "Item" not in existing:
            print(f"⚠️ Reporte no encontrado: {uuid}")
            return {
                "statusCode": 404,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({"error": "El reporte no existe"})
            }

        # Eliminar
        table.delete_item(
            Key={"tenant_id": tenant_id, "uuid": uuid}
        )
        
        print(f"✅ Reporte eliminado correctamente: {uuid}")

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "mensaje": "Reporte eliminado correctamente",
                "uuid": uuid
            })
        }

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        traceback.print_exc()
        
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"error": str(e)})
        }
