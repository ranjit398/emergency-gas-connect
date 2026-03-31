#!/bin/bash

# Emergency Gas Backend - Makefile for common commands
# Usage: make [command]

.PHONY: help install dev build test lint clean docker logs

help:
	@echo "Emergency Gas Backend - Available Commands"
	@echo "=========================================="
	@echo "make install          - Install dependencies"
	@echo "make dev              - Run development server"
	@echo "make build            - Build TypeScript"
	@echo "make start            - Start production server"
	@echo "make test             - Run tests"
	@echo "make lint             - Run ESLint"
	@echo "make lint-fix         - Fix ESLint issues"
	@echo "make clean            - Clean build files"
	@echo "make docker-build     - Build Docker image"
	@echo "make docker-run       - Run Docker container"
	@echo "make docker-compose   - Start full stack with Docker Compose"
	@echo "make docker-stop      - Stop Docker Compose"
	@echo "make logs             - View Docker Compose logs"
	@echo "make setup            - Initial setup"
	@echo ""

install:
	npm install

dev:
	npm run dev

build:
	npm run build

start:
	npm start

test:
	npm test

lint:
	npm run lint

lint-fix:
	npm run lint:fix

clean:
	rm -rf dist node_modules

docker-build:
	docker build -t emergency-gas-backend:latest .

docker-run:
	docker run -p 5000:5000 --env-file .env emergency-gas-backend:latest

docker-compose:
	docker-compose up -d

docker-stop:
	docker-compose down

logs:
	docker-compose logs -f backend

setup:
	chmod +x setup.sh
	./setup.sh

.DEFAULT_GOAL := help
