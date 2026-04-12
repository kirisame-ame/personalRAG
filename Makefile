.PHONY: dev dev-build dev-down prod prod-build prod-down

dev:
	docker compose --profile dev -f compose.yml -f compose.dev.yml up -d --build

dev-build:
	docker compose --profile dev -f compose.yml -f compose.dev.yml build --no-cache

dev-down:
	docker compose --profile dev -f compose.yml -f compose.dev.yml down
dev-down-vol:
	docker compose --profile dev -f compose.yml -f compose.dev.yml down -v
prod:
	docker compose -f compose.yml up -d --build

prod-build:
	docker compose -f compose.yml build --no-cache

prod-down:
	docker compose -f compose.yml down
