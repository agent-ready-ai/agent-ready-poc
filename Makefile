.PHONY: help bootstrap install-fresh install up down stop logs shell build dev \
        deploy whoami validate lighthouse a11y scan check-all changelog \
        secret-scan clean nuke

COMPOSE := docker compose
SERVICE := dev

# If container is running, exec into it. Otherwise, run a one-shot.
RUN_OR_EXEC = $(shell docker compose ps --status=running --services 2>/dev/null | grep -q $(SERVICE) && echo "exec" || echo "run --rm")
DO          := $(COMPOSE) $(RUN_OR_EXEC) $(SERVICE)

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

bootstrap: ## First-time setup: build the Docker image only
	$(COMPOSE) build
	@echo ""
	@echo "Image built. Next: create package.json, then run 'make install-fresh'."

install-fresh: ## First-ever dependency install — generates package-lock.json
	$(DO) npm install
	@echo "package-lock.json generated. Commit it. Use 'make install' from now on."

install: ## Reproducible dependency install from package-lock.json
	$(DO) npm ci

up: ## Start the container in the background (do this once per session)
	$(COMPOSE) up -d
	@echo "Container running. Subsequent make commands exec into it (<1s)."

down: ## Stop the container
	$(COMPOSE) down

stop: down ## Alias for down

logs: ## Tail container logs
	$(COMPOSE) logs -f $(SERVICE)

shell: ## Open bash inside the container
	$(DO) bash

build: ## Build the site into dist/
	$(DO) npm run build

dev: ## Start Eleventy dev server
	$(DO) npm run dev

deploy: build ## Deploy dist/ to Cloudflare Pages
	$(DO) sh -c 'wrangler pages deploy dist --project-name=$$(cat .pages-project)'

whoami: ## Verify Cloudflare API token and scopes
	$(DO) wrangler whoami

validate: ## schema.org + W3C HTML validation against built site
	$(DO) npm run validate

lighthouse: ## Lighthouse (3 runs, median) on all pages
	$(DO) npm run lighthouse

a11y: ## axe-core accessibility tests on all pages
	$(DO) npm run a11y

scan: ## POST to isitagentready.com and print results
	$(DO) npm run scan

check-all: validate lighthouse a11y scan ## Run all verification gates

changelog: ## Generate CHANGELOG.md from conventional commits
	$(DO) npm run changelog

secret-scan: ## gitleaks against working tree and full history
	$(DO) gitleaks detect --source . --no-git
	$(DO) gitleaks detect --source . --log-opts="--all"

clean: ## Remove containers, volumes, dist, node_modules
	$(COMPOSE) down -v
	rm -rf dist node_modules lighthouse-reports

nuke: clean ## Full reset: also remove the Docker image and build cache
	docker rmi agent-ready-poc:dev 2>/dev/null || true
	docker builder prune -f
