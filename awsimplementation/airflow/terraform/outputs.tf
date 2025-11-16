# outputs.tf
output "ec2_public_ip" {
  value = aws_instance.airflow_ec2.public_ip
}
output "mwaa_environment_name" {
  value = aws_mwaa_environment.example.name
}

output "mwaa_execution_role_arn" {
  value = aws_iam_role.mwaa_execution_role.arn
}