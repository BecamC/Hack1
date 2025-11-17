import boto3
import json
import traceback
import re

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
        nombre = body.get("nombre", "").strip()

        if not email or not password or not nombre:
            return {
                "statusCode": 400,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "POST,OPTIONS"
                },
                "body": json.dumps({"error": "Faltan campos: email, password, nombre"})
            }

        # Validar formato email (@utec.edu.pe)
        if not email.endswith("@utec.edu.pe"):
            return {
                "statusCode": 400,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "POST,OPTIONS"
                },
                "body": json.dumps({"error": "Solo se aceptan emails @utec.edu.pe"})
            }

        # Validar contraseña (mín 6 caracteres)
        if len(password) < 6:
            return {
                "statusCode": 400,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "POST,OPTIONS"
                },
                "body": json.dumps({"error": "La contraseña debe tener al menos 6 caracteres"})
            }

        # Verificar si el email ya existe
        response = admins_table.get_item(Key={"email": email})
        if "Item" in response:
            return {
                "statusCode": 409,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "POST,OPTIONS"
                },
                "body": json.dumps({"error": "El email ya está registrado"})
            }

        # Crear admin
        admin = {
            "email": email,
            "password": password,  # En producción, encriptar con bcrypt
            "nombre": nombre
        }

        admins_table.put_item(Item=admin)

        return {
            "statusCode": 201,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST,OPTIONS"
            },
            "body": json.dumps({
                "mensaje": "Admin registrado exitosamente",
                "admin": {"email": email, "nombre": nombre}
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
