#!/bin/bash

# AWS Deployment Script for URL Shortener
# This script deploys the application to AWS using CloudFormation and ECS

set -e

# Configuration
STACK_NAME="url-shortener-stack"
REGION="us-east-1"
ECR_REPO_NAME="url-shortener"
ENVIRONMENT="production"

echo "================================================"
echo "URL Shortener - AWS Deployment Script"
echo "================================================"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed"
    exit 1
fi

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "AWS Account ID: $ACCOUNT_ID"
echo "Region: $REGION"

# Create ECR repository if it doesn't exist
echo ""
echo "Step 1: Creating ECR repository..."
aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $REGION 2>/dev/null || \
    aws ecr create-repository --repository-name $ECR_REPO_NAME --region $REGION

# Login to ECR
echo ""
echo "Step 2: Logging in to ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Build Docker image
echo ""
echo "Step 3: Building Docker image..."
docker build -t $ECR_REPO_NAME:latest .

# Tag image
echo ""
echo "Step 4: Tagging Docker image..."
docker tag $ECR_REPO_NAME:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO_NAME:latest

# Push image to ECR
echo ""
echo "Step 5: Pushing Docker image to ECR..."
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO_NAME:latest

# Deploy CloudFormation stack
echo ""
echo "Step 6: Deploying CloudFormation stack..."
aws cloudformation deploy \
    --template-file aws/cloudformation-template.yml \
    --stack-name $STACK_NAME \
    --parameter-overrides EnvironmentName=$ENVIRONMENT \
    --capabilities CAPABILITY_IAM \
    --region $REGION

# Get stack outputs
echo ""
echo "Step 7: Retrieving stack outputs..."
ALB_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' \
    --output text)

RDS_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`RDSEndpoint`].OutputValue' \
    --output text)

REDIS_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`RedisEndpoint`].OutputValue' \
    --output text)

echo ""
echo "================================================"
echo "Deployment Complete!"
echo "================================================"
echo "Application URL: $ALB_URL"
echo "RDS Endpoint: $RDS_ENDPOINT"
echo "Redis Endpoint: $REDIS_ENDPOINT"
echo ""
echo "Note: It may take a few minutes for the application to be fully available."
echo "You can check the status in the AWS Console or by running:"
echo "aws ecs describe-services --cluster $ENVIRONMENT-cluster --services $ENVIRONMENT-service --region $REGION"
