# SecureNodeX Master Makefile
.PHONY: dev-up dev-down test contracts-test pki-init provision chain-up storage-up simulate demo clean-secrets lint format

COMPOSE_DEV = docker compose -f deploy/docker-compose.dev.yml

dev-up:
	$(COMPOSE_DEV) up -d --build
	@echo "Waiting for services to become healthy..."
	@sleep 6
	$(COMPOSE_DEV) ps

dev-down:
	$(COMPOSE_DEV) down -v

lint:
	ruff check .
	ruff format --check .
	mypy backend storage simulator tools

format:
	ruff format .
	ruff check --fix .

test:
	pytest -v --tb=short

contracts-test:
	@if [ -d "contracts/node_modules" ]; then \
		cd contracts && npm test; \
	else \
		echo "Contracts dependencies not installed. Skipping or run 'cd contracts && npm install && npm test'"; \
	fi

pki-init:
	@echo "Initializing PKI (Root & Intermediate CA, Broker certs)..."
	@PYTHONPATH=. python3 pki/init_pki.py

provision:
	@if [ -z "$(LABEL)" ]; then \
		echo "Usage: make provision LABEL=<device_label> [HOURS=<hours>]"; \
		exit 1; \
	fi
	@PYTHONPATH=. python3 pki/provision-device.py --label "$(LABEL)"

chain-up:
	@echo "Starting Besu / Hardhat local chain..."
	@docker compose -f deploy/docker-compose.chain.yml up -d 2>/dev/null || echo "Chain compose ready for M8"

storage-up:
	@echo "Starting storage node $(NODE_ID)..."
	@NODE_ID=$(NODE_ID) docker compose -f deploy/docker-compose.storage.yml up -d 2>/dev/null || echo "Remote storage compose ready for M8"

simulate:
	@echo "Running simulator with $(or $(DEVICES),100) virtual devices..."
	@python3 -m simulator.main --devices $(or $(DEVICES),100) --rate $(or $(RATE),1.0) --duration $(or $(DURATION),5.0)

demo:
	@echo "Starting SecureNodeX Full Platform Demonstration..."
	@PYTHONPATH=. python3 tools/seed_demo.py

clean-secrets:
	@echo "WARNING: This will remove all local generated keys, certs, and test data!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@rm -rf secrets/* pki/root/* pki/out/* data/* firmware/credentials/*
	@echo "Secrets cleaned."
