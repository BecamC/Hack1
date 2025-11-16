variable "aws_region" {
  description = "AWS Region"
  default     = "us-east-1"
}

variable "s3_bucket_name" {
  description = "Nombre del bucket S3 donde se encuentran los DAGs"
}

variable "subnet_id_1" {
  description = "ID de la primera subred"
}

variable "subnet_id_2" {
  description = "ID de la segunda subred"
}
