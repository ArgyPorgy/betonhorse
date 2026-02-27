.PHONY: help install dev build docker-up docker-down deploy-contract test clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	cd contracts && npm install
	cd backend && npm install
	cd frontend && npm install

dev-backend: ## Run backend in dev mode
	cd backend && npm run dev

dev-frontend: ## Run frontend in dev mode
	cd frontend && npm run dev

dev: ## Run both frontend and backend
	@echo "Run 'make dev-backend' and 'make dev-frontend' in separate terminals"

docker-up: ## Start all services with Docker
	docker compose up --build -d

docker-down: ## Stop all Docker services
	docker compose down

docker-logs: ## View Docker logs
	docker compose logs -f

compile-contract: ## Compile smart contract
	cd contracts && npx hardhat compile

test-contract: ## Run contract tests
	cd contracts && npx hardhat test

deploy-contract-sepolia: ## Deploy contract to Sepolia
	cd contracts && npx hardhat run scripts/deploy.js --network sepolia

deploy-contract-local: ## Deploy contract to local Hardhat node
	cd contracts && npx hardhat run scripts/deploy.js --network localhost

hardhat-node: ## Start local Hardhat node
	cd contracts && npx hardhat node

clean: ## Clean all build artifacts
	rm -rf contracts/artifacts contracts/cache
	rm -rf frontend/.next frontend/node_modules/.cache
	rm -rf backend/node_modules/.cache

# EigenCompute deployment
eigencompute-prepare: ## Copy EigenCompute Dockerfile for ecloud deploy
	cp Dockerfile.eigencompute Dockerfile
	@echo "Run: ecloud compute app deploy"

eigencompute-build: ## Build EigenCompute image locally (for testing)
	docker build -f Dockerfile.eigencompute -t betonhorse:eigencompute .

# Render deployment - push to GitHub, then connect repo at dashboard.render.com
render-deploy: ## Deploy to Render (see docs/RENDER.md)
	@echo "1. Push to GitHub"
	@echo "2. Go to dashboard.render.com"
	@echo "3. New > Blueprint > Connect repo"
	@echo "4. Add env vars, then Apply"
	@echo "See docs/RENDER.md for full instructions"
