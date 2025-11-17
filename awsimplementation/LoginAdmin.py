import boto3
import json
import traceback

dynamodb = boto3.resource("dynamodb")
admins_table = dynamodb.Table("admins")

def lambda_handler(event, context):
    try:
        # Parsear body
        raw_body = event.get("body", "{}")
        if isinstance(raw_body, str):
            body = json.loads(raw_body)
        else:
            body = raw_body

        # Validar campos
        email = body.get("email", "").strip().lower()
        password = body.get("password", "").strip()

        if not email or not password:
            return {
                "statusCode": 400,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "POST,OPTIONS"
                },
                "body": json.dumps({"error": "Faltan campos: email, password"})
            }

        # Buscar admin
        response = admins_table.get_item(Key={"email": email})

        if "Item" not in response:
            return {
                "statusCode": 401,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "POST,OPTIONS"
                },
                "body": json.dumps({"error": "Email o contraseña incorrectos"})
            }

        admin = response["Item"]

        # Verificar contraseña
        if admin["password"] != password:
            return {
                "statusCode": 401,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "POST,OPTIONS"
                },
                "body": json.dumps({"error": "Email o contraseña incorrectos"})
            }

        # Login exitoso
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST,OPTIONS"
            },
            "body": json.dumps({
                "mensaje": "Login exitoso",
                "admin": {
                    "email": admin["email"],
                    "nombre": admin["nombre"]
                },
                "token": email  # Simple token (en producción usar JWT)
            })
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        traceback.print_exc()
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST,OPTIONS"
            },
            "body": json.dumps({"error": str(e)})
        }
