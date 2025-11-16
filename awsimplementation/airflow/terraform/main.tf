# Provider AWS
provider "aws" {
  region                  = "us-east-1"
  shared_credentials_files = ["~/.aws/credentials"]  # Aquí toma las credenciales de tu configuración local
  profile                 = "default"  # Usa el perfil 'default' si ese es el que usas, o usa el nombre de tu perfil
}

# Declaración de variables

variable "ami_id" {
  description = "ID of the AMI to use for the environment"
  type        = string
}

variable "source_bucket_arn" {
  description = "ARN of the S3 bucket for Airflow DAGs"
  type        = string
}

# VPC y Subredes
resource "aws_vpc" "main" {
  cidr_block = "172.31.0.0/16"
}

resource "aws_subnet" "subnet_1" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "172.31.0.0/20"
}

resource "aws_subnet" "subnet_2" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "172.31.16.0/20"
}

# Grupo de seguridad
resource "aws_security_group" "mwaa_sg" {
  name   = "mwaa-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Configuración de Amazon MWAA
resource "aws_mwaa_environment" "example" {
  name                    = "example-airflow-environment"
  airflow_version          = "2.3.0"
  environment_class        = "mw1.medium"
  execution_role_arn       = "arn:aws:iam::804190897568:role/MyExistingMWAARole"  # El ARN de tu rol IAM ya existente

  # Especifica la configuración de red
  network_configuration {
    subnet_ids              = [aws_subnet.subnet_1.id, aws_subnet.subnet_2.id]
    security_group_ids      = [aws_security_group.mwaa_sg.id]
  }

  # Especifica el bucket de S3 donde se encuentran los DAGs
  source_bucket_arn        = var.source_bucket_arn  # Usamos la variable definida

  dag_s3_path              = "airflow/dags"        # Ruta donde están tus DAGs en S3
  airflow_configuration_options = {
    "core.dag_concurrency"              = "16"
    "core.max_active_runs_per_dag"      = "10"
  }

  # Configura el bucket donde están los requisitos de Python (requirements.txt)
  requirements_s3_path     = "airflow/requirements.txt" # Ruta a tu archivo requirements.txt
  plugins_s3_path          = "airflow/plugins"           # Si tienes plugins personalizados (opcional)
}

# Salidas (opcional)
output "mwaa_environment_name" {
  value = aws_mwaa_environment.example.name
}

output "mwaa_execution_role_arn" {
  value = "arn:aws:iam::804190897568:role/MyExistingMWAARole"  # El ARN del rol existente
}
