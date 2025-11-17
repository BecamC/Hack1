import json
import boto3
import uuid
import os
import traceback

dynamodb = boto3.resource("dynamodb")
table_name = os.environ.get("TABLE_NAME", "dev-t_reportes")
reportes_table = dynamodb.Table(table_name)
connections_table = dynamodb.Table(os.environ.get("CONNECTIONS_TABLE", "Connections"))

# Cliente SNS para enviar notificaciones por email
sns = boto3.client("sns")
SNS_TOPIC_ARN = os.environ.get("SNS_TOPIC_ARN", "")

def lambda_handler(event, context):
    try:
        # El body puede venir como string o dict dependiendo de cómo lo envíe API Gateway
        raw_body = event.get("body", "{}")
        if isinstance(raw_body, str):
            body = json.loads(raw_body)
        else:
            body = raw_body
        
        required = ["tipo_incidente", "ubicacion", "tipo_usuario", "descripcion"]

        missing = [x for x in required if x not in body]
        if missing:
            return {"statusCode": 400, "body": json.dumps({"error": f"Faltan campos: {missing}"})}

        uuidv4 = str(uuid.uuid4())
        tenant_id = body.get("tenant_id", "utec")
        
        # nivel_urgencia es opcional, con valor por defecto
        nivel_urgencia = body.get("nivel_urgencia", "media")

        reporte = {
            "tenant_id": tenant_id,
            "uuid": uuidv4,
            "tipo_incidente": body["tipo_incidente"],
            "nivel_urgencia": nivel_urgencia,
            "ubicacion": body["ubicacion"],
            "tipo_usuario": body["tipo_usuario"],
            "descripcion": body["descripcion"],
            "estado": "pendiente"
        }

        # =====================================================
        # 💾 GUARDAR EN DYNAMODB
        # =====================================================
        reportes_table.put_item(Item=reporte)
        print(f"✅ Reporte guardado: {uuidv4}")

        # =====================================================
        # 📧 ENVIAR NOTIFICACIÓN POR EMAIL VIA SNS
        # =====================================================
        if SNS_TOPIC_ARN:
            try:
                mensaje_email = f"""
Se ha registrado un nuevo incidente en el Panel UTEC:

UUID: {uuidv4}
Tipo: {reporte['tipo_incidente']}
Nivel de urgencia: {reporte['nivel_urgencia']}
Ubicación: {reporte['ubicacion']}
Usuario: {reporte['tipo_usuario']}
Descripción: {reporte['descripcion']}
Estado: {reporte['estado']}
Tenant: {tenant_id}

---
Este es un mensaje automático del sistema de reportes UTEC.
                """

                sns.publish(
                    TopicArn=SNS_TOPIC_ARN,
                    Subject=f"🚨 Nuevo Reporte UTEC - {reporte['tipo_incidente']} ({reporte['nivel_urgencia']})",
                    Message=mensaje_email
                )

                print("📨 Notificación SNS enviada correctamente")

            except Exception as e:
                print(f"⚠️ Error enviando SNS: {str(e)}")
                traceback.print_exc()
        else:
            print("⚠️ SNS_TOPIC_ARN no configurado, no se enviará email")

        # =====================================================
        # 🔵 NOTIFICAR POR WEBSOCKET (TIEMPO REAL)
        # =====================================================
        try:
            domain = event["requestContext"]["domainName"]
            stage = event["requestContext"]["stage"]
            ws_endpoint = f"https://{domain}/{stage}"
            
            api = boto3.client("apigatewaymanagementapi", endpoint_url=ws_endpoint)
            connections = connections_table.scan().get("Items", [])
            
            message = {
                "type": "nuevoReporte",
                "data": reporte
            }
            
            for conn in connections:
                try:
                    api.post_to_connection(
                        ConnectionId=conn["connectionId"],
                        Data=json.dumps(message)
                    )
                    print(f"✅ WS enviado a {conn['connectionId']}")
                except Exception as e:
                    print(f"⚠️ Error enviando a {conn.get('connectionId', 'unknown')}: {str(e)}")
        except Exception as e:
            print(f"⚠️ No se pudo notificar por WebSocket: {str(e)}")
            traceback.print_exc()

        # =====================================================
        # ✅ RESPUESTA EXITOSA CON CORS
        # =====================================================
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST,OPTIONS"
            },
            "body": json.dumps({
                "mensaje": "Reporte creado exitosamente",
                "uuid": uuidv4,
                "reporte": reporte
            })
        }

    except Exception as e:
        print(f"❌ Error general: {str(e)}")
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
